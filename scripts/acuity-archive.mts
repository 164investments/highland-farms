// Archive EVERY Acuity appointment (active + canceled), all orders, and the
// account config, before anything is ever cancelled. Read-only against Acuity.
// Run: npx tsx --env-file .env.local scripts/acuity-archive.mts <YYYYMMDD>
import { createClient } from "@supabase/supabase-js";
import { gzipSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const AUTH = Buffer.from(
  `${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`,
).toString("base64");
const BASE = "https://acuityscheduling.com/api/v1";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acuity(path: string): Promise<unknown[]> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Basic ${AUTH}` },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as unknown[];
}

function* months(fromYear: number, toYear: number): Generator<[string, string]> {
  for (let y = fromYear; y <= toYear; y++)
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, "0");
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
      yield [`${y}-${mm}-01`, `${y}-${mm}-${String(last).padStart(2, "0")}`];
    }
}

// End year: 2 years past "now" -- derived from the run stamp (argv[2],
// YYYYMMDD) when one is passed, falling back to the actual current date
// otherwise. Preferring the stamp keeps a re-run against an intentionally
// backdated/future stamp (rare, but this is a script someone might invoke
// by hand with an odd argument) consistent with what it's archiving,
// instead of silently drifting off whatever day the script happens to run
// on. No `Date.now()`-freshness issue here either way -- this is a one-shot
// script invocation, not a long-lived process where a stale `now` would
// matter.
const runStampArg = process.argv[2];
const stampYear =
  runStampArg && /^\d{8}$/.test(runStampArg) ? Number(runStampArg.slice(0, 4)) : null;
const endYear = (stampYear ?? new Date().getUTCFullYear()) + 2;

const appts: Record<string, unknown>[] = [];
for (const [min, max] of months(2019, endYear)) {
  for (const canceled of ["false", "true"]) {
    const rows = (await acuity(
      `/appointments?minDate=${min}&maxDate=${max}&max=500&canceled=${canceled}`,
    )) as Record<string, unknown>[];
    if (rows.length >= 500) throw new Error(`month ${min} hit the 500 cap — split it`);
    appts.push(...rows);
    // Mind Acuity rate limits — small delay between fetches.
    await sleep(150);
  }
}
const orders = await acuity("/orders?max=500");
const config = {
  appointmentTypes: await acuity("/appointment-types"),
  calendars: await acuity("/calendars"),
  forms: await acuity("/forms"),
};
console.log(`appointments=${appts.length} orders=${orders.length}`);

const stamp = process.argv[2] ?? "manual";
mkdirSync("docs/acuity-archive", { recursive: true });
writeFileSync(`docs/acuity-archive/appointments-${stamp}.json.gz`, gzipSync(JSON.stringify(appts)));
writeFileSync(`docs/acuity-archive/orders-${stamp}.json.gz`, gzipSync(JSON.stringify(orders)));
writeFileSync(`docs/acuity-archive/config-${stamp}.json.gz`, gzipSync(JSON.stringify(config)));

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
for (let i = 0; i < appts.length; i += 500) {
  const batch = appts.slice(i, i + 500).map((a) => ({
    id: a.id,
    datetime: a.datetime,
    datetime_created: a.datetimeCreated ?? null,
    appointment_type_id: a.appointmentTypeID,
    type: a.type,
    calendar_id: a.calendarID ?? null,
    first_name: a.firstName, last_name: a.lastName,
    email: a.email, phone: a.phone,
    amount_paid_cents: Math.round(Number(a.amountPaid ?? 0) * 100),
    price_cents: Math.round(Number(a.price ?? 0) * 100),
    canceled: Boolean(a.canceled),
    raw: a,
  }));
  const { error } = await db.from("acuity_archive_appointments").upsert(batch, { onConflict: "id" });
  if (error) throw new Error(`archive upsert failed at ${i}: ${error.message}`);
}
const { count } = await db.from("acuity_archive_appointments").select("*", { count: "exact", head: true });
console.log(`supabase archive rows=${count}`);

// Dedupe assertion: rescheduled/moved appointments can appear in two month
// buckets (their datetime shifts across the boundary), so appts.length can
// exceed the unique id count. The upsert on id dedupes those — verify the
// Supabase row count matches the unique id count from what we fetched, not
// the raw fetched length.
const uniqueIds = new Set(appts.map((a) => a.id));
if (count !== uniqueIds.size) {
  throw new Error(
    `dedupe assertion failed: supabase count=${count} !== unique fetched ids=${uniqueIds.size} (raw fetched=${appts.length})`,
  );
}
console.log(`dedupe assertion OK: unique ids=${uniqueIds.size} raw fetched=${appts.length} supabase rows=${count}`);
