import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOOKING_PRODUCTS,
  getBookingProduct,
  unitsFor,
  COMBO,
} from "../src/lib/booking/products.ts";
import {
  slotToUtc,
  pacificDateStr,
  pacificTimeStr,
  pacificWeekday,
  addDays,
  eachDate,
} from "../src/lib/booking/time.ts";

test("products: tour is a private slot at $75/person, 2-6 guests", () => {
  const tour = BOOKING_PRODUCTS["farm-tour"];
  assert.equal(tour.kind, "private_slot");
  assert.equal(tour.pricePerPersonCents, 7500);
  assert.equal(tour.minParty, 2);
  assert.equal(tour.maxParty, 6);
  assert.equal(tour.durationMin, 60);
  assert.equal(unitsFor(tour, 4), 1); // a party takes the whole slot
});

test("products: spa is a shared class, seats are per person", () => {
  const spa = BOOKING_PRODUCTS["nordic-spa"];
  assert.equal(spa.kind, "class");
  assert.equal(spa.durationMin, 90);
  assert.equal(spa.minParty, 1);
  assert.equal(unitsFor(spa, 3), 3);
});

test("products: wedding call is free", () => {
  const call = BOOKING_PRODUCTS["wedding-call"];
  assert.equal(call.kind, "consult");
  assert.equal(call.pricePerPersonCents, 0);
  assert.equal(call.durationMin, 45);
});

test("products: unknown slug returns undefined; combo buffer is 30", () => {
  assert.equal(getBookingProduct("lodging"), undefined);
  assert.equal(COMBO.bufferMin, 30);
});

test("time: PDT slot converts at UTC-7", () => {
  // 2026-09-05 is PDT.
  assert.equal(slotToUtc("2026-09-05", "11:00").toISOString(), "2026-09-05T18:00:00.000Z");
});

test("time: PST slot converts at UTC-8", () => {
  // 2026-12-05 is PST.
  assert.equal(slotToUtc("2026-12-05", "11:00").toISOString(), "2026-12-05T19:00:00.000Z");
});

test("time: DST fall-back day still lands on the right wall clock", () => {
  // US DST ends 2026-11-01. 11:00 that morning is PST (UTC-8).
  const d = slotToUtc("2026-11-01", "11:00");
  assert.equal(pacificDateStr(d), "2026-11-01");
  assert.equal(pacificTimeStr(d), "11:00");
});

test("time: spring-forward day", () => {
  // US DST starts 2026-03-08; 11:00 is PDT (UTC-7).
  const d = slotToUtc("2026-03-08", "11:00");
  assert.equal(pacificTimeStr(d), "11:00");
  assert.equal(d.toISOString(), "2026-03-08T18:00:00.000Z");
});

test("time: weekday + date walking", () => {
  assert.equal(pacificWeekday("2026-09-05"), 6); // Saturday
  assert.equal(addDays("2026-08-30", 3), "2026-09-02");
  assert.deepEqual(eachDate("2026-08-30", "2026-09-01"), [
    "2026-08-30", "2026-08-31", "2026-09-01",
  ]);
});
