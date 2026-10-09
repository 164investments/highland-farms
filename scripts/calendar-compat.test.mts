import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BOOKING_PRODUCTS, type BookingProduct } from "../src/lib/booking/products.ts";
import { computeAvailability, slotCapacity, type BookedUnits, type Blackout, type ScheduleRule } from "../src/lib/booking/engine.ts";
import { slotToUtc } from "../src/lib/booking/time.ts";
import type { AcuityAppointment } from "../src/lib/acuity.ts";

const root = new URL("../", import.meta.url);
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(new URL(`src/${specifier.slice(2)}.ts`, root).href, context);
  try { return nextResolve(specifier, context); } catch (error) {
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
    }
    throw error;
  }
} });
process.env.ACUITY_USER_ID = "test-only";
process.env.ACUITY_API_KEY = "test-only";
globalThis.fetch = async () => { throw new Error("Pure calendar compatibility tests must not make network requests"); };
const { mapAcuityAppointment } = await import("../src/lib/booking/acuity-import.ts");

const date = "2026-09-05"; // Saturday, America/Los_Angeles.
const now = new Date("2026-08-28T17:00:00Z");
const iso = (time: string) => slotToUtc(date, time).toISOString();
function rule(product: BookingProduct, times: string[], capacity = 1): ScheduleRule {
  return { productSlug: product.slug, weekday: 6, startTimes: times, capacity, effectiveFrom: "2026-01-01", effectiveTo: null };
}
function slots(product: BookingProduct, times: string[], booked: BookedUnits[] = [], blackouts: Blackout[] = [], capacity = 1) {
  return computeAvailability({ product, from: date, to: date, schedules: [rule(product, times, capacity)], exceptions: [], blackouts, booked, now })[0].slots;
}

test("verified tour/spa lead times and horizons, tour daily cap and wedding buffers are explicit", () => {
  assert.equal(BOOKING_PRODUCTS["farm-tour"].leadTimeMin, 720);
  assert.equal(BOOKING_PRODUCTS["farm-tour"].horizonDays, 365);
  assert.equal(BOOKING_PRODUCTS["farm-tour"].maxDailyAppointments, 6);
  assert.equal(BOOKING_PRODUCTS["nordic-spa"].leadTimeMin, 120);
  assert.equal(BOOKING_PRODUCTS["nordic-spa"].horizonDays, 365);
  assert.equal(BOOKING_PRODUCTS["wedding-call"].paddingBeforeMin, 5);
  assert.equal(BOOKING_PRODUCTS["wedding-call"].paddingAfterMin, 15);
  assert.equal(BOOKING_PRODUCTS["wedding-call"].leadTimeMin, 720);
  assert.equal(BOOKING_PRODUCTS["wedding-call"].horizonDays, 365);
});

test("timed blackout removes intersecting tour intervals while leaving the rest of the day open", () => {
  const tour = BOOKING_PRODUCTS["farm-tour"];
  const blackout: Blackout = { kind: "closure", startsAt: iso("10:30"), endsAt: iso("11:15"), productSlugs: [tour.slug] };
  assert.deepEqual(slots(tour, ["10:00", "11:00", "12:00"], [], [blackout]).map(s => s.time), ["12:00"]);
  const opts = { product: tour, dateStr: date, schedules: [rule(tour, ["10:00", "12:00"])], exceptions: [], blackouts: [blackout], now };
  assert.equal(slotCapacity({ ...opts, time: "10:00" }), null);
  assert.equal(slotCapacity({ ...opts, time: "12:00" }), 1);
});

test("all-day blackout remains compatible, and timed closures only affect their named product", () => {
  const tour = BOOKING_PRODUCTS["farm-tour"];
  assert.equal(slots(tour, ["10:00"], [], [{ kind: "wedding", startsOn: date, endsOn: date, productSlugs: [tour.slug] }]).length, 0);
  assert.equal(slots(tour, ["10:00"], [], [{ kind: "closure", startsAt: iso("09:00"), endsAt: iso("12:00"), productSlugs: ["nordic-spa"] }]).length, 1);
});

