#!/usr/bin/env node
/** Local stdio MCP bridge. No dependencies, broad admin token or configurable host. */
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

const ORIGIN = "https://highlandfarmsoregon.com";
const PREFIX = "/api/shop/admin/booking/";
const PRODUCTS = ["farm-tour", "nordic-spa", "wedding-call"];
const dateSchema = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" };
const timesSchema = { type: "array", items: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$" }, minItems: 1, maxItems: 20, uniqueItems: true };
const productSchema = { type: "string", enum: PRODUCTS };
const idSchema = { type: "integer", minimum: 1 };
const capacitySchema = { type: "integer", minimum: 1, maximum: 6, description: "Product maximum: farm-tour 2 appointments, nordic-spa 6 guests, wedding-call 1 appointment." };
const blackoutKindSchema = { type: "string", enum: ["wedding", "closure", "private_event"] };
const productsSchema = { type: "array", items: productSchema, minItems: 1, maxItems: 3, uniqueItems: true };
const noteSchema = { anyOf: [{ type: "string", maxLength: 500 }, { type: "null" }] };
function schema(properties, required) { return { type: "object", properties, required, additionalProperties: false }; }
function tool(name, description, inputSchema, readOnly = false, idempotent = false) {
  return { name, description, inputSchema, annotations: { readOnlyHint: readOnly, destructiveHint: !readOnly, idempotentHint: readOnly || idempotent, openWorldHint: false } };
}
export const CALENDAR_TOOLS = [
  tool("read_calendar", "Read schedules, date overrides, blackouts and aggregate occupancy, without customer details. Date range is inclusive, at most 63 days.", schema({ start: dateSchema, end: dateSchema }, ["start", "end"]), true),
  tool("set_weekly_schedule", "Create a weekly rule. Read current rules first: this inserts a rule rather than editing an existing ID.", schema({ productSlug: productSchema, weekday: { type: "integer", minimum: 0, maximum: 6 }, startTimes: timesSchema, capacity: capacitySchema, effectiveFrom: dateSchema, effectiveTo: { anyOf: [dateSchema, { type: "null" }] } }, ["productSlug", "weekday", "startTimes", "capacity", "effectiveFrom"])),
  tool("set_date_schedule", "Replace the schedule for one product/date. startTimes:null closes that date; open dates require explicit capacity. Deleting an override restores weekly behavior.", schema({ productSlug: productSchema, onDate: dateSchema, startTimes: { anyOf: [timesSchema, { type: "null" }] }, capacity: { anyOf: [capacitySchema, { type: "null" }] } }, ["productSlug", "onDate", "startTimes", "capacity"]), false, true),
  tool("set_blackout", "Create a wedding, closure or private-event blackout for selected products and inclusive dates. Notes should contain no customer details.", schema({ kind: blackoutKindSchema, startsOn: dateSchema, endsOn: dateSchema, productSlugs: productsSchema, note: noteSchema }, ["kind", "startsOn", "endsOn", "productSlugs"])),
  tool("set_timed_blackout", "Create an interval blackout for selected products. ISO start/end must include Z or an explicit UTC offset. Notes should contain no customer details.", schema({ kind: blackoutKindSchema, startsAt: { type: "string", format: "date-time" }, endsAt: { type: "string", format: "date-time" }, productSlugs: productsSchema, note: noteSchema }, ["kind", "startsAt", "endsAt", "productSlugs"])),
  tool("delete_weekly_schedule", "Delete one weekly rule by its numeric ID; changes future availability.", schema({ id: idSchema }, ["id"]), false, true),
  tool("delete_date_schedule", "Delete one product/date override, restoring that day's weekly schedule and capacity.", schema({ productSlug: productSchema, onDate: dateSchema }, ["productSlug", "onDate"]), false, true),
  tool("delete_blackout", "Delete one blackout by its numeric ID; may reopen booking availability.", schema({ id: idSchema }, ["id"]), false, true),
  tool("delete_timed_blackout", "Delete one interval blackout by its numeric ID; may reopen booking availability.", schema({ id: idSchema }, ["id"]), false, true),
];

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function requireValue(ok, message) { if (!ok) throw new Error(message); }
function date(value, field) { requireValue(validDate(value), `${field} must be a real YYYY-MM-DD date.`); }
function product(value) { requireValue(PRODUCTS.includes(value), "Unknown booking product."); }
function instant(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)
    && validDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value));
}
function capacity(value, productSlug) {
  const maximum = productSlug === "farm-tour" ? 2 : productSlug === "nordic-spa" ? 6 : 1;
  requireValue(Number.isInteger(value) && value >= 1 && value <= maximum, `Capacity must be an integer from 1 to ${maximum} for this product.`);
}
function times(value) {
  requireValue(Array.isArray(value) && value.length >= 1 && value.length <= 20 && value.every((v) => typeof v === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v)) && new Set(value).size === value.length, "startTimes must contain 1-20 unique HH:MM times.");
}
export function calendarOperation(name, args) {
  const definition = CALENDAR_TOOLS.find((entry) => entry.name === name);
  requireValue(Boolean(definition), "Unknown calendar tool.");
  requireValue(args && typeof args === "object" && !Array.isArray(args), "Tool arguments must be an object.");
  requireValue(Object.keys(args).every((key) => Object.hasOwn(definition.inputSchema.properties, key)), "Unexpected tool argument.");
  requireValue(definition.inputSchema.required.every((key) => Object.hasOwn(args, key)), "Missing required tool argument.");
  if (name === "read_calendar") {
    date(args.start, "start"); date(args.end, "end");
    requireValue(args.end >= args.start && (Date.parse(args.end) - Date.parse(args.start)) / 86400000 <= 62, "Calendar range must be ordered and at most 63 days.");
    return { path: `calendar?${new URLSearchParams({ from: args.start, to: args.end })}`, method: "GET" };
  }
  if (["delete_weekly_schedule", "delete_blackout", "delete_timed_blackout"].includes(name)) {
    requireValue(Number.isSafeInteger(args.id) && args.id > 0, "ID must be a positive integer.");
    return { path: name === "delete_blackout" ? "blackouts" : name === "delete_timed_blackout" ? "timed-blackouts" : "schedules", method: "DELETE", body: { id: args.id } };
  }
  if (name === "delete_date_schedule") {
    product(args.productSlug); date(args.onDate, "onDate");
    return { path: "exceptions", method: "DELETE", body: { productSlug: args.productSlug, onDate: args.onDate } };
  }
  if (name === "set_weekly_schedule") {
    product(args.productSlug); times(args.startTimes); capacity(args.capacity, args.productSlug); date(args.effectiveFrom, "effectiveFrom");
    requireValue(Number.isInteger(args.weekday) && args.weekday >= 0 && args.weekday <= 6, "weekday must be 0 (Sunday) through 6 (Saturday).");
    if (args.effectiveTo != null) { date(args.effectiveTo, "effectiveTo"); requireValue(args.effectiveTo >= args.effectiveFrom, "effectiveTo must not precede effectiveFrom."); }
    return { path: "schedules", method: "POST", body: { ...args, effectiveTo: args.effectiveTo ?? null } };
  }
  if (name === "set_date_schedule") {
    product(args.productSlug); date(args.onDate, "onDate");
    if (args.startTimes !== null) times(args.startTimes);
    if (args.capacity !== null) capacity(args.capacity, args.productSlug);
    requireValue(args.startTimes === null || args.capacity !== null, "Open date schedules need an explicit capacity.");
    return { path: "exceptions", method: "POST", body: { ...args } };
  }
  requireValue(["wedding", "closure", "private_event"].includes(args.kind), "Unknown blackout kind.");
  requireValue(Array.isArray(args.productSlugs) && args.productSlugs.length >= 1 && args.productSlugs.length <= 3 && new Set(args.productSlugs).size === args.productSlugs.length, "Select 1-3 unique products.");
  args.productSlugs.forEach(product);
  requireValue(args.note == null || (typeof args.note === "string" && args.note.trim().length <= 500), "note must contain at most 500 characters.");
  if (name === "set_timed_blackout") {
    requireValue(instant(args.startsAt) && instant(args.endsAt), "Timed blackout start/end must be real ISO timestamps with Z or explicit UTC offset.");
    requireValue(Date.parse(args.endsAt) > Date.parse(args.startsAt), "Timed blackout end must be later than start.");
    return { path: "timed-blackouts", method: "POST", body: { ...args, note: typeof args.note === "string" ? args.note.trim() : null } };
  }
  date(args.startsOn, "startsOn"); date(args.endsOn, "endsOn");
  requireValue(args.endsOn >= args.startsOn, "endsOn must not precede startsOn.");
  return { path: "blackouts", method: "POST", body: { ...args, note: typeof args.note === "string" ? args.note.trim() : null } };
}

