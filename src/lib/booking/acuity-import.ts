/**
 * Mirrors Acuity appointments into the native `bookings` table as
 * `source='acuity_import'` rows — the read model the native calendar's own
 * UI/reports can eventually run against without hitting the Acuity API.
 *
 * Shared by two callers:
 *  - `scripts/import-acuity-bookings.mts` — the bulk backfill + periodic
 *    straggler sweep (this task).
 *  - `src/app/api/acuity/webhook/route.ts` — Task 3's best-effort mirror on
 *    every `scheduled`/`rescheduled` webhook, so a single booking never has
 *    to wait for the next script run to show up here.
 *
 * Acuity access is READ-ONLY. This module only ever writes to `bookings`
 * rows it owns (`source='acuity_import'`) — it must never touch a `native`
 * or `admin` row, even if a defensive check never fires in practice.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAppointments, type AcuityAppointment } from "@/lib/acuity";
import { BOOKING_PRODUCTS, unitsFor, type BookingSlug } from "@/lib/booking/products";

let client: SupabaseClient | undefined;

function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("acuity-import needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

/**
 * Type-id → product mapping (plan's Global Constraints table, single source
 * for both the importer and the webhook mirror). The legacy "Private Tour
 * for Two + Dozen Eggs" type id is NOT hardcoded here — Acuity's archive
 * shows it currently shares appointmentTypeID 48403186 with the plain
 * "Private Tour for Two" type (so it's already covered), but that could
 * have been a distinct id in an older Acuity configuration. `ensureAcuityTypeMap`
 * resolves it from the archive at runtime and merges it in defensively —
 * a no-op today, cheap insurance if it ever isn't.
 */
export const ACUITY_TYPE_MAP: Record<number, { slug: BookingSlug; party: number }> = {
  48403186: { slug: "farm-tour", party: 2 },
  48403269: { slug: "farm-tour", party: 3 },
  48403283: { slug: "farm-tour", party: 4 },
  48403306: { slug: "farm-tour", party: 5 },
  64217701: { slug: "farm-tour", party: 6 },
  85942611: { slug: "nordic-spa", party: 1 }, // each attendee is their own appointment row
  78277096: { slug: "wedding-call", party: 1 },
  91550850: { slug: "wedding-call", party: 1 }, // finalization meeting
};

async function resolveLegacyEggsTypeId(): Promise<number | null> {
  const { data, error } = await db()
    .from("acuity_archive_appointments")
    .select("appointment_type_id")
    .ilike("type", "%Private Tour for Two + Dozen Eggs%")
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn(`[acuity-import] legacy eggs type lookup failed (non-fatal): ${error.message}`);
    return null;
  }
  return (data?.appointment_type_id as number | undefined) ?? null;
}

let typeMapReady = false;

/** Merges the legacy eggs type id into `ACUITY_TYPE_MAP` (idempotent, memoized
 *  per process). Call once before any `mapAcuityAppointment`/`upsertAcuityBooking`
 *  in a fresh run — the runner does this at startup; the webhook route should too. */
export async function ensureAcuityTypeMap(): Promise<void> {
  if (typeMapReady) return;
  const legacyId = await resolveLegacyEggsTypeId();
  if (legacyId !== null && !(legacyId in ACUITY_TYPE_MAP)) {
    ACUITY_TYPE_MAP[legacyId] = { slug: "farm-tour", party: 2 };
    console.log(`[acuity-import] merged legacy eggs type id ${legacyId} -> farm-tour party 2`);
  }
  typeMapReady = true;
}

/** First non-empty value inside a form whose NAME contains "hear" (the
 *  "How did you hear about us?" intake question). Null when absent/blank. */
function extractReferral(appt: AcuityAppointment): string | null {
  for (const form of appt.forms ?? []) {
    if (!form.name || !/hear/i.test(form.name)) continue;
    for (const v of form.values ?? []) {
      const value = v.value?.trim();
      if (value) return value;
    }
  }
  return null;
}

export interface BookingUpsert {
  acuityId: number;
  productSlug: BookingSlug;
  startsAt: string; // UTC ISO
  durationMin: number;
  partySize: number;
  units: number;
  amountCents: number;
  bookingNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  referralSource: string | null;
}

/** Maps one Acuity appointment to the row we'd write. Null (+ logged) for an
 *  unknown appointment type — never throws, so a run never dies on one row. */
