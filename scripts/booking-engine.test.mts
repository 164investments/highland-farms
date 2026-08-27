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
import {
  computeAvailability,
  comboDays,
  slotCapacity,
  type ScheduleRule,
  type Blackout,
} from "../src/lib/booking/engine.ts";
import {
  renderBookingConfirmation,
  renderMeetLinkNeededBanner,
} from "../src/lib/booking/confirmation-email.ts";
import { buildIcs } from "../src/lib/booking/ics.ts";

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

const TOUR = BOOKING_PRODUCTS["farm-tour"];
const SPA = BOOKING_PRODUCTS["nordic-spa"];

// Sept 2026: 5th is a Saturday, 6th a Sunday, 7th a Monday.
const rules: ScheduleRule[] = [
  { productSlug: "farm-tour", weekday: 6, startTimes: ["10:00", "12:00", "14:00"], capacity: 1, effectiveFrom: "2026-01-01", effectiveTo: null },
  { productSlug: "nordic-spa", weekday: 6, startTimes: ["11:00", "13:00", "15:00"], capacity: 6, effectiveFrom: "2026-01-01", effectiveTo: null },
];
const NOW = new Date("2026-08-28T17:00:00Z"); // late Aug — horizon/lead time satisfied

test("engine: weekday rule yields slots only on that weekday", () => {
  const days = computeAvailability({
    product: TOUR, from: "2026-09-05", to: "2026-09-07",
    schedules: rules, exceptions: [], blackouts: [], booked: [], now: NOW,
  });
  const byDate = Object.fromEntries(days.map((d) => [d.date, d.slots.length]));
  assert.equal(byDate["2026-09-05"], 3); // Saturday
  assert.equal(byDate["2026-09-06"] ?? 0, 0);
  assert.equal(byDate["2026-09-07"] ?? 0, 0);
});

test("engine: a wedding blackout removes the whole day", () => {
  const blackout: Blackout = {
    kind: "wedding", startsOn: "2026-09-05", endsOn: "2026-09-05",
    productSlugs: ["farm-tour", "nordic-spa"],
  };
  const days = computeAvailability({
    product: TOUR, from: "2026-09-05", to: "2026-09-05",
    schedules: rules, exceptions: [], blackouts: [blackout], booked: [], now: NOW,
  });
  assert.equal(days[0].slots.length, 0);
});

test("engine: an exception closes a day; another adds a one-off session", () => {
  const days = computeAvailability({
    product: SPA, from: "2026-09-05", to: "2026-09-07",
    schedules: rules,
    exceptions: [
      { productSlug: "nordic-spa", onDate: "2026-09-05", startTimes: null, capacity: null },   // closed
      { productSlug: "nordic-spa", onDate: "2026-09-07", startTimes: ["17:00"], capacity: 4 }, // pop-up Monday
    ],
    blackouts: [], booked: [], now: NOW,
  });
  const byDate = Object.fromEntries(days.map((d) => [d.date, d.slots]));
  assert.equal(byDate["2026-09-05"].length, 0);
  assert.equal(byDate["2026-09-07"].length, 1);
  assert.equal(byDate["2026-09-07"][0].capacity, 4);
});

test("engine: booked units reduce remaining; full slots are still listed at 0", () => {
  const spa1100 = "2026-09-05T18:00:00.000Z"; // 11:00 PDT
  const days = computeAvailability({
    product: SPA, from: "2026-09-05", to: "2026-09-05",
    schedules: rules, exceptions: [], blackouts: [],
    booked: [
      { productSlug: "nordic-spa", startsAtIso: spa1100, units: 4 },
      { productSlug: "nordic-spa", startsAtIso: spa1100, units: 2 },
    ],
    now: NOW,
  });
  const s = days[0].slots.find((x) => x.time === "11:00")!;
  assert.equal(s.remainingUnits, 0);
  assert.equal(days[0].slots.find((x) => x.time === "13:00")!.remainingUnits, 6);
});

