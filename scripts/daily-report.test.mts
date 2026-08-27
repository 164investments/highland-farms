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
  getDailyReportDateRanges,
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
