/**
 * Pure availability computation. No I/O — callers fetch rules/blackouts/booked
 * units (src/lib/booking/store.ts) and hand them in, which is what makes this
 * the most heavily unit-tested file in the booking system.
 *
 * The DB RPC is the final capacity authority under lock; this engine is the
 * schedule authority (is that slot even offered?) and the display layer's
 * source of remaining-seat truth.
 */
import { type BookingProduct } from "./products.ts";
import { slotToUtc, pacificWeekday, eachDate } from "./time.ts";

export interface ScheduleRule {
  productSlug: string;
  weekday: number; // 0 = Sunday, Pacific
  startTimes: string[];
  capacity: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface ScheduleException {
  productSlug: string;
  onDate: string;
  /** null = closed that day; otherwise replaces the weekday rule's times */
  startTimes: string[] | null;
  capacity: number | null;
}

export interface Blackout {
  kind: string;
  startsOn: string;
  endsOn: string;
  productSlugs: string[];
}

export interface BookedUnits {
  productSlug: string;
  startsAtIso: string;
  units: number;
}

export interface Slot {
  /** UTC ISO instant */
  startsAt: string;
  /** Pacific wall clock 'HH:MM' */
  time: string;
  capacity: number;
  remainingUnits: number;
}

export interface DayAvailability {
  date: string;
  slots: Slot[];
}

function isBlackedOut(
  productSlug: string,
  dateStr: string,
  blackouts: Blackout[],
): boolean {
  return blackouts.some(
    (b) =>
      b.productSlugs.includes(productSlug) &&
      dateStr >= b.startsOn &&
      dateStr <= b.endsOn,
  );
}

/** The offered times+capacity for one product on one date, or null when closed. */
function dayPlan(
  productSlug: string,
  dateStr: string,
  schedules: ScheduleRule[],
  exceptions: ScheduleException[],
  blackouts: Blackout[],
): { times: string[]; capacity: number } | null {
  if (isBlackedOut(productSlug, dateStr, blackouts)) return null;

  const exception = exceptions.find(
    (e) => e.productSlug === productSlug && e.onDate === dateStr,
  );
  const weekday = pacificWeekday(dateStr);
  // Multiple rows are allowed for the same product+weekday with overlapping
  // effective windows; the latest effectiveFrom wins, independent of array order.
  const rule = schedules
    .filter(
      (r) =>
        r.productSlug === productSlug &&
        r.weekday === weekday &&
        r.effectiveFrom <= dateStr &&
        (r.effectiveTo === null || r.effectiveTo >= dateStr),
    )
    .reduce<ScheduleRule | undefined>(
      (latest, r) => (!latest || r.effectiveFrom > latest.effectiveFrom ? r : latest),
      undefined,
    );

  if (exception) {
    if (exception.startTimes === null) return null; // closed
    return {
      times: exception.startTimes,
      capacity: exception.capacity ?? rule?.capacity ?? 1,
    };
  }
  if (!rule) return null;
  return { times: rule.startTimes, capacity: rule.capacity };
}

export function computeAvailability(opts: {
  product: BookingProduct;
  from: string;
  to: string;
  schedules: ScheduleRule[];
  exceptions: ScheduleException[];
  blackouts: Blackout[];
  booked: BookedUnits[];
  now: Date;
}): DayAvailability[] {
  const { product, schedules, exceptions, blackouts, booked, now } = opts;
  const usedBySlot = new Map<string, number>();
  for (const b of booked) {
    if (b.productSlug !== product.slug) continue;
    const key = new Date(b.startsAtIso).toISOString();
    usedBySlot.set(key, (usedBySlot.get(key) ?? 0) + b.units);
  }
  const earliest = new Date(now.getTime() + product.leadTimeMin * 60000);

  return eachDate(opts.from, opts.to).map((date) => {
    const plan = dayPlan(product.slug, date, schedules, exceptions, blackouts);
    if (!plan) return { date, slots: [] };
    const slots: Slot[] = [];
    for (const time of [...plan.times].sort()) {
      const startsAt = slotToUtc(date, time);
      if (startsAt < earliest) continue;
      const used = usedBySlot.get(startsAt.toISOString()) ?? 0;
      slots.push({
        startsAt: startsAt.toISOString(),
        time,
        capacity: plan.capacity,
        remainingUnits: Math.max(0, plan.capacity - used),
      });
    }
    return { date, slots };
  });
}

/**
 * Checkout's schedule authority: capacity for that exact slot if it is
 * legitimately offered (on schedule, not blacked out, not inside lead time),
 * else null. The DB re-checks capacity under lock; this checks legitimacy.
 */
export function slotCapacity(opts: {
  product: BookingProduct;
  dateStr: string;
  time: string;
  schedules: ScheduleRule[];
  exceptions: ScheduleException[];
  blackouts: Blackout[];
  now: Date;
}): number | null {
  const plan = dayPlan(
    opts.product.slug, opts.dateStr, opts.schedules, opts.exceptions, opts.blackouts,
  );
  if (!plan || !plan.times.includes(opts.time)) return null;
  const startsAt = slotToUtc(opts.dateStr, opts.time);
  const earliest = new Date(opts.now.getTime() + opts.product.leadTimeMin * 60000);
  if (startsAt < earliest) return null;
  const horizon = new Date(opts.now.getTime() + opts.product.horizonDays * 86400000);
  if (startsAt > horizon) return null;
  return plan.capacity;
}

/** Days where a tour and a spa session can both be booked ≥ bufferMin apart, either order. */
export function comboDays(
  tour: DayAvailability[],
  spa: DayAvailability[],
  tourUnitsNeeded: number,
  spaUnitsNeeded: number,
  bufferMin: number,
): { date: string; pairs: { tour: Slot; spa: Slot }[] }[] {
  const spaByDate = new Map(spa.map((d) => [d.date, d.slots]));
  const TOUR_MIN = 60;
  const SPA_MIN = 90;
  const out: { date: string; pairs: { tour: Slot; spa: Slot }[] }[] = [];
  for (const day of tour) {
    const spaSlots = spaByDate.get(day.date) ?? [];
    const pairs: { tour: Slot; spa: Slot }[] = [];
    for (const t of day.slots) {
      if (t.remainingUnits < tourUnitsNeeded) continue;
      for (const s of spaSlots) {
        if (s.remainingUnits < spaUnitsNeeded) continue;
        const tStart = Date.parse(t.startsAt);
        const sStart = Date.parse(s.startsAt);
        const tourThenSpa = sStart - (tStart + TOUR_MIN * 60000);
        const spaThenTour = tStart - (sStart + SPA_MIN * 60000);
        if (tourThenSpa >= bufferMin * 60000 || spaThenTour >= bufferMin * 60000) {
          pairs.push({ tour: t, spa: s });
        }
      }
    }
    if (pairs.length) out.push({ date: day.date, pairs });
  }
  return out;
}
