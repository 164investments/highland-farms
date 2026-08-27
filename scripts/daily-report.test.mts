import assert from "node:assert/strict";
import test from "node:test";
import type { AcuityAppointment, AcuityOrder } from "../src/lib/acuity.ts";
import { assertCompleteOrders } from "../src/lib/acuity.ts";
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
  bookingCandidates?: AcuityAppointment[];
  orders?: AcuityOrder[];
} = {}) {
  return {
    now: new Date("2026-08-27T15:00:00Z"),
    active: overrides.active ?? [],
    canceled: overrides.canceled ?? [],
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
  assert.deepEqual(ranges.bookingWindow, {
    start: "2026-01-01",
    end: "2027-12-31",
  });
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
