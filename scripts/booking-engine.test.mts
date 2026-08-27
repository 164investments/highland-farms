import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOOKING_PRODUCTS,
  getBookingProduct,
  unitsFor,
  COMBO,
} from "../src/lib/booking/products.ts";

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
