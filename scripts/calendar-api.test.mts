import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "next/server" || specifier === "next/headers") return nextResolve(`${specifier}.js`, context);
  if (specifier.startsWith("@/")) return nextResolve(new URL(`src/${specifier.slice(2)}.ts`, root).href, context);
  try { return nextResolve(specifier, context); } catch (error) {
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
    }
    throw error;
  }
} });
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://calendar-fixture.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-placeholder";
process.env.SHOP_ADMIN_TOKEN = "full-admin-fixture";
process.env.BOOKING_CALENDAR_API_TOKEN = "calendar-only-fixture";
const exceptions = await import("../src/app/api/shop/admin/booking/exceptions/route.ts");
const calendar = await import("../src/app/api/shop/admin/booking/calendar/route.ts");
const schedules = await import("../src/app/api/shop/admin/booking/schedules/route.ts");
const timed = await import("../src/app/api/shop/admin/booking/timed-blackouts/route.ts");
const cancel = await import("../src/app/api/shop/admin/booking/cancel/route.ts");
const { dateScheduleSchema } = await import("../src/lib/booking/calendar-schema.ts");
let calls: { url: URL; method: string; body: unknown }[] = [];
let manyBookings = false;
const rule = { id: 1, product_slug: "farm-tour", weekday: 1, start_times: ["10:00"], capacity: 2, effective_from: "2026-10-09", effective_to: null };
const block = { id: 2, kind: "wedding", starts_on: "2026-10-20", ends_on: "2026-10-20", product_slugs: ["farm-tour", "nordic-spa"], note: "Private customer information" };
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.origin, "https://calendar-fixture.invalid", "All network calls must stay mocked");
  const method = init?.method ?? "GET";
  calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : null });
  const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  if (url.pathname.endsWith("/booking_audit")) return new Response(null, { status: 201 });
  if (url.pathname.endsWith("/booking_schedules")) return json(method === "POST" ? rule : [rule]);
  if (url.pathname.endsWith("/booking_schedule_exceptions")) return method === "POST" ? new Response(null, { status: 201 }) : json(method === "DELETE" ? [{ id: 1 }] : [{ product_slug: "farm-tour", on_date: "2026-10-15", start_times: null, capacity: null }]);
  if (url.pathname.endsWith("/booking_blackouts")) return json([block]);
  if (url.pathname.endsWith("/booking_timed_blackouts")) return json(method === "POST" ? {
    id: 4, kind: "closure", starts_at: "2026-10-15T17:00:00Z", ends_at: "2026-10-15T18:00:00Z", product_slugs: ["farm-tour"], note: null,
  } : method === "DELETE" ? [{ id: 4 }] : []);
  if (url.pathname.endsWith("/bookings")) {
    const row = { product_slug: "farm-tour", starts_at: "2026-10-16T17:00:00Z", units: 1, status: "pending", hold_expires_at: "infinity", email: "private@example.invalid" };
    return json(manyBookings && Number(url.searchParams.get("offset") ?? 0) === 0 ? Array.from({ length: 1000 }, () => row) : [row]);
  }
  throw new Error(`Unexpected database operation: ${method} ${url.pathname}`);
};
const request = (path: string, method = "GET", body?: unknown, token = "calendar-only-fixture") => new Request(`https://highlandfarmsoregon.com/api/shop/admin/booking/${path}`, {
  method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
});
const date = { productSlug: "farm-tour", onDate: "2026-10-15", startTimes: ["14:00", "10:00", "10:00"], capacity: 2 };