test("wedding booking buffers prevent adjacent overlap and permit an exact half-open boundary", () => {
  const call = BOOKING_PRODUCTS["wedding-call"];
  const booked: BookedUnits[] = [{ productSlug: call.slug, startsAtIso: iso("10:00"), units: 1, durationMin: 45, paddingBeforeMin: 5, paddingAfterMin: 15 }];
  assert.deepEqual(slots(call, ["11:00", "11:05", "12:00"], booked).map(s => [s.time, s.remainingUnits]), [["11:00", 0], ["11:05", 1], ["12:00", 1]]);
  const blackout: Blackout = { kind: "closure", startsAt: iso("10:45"), endsAt: iso("11:00"), productSlugs: [call.slug] };
  assert.deepEqual(slots(call, ["11:00", "11:05"], [], [blackout]).map(s => s.time), ["11:05"]);
});

test("tour daily maximum counts appointments on Pacific date, independently of slot capacity", () => {
  const tour = BOOKING_PRODUCTS["farm-tour"];
  const booked: BookedUnits[] = ["06:00", "07:00", "08:00", "09:00", "18:00", "20:00"]
    .map(time => ({ productSlug: tour.slug, startsAtIso: iso(time), units: 1, durationMin: 60 }));
  // 20:00 Pacific is the next UTC date; it still consumes today's daily cap.
  assert.equal(booked[5].startsAtIso.slice(0, 10), "2026-09-06");
  assert.equal(slots(tour, ["12:00"], booked)[0].remainingUnits, 0);
  assert.equal(slotCapacity({ product: tour, dateStr: date, time: "12:00", schedules: [rule(tour, ["12:00"])], exceptions: [], blackouts: [], booked, now }), null);
  assert.equal(slots(tour, ["12:00"], booked.slice(0, 5))[0].remainingUnits, 1);
  assert.equal(slots(tour, ["12:00"], [{ ...booked[0], units: 6 }])[0].remainingUnits, 0);
});

test("overlap capacity uses peak concurrency instead of adding consecutive bookings together", () => {
  const tour = { ...BOOKING_PRODUCTS["farm-tour"], durationMin: 90, maxDailyAppointments: undefined };
  const booked: BookedUnits[] = [
    { productSlug: tour.slug, startsAtIso: iso("10:00"), units: 1, durationMin: 30 },
    { productSlug: tour.slug, startsAtIso: iso("11:00"), units: 1, durationMin: 30 },
  ];
  assert.equal(slots(tour, ["10:00"], booked, [], 2)[0].remainingUnits, 1);
});

test("separate overlapping spa class starts retain independent seat inventory", () => {
  const spa = BOOKING_PRODUCTS["nordic-spa"];
  const booked: BookedUnits[] = [{ productSlug: spa.slug, startsAtIso: iso("10:00"), units: 6, durationMin: 90 }];
  assert.deepEqual(slots(spa, ["10:00", "10:30"], booked, [], 6).map(s => [s.time, s.remainingUnits]), [["10:00", 0], ["10:30", 6]]);
});

test("actual imported duration protects a long finalization meeting from a later wedding call", () => {
  const call = BOOKING_PRODUCTS["wedding-call"];
  const booked: BookedUnits[] = [{ productSlug: call.slug, startsAtIso: iso("10:00"), units: 1, durationMin: 60, paddingBeforeMin: 0, paddingAfterMin: 0 }];
  assert.equal(slots(call, ["10:50"], booked)[0].remainingUnits, 0);
  assert.equal(slots(call, ["11:05"], booked)[0].remainingUnits, 1);
});

function appointment(type: number, duration: string): AcuityAppointment {
  return { id: 1, appointmentTypeID: type, calendarID: 13899411, datetime: iso("10:00"), duration, amountPaid: "0", forms: [], firstName: "Fixture", lastName: "Guest", email: "fixture@example.invalid", phone: "5035550000" } as AcuityAppointment;
}
test("Acuity mapping preserves finalization's actual 60-minute duration and type-specific padding", () => {
  const finalization = mapAcuityAppointment(appointment(91550850, "60"));
  assert.equal(finalization?.durationMin, 60);
  assert.equal(finalization?.paddingBeforeMin, 0); assert.equal(finalization?.paddingAfterMin, 0);
  const call = mapAcuityAppointment(appointment(78277096, "45"));
  assert.equal(call?.durationMin, 45);
  assert.equal(call?.paddingBeforeMin, 5); assert.equal(call?.paddingAfterMin, 15);
  assert.equal(mapAcuityAppointment(appointment(78277096, "75"))?.durationMin, 75);
  assert.equal(mapAcuityAppointment(appointment(78277096, "invalid"))?.durationMin, 45);
});
