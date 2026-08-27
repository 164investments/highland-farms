import assert from "node:assert/strict";
import test from "node:test";
import type { AcuityAppointment, AcuityOrder } from "../src/lib/acuity.ts";
import {
  assertCompleteOrders,
  getAllAppointments,
  getAppointments,
} from "../src/lib/acuity.ts";
import {
  buildDailyReport,
  calculateDailyReport,
  calculateNativeAdditions,
  getDailyReportDateRanges,
  mapArchiveToAppointment,
  mapBookingToAppointment,
  mergeArchiveWithCurrent,
  resolveGiftCertValueCents,
  toPacificDateKey,
} from "../src/lib/daily-report.ts";

function appointment(
  id: number,
  overrides: Partial<AcuityAppointment> = {},
): AcuityAppointment {
  return {
    id,
    firstName: "Test",
    lastName: "Guest",
    email: "guest@example.com",
    phone: "",
    date: "August 26, 2026",
    time: "10:00am",
    datetime: "2026-08-26T10:00:00-0700",
    datetimeCreated: "2026-08-26T12:00:00-0500",
    price: "75.00",
    priceSold: "75.00",
    amountPaid: "75.00",
    paid: "yes",
    type: "Highland Farms Nordic Spa Experience",
    appointmentTypeID: 85942611,
    category: "",
    duration: "90",
    calendar: "Nordic Spa",
    calendarID: 13047082,
    canceled: false,
    forms: [],
    ...overrides,
  };
}

function reportData(overrides: {
  active?: AcuityAppointment[];
  canceled?: AcuityAppointment[];
  yesterdayCandidates?: AcuityAppointment[];
  pacingCandidates?: AcuityAppointment[];
  scheduleCandidates?: AcuityAppointment[];
  bookingCandidates?: AcuityAppointment[];
  orders?: AcuityOrder[];
} = {}) {
  return {
    now: new Date("2026-08-27T15:00:00Z"),
    active: overrides.active ?? [],
    canceled: overrides.canceled ?? [],
    yesterdayCandidates: overrides.yesterdayCandidates ?? overrides.active ?? [],
    pacingCandidates: overrides.pacingCandidates ?? overrides.active ?? [],
    scheduleCandidates: overrides.scheduleCandidates ?? overrides.active ?? [],
    bookingCandidates: overrides.bookingCandidates ?? [],
    orders: overrides.orders ?? [],
  };
}

test("normalizes Acuity creation timestamps to the Highland Farms Pacific day", () => {
  assert.equal(toPacificDateKey("2026-08-26T00:08:08-0500"), "2026-08-25");
  assert.equal(toPacificDateKey("2026-08-26T09:00:00-0500"), "2026-08-26");

  const latePacificOnAug25 = appointment(1, {
    datetimeCreated: "2026-08-26T00:08:08-0500",
  });
  const aug26Booking = appointment(2, {
    datetimeCreated: "2026-08-26T09:00:00-0500",
  });

  const metrics = calculateDailyReport(reportData({
    bookingCandidates: [latePacificOnAug25, aug26Booking],
  }));

  assert.deepEqual(metrics.newBookings.map((item) => item.id), [2]);
});

test("includes next-year and same-day-canceled records in new-booking coverage", () => {
  const nextYear = appointment(10, {
    datetime: "2027-02-01T09:30:00-0800",
    datetimeCreated: "2026-08-26T12:00:00-0500",
    type: "Highland Farms Wedding Call",
    amountPaid: "0.00",
    priceSold: "0.00",
  });
  const canceled = appointment(11, {
    datetimeCreated: "2026-08-26T13:00:00-0500",
    canceled: true,
  });

  const metrics = calculateDailyReport(reportData({
    bookingCandidates: [nextYear, canceled],
  }));

  assert.deepEqual(metrics.newBookings.map((item) => item.id), [10, 11]);
  assert.equal(metrics.newActiveBookingValue, 0);

  const ranges = getDailyReportDateRanges(new Date("2026-08-27T15:00:00Z"));
  assert.deepEqual(ranges.reportYear, { start: "2026-01-01", end: "2026-12-31" });
  assert.deepEqual(ranges.nextYear, { start: "2027-01-01", end: "2027-12-31" });
  assert.equal(ranges.fetchPriorMonthSeparately, false);
});

