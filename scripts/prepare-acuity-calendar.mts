import { readFileSync, writeFileSync, mkdirSync, realpathSync } from "node:fs";
import { dirname, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { z } from "zod";
import { calendarDate, calendarTime, dateScheduleSchema } from "../src/lib/booking/calendar-schema.ts";
import { pacificDateStr, pacificTimeStr, slotToUtc } from "../src/lib/booking/time.ts";
import { computeAvailability } from "../src/lib/booking/engine.ts";
import { BOOKING_PRODUCTS } from "../src/lib/booking/products.ts";

const uiSchema = z.object({
  observedOn: calendarDate,
  timezone: z.literal("America/Los_Angeles"),
  tours: z.object({ regularWeekly: z.literal(false), scheduleExceptions: z.array(dateScheduleSchema), inspectedDateRange: z.object({ from: calendarDate, to: calendarDate }) }),
  weddingCall: z.object({ calendarId: z.literal(12109481), weeklyHours: z.record(z.string(), z.string().nullable()),
    dateOverrideHours: z.record(z.string(), z.string().nullable()),
    inspectedOverrideRange: z.object({ from: calendarDate, to: calendarDate }),
    durationMinutes: z.literal(45), paddingBeforeMinutes: z.literal(5), paddingAfterMinutes: z.literal(15) }),
  gaps: z.array(z.string()),
});
const tableSchema = z.object({ columns: z.array(z.string()), count: z.number().int(), rows: z.array(z.array(z.unknown())).optional(), offerings: z.array(z.array(z.unknown())).optional() });
const apiSchema = z.object({
  captured_at_utc: z.string().optional(),
  account_verified_by_calendar_ids: z.literal(true),
  account: z.object({ timezone: z.literal("America/Los_Angeles"), currency: z.literal("USD") }),
  explicit_class_offerings: tableSchema,
  authoritative_explicit_blocks: tableSchema,
  primary_wedding_call_interval_probes: z.array(z.object({ existing_occupancy_groups: z.number(), explicit_blocks_count: z.number(), times: z.array(z.string()) })),
  limitations: z.array(z.string()),
  future_appointments: z.object({ occupancy: z.array(z.object({
    calendar_id: z.number(), appointment_type_id: z.number(), starts_at: z.string(), duration_min: z.number(), appointment_rows: z.number(),
  })) }).optional(),
});
function expandTable(table: z.infer<typeof tableSchema>, key: "rows" | "offerings") {
  const rows = table[key];
  if (!rows || rows.length !== table.count) throw new Error("Incomplete calendar evidence table");
  return rows.map((row) => {
    if (row.length !== table.columns.length) throw new Error("Malformed calendar evidence row");
    return Object.fromEntries(table.columns.map((column, index) => [column, row[index]]));
  });
}
/** Acuity's verified automatic 65-minute interval; buffers are protected by
 * the engine/RPC. The working-hours editor starts its preview at range start. */
export function callStarts(hours: string | null): string[] | null {
  if (hours === null) return null;
  const times: string[] = [];
  for (const range of hours.split(",")) {
    const match = range.trim().match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (!match || !calendarTime.safeParse(match[1]).success || !calendarTime.safeParse(match[2]).success) throw new Error("Unsupported Acuity working-hours range");
    const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
    const start = minutes(match[1]), end = minutes(match[2]);
    if (end <= start) throw new Error("Working-hours end must follow start");
    for (let minute = start; minute + 65 <= end; minute += 65) {
      times.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
    }
  }
  return [...new Set(times)].sort();
}
const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;
const sqlArray = (values: string[] | null) => values === null ? "null" : `array[${values.map(quote).join(",")}]::text[]`;

export function prepareCalendar(uiInput: unknown, apiInput: unknown, from: string, to: string) {
  calendarDate.parse(from); calendarDate.parse(to);
  if (to < from) throw new Error("Invalid preparation range");
  const ui = uiSchema.parse(uiInput), api = apiSchema.parse(apiInput);
  if (from < ui.tours.inspectedDateRange.from || to > ui.tours.inspectedDateRange.to) throw new Error("Tour override evidence does not cover requested range");
  const exceptions = ui.tours.scheduleExceptions.filter((r) => r.onDate >= from && r.onDate <= to).map((r) => ({ ...r }));
  if (exceptions.some((r) => r.productSlug !== "farm-tour" || r.capacity !== 2)) throw new Error("Tour configuration differs from verified capacity");
  const classDates = new Map<string, { productSlug: "nordic-spa"; onDate: string; startTimes: string[]; capacity: number }>();
  const classes = expandTable(api.explicit_class_offerings, "offerings");
  for (const row of classes) {
    if (row.appointmentTypeID !== 85942611 || row.calendarID !== 13047082 || row.calendarTimezone !== "America/Los_Angeles" || row.duration !== 90 || row.slots !== 6 || row.isSeries !== false) throw new Error("Spa class differs from verified native model");
    const instant = new Date(String(row.time));
    if (!Number.isFinite(instant.getTime())) throw new Error("Invalid class instant");
    const date = pacificDateStr(instant);
    if (date < from || date > to) continue;
    const entry = classDates.get(date) ?? { productSlug: "nordic-spa", onDate: date, startTimes: [], capacity: 6 };
    entry.startTimes.push(pacificTimeStr(instant)); classDates.set(date, entry);
  }
  for (const row of classDates.values()) exceptions.push({ ...row, startTimes: [...new Set(row.startTimes)].sort() });
  const regularStarts = callStarts(ui.weddingCall.weeklyHours["1"]);
  const cleanProbes = api.primary_wedding_call_interval_probes.filter((p) => p.existing_occupancy_groups === 0 && p.explicit_blocks_count === 0);
  if (!cleanProbes.length || cleanProbes.some((p) => JSON.stringify(p.times.map((time) => calendarTime.safeParse(time).success ? time : pacificTimeStr(new Date(time)))) !== JSON.stringify(regularStarts))) throw new Error("Call interval translation is not confirmed by clean live API probes");
  const callRangeComplete = from >= ui.weddingCall.inspectedOverrideRange.from && to <= ui.weddingCall.inspectedOverrideRange.to;
  const callThrough = to < ui.weddingCall.inspectedOverrideRange.to ? to : ui.weddingCall.inspectedOverrideRange.to;
  const schedules = Object.entries(ui.weddingCall.weeklyHours).flatMap(([weekday, hours]) => {
    const startTimes = callStarts(hours);
    if (!startTimes?.length) return [];
    return [{ productSlug: "wedding-call", weekday: Number(weekday), startTimes, capacity: 1, effectiveFrom: from, effectiveTo: callThrough }];
  });
  for (const [onDate, hours] of Object.entries(ui.weddingCall.dateOverrideHours)) {
    calendarDate.parse(onDate);
    if (onDate >= from && onDate <= callThrough) exceptions.push({ productSlug: "wedding-call", onDate, startTimes: callStarts(hours), capacity: 1 });
  }
  const keys = exceptions.map((r) => `${r.productSlug}:${r.onDate}`);
  if (new Set(keys).size !== keys.length) throw new Error("Duplicate date override in preparation");
  exceptions.sort((a, b) => `${a.productSlug}:${a.onDate}`.localeCompare(`${b.productSlug}:${b.onDate}`));
  const explicitBlocks = expandTable(api.authoritative_explicit_blocks, "rows");
  const timed = explicitBlocks.flatMap((row) => {
    // Acuity service blocks do not close explicit group classes. Preserve that.
    const productSlugs = row.calendarID === 7539520 ? ["farm-tour"] : [12109481, 13899411].includes(Number(row.calendarID)) ? ["wedding-call"] : [];
    if (!productSlugs.length) return [];
    if (row.recurring !== null || row.until !== null || row.calendarTimezone !== "America/Los_Angeles") throw new Error("Unexpanded recurring/timezone block needs review");
    const start = new Date(String(row.start)), end = new Date(String(row.end));
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || !Number.isSafeInteger(row.id)) throw new Error("Invalid explicit block");
    if (pacificDateStr(end) < from || pacificDateStr(start) > to) return [];
    return [{ acuityBlockId: Number(row.id), kind: "closure", productSlugs, startsAt: start.toISOString(), endsAt: end.toISOString() }];
  });
  const sql = [
    "-- PRIVATE calendar preparation. Dry-run artifact, not an approval or an automatic apply.",
    `-- Source snapshot ${ui.observedOn}; requested Pacific dates ${from} through ${to}.`,
    "-- Apply both schema migrations first. Import current Acuity bookings separately.",
    "-- Native calendar must remain OFF until parity and cutover checks pass.",
    "begin;",
    "do $$ begin if exists(select 1 from booking_schedules) or exists(select 1 from booking_schedule_exceptions) or exists(select 1 from booking_timed_blackouts) then raise exception 'Calendar is no longer empty; review a fresh diff instead of overwriting operator changes'; end if; end $$;",
    ...schedules.map((r) => `insert into booking_schedules(product_slug,weekday,start_times,capacity,effective_from,effective_to) values(${quote(r.productSlug)},${r.weekday},${sqlArray(r.startTimes)},${r.capacity},${quote(r.effectiveFrom)},${quote(r.effectiveTo)});`),
    ...exceptions.map((r) => `insert into booking_schedule_exceptions(product_slug,on_date,start_times,capacity) values(${quote(r.productSlug)},${quote(r.onDate)},${sqlArray(r.startTimes)},${r.capacity ?? "null"});`),
    ...timed.map((r) => `insert into booking_timed_blackouts(kind,starts_at,ends_at,product_slugs,source,acuity_block_id) values('closure',${quote(r.startsAt)},${quote(r.endsAt)},${sqlArray(r.productSlugs)},'acuity_import',${r.acuityBlockId});`),
    "commit;", "",
  ].join("\n");
  const booked = (api.future_appointments?.occupancy ?? []).map((row) => ({
    productSlug: row.calendar_id === 7539520 ? "farm-tour" : row.calendar_id === 13047082 ? "nordic-spa" : "wedding-call",
    startsAtIso: new Date(row.starts_at).toISOString(), durationMin: row.duration_min, units: row.appointment_rows,
    paddingBeforeMin: row.appointment_type_id === 78277096 ? 5 : 0,
    paddingAfterMin: row.appointment_type_id === 78277096 ? 15 : 0,
  }));
  const now = api.captured_at_utc ? new Date(api.captured_at_utc) : slotToUtc(ui.observedOn, "00:00");
  const availability = Object.values(BOOKING_PRODUCTS).map((product) => ({ product: product.slug, name: product.name,
    days: computeAvailability({ product, from, to, schedules, exceptions,
      blackouts: timed, booked, now }),
  }));
  return { schedules, exceptions, timedBlackouts: timed, availability, sql,
    review: { from, to, capturedOn: ui.observedOn, nativeCalendarReady: false,
      tourOpenDates: exceptions.filter((r) => r.productSlug === "farm-tour").length,
      spaOpenDates: classDates.size, explicitSpaClasses: classes.length, callWeeklyRules: schedules.length,
      callOverridesComplete: callRangeComplete, importedTimedBlocks: timed.length,
      verified: ["Tour date overrides and wedding weekly hours/date overrides come from the current Acuity editor.", "All eight regular wedding-call starts match two clean current Acuity API probes.", "Explicit spa classes, timed blocks and appointment occupancy come from the current Acuity API snapshot."],
      pending: ["Refresh actual appointments through guarded source-owned importer before cutover.", "Verify shared staffing/resource rules for the two Acuity wedding calendars.", "Verify external-calendar busy time and blocks starting before the bounded lookback.", "Run booking parity and the Stripe sandbox payment matrix before native activation.", ...(!callRangeComplete ? ["Wedding date override evidence does not cover the full requested range; rules are bounded to inspected dates."] : [])],
      sourceCaveats: { ui: ui.gaps, api: api.limitations },
    } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const arg = (name: string) => { const index = process.argv.indexOf(name); if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}`); return process.argv[index + 1]; };
    const uiPath = arg("--ui"), apiPath = arg("--api"), out = resolve(arg("--out"));
    const uiText = readFileSync(uiPath, "utf8"), apiText = readFileSync(apiPath, "utf8");
    const ui = JSON.parse(uiText);
    const from = process.argv.includes("--from") ? arg("--from") : ui.observedOn;
    const to = process.argv.includes("--to") ? arg("--to") : new Date(Date.parse(`${ui.observedOn}T00:00:00Z`) + 365 * 86400000).toISOString().slice(0, 10);
    const prepared = prepareCalendar(ui, JSON.parse(apiText), from, to);
    mkdirSync(out, { recursive: true });
    const root = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
    const distance = relative(root, realpathSync(out));
    if (!distance || (!distance.startsWith("..") && !isAbsolute(distance))) throw new Error("Private calendar artifacts must be stored outside this public repository");
    const review = { ...prepared.review, sourceSha256: { ui: createHash("sha256").update(uiText).digest("hex"), api: createHash("sha256").update(apiText).digest("hex") } };
    writeFileSync(resolve(out, "calendar-seed.sql"), prepared.sql, { mode: 0o600 });
    writeFileSync(resolve(out, "calendar-preview.json"), JSON.stringify({ ...prepared, sql: undefined, review }, null, 2), { mode: 0o600 });
    const previewData = JSON.stringify(prepared.availability).replace(/</g, "\\u003c");
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Highland Farms calendar preparation</title><style>body{font:16px system-ui;margin:0;background:#f6f2e8;color:#273c2d}main{max-width:1000px;margin:auto;padding:30px 20px}h1{font:38px Georgia}select,button{font:inherit;padding:10px;background:white;border:1px solid #a7ac9e;border-radius:3px}header{display:flex;gap:12px;flex-wrap:wrap}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{text-align:left;border-bottom:1px solid #d0d1c6;padding:12px 8px;vertical-align:top}small{color:#596657}.slot{display:inline-block;background:white;border:1px solid #bec7b8;padding:6px 9px;margin:3px;font-size:14px}.full{opacity:.55}.closed{color:#7c8274}p{line-height:1.5}</style><main><h1>Highland Farms calendar preparation</h1><p>Private preview from the October 9 Acuity snapshot. Times are Pacific. Existing appointments, timed blocks, booking buffers and daily limits are included. This preview makes no live changes.</p><header><select id="product" aria-label="Experience"></select><select id="month" aria-label="Month"></select></header><table><thead><tr><th>Date</th><th>Offered start times · remaining capacity</th></tr></thead><tbody id="days"></tbody></table><small>Wedding calendars share one conservative resource until staffing is verified. Refresh source appointments and complete the cutover checks before activation.</small></main><script>const data=${previewData};const p=document.querySelector('#product'),m=document.querySelector('#month'),body=document.querySelector('#days');for(const x of data){const o=new Option(x.name,x.product);p.add(o)}for(const s of [...new Set(data[0].days.map(d=>d.date.slice(0,7)))])m.add(new Option(s,s));function render(){body.replaceChildren();for(const d of data.find(x=>x.product===p.value).days.filter(d=>d.date.startsWith(m.value))){const tr=document.createElement('tr'),date=document.createElement('td'),times=document.createElement('td');date.textContent=d.date;if(!d.slots.length){times.textContent='No offered times';times.className='closed'}for(const s of d.slots){const span=document.createElement('span');span.className='slot'+(s.remainingUnits===0?' full':'');span.textContent=s.time+' · '+s.remainingUnits+'/'+s.capacity;times.append(span)}tr.append(date,times);body.append(tr)}}p.onchange=m.onchange=render;render();</script></html>`;
    writeFileSync(resolve(out, "calendar-preview.html"), html, { mode: 0o600 });
    console.log(JSON.stringify({ dryRunOnly: true, out, review }, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not prepare calendar"); process.exitCode = 1;
  }
}
