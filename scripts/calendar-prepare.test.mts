import assert from "node:assert/strict";
import test from "node:test";
import { prepareCalendar, callStarts } from "./prepare-acuity-calendar.mts";

const ui = { observedOn: "2026-10-09", timezone: "America/Los_Angeles",
  tours: { regularWeekly: false, inspectedDateRange: { from: "2026-10-01", to: "2027-10-31" }, scheduleExceptions: [{ productSlug: "farm-tour", onDate: "2026-10-12", startTimes: ["10:00"], capacity: 2 }] },
  weddingCall: { calendarId: 12109481, durationMinutes: 45, paddingBeforeMinutes: 5, paddingAfterMinutes: 15,
    weeklyHours: { "0": null, "1": "09:30-19:00" }, inspectedOverrideRange: { from: "2026-10-01", to: "2026-10-31" }, dateOverrideHours: { "2026-10-12": null } }, gaps: ["Fixture requires review"] };
const api = { account_verified_by_calendar_ids: true, account: { timezone: "America/Los_Angeles", currency: "USD" },
  explicit_class_offerings: { count: 1, columns: ["appointmentTypeID", "calendarID", "calendarTimezone", "duration", "slots", "isSeries", "time"], offerings: [[85942611, 13047082, "America/Los_Angeles", 90, 6, false, "2026-10-12T12:00:00-0700"]] },
  authoritative_explicit_blocks: { count: 2, columns: ["id", "calendarID", "calendarTimezone", "start", "end", "recurring", "until"], rows: [
    [1, 7539520, "America/Los_Angeles", "2026-10-12T10:00:00-0700", "2026-10-12T11:00:00-0700", null, null],
    [2, 13047082, "America/Los_Angeles", "2026-10-12T12:00:00-0700", "2026-10-12T13:30:00-0700", null, null],
  ] },
  primary_wedding_call_interval_probes: [{ existing_occupancy_groups: 0, explicit_blocks_count: 0, times: ["09:30", "10:35", "11:40", "12:45", "13:50", "14:55", "16:00", "17:05"] }], limitations: [] };
test("prepare uses explicit tours/classes and ignores Acuity service blocks on group classes", () => {
  const prepared = prepareCalendar(ui, api, "2026-10-09", "2026-10-31");
  assert.equal(prepared.review.tourOpenDates, 1);
  assert.equal(prepared.review.spaOpenDates, 1);
  assert.equal(prepared.timedBlackouts.length, 1);
  assert.deepEqual(prepared.timedBlackouts[0].productSlugs, ["farm-tour"]);
  assert.match(prepared.sql, /Calendar is no longer empty/);
  assert.match(prepared.sql, /'wedding-call','2026-10-12',null,1/);
  assert.equal(prepared.review.nativeCalendarReady, false);
  assert.equal(prepared.availability.find((x) => x.product === "farm-tour")?.days.find((d) => d.date === "2026-10-12")?.slots.length, 0);
  assert.equal(prepared.availability.find((x) => x.product === "nordic-spa")?.days.find((d) => d.date === "2026-10-12")?.slots[0].remainingUnits, 6);
});
test("call translation matches verified65-minute starts, bounded ranges and closed dates", () => {
  assert.deepEqual(callStarts("09:30-12:00"), ["09:30", "10:35"]);
  assert.equal(callStarts(null), null);
  assert.throws(() => callStarts("24:00-25:00"));
  const prepared = prepareCalendar(ui, api, "2026-10-09", "2027-02-01");
  assert.equal(prepared.review.callOverridesComplete, false);
  assert.equal(prepared.schedules[0].effectiveTo, "2026-10-31");
});
test("incomplete or incompatible evidence fails before creating a seed", () => {
  assert.throws(() => prepareCalendar(ui, { ...api, explicit_class_offerings: { ...api.explicit_class_offerings, count: 2 } }, "2026-10-09", "2026-10-31"), /Incomplete/);
  assert.throws(() => prepareCalendar(ui, { ...api, primary_wedding_call_interval_probes: [] }, "2026-10-09", "2026-10-31"), /confirmed/);
  assert.throws(() => prepareCalendar({ ...ui, tours: { ...ui.tours, scheduleExceptions: [...ui.tours.scheduleExceptions, ...ui.tours.scheduleExceptions] } }, api, "2026-10-09", "2026-10-31"), /Duplicate/);
  assert.throws(() => prepareCalendar(ui, api, "2026-10-09", "2028-01-01"), /cover/);
});