const SAFE_CONTAINER_KEYS = new Set(["schedules", "rules", "rule", "exceptions", "exception", "blackouts", "blackout", "timedBlackouts", "timedBlackout", "booked", "occupancy", "slots"]);
const SAFE_DATE_KEYS = new Set(["from", "to", "effectiveFrom", "effectiveTo", "onDate", "startsOn", "endsOn"]);
/** Defense in depth: return only calendar fields, even if an API accidentally adds customer data. */
export function calendarResult(value, depth = 0) {
  if (depth > 6 || !value || typeof value !== "object") return {};
  if (Array.isArray(value)) return value.slice(0, 10000).map((entry) => calendarResult(entry, depth + 1));
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (SAFE_CONTAINER_KEYS.has(key) && item && typeof item === "object") result[key] = calendarResult(item, depth + 1);
    else if (SAFE_DATE_KEYS.has(key) && (validDate(item) || item === null)) result[key] = item;
    else if (["ok", "nativeCalendarEnabled"].includes(key) && typeof item === "boolean") result[key] = item;
    else if (key === "timezone" && item === "America/Los_Angeles") result[key] = item;
    else if (["id", "capacity", "units", "partySize", "count", "bookedUnits", "remainingUnits", "weekday", "durationMin", "paddingBeforeMin", "paddingAfterMin"].includes(key) && (item === null || (Number.isSafeInteger(item) && item >= 0))) result[key] = item;
    else if (key === "productSlug" && PRODUCTS.includes(item)) result[key] = item;
    else if (key === "productSlugs" && Array.isArray(item) && item.every((p) => PRODUCTS.includes(p))) result[key] = item;
    else if (key === "kind" && ["wedding", "closure", "private_event"].includes(item)) result[key] = item;
    else if (key === "startTimes" && (item === null || (Array.isArray(item) && item.every((t) => typeof t === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t))))) result[key] = item;
    else if (["startsAt", "endsAt", "startsAtIso"].includes(key) && instant(item)) result[key] = item;
  }
  return result;
}