test("keeps December 31 appointments in the January 1 report without mixing years", () => {
  const december31 = appointment(12, {
    datetime: "2026-12-31T10:00:00-0800",
    datetimeCreated: "2026-12-31T09:00:00-0800",
    amountPaid: "150.00",
  });
  const now = new Date("2027-01-01T16:00:00Z");
  const ranges = getDailyReportDateRanges(now);
  const metrics = calculateDailyReport({
    ...reportData(),
    now,
    yesterdayCandidates: [december31],
    bookingCandidates: [december31],
  });

  assert.deepEqual(ranges.priorMonth, { start: "2026-12-01", end: "2026-12-31" });
  assert.equal(ranges.fetchPriorMonthSeparately, true);
  assert.deepEqual(metrics.yesterdayAppointments.map((item) => item.id), [12]);
  assert.deepEqual(metrics.newBookings.map((item) => item.id), [12]);
  assert.equal(metrics.yesterdayScheduledValue, 150);
  assert.equal(metrics.activeCount, 0);
});

test("keeps prior-December appointments available for January pacing", () => {
  const current = appointment(13, {
    datetime: "2027-01-05T10:00:00-0800",
    amountPaid: "100.00",
  });
  const previous = appointment(14, {
    datetime: "2026-12-05T10:00:00-0800",
    amountPaid: "200.00",
  });

  const metrics = calculateDailyReport({
    ...reportData({ active: [current] }),
    now: new Date("2027-01-10T16:00:00Z"),
    pacingCandidates: [current, previous],
  });

  assert.deepEqual(metrics.pacing, {
    currentValue: 100,
    previousValue: 200,
    percentage: -50,
    currentLabel: "Jan 1–9",
    previousLabel: "Dec 1–9",
  });
  assert.equal(metrics.activeCount, 1);
});

test("includes next-year appointments in the late-December seven-day schedule", () => {
  const january2 = appointment(15, {
    datetime: "2027-01-02T10:00:00-0800",
    amountPaid: "225.00",
  });
  const metrics = calculateDailyReport({
    ...reportData(),
    now: new Date("2026-12-29T16:00:00Z"),
    scheduleCandidates: [january2],
  });

  assert.deepEqual(metrics.next7.at(-1), {
    label: "Mon, Jan 4",
    count: 0,
    value: 0,
  });
  assert.deepEqual(metrics.next7[4], {
    label: "Sat, Jan 2",
    count: 1,
    value: 225,
  });
  assert.equal(metrics.activeCount, 0);
});

test("does not claim that active appointments were delivered", () => {
  const active = appointment(20);
  const html = buildDailyReport(reportData({ active: [active] }));

  assert.match(html, /SCHEDULED VALUE/);
  assert.match(html, /ACTIVE APPOINTMENTS/);
  assert.match(html, /Yesterday's Active Appointments/);
  assert.doesNotMatch(html, /DELIVERED/);
});

test("separates future appointment value from past service dates and removes YTD", () => {
  const past = appointment(30, { amountPaid: "150.00", priceSold: "150.00" });
  const future = appointment(31, {
    datetime: "2026-09-01T10:00:00-0700",
    amountPaid: "225.00",
    priceSold: "225.00",
  });

  const metrics = calculateDailyReport(reportData({ active: [past, future] }));
  const html = buildDailyReport(reportData({ active: [past, future] }));

  assert.equal(metrics.pastActiveValue, 150);
  assert.equal(metrics.futureActiveValue, 225);
  assert.match(html, /Future active appointments/);
  assert.match(html, /\$225/);
  assert.doesNotMatch(html, /YTD/);
  assert.doesNotMatch(html, /grand total/i);
});

test("calculates pacing through equal elapsed service-date periods", () => {
  const current = appointment(40, {
    datetime: "2026-08-10T10:00:00-0700",
    amountPaid: "100.00",
    priceSold: "100.00",
  });
  const currentFuture = appointment(41, {
    datetime: "2026-08-31T10:00:00-0700",
    amountPaid: "1000.00",
    priceSold: "1000.00",
  });
  const previous = appointment(42, {
    datetime: "2026-07-10T10:00:00-0700",
    amountPaid: "200.00",
    priceSold: "200.00",
  });

  const metrics = calculateDailyReport(reportData({
    active: [current, currentFuture, previous],
  }));

  assert.deepEqual(metrics.pacing, {
    currentValue: 100,
    previousValue: 200,
    percentage: -50,
    currentLabel: "Aug 1–26",
    previousLabel: "Jul 1–26",
  });
});

test("escapes Acuity and intake-form text before inserting it into email HTML", () => {
  const unsafe = appointment(50, {
    firstName: "<img src=x onerror=alert(1)>",
    lastName: "&Guest",
    type: "Tour <script>alert(1)</script>",
    forms: [{
      id: 1,
      name: "Referral",
      values: [{ name: "How did you hear about us?", value: "Friend <b>Bob</b>" }],
    }],
  });

  const html = buildDailyReport(reportData({
    active: [unsafe],
    bookingCandidates: [unsafe],
  }));

  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /Friend <b>Bob<\/b>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Friend &lt;b&gt;Bob&lt;\/b&gt;/);
});