test("engine: lead time hides slots starting too soon", () => {
  const nearNow = new Date("2026-09-05T16:30:00Z"); // 09:30 PDT that Saturday
  const days = computeAvailability({
    product: TOUR, from: "2026-09-05", to: "2026-09-05",
    schedules: rules, exceptions: [], blackouts: [], booked: [], now: nearNow,
  });
  // 10:00 is 30 min out (< 120 lead) → hidden. 12:00 and 14:00 remain.
  assert.deepEqual(days[0].slots.map((s) => s.time), ["12:00", "14:00"]);
});

test("engine: slotCapacity is the checkout authority — null off-schedule", () => {
  const ok = slotCapacity({
    product: SPA, dateStr: "2026-09-05", time: "11:00",
    schedules: rules, exceptions: [], blackouts: [], now: NOW,
  });
  assert.equal(ok, 6);
  const off = slotCapacity({
    product: SPA, dateStr: "2026-09-05", time: "11:30",
    schedules: rules, exceptions: [], blackouts: [], now: NOW,
  });
  assert.equal(off, null);
});

test("engine: overlapping rules — latest effectiveFrom wins, order-independent", () => {
  const older: ScheduleRule = {
    productSlug: "farm-tour", weekday: 6, startTimes: ["10:00"], capacity: 1,
    effectiveFrom: "2026-01-01", effectiveTo: null,
  };
  const newer: ScheduleRule = {
    productSlug: "farm-tour", weekday: 6, startTimes: ["09:00", "11:00"], capacity: 2,
    effectiveFrom: "2026-09-01", effectiveTo: null,
  };

  for (const overlapping of [[older, newer], [newer, older]]) {
    const days = computeAvailability({
      product: TOUR, from: "2026-08-29", to: "2026-09-05",
      schedules: overlapping, exceptions: [], blackouts: [], booked: [], now: NOW,
    });
    const byDate = Object.fromEntries(days.map((d) => [d.date, d.slots]));
    // 2026-08-29 is before the newer rule's effectiveFrom → older rule applies.
    assert.deepEqual(byDate["2026-08-29"].map((s) => s.time), ["10:00"]);
    assert.equal(byDate["2026-08-29"][0].capacity, 1);
    // 2026-09-05 is on/after the newer rule's effectiveFrom → newer rule applies.
    assert.deepEqual(byDate["2026-09-05"].map((s) => s.time), ["09:00", "11:00"]);
    assert.equal(byDate["2026-09-05"][0].capacity, 2);
  }
});

test("engine: combo pairs respect the 30-min buffer in either order", () => {
  const tourDays = computeAvailability({
    product: TOUR, from: "2026-09-05", to: "2026-09-05",
    schedules: rules, exceptions: [], blackouts: [], booked: [], now: NOW,
  });
  const spaDays = computeAvailability({
    product: SPA, from: "2026-09-05", to: "2026-09-05",
    schedules: rules, exceptions: [], blackouts: [], booked: [], now: NOW,
  });
  const combos = comboDays(tourDays, spaDays, {
    tourUnitsNeeded: 1,
    spaUnitsNeeded: 2,
    bufferMin: 30,
    tourDurationMin: BOOKING_PRODUCTS["farm-tour"].durationMin,
    spaDurationMin: BOOKING_PRODUCTS["nordic-spa"].durationMin,
  });
  assert.equal(combos.length, 1);
  const pairs = combos[0].pairs.map((p) => `${p.tour.time}+${p.spa.time}`);
  // Tour 10:00-11:00 → spa 13:00/15:00 OK (11:00 violates buffer: gap 0).
  assert.ok(pairs.includes("10:00+13:00"));
  assert.ok(!pairs.includes("10:00+11:00"));
  // Spa-first also allowed: spa 11:00-12:30 → tour 14:00 (gap 90) OK, 12:00 (overlap) not.
  assert.ok(pairs.includes("14:00+11:00"));
  assert.ok(!pairs.includes("12:00+11:00"));
});

