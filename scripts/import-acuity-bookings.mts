// Imports active Acuity appointments into the native `bookings` table
// (source='acuity_import') and reconciles cancellations, so the native
// calendar's tables reflect the live Acuity account before/during cutover.
//
// Acuity access is READ-ONLY -- this script never calls a mutating Acuity
// endpoint. All writes go to our own Supabase `bookings` table, and only to
// rows this importer owns (source='acuity_import').
//
// Run: npx tsx --env-file .env.local scripts/import-acuity-bookings.mts [--from YYYY-MM-DD]
//   --from defaults to today (Pacific).
import { getAppointments } from "../src/lib/acuity.ts";
import {
  ensureAcuityTypeMap,
  upsertAcuityBooking,
  reconcileCancellations,
} from "../src/lib/booking/acuity-import.ts";
import { pacificDateStr } from "../src/lib/booking/time.ts";

const HORIZON_MONTHS = 18;
const PER_MONTH_CAP = 500;

function parseFromArg(argv: string[]): string {
  const idx = argv.indexOf("--from");
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
  return pacificDateStr(new Date());
}

function addMonthsDateStr(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1 + months, d));
  return next.toISOString().slice(0, 10);
}

/** Calendar-month chunks covering [from, to], clipped at both ends. */
function monthChunks(from: string, to: string): { start: string; end: string }[] {
  const chunks: { start: string; end: string }[] = [];
  let cursor = from;
  while (cursor <= to) {
    const [y, m] = cursor.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const monthEnd = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const chunkEnd = monthEnd > to ? to : monthEnd;
    chunks.push({ start: cursor, end: chunkEnd });
    const nextMonth = new Date(Date.UTC(y, m, 1)); // first of next month
    cursor = nextMonth.toISOString().slice(0, 10);
  }
  return chunks;
}

async function main() {
  const from = parseFromArg(process.argv.slice(2));
  const to = addMonthsDateStr(from, HORIZON_MONTHS);
  console.log(`[import-acuity-bookings] importing active appointments ${from} .. ${to}`);

  await ensureAcuityTypeMap();

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let seen = 0;

  for (const { start, end } of monthChunks(from, to)) {
    const appts = await getAppointments(start, end, false);
    if (appts.length >= PER_MONTH_CAP) {
      throw new Error(
        `month ${start}..${end} returned ${appts.length} active appointments (>= ${PER_MONTH_CAP} cap) -- refusing to risk silent truncation`,
      );
    }
    seen += appts.length;
    for (const appt of appts) {
      const result = await upsertAcuityBooking(appt);
      if (result === "inserted") inserted++;
      else if (result === "updated") updated++;
      else skipped++;
    }
    console.log(`  ${start}..${end}: ${appts.length} active appointments`);
  }

  console.log(`[import-acuity-bookings] fetched ${seen} active appointments`);
  console.log(
    `[import-acuity-bookings] inserted=${inserted} updated=${updated} skipped=${skipped}`,
  );

  const fromIso = `${from}T00:00:00Z`;
  const cancelled = await reconcileCancellations(fromIso);
  console.log(`[import-acuity-bookings] cancelled=${cancelled}`);

  console.log(
    `[import-acuity-bookings] DONE inserted=${inserted} updated=${updated} skipped=${skipped} cancelled=${cancelled}`,
  );
}

main().catch((err) => {
  console.error("[import-acuity-bookings] FAILED:", err);
  process.exitCode = 1;
});