export function mapAcuityAppointment(appt: AcuityAppointment): BookingUpsert | null {
  const mapped = ACUITY_TYPE_MAP[appt.appointmentTypeID];
  if (!mapped) {
    console.warn(
      `[acuity-import] unknown appointment type ${appt.appointmentTypeID} ("${appt.type}") on appt ${appt.id} -- skipped`,
    );
    return null;
  }
  const product = BOOKING_PRODUCTS[mapped.slug];
  return {
    acuityId: appt.id,
    productSlug: mapped.slug,
    // appt.datetime carries the UTC offset already (e.g. "...-07:00") --
    // new Date(...) is the correct, offset-aware parse.
    startsAt: new Date(appt.datetime).toISOString(),
    durationMin: product.durationMin,
    partySize: mapped.party,
    units: unitsFor(product, mapped.party),
    amountCents: Math.round(Number(appt.amountPaid || 0) * 100),
    bookingNumber: `ACU-${appt.id}`,
    firstName: appt.firstName ?? "",
    lastName: appt.lastName ?? "",
    email: appt.email ?? "",
    phone: appt.phone ?? "",
    referralSource: extractReferral(appt),
  };
}

/**
 * Upserts one Acuity appointment into `bookings` on `acuity_id`. Always
 * writes `status='confirmed'` -- this function only ever sees ACTIVE
 * appointments (the runner fetches `canceled=false`; the webhook fires on
 * scheduled/rescheduled). Cancellations are handled separately, and only
 * forward (confirmed -> cancelled), by `reconcileCancellations`.
 *
 * NEVER touches a row whose `source` isn't `acuity_import` -- both the
 * lookup and the update are guarded on it.
 */
export async function upsertAcuityBooking(
  appt: AcuityAppointment,
): Promise<"inserted" | "updated" | "skipped"> {
  const mapped = mapAcuityAppointment(appt);
  if (!mapped) return "skipped";

  const supa = db();
  const { data: existing, error: selErr } = await supa
    .from("bookings")
    .select("id, source")
    .eq("acuity_id", mapped.acuityId)
    .maybeSingle();
  if (selErr) {
    throw new Error(`upsertAcuityBooking select failed for acuity_id ${mapped.acuityId}: ${selErr.message}`);
  }

  if (existing) {
    if (existing.source !== "acuity_import") {
      console.warn(
        `[acuity-import] bookings row for acuity_id ${mapped.acuityId} has source="${existing.source}" -- not touching it`,
      );
      return "skipped";
    }
    const { error: updErr } = await supa
      .from("bookings")
      .update({
        product_slug: mapped.productSlug,
        starts_at: mapped.startsAt,
        duration_min: mapped.durationMin,
        party_size: mapped.partySize,
        units: mapped.units,
        amount_cents: mapped.amountCents,
        status: "confirmed",
        first_name: mapped.firstName,
        last_name: mapped.lastName,
        email: mapped.email,
        phone: mapped.phone,
        referral_source: mapped.referralSource,
        updated_at: new Date().toISOString(),
      })
      .eq("acuity_id", mapped.acuityId)
      .eq("source", "acuity_import");
    if (updErr) {
      throw new Error(`upsertAcuityBooking update failed for acuity_id ${mapped.acuityId}: ${updErr.message}`);
    }
    return "updated";
  }

  const { error: insErr } = await supa.from("bookings").insert({
    booking_number: mapped.bookingNumber,
    product_slug: mapped.productSlug,
    starts_at: mapped.startsAt,
    duration_min: mapped.durationMin,
    party_size: mapped.partySize,
    units: mapped.units,
    status: "confirmed",
    first_name: mapped.firstName,
    last_name: mapped.lastName,
    email: mapped.email,
    phone: mapped.phone,
    amount_cents: mapped.amountCents,
    referral_source: mapped.referralSource,
    policy_agreed_at: null,
    acuity_id: mapped.acuityId,
    source: "acuity_import",
  });
  if (insErr) {
    if (insErr.code === "23505") {
      // Raced with another writer between the select and the insert (e.g. a
      // concurrent webhook mirror). Re-run once; the select will now find it.
      return upsertAcuityBooking(appt);
    }
    throw new Error(`upsertAcuityBooking insert failed for acuity_id ${mapped.acuityId}: ${insErr.message}`);
  }
  return "inserted";
}

function isoToDateStr(iso: string): string {
  return iso.slice(0, 10);
}

function addMonthsDateStr(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1 + months, d));
  return next.toISOString().slice(0, 10);
}