test("engine: comboDays derives overlap from the provided durations", () => {
  const tourDays = [{ date: "2026-09-05", slots: [
    { startsAt: "2026-09-05T17:00:00.000Z", time: "10:00", capacity: 1, remainingUnits: 1 },
  ]}];
  const spaDays = [{ date: "2026-09-05", slots: [
    { startsAt: "2026-09-05T18:30:00.000Z", time: "11:30", capacity: 6, remainingUnits: 6 },
  ]}];
  // Tour 10:00 + 60min ends 11:00; spa 11:30 → gap 30 = OK at bufferMin 30.
  assert.equal(comboDays(tourDays, spaDays, {
    tourUnitsNeeded: 1, spaUnitsNeeded: 1, bufferMin: 30,
    tourDurationMin: 60, spaDurationMin: 90,
  })[0]?.pairs.length ?? 0, 1);
  // With a 90-min tour the same pair overlaps and disappears.
  assert.equal(comboDays(tourDays, spaDays, {
    tourUnitsNeeded: 1, spaUnitsNeeded: 1, bufferMin: 30,
    tourDurationMin: 90, spaDurationMin: 90,
  }).length, 0);
});

test("email: confirmation carries the strict policy and the weather promise", () => {
  const html = renderBookingConfirmation({
    bookingNumber: "HFB-260905-1234",
    product: "farm-tour",
    legs: [{ productSlug: "farm-tour", startsAt: "2026-09-05T17:00:00.000Z", durationMin: 60 }],
    partySize: 2,
    customerName: "Ada Lovelace",
    customerEmail: "ada@example.com",
    customerPhone: "555-0100",
    totalCents: 15000,
    giftAppliedCents: 0,
    paidCents: 15000,
    locationChoice: null,
  });
  assert.match(html, /HFB-260905-1234/);
  assert.match(html, /all bookings are final/i);
  assert.match(html, /weather or animal|guest safety/i);
  assert.match(html, /Saturday, September 5/);
  assert.match(html, /10:00 AM/);          // Pacific wall clock, not UTC
  assert.match(html, /\$150\.00/);
  assert.doesNotMatch(html, /reschedul/i); // never promise what the policy denies
});

test("email: gift line renders only when a gift was applied", () => {
  const base = {
    bookingNumber: "HFB-260905-5678",
    product: "nordic-spa" as const,
    legs: [{ productSlug: "nordic-spa", startsAt: "2026-09-05T18:00:00.000Z", durationMin: 90 }],
    partySize: 2,
    customerName: "A", customerEmail: "a@b.c", customerPhone: "5550100",
    totalCents: 15000, giftAppliedCents: 0, paidCents: 15000, locationChoice: null,
  };
  assert.doesNotMatch(renderBookingConfirmation(base), /gift/i);
  assert.match(
    renderBookingConfirmation({ ...base, giftAppliedCents: 5000, paidCents: 10000 }),
    /Gift certificate.*\$50\.00/s,
  );
});

test("ics: DTSTART/DTEND are correct UTC for a known instant", () => {
  const ics = buildIcs({
    uid: "HFB-260905-1234",
    startIso: "2026-09-05T17:00:00.000Z",
    durationMin: 45,
    summary: "Wedding Call: Ada Lovelace + Highland Farms",
    description: "Booking HFB-260905-1234",
    location: "Google Meet",
  });
  assert.match(ics, /DTSTART:20260905T170000Z/);
  assert.match(ics, /DTEND:20260905T174500Z/);
});

test("ics: uses CRLF line endings throughout", () => {
  const ics = buildIcs({
    uid: "HFB-260905-1234",
    startIso: "2026-09-05T17:00:00.000Z",
    durationMin: 45,
    summary: "Wedding Call",
    description: "Booking HFB-260905-1234",
    location: "Google Meet",
  });
  assert.ok(ics.includes("\r\n"));
  assert.ok(!ics.replace(/\r\n/g, "").includes("\n"), "no bare LF outside CRLF pairs");
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
});

test("ics: escapes a comma in the description (and other RFC5545 special chars)", () => {
  const ics = buildIcs({
    uid: "HFB-260905-1234",
    startIso: "2026-09-05T17:00:00.000Z",
    durationMin: 45,
    summary: "Wedding Call",
    description: "Ada + Sam, at the barn; call Hayden\\Jalene for details",
    location: "Google Meet",
  });
  assert.match(ics, /DESCRIPTION:Ada \+ Sam\\, at the barn\\; call Hayden\\\\Jalene for details/);
});