test("dedicated token reads aggregate calendar without customer data or blackout notes", async () => {
  calls = [];
  const response = await calendar.GET(request("calendar?from=2026-10-09&to=2026-10-31"));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.timezone, "America/Los_Angeles");
  assert.deepEqual(data.booked, [{ productSlug: "farm-tour", startsAtIso: "2026-10-16T17:00:00Z", units: 1 }]);
  assert.equal(data.blackouts[0].id, 2);
  assert.doesNotMatch(JSON.stringify(data), /private|customer|email|phone/i);
});
test("calendar paging retains rows beyond 1000 and infinity processing holds", async () => {
  manyBookings = true; calls = [];
  try {
    const response = await calendar.GET(request("calendar?from=2026-10-09&to=2026-10-31"));
    assert.equal((await response.json()).booked[0].units, 1001);
    assert.equal(calls.filter((c) => c.url.pathname.endsWith("/bookings")).length, 2);
  } finally { manyBookings = false; }
});
test("date override upserts normalized times under unique product/date and writes audit", async () => {
  calls = [];
  assert.equal((await exceptions.POST(request("exceptions", "POST", date))).status, 200);
  const write = calls.find((c) => c.method === "POST" && c.url.pathname.endsWith("/booking_schedule_exceptions"))!;
  assert.deepEqual(write.body, { product_slug: "farm-tour", on_date: "2026-10-15", start_times: ["10:00", "14:00"], capacity: 2 });
  assert.equal(write.url.searchParams.get("on_conflict"), "product_slug,on_date");
  assert.ok(calls.some((c) => c.url.pathname.endsWith("/booking_audit")));
  assert.equal((await exceptions.DELETE(request("exceptions", "DELETE", { productSlug: "farm-tour", onDate: date.onDate }))).status, 200);
});
test("invalid dates, times, unknown keys and missing open-date capacity are rejected before writes", async () => {
  calls = [];
  for (const payload of [{ ...date, onDate: "2026-02-30" }, { ...date, startTimes: ["24:00"] }, { ...date, capacity: null }, { ...date, capacity: 3 }, { ...date, unexpected: true }]) {
    assert.equal((await exceptions.POST(request("exceptions", "POST", payload))).status, 400);
  }
  assert.equal(calls.length, 0);
  assert.equal(dateScheduleSchema.safeParse({ ...date, startTimes: null, capacity: null }).success, true);
});
test("calendar token cannot refund or cancel, and unknown token cannot access calendar", async () => {
  calls = [];
  assert.equal((await cancel.POST(request("cancel", "POST", { id: "00000000-0000-4000-8000-000000000001", refund: true, reason: "Test" }))).status, 401);
  assert.equal((await calendar.GET(request("calendar?from=2026-10-09&to=2026-10-31", "GET", undefined, "unknown"))).status, 401);
  assert.equal((await exceptions.POST(request("exceptions", "POST", date, "unknown"))).status, 401);
  assert.equal(calls.length, 0);
});
test("full admin still works; oversized calendar range and invalid weekly time never query", async () => {
  assert.equal((await exceptions.POST(request("exceptions", "POST", date, "full-admin-fixture"))).status, 200);
  calls = [];
  assert.equal((await calendar.GET(request("calendar?from=2026-10-09&to=2027-10-09"))).status, 400);
  assert.equal((await schedules.POST(request("schedules", "POST", { productSlug: "farm-tour", weekday: 1, startTimes: ["25:00"], capacity: 2, effectiveFrom: "2026-10-09" }))).status, 400);
  assert.equal(calls.length, 0);
});

test("calendar token creates a precise timed closure and can delete it by returned id", async () => {
  calls = [];
  const response = await timed.POST(request("timed-blackouts", "POST", {
    kind: "closure", startsAt: "2026-10-15T10:00:00-07:00", endsAt: "2026-10-15T11:00:00-07:00", productSlugs: ["farm-tour", "farm-tour"],
  }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).blackout.id, 4);
  const write = calls.find((c) => c.method === "POST" && c.url.pathname.endsWith("/booking_timed_blackouts"))!;
  assert.deepEqual(write.body, { kind: "closure", starts_at: "2026-10-15T10:00:00-07:00", ends_at: "2026-10-15T11:00:00-07:00", product_slugs: ["farm-tour"], note: null });
  assert.equal((await timed.DELETE(request("timed-blackouts", "DELETE", { id: 4 }))).status, 200);
  assert.equal(calls.filter((c) => c.url.pathname.endsWith("/booking_audit")).length, 2);
});

test("timed closures reject ambiguous local instants and reversed intervals before writes", async () => {
  calls = [];
  for (const payload of [
    { kind: "closure", startsAt: "2026-10-15T10:00:00", endsAt: "2026-10-15T11:00:00", productSlugs: ["farm-tour"] },
    { kind: "closure", startsAt: "2026-10-15T11:00:00Z", endsAt: "2026-10-15T10:00:00Z", productSlugs: ["farm-tour"] },
    { kind: "closure", startsAt: "2026-10-15T10:00:00Z", endsAt: "2026-10-15T11:00:00Z", productSlugs: [] },
  ]) assert.equal((await timed.POST(request("timed-blackouts", "POST", payload))).status, 400);
  assert.equal((await timed.DELETE(request("timed-blackouts", "DELETE", { id: 0 }))).status, 400);
  assert.equal(calls.length, 0);
});
