import assert from "node:assert/strict";
import test from "node:test";
import { fetchAllPages, fetchNativeAdditionsSafely } from "../src/lib/daily-report-fetch.ts";
import { buildDailyReport } from "../src/lib/daily-report.ts";

function appointment(id: number, overrides: Record<string, unknown> = {}) {
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

// ---- CRITICAL 1: native-additions reads must never take down the report ----

test("fetchNativeAdditionsSafely returns the fetcher's result on success", async () => {
  const rows = await fetchNativeAdditionsSafely("native bookings", async () => [1, 2, 3]);
  assert.deepEqual(rows, [1, 2, 3]);
});

test("fetchNativeAdditionsSafely degrades to [] and logs when the fetcher rejects", async () => {
  const originalError = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };
  try {
    const rows = await fetchNativeAdditionsSafely("native bookings", async () => {
      throw new Error("Supabase is down");
    });
    assert.deepEqual(rows, []);
  } finally {
    console.error = originalError;
  }
  assert.equal(logged.length, 1);
  assert.equal(logged[0][0], "[daily-report] native additions unavailable (native bookings):");
  assert.ok(logged[0][1] instanceof Error);
  assert.equal((logged[0][1] as Error).message, "Supabase is down");
});

test("wiring: a rejected native fetch still yields a sendable, byte-identical Mode A report body", async () => {
  const active = [appointment(2001, { amountPaid: "75.00", priceSold: "75.00" })];
  const baseline = buildDailyReport({
    now: new Date("2026-08-27T15:00:00Z"),
    active,
    canceled: [],
    yesterdayCandidates: active,
    pacingCandidates: active,
    scheduleCandidates: active,
    bookingCandidates: [],
    orders: [],
  });

  // Exactly what the route does: run both "native additions" reads through
  // the safety wrapper, with fetchers that reject (simulating a Supabase
  // outage), then feed the (degraded-to-empty) results into the same
  // buildDailyReport call the route makes.
  const nativeBookings = await fetchNativeAdditionsSafely("native bookings", async () => {
    throw new Error("relation \"bookings\" does not exist right now");
  });
  const nativeGiftCertValueCents = await fetchNativeAdditionsSafely("native gift certs", async () => {
    throw new Error("timeout");
  });

  const html = buildDailyReport({
    now: new Date("2026-08-27T15:00:00Z"),
    active,
    canceled: [],
    yesterdayCandidates: active,
    pacingCandidates: active,
    scheduleCandidates: active,
    bookingCandidates: [],
    orders: [],
    nativeBookings,
    nativeGiftCertValueCents,
  });

  assert.ok(html.length > 0, "the report must still render some content");
  assert.match(html, /Highland Farms/);
  assert.doesNotMatch(html, /Booked on the site \(native\)/);
  // The report the route would actually send is identical to the
  // Acuity-only baseline — a native-additions outage costs nothing but the
  // (never-promised) native line.
  assert.equal(html, baseline);
});

// ---- IMPORTANT 3: paged reads must never silently truncate ----

test("fetchAllPages accumulates every row across multiple full pages", async () => {
  const allRows = Array.from({ length: 2500 }, (_, i) => i);
  const requestedRanges: Array<[number, number]> = [];
  const rows = await fetchAllPages(1000, async (from, to) => {
    requestedRanges.push([from, to]);
    return allRows.slice(from, to + 1);
  });

  assert.deepEqual(rows, allRows);
  assert.deepEqual(requestedRanges, [
    [0, 999],
    [1000, 1999],
    [2000, 2999],
  ]);
});

test("fetchAllPages stops after exactly one page when the table is smaller than the page size", async () => {
  let calls = 0;
  const rows = await fetchAllPages(1000, async () => {
    calls += 1;
    return [1, 2, 3];
  });
  assert.deepEqual(rows, [1, 2, 3]);
  assert.equal(calls, 1);
});

test("fetchAllPages stops immediately on an empty table", async () => {
  const rows = await fetchAllPages(1000, async () => []);
  assert.deepEqual(rows, []);
});

test("fetchAllPages fetches one extra (empty) page when the table size is an exact multiple of the page size", async () => {
  // Regression case: if the table has exactly `pageSize` rows, the first
  // page comes back FULL (length === pageSize), which must not be
  // mistaken for "that was the last page" -- only a page SHORTER than
  // pageSize proves the end. A table of exactly 1000 rows with a page size
  // of 1000 needs a second, empty-page fetch to confirm there's nothing
  // left, same as `bookings` (IMPORTANT-1) and the archive table
  // (IMPORTANT-3) both now rely on in route.ts.
  const allRows = Array.from({ length: 1000 }, (_, i) => i);
  const requestedRanges: Array<[number, number]> = [];
  const rows = await fetchAllPages(1000, async (from, to) => {
    requestedRanges.push([from, to]);
    return allRows.slice(from, to + 1);
  });

  assert.deepEqual(rows, allRows);
  assert.deepEqual(requestedRanges, [
    [0, 999],
    [1000, 1999],
  ]);
});

test("fetchAllPages propagates a page fetch failure instead of swallowing it (this IS core/load-bearing data)", async () => {
  await assert.rejects(
    fetchAllPages(1000, async () => {
      throw new Error("acuity_archive_appointments fetch failed: boom");
    }),
    /boom/,
  );
});