test("fails loudly instead of silently truncating Acuity order totals", () => {
  assert.deepEqual(assertCompleteOrders([1, 2], 3), [1, 2]);
  assert.throws(
    () => assertCompleteOrders([1, 2, 3], 3),
    /refusing to send an incomplete order total/,
  );
});

test("fetches all Acuity appointment ranges with showall and de-duplicates IDs", async () => {
  const originalFetch = globalThis.fetch;
  const requested: URL[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requested.push(url);
    const month = url.searchParams.get("minDate");
    const rows = month === "2026-01-01"
      ? [appointment(101)]
      : [appointment(101), appointment(102)];
    return new Response(JSON.stringify(rows), { status: 200 });
  };

  try {
    const result = await getAllAppointments("2026-01-01", "2026-02-28");
    assert.deepEqual(result.map((item) => item.id), [101, 102]);
    assert.equal(requested.length, 2);
    assert.ok(requested.every((url) => url.searchParams.get("showall") === "true"));
    assert.ok(requested.every((url) => url.searchParams.get("max") === "500"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses Acuity's active and canceled filters without leaking showall", async () => {
  const originalFetch = globalThis.fetch;
  const requested: URL[] = [];
  globalThis.fetch = async (input) => {
    requested.push(new URL(String(input)));
    return new Response("[]", { status: 200 });
  };

  try {
    await getAppointments("2026-01-01", "2026-01-01");
    await getAppointments("2026-01-01", "2026-01-01", true);
    assert.equal(requested[0].searchParams.has("showall"), false);
    assert.equal(requested[0].searchParams.has("canceled"), false);
    assert.equal(requested[1].searchParams.has("showall"), false);
    assert.equal(requested[1].searchParams.get("canceled"), "true");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("splits a capped Acuity date range instead of silently truncating it", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    const minDate = url.searchParams.get("minDate")!;
    const maxDate = url.searchParams.get("maxDate")!;
    requested.push(`${minDate}:${maxDate}`);
    const rows = minDate === maxDate
      ? [appointment(minDate.endsWith("01") ? 201 : 202)]
      : Array.from({ length: 500 }, (_, index) => appointment(1_000 + index));
    return new Response(JSON.stringify(rows), { status: 200 });
  };

  try {
    const result = await getAllAppointments("2026-01-01", "2026-01-02");
    assert.deepEqual(result.map((item) => item.id), [201, 202]);
    assert.deepEqual(requested, [
      "2026-01-01:2026-01-02",
      "2026-01-01:2026-01-01",
      "2026-01-02:2026-01-02",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---- Task 5: dual-source daily report (native additions + Mode B) ----

test("native-additions summing counts and totals native bookings and gift certs", () => {
  const nativeBookings = [
    appointment(500, { amountPaid: "75.00", priceSold: "75.00" }),
    appointment(501, { amountPaid: "150.00", priceSold: "150.00" }),
  ];
  const additions = calculateNativeAdditions(nativeBookings, [15000, 19900]);

  assert.equal(additions.bookingCount, 2);
  assert.equal(additions.bookingValue, 225);
  assert.equal(additions.giftCount, 2);
  assert.equal(additions.giftValue, 349);
});

test("native-additions summing is zero for no native activity", () => {
  const additions = calculateNativeAdditions([], []);
  assert.deepEqual(additions, {
    bookingCount: 0,
    bookingValue: 0,
    giftCount: 0,
    giftValue: 0,
  });
});

test("resolves a value-kind gift certificate's cents directly from its units", () => {
  assert.equal(
    resolveGiftCertValueCents({ kind: "value", productScope: "farm-tour", units: 15000 }, []),
    15000,
  );
});

test("resolves a visits-kind gift certificate's cents from the product catalog", () => {
  const catalog = [
    { kind: "visits" as const, productScope: "nordic-spa", units: 3, amountCents: 19900 },
  ];
  assert.equal(
    resolveGiftCertValueCents({ kind: "visits", productScope: "nordic-spa", units: 3 }, catalog),
    19900,
  );
  assert.equal(
    resolveGiftCertValueCents({ kind: "visits", productScope: "nordic-spa", units: 9 }, catalog),
    0,
  );
});

test("mode-B math: maps an archive row's cents to Acuity-shaped dollar strings", () => {
  const mapped = mapArchiveToAppointment({
    id: 9001,
    datetime: "2026-08-10T10:00:00-0700",
    datetimeCreated: "2026-08-01T09:00:00-0700",
    firstName: "Archive",
    lastName: "Guest",
    amountPaidCents: 15000,
    priceCents: 15000,
    canceled: false,
    type: "Highland Farms Farm Tour",
  });

  assert.equal(mapped.id, 9001);
  assert.equal(mapped.amountPaid, "150.00");
  assert.equal(mapped.canceled, false);
  assert.equal(mapped.type, "Highland Farms Farm Tour");
});

test("mode-B math: an imported booking keeps its original Acuity id", () => {
  const mapped = mapBookingToAppointment({
    id: "11111111-1111-1111-1111-111111111111",
    acuityId: 9001,
    startsAt: "2026-08-10T10:00:00-0700",
    createdAt: "2026-08-01T09:00:00-0700",
    firstName: "Import",
    lastName: "Guest",
    amountCents: 15000,
    canceled: false,
    type: "Private Farm Tour",
  });
  assert.equal(mapped.id, 9001);
  assert.equal(mapped.amountPaid, "150.00");
});

test("mode-B math: a native booking (no acuity id) gets a stable synthetic id that never collides with a real Acuity id", () => {
  const row = {
    id: "22222222-2222-2222-2222-222222222222",
    acuityId: null,
    startsAt: "2026-08-11T10:00:00-0700",
    createdAt: "2026-08-01T09:00:00-0700",
    firstName: "Native",
    lastName: "Guest",
    amountCents: 15000,
    canceled: false,
    type: "Private Farm Tour",
  };
  const first = mapBookingToAppointment(row);
  const second = mapBookingToAppointment(row);
  assert.equal(first.id, second.id, "same input must yield the same synthetic id");
  assert.ok(first.id < 0, "a synthetic id must never look like a real (positive) Acuity id");

  const other = mapBookingToAppointment({ ...row, id: "33333333-3333-3333-3333-333333333333" });
  assert.notEqual(first.id, other.id, "different bookings must not collide");
});

test("mode-B math: a current booking supersedes the frozen archive row for the same Acuity appointment (dedupe is inherent, no double count)", () => {
  const archived = mapArchiveToAppointment({
    id: 9001,
    datetime: "2026-08-10T10:00:00-0700",
    datetimeCreated: "2026-08-01T09:00:00-0700",
    firstName: "Archive",
    lastName: "Guest",
    amountPaidCents: 15000,
    priceCents: 15000,
    canceled: false, // still active as of the frozen snapshot
    type: "Highland Farms Farm Tour",
  });
  const current = mapBookingToAppointment({
    id: "11111111-1111-1111-1111-111111111111",
    acuityId: 9001,
    startsAt: "2026-08-10T10:00:00-0700",
    createdAt: "2026-08-01T09:00:00-0700",
    firstName: "Import",
    lastName: "Guest",
    amountCents: 15000,
    canceled: true, // canceled AFTER the archive snapshot was taken
    type: "Private Farm Tour",
  });

  const merged = mergeArchiveWithCurrent([archived], [current]);
  assert.equal(merged.length, 1, "the same underlying appointment must not double count");
  assert.equal(merged[0].canceled, true, "the live bookings row wins over the frozen archive row");
});

// ---- CRITICAL 2 fix (post-review): a cancelled acuity_import row must
// supersede its archive twin, and active/canceled must both be derived
// from the SAME merged result — not from separately status-filtered raw
// arrays, which is exactly what let the same appointment get counted
// active (stale archive) AND canceled (bookings) at once. This test wires
// the pure functions the same way the route does after the fix.
//
// Re-review caught a second bug in the FIRST fix: filtering
// `currentForMerge` to acuity_import (any status) OR confirmed/completed
// dropped native rows with status cancelled/no_show entirely — before that
// fix they were at least counted once in `canceled`; the fix made them
// disappear from the report altogether (undercounting cancellations/volume
// the moment Mode B goes live). The route now excludes ONLY status='pending'
// — every other status, from either source, flows into the merge. ----

const bookingRowToAppointment = (row: {
  id: string;
  acuity_id: number | null;
  starts_at: string;
  created_at: string;
  first_name: string;
  last_name: string;
  amount_cents: number;
  status: string;
  product_slug: string;
}) =>
  mapBookingToAppointment({
    id: row.id,
    acuityId: row.acuity_id,
    startsAt: row.starts_at,
    createdAt: row.created_at,
    firstName: row.first_name,
    lastName: row.last_name,
    amountCents: row.amount_cents,
    canceled: row.status === "cancelled" || row.status === "no_show",
    type: row.product_slug,
  });

/** The fixed route's exact filter: every row except status='pending'. */
const currentForMergeFilter = (row: { status: string }) => row.status !== "pending";

test("mode-B route wiring: a cancelled import row supersedes its archive twin and is counted once, as cancelled (no double count)", () => {
  const archived = mapArchiveToAppointment({
    id: 9002,
    datetime: "2026-08-12T10:00:00-0700",
    datetimeCreated: "2026-08-02T09:00:00-0700",
    firstName: "Archive",
    lastName: "Guest",
    amountPaidCents: 15000,
    priceCents: 15000,
    canceled: false, // active as of the frozen snapshot
    type: "Highland Farms Farm Tour",
  });

  // Raw bookings rows exactly as `bookingsResult.data` would carry them —
  // includes a cancelled acuity_import row (the route's fix must feed this
  // into the merge regardless of status).
  const bookingRows = [
    {
      id: "22222222-2222-2222-2222-222222222222",
      acuity_id: 9002,
      starts_at: "2026-08-12T10:00:00-0700",
      created_at: "2026-08-02T09:00:00-0700",
      first_name: "Import",
      last_name: "Guest",
      amount_cents: 15000,
      status: "cancelled",
      product_slug: "farm-tour",
      source: "acuity_import",
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      acuity_id: null,
      starts_at: "2026-08-13T10:00:00-0700",
      created_at: "2026-08-03T09:00:00-0700",
      first_name: "Native",
      last_name: "Guest",
      amount_cents: 22000,
      status: "confirmed",
      product_slug: "nordic-spa",
      source: "native",
    },
    {
      // A still-pending native hold must NOT be counted at all.
      id: "44444444-4444-4444-4444-444444444444",
      acuity_id: null,
      starts_at: "2026-08-14T10:00:00-0700",
      created_at: "2026-08-04T09:00:00-0700",
      first_name: "Pending",
      last_name: "Guest",
      amount_cents: 7500,
      status: "pending",
      product_slug: "farm-tour",
      source: "native",
    },
  ];

  const currentForMerge = bookingRows.filter(currentForMergeFilter).map(bookingRowToAppointment);
  const merged = mergeArchiveWithCurrent([archived], currentForMerge);

  // Pending native row never entered currentForMerge, so it can't appear.
  assert.equal(merged.length, 2, "archive-superseded import row + the one confirmed native row");

  const active = merged.filter((a) => !a.canceled);
  const canceled = merged.filter((a) => a.canceled);
  const nativeAppointmentId = bookingRowToAppointment(bookingRows[1]).id;

  assert.equal(active.length, 1, "only the native confirmed booking is active");
  assert.equal(active[0].id, nativeAppointmentId, "the active entry is the confirmed native booking");
  assert.equal(canceled.length, 1, "the cancelled import supersedes its archive twin exactly once");
  assert.equal(canceled[0].id, 9002, "the cancelled row keeps the original Acuity id");

  // The archive's stale non-cancelled id must NOT also appear in active —
  // this is the exact double count the fix closes.
  assert.ok(
    !active.some((a) => a.id === 9002),
    "the same appointment must never appear as both active and cancelled",
  );
});

test("mode-B route wiring: a native cancelled/no_show row appears exactly once, in canceled, never in active — and a pending row appears nowhere", () => {
  const bookingRows = [
    {
      id: "55555555-5555-5555-5555-555555555555",
      acuity_id: null,
      starts_at: "2026-08-15T10:00:00-0700",
      created_at: "2026-08-05T09:00:00-0700",
      first_name: "Cancelled",
      last_name: "Native",
      amount_cents: 15000,
      status: "cancelled",
      product_slug: "farm-tour",
      source: "native",
    },
    {
      id: "66666666-6666-6666-6666-666666666666",
      acuity_id: null,
      starts_at: "2026-08-16T10:00:00-0700",
      created_at: "2026-08-06T09:00:00-0700",
      first_name: "NoShow",
      last_name: "Native",
      amount_cents: 22000,
      status: "no_show",
      product_slug: "nordic-spa",
      source: "native",
    },
    {
      id: "77777777-7777-7777-7777-777777777777",
      acuity_id: null,
      starts_at: "2026-08-17T10:00:00-0700",
      created_at: "2026-08-07T09:00:00-0700",
      first_name: "Pending",
      last_name: "Native",
      amount_cents: 7500,
      status: "pending",
      product_slug: "farm-tour",
      source: "native",
    },
  ];

  // No archive rows in play here — these native rows have no Acuity twin.
  const currentForMerge = bookingRows.filter(currentForMergeFilter).map(bookingRowToAppointment);
  const merged = mergeArchiveWithCurrent([], currentForMerge);

  assert.equal(merged.length, 2, "the pending row must not enter the merge at all");

  const active = merged.filter((a) => !a.canceled);
  const canceled = merged.filter((a) => a.canceled);
  const cancelledId = bookingRowToAppointment(bookingRows[0]).id;
  const noShowId = bookingRowToAppointment(bookingRows[1]).id;
  const pendingId = bookingRowToAppointment(bookingRows[2]).id;

  assert.equal(active.length, 0, "neither the cancelled nor the no_show native row is active");
  assert.equal(canceled.length, 2, "both the cancelled and no_show native rows land in canceled");
  assert.ok(canceled.some((a) => a.id === cancelledId), "the cancelled native row appears in canceled");
  assert.ok(canceled.some((a) => a.id === noShowId), "the no_show native row appears in canceled (same bucket as a cancellation)");
  assert.ok(!merged.some((a) => a.id === pendingId), "the pending row appears nowhere in the merged result");
});

test("zero native activity renders the daily report section-for-section identical to the single-source report", () => {
  const active = [appointment(600, { amountPaid: "75.00", priceSold: "75.00" })];
  const baseline = buildDailyReport(reportData({ active }));
  const withEmptyNativeFields = buildDailyReport({
    ...reportData({ active }),
    nativeBookings: [],
    nativeGiftCertValueCents: [],
  });

  assert.equal(withEmptyNativeFields, baseline);
  assert.doesNotMatch(baseline, /Booked on the site \(native\)/);
});

test("nonzero native activity adds its own labeled line without touching the Acuity numbers", () => {
  const active = [appointment(601, { amountPaid: "75.00", priceSold: "75.00" })];
  const baseline = buildDailyReport(reportData({ active }));
  const nativeBookings = [appointment(700, { amountPaid: "75.00", priceSold: "75.00" })];
  const withNative = buildDailyReport({
    ...reportData({ active }),
    nativeBookings,
    nativeGiftCertValueCents: [15000],
  });

  assert.match(withNative, /Booked on the site \(native\)/);
  assert.match(withNative, /NATIVE BOOKINGS/);
  assert.match(withNative, /NATIVE GIFT CERTS SOLD/);

  // The native section is one self-contained block. Cutting exactly that
  // block back out of the "with native" report must reproduce the baseline
  // (Acuity-only) report byte for byte — proof the addition is purely
  // additive and never rewrites an existing Acuity-derived number.
  const nativeBlockPattern =
    /<tr><td style='padding:28px 32px 0;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Booked on the site \(native\)<\/span>[\s\S]*?<\/table><\/td><\/tr>/;
  assert.match(withNative, nativeBlockPattern);
  assert.equal(withNative.replace(nativeBlockPattern, ""), baseline);
});

test("fails loudly when a single Acuity day reaches the appointment cap", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(
    Array.from({ length: 500 }, (_, index) => appointment(2_000 + index)),
  ), { status: 200 });

  try {
    await assert.rejects(
      getAllAppointments("2026-01-01", "2026-01-01"),
      /refusing to silently truncate the report/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