const content = (value, isError = false) => ({ content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }], ...(isError ? { isError: true } : {}) });
export async function callCalendarTool(name, args, options = {}) {
  let operation;
  try { operation = calendarOperation(name, args); } catch (error) { return content(error.message, true); }
  const token = (options.env ?? process.env).BOOKING_CALENDAR_API_TOKEN;
  if (typeof token !== "string" || !token.trim() || /[\r\n]/.test(token)) return content("BOOKING_CALENDAR_API_TOKEN is not configured. No request was sent.", true);
  try {
    const response = await (options.fetch ?? globalThis.fetch)(`${ORIGIN}${PREFIX}${operation.path}`, {
      method: operation.method, headers: { Authorization: `Bearer ${token.trim()}`, ...(operation.body ? { "Content-Type": "application/json" } : {}) },
      body: operation.body ? JSON.stringify(operation.body) : undefined,
      redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return content(`Calendar API returned HTTP ${response.status}. Check access or retry; no response details were exposed.`, true);
    const raw = await response.text();
    if (raw.length > 1048576) return content("Calendar response was too large. Request a smaller date range.", true);
    return content(calendarResult(JSON.parse(raw)));
  } catch { return content("Calendar request failed. Check connectivity and calendar API configuration before retrying.", true); }
}

export function createCalendarMcp(options = {}) {
  let negotiated = false;
  let initialized = false;
  return async (message) => {
    const id = message?.id;
    const hasId = typeof id === "string" || (typeof id === "number" && Number.isFinite(id));
    const error = (code, text) => ({ jsonrpc: "2.0", id: hasId ? id : null, error: { code, message: text } });
    const result = (value) => ({ jsonrpc: "2.0", id, result: value });
    if (!message || Array.isArray(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string") return error(-32600, "Invalid request");
    if (!hasId) {
      if (message.method === "notifications/initialized" && negotiated) initialized = true;
      return undefined;
    }
    if (message.method === "ping") return result({});
    if (message.method === "initialize") {
      if (negotiated || typeof message.params?.protocolVersion !== "string" || !message.params?.clientInfo || !message.params?.capabilities) return error(-32602, "Invalid initialization");
      negotiated = true;
      return result({ protocolVersion: "2024-11-05", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "highland-farms-calendar", version: "1.0.0" } });
    }
    if (!initialized) return error(-32002, "Server not initialized");
    if (message.method === "tools/list") return result({ tools: CALENDAR_TOOLS });
    if (message.method === "tools/call") {
      if (!CALENDAR_TOOLS.some((entry) => entry.name === message.params?.name)) return error(-32602, "Unknown tool");
      return result(await callCalendarTool(message.params.name, message.params.arguments ?? {}, options));
    }
    return error(-32601, "Method not found");
  };
}

export async function runCalendarStdio(input = process.stdin, output = process.stdout, options = {}) {
  const handle = createCalendarMcp(options);
  for await (const line of createInterface({ input, crlfDelay: Infinity })) {
    if (!line.trim()) continue;
    let response;
    try {
      if (line.length > 65536) throw new Error("oversized");
      const message = JSON.parse(line);
      response = await handle(message);
    } catch { response = { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Invalid JSON message" } }; }
    if (response) output.write(`${JSON.stringify(response)}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCalendarStdio().catch(() => { process.stderr.write("Calendar MCP stopped unexpectedly.\n"); process.exitCode = 1; });
}