/**
 * Marks `source='acuity_import'` bookings `cancelled` when Acuity no longer
 * shows them as active over [fromIso, fromIso + 18 months]: either they show
 * up in the `canceled=true` set for their month, or they've simply vanished
 * from the `canceled=false` set entirely (also a cancellation, from Acuity's
 * point of view). Returns the number of rows actually flipped.
 *
 * Candidate rows are pulled from a narrower window than the fetch --
 * `[fromIso, from + 17 months)`, one month short of the 18-month fetch
 * horizon -- so a booking rescheduled OUT to somewhere near the edge of the
 * horizon is never judged against a fetch that might not actually cover its
 * new date. See the inline comment above `candidateEnd` for why.
 *
 * Only ever touches `source='acuity_import'` rows, and only rows currently
 * `confirmed` (never re-flips an already-cancelled row, never touches
 * `pending`/`completed`/`no_show`).
 *
 * Also excludes any candidate row whose `updated_at` is at/after the moment
 * the Acuity fetch started (`fetchStartedAt`, captured first thing below) --
 * closes a reconcile <-> webhook race where a booking created and mirrored
 * WHILE this fetch is in flight would otherwise be falsely cancelled, since
 * it can't possibly appear in either Acuity result set fetched before it
 * existed.
 */
const HORIZON_MONTHS = 18;

export async function reconcileCancellations(fromIso: string): Promise<number> {
  const fromDate = isoToDateStr(fromIso);
  const toDate = addMonthsDateStr(fromDate, HORIZON_MONTHS);

  // Captured BEFORE the Acuity fetch starts, to close a reconcile <-> webhook
  // race: a booking created (and webhook-mirrored into `bookings`) WHILE
  // this fetch is in flight has no way to appear in `activeAppts` below --
  // Acuity already returned its response snapshot before the new booking
  // existed. Without this guard such a row would look identical to a real
  // cancellation (missing from both `activeIds` and `canceledIds`) and get
  // falsely marked cancelled a few lines down. Any row whose `updated_at` is
  // at or after this timestamp was touched by something else (the webhook
  // mirror, most likely) after the fetch started, so it's excluded from the
  // cancel candidates below rather than trusted against a snapshot that
  // predates it.
  const fetchStartedAt = new Date().toISOString();

  const [activeAppts, canceledAppts] = await Promise.all([
    getAppointments(fromDate, toDate, false),
    getAppointments(fromDate, toDate, true),
  ]);
  const activeIds = new Set(activeAppts.map((a) => a.id));
  const canceledIds = new Set(canceledAppts.map((a) => a.id));

  // Candidate rows are restricted to a window that ends ONE MONTH INSIDE the
  // 18-month fetch horizon (`toDate` above), not all the way out to it. A
  // booking rescheduled to a date past the fetch horizon simply vanishes
  // from `activeAppts` (Acuity never told us about it -- we didn't ask that
  // far out), which would otherwise look identical to a real cancellation
  // and get marked cancelled here. It would self-heal on the next run once
  // that later date rolls inside the window, but by then the daily report
  // (post-cutover) may already have trusted the wrong status. The 1-month
  // margin means only rows we're CERTAIN were inside the fetch window get
  // reconciled against it.
  const candidateEnd = addMonthsDateStr(fromDate, HORIZON_MONTHS - 1);

  const supa = db();
  const { data: rows, error } = await supa
    .from("bookings")
    .select("id, acuity_id, updated_at")
    .eq("source", "acuity_import")
    .eq("status", "confirmed")
    .gte("starts_at", fromIso)
    .lt("starts_at", `${candidateEnd}T00:00:00Z`);
  if (error) throw new Error(`reconcileCancellations read failed: ${error.message}`);

  const idsToCancel = (rows ?? [])
    .filter((r) => r.acuity_id !== null)
    // Race guard (see `fetchStartedAt` above): a row touched at/after the
    // fetch started may have been written by a concurrent webhook mirror
    // AFTER Acuity's snapshot was taken -- never judge it against a
    // snapshot that predates its own last write.
    .filter((r) => (r.updated_at as string) < fetchStartedAt)
    .filter((r) => canceledIds.has(r.acuity_id as number) || !activeIds.has(r.acuity_id as number))
    .map((r) => r.id as string);

  if (idsToCancel.length === 0) return 0;

  const { data: updated, error: updErr } = await supa
    .from("bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .in("id", idsToCancel)
    .eq("source", "acuity_import")
    .eq("status", "confirmed")
    .select("id");
  if (updErr) throw new Error(`reconcileCancellations update failed: ${updErr.message}`);
  return updated?.length ?? 0;
}