test("email: consult with a Meet link renders the join line, not the promise", () => {
  const base = {
    bookingNumber: "HFB-260830-1111",
    product: "wedding-call" as const,
    legs: [{ productSlug: "wedding-call", startsAt: "2026-08-30T21:00:00.000Z", durationMin: 45 }],
    partySize: 1,
    customerName: "Ada Lovelace", customerEmail: "ada@example.com", customerPhone: "5550100",
    totalCents: 0, giftAppliedCents: 0, paidCents: 0,
    locationChoice: "meet" as const,
  };
  const withLink = renderBookingConfirmation({ ...base, meetLink: "https://meet.google.com/abc-defg-hij" });
  assert.match(withLink, /Join on Google Meet/);
  assert.match(withLink, /meet\.google\.com\/abc-defg-hij/);
  assert.doesNotMatch(withLink, /we'll email your google meet link/i);
});

test("email: consult that chose Meet but has no link yet promises to send it", () => {
  const html = renderBookingConfirmation({
    bookingNumber: "HFB-260830-2222",
    product: "wedding-call",
    legs: [{ productSlug: "wedding-call", startsAt: "2026-08-30T21:00:00.000Z", durationMin: 45 }],
    partySize: 1,
    customerName: "Ada Lovelace", customerEmail: "ada@example.com", customerPhone: "5550100",
    totalCents: 0, giftAppliedCents: 0, paidCents: 0,
    locationChoice: "meet", meetLink: null,
  });
  assert.match(html, /We'll email your Google Meet link before the call\./);
  assert.doesNotMatch(html, /—/); // no em dashes in rendered copy
});

test("email: an in-person consult never shows the Meet fallback line", () => {
  const html = renderBookingConfirmation({
    bookingNumber: "HFB-260830-3333",
    product: "wedding-call",
    legs: [{ productSlug: "wedding-call", startsAt: "2026-08-30T21:00:00.000Z", durationMin: 45 }],
    partySize: 1,
    customerName: "Ada Lovelace", customerEmail: "ada@example.com", customerPhone: "5550100",
    totalCents: 0, giftAppliedCents: 0, paidCents: 0,
    locationChoice: "in_person", meetLink: null,
  });
  assert.doesNotMatch(html, /google meet/i);
});

test("email: farm notification flags MEET LINK NEEDED only for a failed/unconfigured Meet consult", () => {
  const base = {
    bookingNumber: "HFB-260830-4444",
    product: "wedding-call" as const,
    legs: [{ productSlug: "wedding-call", startsAt: "2026-08-30T21:00:00.000Z", durationMin: 45 }],
    partySize: 1,
    customerName: "Ada Lovelace", customerEmail: "ada@example.com", customerPhone: "5550100",
    totalCents: 0, giftAppliedCents: 0, paidCents: 0,
  };
  assert.match(
    renderMeetLinkNeededBanner({ ...base, locationChoice: "meet", meetLink: null }),
    /MEET LINK NEEDED/,
  );
  assert.equal(
    renderMeetLinkNeededBanner({ ...base, locationChoice: "meet", meetLink: "https://meet.google.com/x" }),
    "",
  );
  assert.equal(
    renderMeetLinkNeededBanner({ ...base, locationChoice: "in_person", meetLink: null }),
    "",
  );
  assert.equal(
    renderMeetLinkNeededBanner({ ...base, product: "farm-tour", locationChoice: null, meetLink: null }),
    "",
  );
});

test("ics: UID is namespaced to highlandfarmsoregon.com", () => {
  const ics = buildIcs({
    uid: "HFB-260905-1234",
    startIso: "2026-09-05T17:00:00.000Z",
    durationMin: 45,
    summary: "Wedding Call",
    description: "Booking HFB-260905-1234",
    location: "Google Meet",
  });
  assert.match(ics, /UID:HFB-260905-1234@highlandfarmsoregon\.com\r\n/);
});
