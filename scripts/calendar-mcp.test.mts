import assert from "node:assert/strict";
import test from "node:test";
import { Readable, Writable } from "node:stream";
import { CALENDAR_TOOLS, calendarOperation, calendarResult, callCalendarTool, createCalendarMcp, runCalendarStdio } from "./calendar-mcp.mjs";

const env = { BOOKING_CALENDAR_API_TOKEN: "calendar-fixture-placeholder" };
const weekly = { productSlug: "farm-tour", weekday: 6, startTimes: ["10:00", "12:00"], capacity: 1, effectiveFrom: "2027-01-01", effectiveTo: null };
const override = { productSlug: "nordic-spa", onDate: "2027-01-02", startTimes: null, capacity: null };
const blackout = { kind: "wedding", startsOn: "2027-01-02", endsOn: "2027-01-03", productSlugs: ["farm-tour", "nordic-spa"] };
const timed = { kind: "closure", startsAt: "2027-01-02T13:00:00-08:00", endsAt: "2027-01-02T15:00:00-08:00", productSlugs: ["farm-tour"] };
const initialized = { jsonrpc: "2.0", method: "notifications/initialized" };
const initialize = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "fixture", version: "1" } } };

test("MCP lifecycle negotiates protocol, exposes nine annotated tools and answers ping", async () => {
  const handle = createCalendarMcp();
  assert.equal((await handle({ jsonrpc: "2.0", id: 0, method: "tools/list" }))?.error.code, -32002);
  const reply = await handle(initialize);
  assert.equal(reply?.result.protocolVersion, "2024-11-05");
  assert.equal(await handle(initialized), undefined);
  const listed = await handle({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.equal(listed?.result.tools.length, 9);
  for (const entry of CALENDAR_TOOLS) {
    assert.equal(entry.inputSchema.additionalProperties, false);
    assert.equal(entry.annotations.readOnlyHint, entry.name === "read_calendar");
    assert.equal(entry.annotations.destructiveHint, entry.name !== "read_calendar");
  }
  assert.deepEqual(await handle({ jsonrpc: "2.0", id: 3, method: "ping" }), { jsonrpc: "2.0", id: 3, result: {} });
});
test("all tools map to only approved calendar endpoints and exact API field names", () => {
  assert.deepEqual(calendarOperation("read_calendar", { start: "2027-01-01", end: "2027-01-31" }), { path: "calendar?from=2027-01-01&to=2027-01-31", method: "GET" });
  assert.deepEqual(calendarOperation("set_weekly_schedule", weekly), { path: "schedules", method: "POST", body: weekly });
  assert.deepEqual(calendarOperation("set_date_schedule", override), { path: "exceptions", method: "POST", body: override });
  assert.deepEqual(calendarOperation("set_blackout", blackout), { path: "blackouts", method: "POST", body: { ...blackout, note: null } });
  assert.deepEqual(calendarOperation("set_timed_blackout", timed), { path: "timed-blackouts", method: "POST", body: { ...timed, note: null } });
  assert.deepEqual(calendarOperation("delete_weekly_schedule", { id: 1 }), { path: "schedules", method: "DELETE", body: { id: 1 } });
  assert.deepEqual(calendarOperation("delete_blackout", { id: 2 }), { path: "blackouts", method: "DELETE", body: { id: 2 } });
  assert.deepEqual(calendarOperation("delete_timed_blackout", { id: 3 }), { path: "timed-blackouts", method: "DELETE", body: { id: 3 } });
  assert.deepEqual(calendarOperation("delete_date_schedule", { productSlug: "nordic-spa", onDate: "2027-01-02" }), { path: "exceptions", method: "DELETE", body: { productSlug: "nordic-spa", onDate: "2027-01-02" } });
});
test("validation rejects impossible dates, invalid times/ranges/products/IDs and unexpected fields", () => {
  for (const args of [{ start: "2027-02-30", end: "2027-03-01" }, { start: "2027-02-01", end: "2027-01-01" }, { start: "2027-01-01", end: "2027-03-05" }, { start: "2027-01-01", end: "2027-01-02", url: "https://attacker.invalid" }]) assert.throws(() => calendarOperation("read_calendar", args));
  for (const extra of [{ weekday: 7 }, { startTimes: ["25:00"] }, { startTimes: ["10:00", "10:00"] }, { capacity: 0 }, { productSlug: "other" }, { effectiveTo: "2026-01-01" }, { token: "bad" }]) assert.throws(() => calendarOperation("set_weekly_schedule", { ...weekly, ...extra }));
  assert.throws(() => calendarOperation("set_date_schedule", { ...override, startTimes: [] }));
  assert.throws(() => calendarOperation("set_date_schedule", { ...override, startTimes: ["10:00"], capacity: null }));
  for (const [productSlug, maximum] of [["farm-tour", 2], ["nordic-spa", 6], ["wedding-call", 1]] as const) {
    assert.doesNotThrow(() => calendarOperation("set_weekly_schedule", { ...weekly, productSlug, capacity: maximum }));
    assert.throws(() => calendarOperation("set_weekly_schedule", { ...weekly, productSlug, capacity: maximum + 1 }));
    assert.doesNotThrow(() => calendarOperation("set_date_schedule", { ...override, productSlug, startTimes: ["10:00"], capacity: maximum }));
    assert.throws(() => calendarOperation("set_date_schedule", { ...override, productSlug, startTimes: ["10:00"], capacity: maximum + 1 }));
  }
  assert.throws(() => calendarOperation("set_blackout", { ...blackout, productSlugs: ["farm-tour", "farm-tour"] }));
  for (const extra of [{ startsAt: "2027-01-02T13:00:00" }, { startsAt: "2027-01-02T13:00Z" }, { startsAt: "2027-02-30T13:00:00Z" }, { endsAt: timed.startsAt }, { endsAt: "2027-01-02T12:59:00-08:00" }]) assert.throws(() => calendarOperation("set_timed_blackout", { ...timed, ...extra }));
  assert.throws(() => calendarOperation("delete_blackout", { id: -1 }));
  assert.throws(() => calendarOperation("delete_blackout", { id: 1.5 }));
  assert.throws(() => calendarOperation("cancel_booking", {}));
});
test("dedicated token only, fixed canonical HTTPS host and redirects disabled", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response('{"ok":true}'); };
  const args = { start: "2027-01-01", end: "2027-01-02" };
  const missing = await callCalendarTool("read_calendar", args, { env: { SHOP_ADMIN_TOKEN: "never-use-this" }, fetch });
  assert.equal(missing.isError, true);
  assert.equal(calls.length, 0);
  await callCalendarTool("read_calendar", args, { env: { ...env, CALENDAR_API_ORIGIN: "https://attacker.invalid" }, fetch });
  assert.equal(calls[0].url, "https://highlandfarmsoregon.com/api/shop/admin/booking/calendar?from=2027-01-01&to=2027-01-02");
  assert.equal(new Headers(calls[0].init.headers).get("authorization"), `Bearer ${env.BOOKING_CALENDAR_API_TOKEN}`);
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(calls[0].init.method, "GET");
});
test("API errors and transport errors never expose token, raw body, URL or customer details", async () => {
  const detail = `${env.BOOKING_CALENDAR_API_TOKEN} private-person@example.invalid`;
  for (const fetch of [async () => new Response(detail, { status: 401 }), async () => { throw new Error(detail); }, async () => new Response(detail)]) {
    const result = await callCalendarTool("set_date_schedule", override, { env, fetch });
    assert.equal(result.isError, true);
    assert.ok(!JSON.stringify(result).includes(detail));
    assert.ok(!JSON.stringify(result).includes(env.BOOKING_CALENDAR_API_TOKEN));
    assert.ok(!JSON.stringify(result).includes("private-person"));
  }
});
test("successful API results retain calendar occupancy and strip PII, tokens and free-text notes", async () => {
  const raw = { ok: true, schedules: [{ id: 1, ...weekly, customerEmail: "private@example.invalid", token: env.BOOKING_CALENDAR_API_TOKEN }], exceptions: [override], blackouts: [{ id: 2, ...blackout, note: "Private wedding name" }], timedBlackouts: [{ id: 3, ...timed, note: "Private name" }], booked: [{ productSlug: "farm-tour", startsAtIso: "2027-01-02T18:00:00.000Z", units: 1, firstName: "Private", lastName: "Name", bookingNumber: "PRIVATE-ID", email: "private@example.invalid" }] };
  const safe = calendarResult(raw);
  assert.equal(safe.schedules[0].id, 1);
  assert.equal(safe.booked[0].units, 1);
  assert.equal(safe.booked[0].startsAtIso, "2027-01-02T18:00:00.000Z");
  assert.equal(safe.timedBlackouts[0].endsAt, timed.endsAt);
  assert.ok(!JSON.stringify(safe).includes("Private"));
  assert.ok(!JSON.stringify(safe).includes("private@example"));
  assert.ok(!JSON.stringify(safe).includes(env.BOOKING_CALENDAR_API_TOKEN));
  const result = await callCalendarTool("read_calendar", { start: "2027-01-01", end: "2027-01-02" }, { env, fetch: async () => new Response(JSON.stringify(raw)) });
  assert.deepEqual(JSON.parse(result.content[0].text), safe);
});
test("notifications cannot invoke mutation tools; invalid requests are protocol errors", async () => {
  let requested = false;
  const handle = createCalendarMcp({ env, fetch: async () => { requested = true; throw new Error("unexpected"); } });
  await handle(initialize); await handle(initialized);
  assert.equal(await handle({ jsonrpc: "2.0", method: "tools/call", params: { name: "set_date_schedule", arguments: override } }), undefined);
  assert.equal(requested, false);
  assert.equal((await handle({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "cancel_booking" } }))?.error.code, -32602);
  assert.equal((await handle({ jsonrpc: "2.0", id: 6, method: "not/a/method" }))?.error.code, -32601);
  assert.equal((await handle([]))?.error.code, -32600);
});
test("stdio emits newline-delimited JSON-RPC only and never echoes malformed input", async () => {
  const lines = [initialize, initialized, { jsonrpc: "2.0", id: 2, method: "tools/list" }, { jsonrpc: "2.0", id: 3, method: "ping" }].map((message) => JSON.stringify(message));
  lines.push("this invalid input includes private@example.invalid");
  let output = "";
  const sink = new Writable({ write(chunk, _encoding, callback) { output += chunk.toString(); callback(); } });
  await runCalendarStdio(Readable.from(lines.map((line) => `${line}\n`)), sink);
  const replies = output.trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(replies.length, 4);
  assert.ok(replies.every((reply) => reply.jsonrpc === "2.0"));
  assert.equal(replies[3].error.code, -32700);
  assert.ok(!output.includes("private@example"));
});
