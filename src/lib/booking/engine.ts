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
import { slotToUtc, pacificWeekday, pacificDateStr, eachDate } from "./time.ts";

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
  startsOn?: string;
  endsOn?: string;
  /** Timed blocks use half-open intervals, including the booking's buffers. */
  startsAt?: string;
  endsAt?: string;
  productSlugs: string[];
}

export interface BookedUnits {
  productSlug: string;
  startsAtIso: string;
  units: number;
  durationMin?: number;
  paddingBeforeMin?: number;
  paddingAfterMin?: number;
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
      !b.startsAt && !b.endsAt &&
      b.startsOn !== undefined && b.endsOn !== undefined &&
      dateStr >= b.startsOn &&
      dateStr <= b.endsOn,
  );
}

function slotInterval(product: BookingProduct, start: number): [number, number] {
  return [start - (product.paddingBeforeMin ?? 0) * 60000,
    start + (product.durationMin + (product.paddingAfterMin ?? 0)) * 60000];
}

function timedBlockApplies(product: BookingProduct, start: number, blackouts: Blackout[]): boolean {
  const [from, to] = slotInterval(product, start);
  return blackouts.some(b => b.productSlugs.includes(product.slug) && b.startsAt && b.endsAt
    && Date.parse(b.startsAt) < to && Date.parse(b.endsAt) > from);
}

/** Peak concurrent units, not the sum of every appointment that intersects a
 * long slot: consecutive existing bookings do not consume capacity together. */
function overlappingUnits(product: BookingProduct, start: number, booked: BookedUnits[]): number {
  // Acuity classes are independent explicit offerings, even if their durations
  // overlap. Seats belong to their exact class start, not a pooled resource.
  if (product.kind === "class") return booked.filter(b => b.productSlug === product.slug
    && Date.parse(b.startsAtIso) === start).reduce((sum, b) => sum + b.units, 0);
  const [from, to] = slotInterval(product, start);
  const events = new Map<number, number>();
  for (const b of booked) {
    if (b.productSlug !== product.slug) continue;
    const bookedStart = Date.parse(b.startsAtIso);
    const left = Math.max(from, bookedStart - (b.paddingBeforeMin ?? product.paddingBeforeMin ?? 0) * 60000);
    const right = Math.min(to, bookedStart + ((b.durationMin ?? product.durationMin)
      + (b.paddingAfterMin ?? product.paddingAfterMin ?? 0)) * 60000);
    if (left >= right) continue;
    events.set(left, (events.get(left) ?? 0) + b.units);
    events.set(right, (events.get(right) ?? 0) - b.units);
  }
  let active = 0, peak = 0;
  for (const [, delta] of [...events].sort((a, b) => a[0] - b[0])) {
    active += delta; peak = Math.max(peak, active);
  }
  return peak;
}

function remainingDaily(product: BookingProduct, date: string, booked: BookedUnits[]): number {
  if (product.maxDailyAppointments === undefined) return Infinity;
  const used = booked.filter(b => b.productSlug === product.slug
    && pacificDateStr(new Date(b.startsAtIso)) === date).reduce((sum, b) => sum + b.units, 0);
  return Math.max(0, product.maxDailyAppointments - used);
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
  const earliest = new Date(now.getTime() + product.leadTimeMin * 60000);
  const latest = new Date(now.getTime() + product.horizonDays * 86400000);

  return eachDate(opts.from, opts.to).map((date) => {
    const plan = dayPlan(product.slug, date, schedules, exceptions, blackouts);
    if (!plan) return { date, slots: [] };
    const slots: Slot[] = [];
    for (const time of [...plan.times].sort()) {
      const startsAt = slotToUtc(date, time);
      if (startsAt < earliest || startsAt > latest || timedBlockApplies(product, startsAt.getTime(), blackouts)) continue;
      const used = overlappingUnits(product, startsAt.getTime(), booked);
      slots.push({
        startsAt: startsAt.toISOString(),
        time,
        capacity: plan.capacity,
        remainingUnits: Math.max(0, Math.min(plan.capacity - used, remainingDaily(product, date, booked))),
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
  booked?: BookedUnits[];
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
  if (timedBlockApplies(opts.product, startsAt.getTime(), opts.blackouts)) return null;
  if (remainingDaily(opts.product, opts.dateStr, opts.booked ?? []) === 0) return null;
  return plan.capacity;
}

/** Days where a tour and a spa session can both be booked ≥ bufferMin apart, either order. */
export function comboDays(
  tour: DayAvailability[],
  spa: DayAvailability[],
  opts: {
    tourUnitsNeeded: number;
    spaUnitsNeeded: number;
    bufferMin: number;
    tourDurationMin: number;
    spaDurationMin: number;
  },
): { date: string; pairs: { tour: Slot; spa: Slot }[] }[] {
  const { tourUnitsNeeded, spaUnitsNeeded, bufferMin, tourDurationMin, spaDurationMin } = opts;
  const spaByDate = new Map(spa.map((d) => [d.date, d.slots]));
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
        const tourThenSpa = sStart - (tStart + tourDurationMin * 60000);
        const spaThenTour = tStart - (sStart + spaDurationMin * 60000);
        if (tourThenSpa >= bufferMin * 60000 || spaThenTour >= bufferMin * 60000) {
          pairs.push({ tour: t, spa: s });
        }
      }
    }
    if (pairs.length) out.push({ date: day.date, pairs });
  }
  return out;
}
