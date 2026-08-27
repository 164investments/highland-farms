import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Blackout, BookedUnits, ScheduleException, ScheduleRule,
} from "./engine";
import { addDays } from "./time";

let client: SupabaseClient | undefined;

function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Booking store needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export interface ClaimLeg {
  productSlug: string;
  startsAt: string; // UTC ISO
  durationMin: number;
  capacity: number;
  partySize: number;
  units: number;
  amountCents: number;
}

export interface ClaimCustomer {
  bookingNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  referralSource: string;
  policyAgreedAt: string | null;
  locationChoice: "meet" | "in_person" | null;
  /** Who created the booking row. Defaults to 'native' (customer checkout) —
   *  the admin manual-booking route passes 'admin' explicitly. */
  source?: string;
}

export type ClaimSlotsResult =
  | { ok: true; ids: string[] }
  | { ok: false; reason: "slot_full" | "number_collision" | "error"; message: string };

export async function claimSlots(
  legs: ClaimLeg[],
  customer: ClaimCustomer,
): Promise<ClaimSlotsResult> {
  const { data, error } = await db().rpc("claim_booking_slots", {
    legs: legs.map((l) => ({
      product_slug: l.productSlug,
      starts_at: l.startsAt,
      duration_min: l.durationMin,
      capacity: l.capacity,
      party_size: l.partySize,
      units: l.units,
      amount_cents: l.amountCents,
    })),
    booking: {
      booking_number: customer.bookingNumber,
      first_name: customer.firstName,
      last_name: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      referral_source: customer.referralSource,
      policy_agreed_at: customer.policyAgreedAt ?? "",
      location_choice: customer.locationChoice ?? "",
      source: customer.source ?? "native",
    },
  });

  if (!error && Array.isArray(data)) return { ok: true, ids: data as string[] };

  if (error?.code === "P0001" || /slot full/i.test(error?.message ?? "")) {
    return {
      ok: false,
      reason: "slot_full",
      message:
        "That time was just booked by someone else. Your card has not been charged — pick another time.",
    };
  }
  if (error?.code === "23505") {
    // booking_number unique collision (4-digit suffix); caller regenerates once.
    return { ok: false, reason: "number_collision", message: "" };
  }
  console.error("[booking] claim_booking_slots failed:", error?.code, error?.message);
  return {
    ok: false,
    reason: "error",
    message: "We couldn't confirm that time. Your card has not been charged.",
  };
}

export async function confirmBookings(
  ids: string[],
  paymentId: string | null,
  giftCode: string | null,
  giftCents: number,
): Promise<void> {
  const { error } = await db().rpc("confirm_bookings", {
    p_ids: ids,
    p_payment_id: paymentId,
    p_gift_code: giftCode,
    p_gift_cents: giftCents,
  });
  if (error) {
    // The money is taken by the time this runs — scream, never surface.
    console.error("[booking] confirm_bookings FAILED:", ids, error.message);
    throw new Error(`confirm_bookings failed: ${error.message}`);
  }
}

/**
 * Direct-update fallback for confirm_bookings. Used only when the RPC throws
 * AFTER a successful charge: at that point the customer has paid, the pending
 * rows are on a 10-minute fuse before the sweep deletes them, and one more
 * RPC attempt is not a plan. Same effect as the RPC (gift stamped on the
 * first id only).
 *
 * Returns the ids ACTUALLY confirmed, in order, so a caller that hits a
 * combo (2 legs) can tell a partial success (leg 1 confirmed, leg 2 threw)
 * from a total failure — the un-updated leg is still on the sweep's fuse
 * either way, but the audit trail has to say which one. A 0-row update
 * (already swept, or already confirmed by a since-recovered RPC) is a
 * failure for that id, not a silent success.
 */
export async function forceConfirmBookings(
  ids: string[],
  paymentId: string | null,
  giftCode: string | null,
  giftCents: number,
): Promise<string[]> {
  const supa = db();
  const confirmed: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    const { data, error } = await supa
      .from("bookings")
      .update({
        status: "confirmed",
        hold_expires_at: null,
        square_payment_id: paymentId,
        gift_certificate_code: i === 0 ? giftCode : null,
        gift_amount_cents: i === 0 ? giftCents : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ids[i])
      .eq("status", "pending")
      .select("id");
    if (error) {
      throw new Error(
        `forceConfirm failed on ${ids[i]}: ${error.message} (confirmed so far: [${confirmed.join(",")}])`,
      );
    }
    if (!data || data.length === 0) {
      throw new Error(
        `forceConfirm matched 0 rows for ${ids[i]} (already swept?) (confirmed so far: [${confirmed.join(",")}])`,
      );
    }
    confirmed.push(ids[i]);
  }
  return confirmed;
}

/**
 * Best-effort audit write. Never throws — auditing must not break a booking.
 * `actor` defaults to 'system' for the customer-facing checkout/cron paths;
 * the admin routes pass 'admin' explicitly.
 */
export async function auditBooking(
  action: string,
  bookingId: string | null,
  detail: Record<string, unknown>,
  actor: string = "system",
): Promise<void> {
  const { error } = await db().from("booking_audit").insert({
    actor,
    action,
    booking_id: bookingId,
    detail,
  });
  if (error) console.error("[booking] audit write failed:", action, error.message);
}

export async function releaseBookings(ids: string[]): Promise<void> {
  const { error } = await db().rpc("release_bookings", { p_ids: ids });
  if (error) {
    console.error("[booking] release_bookings FAILED — holds leak until sweep:", ids, error.message);
  }
}

/** Read-only cert lookup — shapes the redemption request; never authorizes it. */
export async function getGiftCertificate(code: string): Promise<{
  kind: "value" | "visits";
  productScope: string | null;
  remainingUnits: number;
} | null> {
  const { data, error } = await db()
    .from("gift_certificates")
    .select("kind, product_scope, remaining_units, status, expires_at")
    .eq("code", code)
    .maybeSingle();
  if (error || !data || data.status !== "active") return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return {
    kind: data.kind,
    productScope: data.product_scope,
    remainingUnits: data.remaining_units,
  };
}

/** Applied units, or null when the code is unusable (bad/expired/depleted). */
export async function redeemGiftCertificate(
  code: string,
  requested: number,
): Promise<number | null> {
  const { data, error } = await db().rpc("redeem_gift_certificate", {
    p_code: code,
    p_requested: requested,
  });
  if (error) {
    if (error.code === "P0001") return null;
    console.error("[booking] redeem_gift_certificate failed:", error.message);
    return null;
  }
  return data as number;
}

export interface GiftCertificateRow {
  code: string;
  kind: "value" | "visits";
  productScope: string | null;
  initialUnits: number;
  remainingUnits: number;
  purchaserEmail: string;
  recipientEmail: string | null;
  squarePaymentId: string | null;
  status: "active";
}

/**
 * Insert one issued gift certificate row. Throws on any error — the caller
 * (`issueGiftCertificate` in gift.ts) needs `error.code` to tell a
 * `code` primary-key collision (23505, retry with a fresh code) from every
 * other failure (rethrow, since money has already been taken at this point).
 */
export async function insertGiftCertificate(row: GiftCertificateRow): Promise<void> {
  const { error } = await db().from("gift_certificates").insert({
    code: row.code,
    kind: row.kind,
    product_scope: row.productScope,
    initial_units: row.initialUnits,
    remaining_units: row.remainingUnits,
    purchaser_email: row.purchaserEmail,
    recipient_email: row.recipientEmail,
    square_payment_id: row.squarePaymentId,
    status: row.status,
  });
  if (error) {
    const err = new Error(`insertGiftCertificate failed: ${error.message}`) as Error & { code?: string };
    err.code = error.code;
    throw err;
  }
}

/**
 * Never throws (same reasoning as before — this can fire after a charge has
 * already failed, and a second failure must not compound the first). Now
 * returns whether it actually succeeded so a caller that NEEDS to know (the
 * admin cancel route, which reports `giftRestored` to the guest email) isn't
 * forced to assume success from a fire-and-forget call. Existing
 * fire-and-forget callers (checkout's failure-path restores) can keep
 * ignoring the return value — `Promise<boolean>` is a strict widening of the
 * old `Promise<void>` call sites.
 */
export async function restoreGiftCertificate(code: string, units: number): Promise<boolean> {
  const { error } = await db().rpc("restore_gift_certificate", {
    p_code: code,
    p_units: units,
  });
  if (error) {
    console.error("[booking] restore_gift_certificate FAILED:", code, units, error.message);
    return false;
  }
  return true;
}

/**
 * Stamps the Google Calendar event id + Meet link onto a confirmed booking.
 * Best-effort: called from the checkout `after()` hook after the customer
 * has already been charged and confirmed, so a write failure here must
 * never surface to the customer — log and move on.
 */
export async function setBookingCalendarInfo(
  id: string,
  eventId: string,
  meetLink: string | null,
): Promise<void> {
  const { error } = await db()
    .from("bookings")
    .update({ google_event_id: eventId, meet_link: meetLink })
    .eq("id", id);
  if (error) {
    console.error("[booking] setBookingCalendarInfo failed:", id, error.message);
  }
}

/**
 * Stamps a free-text note onto a booking. Currently used only by the admin
 * manual-booking route (`claim_booking_slots` has no `notes` column input,
 * so this is a follow-up write). Best-effort, same reasoning as
 * `setBookingCalendarInfo` — a note is a convenience, never a reason to fail
 * a booking that already claimed the slot.
 */
export async function setBookingNote(id: string, note: string): Promise<void> {
  const { error } = await db().from("bookings").update({ notes: note }).eq("id", id);
  if (error) console.error("[booking] setBookingNote failed:", id, error.message);
}

/** Everything the engine needs for a product set + date range, in 4 queries. */
export async function getScheduleData(
  productSlugs: string[],
  from: string,
  to: string,
): Promise<{
  schedules: ScheduleRule[];
  exceptions: ScheduleException[];
  blackouts: Blackout[];
  booked: BookedUnits[];
}> {
  const supa = db();
  const [schedules, exceptions, blackouts, booked] = await Promise.all([
    supa.from("booking_schedules").select("*").in("product_slug", productSlugs),
    supa.from("booking_schedule_exceptions").select("*")
      .in("product_slug", productSlugs).gte("on_date", from).lte("on_date", to),
    supa.from("booking_blackouts").select("*")
      .lte("starts_on", to).gte("ends_on", from),
    supa.from("bookings").select("product_slug, starts_at, units, status, hold_expires_at")
      .in("product_slug", productSlugs)
      .gte("starts_at", `${from}T00:00:00Z`)
      // One extra UTC day so a Pacific evening slot on `to` (which lands on
      // the NEXT UTC date) still has its booked units counted.
      .lte("starts_at", `${addDays(to, 1)}T23:59:59Z`)
      .in("status", ["pending", "confirmed"]),
  ]);

  for (const r of [schedules, exceptions, blackouts, booked]) {
    if (r.error) throw new Error(`booking schedule read failed: ${r.error.message}`);
  }

  const nowMs = Date.now();
  return {
    schedules: (schedules.data ?? []).map((r) => ({
      productSlug: r.product_slug,
      weekday: r.weekday,
      startTimes: r.start_times,
      capacity: r.capacity,
      effectiveFrom: r.effective_from,
      effectiveTo: r.effective_to,
    })),
    exceptions: (exceptions.data ?? []).map((r) => ({
      productSlug: r.product_slug,
      onDate: r.on_date,
      startTimes: r.start_times,
      capacity: r.capacity,
    })),
    blackouts: (blackouts.data ?? []).map((r) => ({
      kind: r.kind,
      startsOn: r.starts_on,
      endsOn: r.ends_on,
      productSlugs: r.product_slugs,
    })),
    booked: (booked.data ?? [])
      .filter(
        (r) => r.status === "confirmed"
          || (r.hold_expires_at !== null && new Date(r.hold_expires_at).getTime() > nowMs),
      )
      .map((r) => ({
        productSlug: r.product_slug,
        startsAtIso: r.starts_at,
        units: r.units,
      })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin (src/app/api/shop/admin/booking/*) — mirrors the same service-role
// pattern above, scoped to what the farm's admin screens need: the raw
// booking rows for a range, blackout/schedule CRUD, and gift-certificate
// lookup/void. No RLS relaxation — same table, same locked-down grants.
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminBookingRow {
  id: string;
  bookingNumber: string;
  productSlug: string;
  startsAt: string;
  durationMin: number;
  partySize: number;
  units: number;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  amountCents: number;
  squarePaymentId: string | null;
  giftCertificateCode: string | null;
  giftAmountCents: number;
  referralSource: string | null;
  source: string;
  notes: string | null;
  /** Shared by both legs of a Full Farm Day combo; null for a single-leg booking. */
  comboGroup: string | null;
  createdAt: string;
}

const ADMIN_BOOKING_COLUMNS =
  "id, booking_number, product_slug, starts_at, duration_min, party_size, units, status, " +
  "first_name, last_name, email, phone, amount_cents, square_payment_id, " +
  "gift_certificate_code, gift_amount_cents, referral_source, source, notes, combo_group, created_at";

interface AdminBookingDbRow {
  id: string;
  booking_number: string;
  product_slug: string;
  starts_at: string;
  duration_min: number;
  party_size: number;
  units: number;
  status: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  amount_cents: number;
  square_payment_id: string | null;
  gift_certificate_code: string | null;
  gift_amount_cents: number;
  referral_source: string | null;
  source: string;
  notes: string | null;
  combo_group: string | null;
  created_at: string;
}

function mapAdminBookingRow(r: AdminBookingDbRow): AdminBookingRow {
  return {
    id: r.id,
    bookingNumber: r.booking_number,
    productSlug: r.product_slug,
    startsAt: r.starts_at,
    durationMin: r.duration_min,
    partySize: r.party_size,
    units: r.units,
    status: r.status,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    phone: r.phone,
    amountCents: r.amount_cents,
    squarePaymentId: r.square_payment_id,
    giftCertificateCode: r.gift_certificate_code,
    giftAmountCents: r.gift_amount_cents,
    referralSource: r.referral_source,
    source: r.source,
    notes: r.notes,
    comboGroup: r.combo_group,
    createdAt: r.created_at,
  };
}

/** Every booking (any status) with `starts_at` in [fromIso, toIso], for the admin calendar. */
export async function listBookingsRange(fromIso: string, toIso: string): Promise<AdminBookingRow[]> {
  const { data, error } = await db()
    .from("bookings")
    .select(ADMIN_BOOKING_COLUMNS)
    .gte("starts_at", fromIso)
    .lte("starts_at", toIso)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`listBookingsRange failed: ${error.message}`);
  return (data ?? []).map((r) => mapAdminBookingRow(r as unknown as AdminBookingDbRow));
}

/** Read-only single-row lookup, any status — used by the cancel route to
 *  check `comboGroup` BEFORE deciding whether to cancel one row or the
 *  whole group, without mutating anything itself. */
export async function getBookingById(id: string): Promise<AdminBookingRow | null> {
  const { data, error } = await db()
    .from("bookings")
    .select(ADMIN_BOOKING_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getBookingById failed: ${error.message}`);
  if (!data) return null;
  return mapAdminBookingRow(data as unknown as AdminBookingDbRow);
}

export type CancelBookingResult =
  | { ok: true; booking: AdminBookingRow }
  | { ok: false };

/** Cancels a booking, but ONLY from `confirmed` — matches the checkout's own
 *  status machine and stops a double-cancel or a cancel of a pending hold
 *  (which the sweep already owns) from doing anything. Returns the row as it
 *  stood right before the flip, so the caller has the payment/gift fields
 *  needed for a refund without a second round trip.
 *
 *  For a combo leg, use `cancelBookingGroup` instead — this function cancels
 *  exactly the one row it's given, which is correct for a single-leg
 *  booking but WRONG for one leg of a combo (see that function's doc). */
export async function cancelBooking(id: string): Promise<CancelBookingResult> {
  const { data, error } = await db()
    .from("bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "confirmed")
    .select(ADMIN_BOOKING_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`cancelBooking failed: ${error.message}`);
  if (!data) return { ok: false };
  return { ok: true, booking: mapAdminBookingRow(data as unknown as AdminBookingDbRow) };
}

export type CancelBookingGroupResult =
  | { ok: true; bookings: AdminBookingRow[] }
  | { ok: false; reason: "partial" };

/**
 * Cancels every row sharing `comboGroup`, as one operation — a combo's two
 * legs (tour + spa) share one payment and one gift stamp (on the first leg
 * only), so cancelling just one leg would mis-compute a refund against the
 * OTHER leg's still-active amount. Checks that every row in the group is
 * currently `confirmed` before touching anything (`reason: "partial"` if
 * not — some other process already moved a leg, and this deliberately
 * refuses to guess at a refund off a group that isn't in the shape it
 * expects); only then does it flip the whole group in one UPDATE statement.
 * A post-update count check catches the (very unlikely, single-admin-tool)
 * race where the group changed between the check and the update, so this
 * NEVER partially cancels a group through this path.
 */
export async function cancelBookingGroup(comboGroup: string): Promise<CancelBookingGroupResult> {
  const { data: rows, error: readError } = await db()
    .from("bookings")
    .select(ADMIN_BOOKING_COLUMNS)
    .eq("combo_group", comboGroup);
  if (readError) throw new Error(`cancelBookingGroup read failed: ${readError.message}`);
  const all = (rows ?? []).map((r) => mapAdminBookingRow(r as unknown as AdminBookingDbRow));
  if (all.length === 0 || all.some((b) => b.status !== "confirmed")) {
    return { ok: false, reason: "partial" };
  }

  const { data, error } = await db()
    .from("bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("combo_group", comboGroup)
    .eq("status", "confirmed")
    .select(ADMIN_BOOKING_COLUMNS);
  if (error) throw new Error(`cancelBookingGroup failed: ${error.message}`);
  const updated = (data ?? []).map((r) => mapAdminBookingRow(r as unknown as AdminBookingDbRow));
  if (updated.length !== all.length) {
    // Something changed the group between the read above and this update —
    // bail rather than compute a refund off a group that moved under us.
    return { ok: false, reason: "partial" };
  }
  return { ok: true, bookings: updated };
}

export interface BlackoutRow {
  id: number;
  kind: string;
  startsOn: string;
  endsOn: string;
  productSlugs: string[];
  note: string | null;
}

interface BlackoutDbRow {
  id: number;
  kind: string;
  starts_on: string;
  ends_on: string;
  product_slugs: string[];
  note: string | null;
}

function mapBlackoutRow(r: BlackoutDbRow): BlackoutRow {
  return {
    id: r.id, kind: r.kind, startsOn: r.starts_on, endsOn: r.ends_on,
    productSlugs: r.product_slugs, note: r.note,
  };
}

/** Blackouts overlapping [from, to] (Pacific date strings) — same overlap test as `getScheduleData`. */
export async function listBlackoutsRange(from: string, to: string): Promise<BlackoutRow[]> {
  const { data, error } = await db()
    .from("booking_blackouts")
    .select("id, kind, starts_on, ends_on, product_slugs, note")
    .lte("starts_on", to)
    .gte("ends_on", from)
    .order("starts_on", { ascending: true });
  if (error) throw new Error(`listBlackoutsRange failed: ${error.message}`);
  return (data ?? []).map((r) => mapBlackoutRow(r as unknown as BlackoutDbRow));
}

export async function insertBlackout(input: {
  kind: string;
  startsOn: string;
  endsOn: string;
  productSlugs: string[];
  note: string | null;
}): Promise<BlackoutRow> {
  const { data, error } = await db()
    .from("booking_blackouts")
    .insert({
      kind: input.kind,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      product_slugs: input.productSlugs,
      note: input.note,
    })
    .select("id, kind, starts_on, ends_on, product_slugs, note")
    .single();
  if (error) throw new Error(`insertBlackout failed: ${error.message}`);
  return mapBlackoutRow(data as unknown as BlackoutDbRow);
}

/** True when a row was actually removed (false = unknown id). */
export async function deleteBlackout(id: number): Promise<boolean> {
  const { data, error } = await db()
    .from("booking_blackouts")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`deleteBlackout failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

export interface ScheduleRuleRow {
  id: number;
  productSlug: string;
  weekday: number;
  startTimes: string[];
  capacity: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

interface ScheduleRuleDbRow {
  id: number;
  product_slug: string;
  weekday: number;
  start_times: string[];
  capacity: number;
  effective_from: string;
  effective_to: string | null;
}

function mapScheduleRuleRow(r: ScheduleRuleDbRow): ScheduleRuleRow {
  return {
    id: r.id, productSlug: r.product_slug, weekday: r.weekday, startTimes: r.start_times,
    capacity: r.capacity, effectiveFrom: r.effective_from, effectiveTo: r.effective_to,
  };
}

/** Every schedule rule row, for the admin screen to manage. Unfiltered — the
 *  table is small (one row per product/weekday/effective-window), and the
 *  engine's own "latest effectiveFrom wins" logic needs the full history to
 *  reason about, not a date-clipped slice. */
export async function listSchedules(): Promise<ScheduleRuleRow[]> {
  const { data, error } = await db()
    .from("booking_schedules")
    .select("id, product_slug, weekday, start_times, capacity, effective_from, effective_to")
    .order("product_slug", { ascending: true })
    .order("weekday", { ascending: true });
  if (error) throw new Error(`listSchedules failed: ${error.message}`);
  return (data ?? []).map((r) => mapScheduleRuleRow(r as unknown as ScheduleRuleDbRow));
}

/** Always an insert — a schedule "edit" is a delete of the old row + an
 *  insert of the new one (the admin route does both); the engine's
 *  latest-effectiveFrom rule is what makes overlapping rows resolve
 *  correctly rather than needing a real upsert key. */
export async function upsertScheduleRule(input: {
  productSlug: string;
  weekday: number;
  startTimes: string[];
  capacity: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}): Promise<ScheduleRuleRow> {
  const { data, error } = await db()
    .from("booking_schedules")
    .insert({
      product_slug: input.productSlug,
      weekday: input.weekday,
      start_times: input.startTimes,
      capacity: input.capacity,
      effective_from: input.effectiveFrom,
      effective_to: input.effectiveTo,
    })
    .select("id, product_slug, weekday, start_times, capacity, effective_from, effective_to")
    .single();
  if (error) throw new Error(`upsertScheduleRule failed: ${error.message}`);
  return mapScheduleRuleRow(data as unknown as ScheduleRuleDbRow);
}

export async function deleteScheduleRule(id: number): Promise<boolean> {
  const { data, error } = await db()
    .from("booking_schedules")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`deleteScheduleRule failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

export interface GiftCertificateAdminRow {
  code: string;
  kind: "value" | "visits";
  productScope: string | null;
  initialUnits: number;
  remainingUnits: number;
  purchaserEmail: string | null;
  recipientEmail: string | null;
  squarePaymentId: string | null;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

/** Full cert row for the admin lookup screen (unlike `getGiftCertificate`,
 *  which is checkout's redemption-shaping read and deliberately hides
 *  status/history from the customer-facing path). */
export async function lookupGiftCertificate(code: string): Promise<GiftCertificateAdminRow | null> {
  const { data, error } = await db()
    .from("gift_certificates")
    .select("code, kind, product_scope, initial_units, remaining_units, purchaser_email, recipient_email, square_payment_id, status, expires_at, created_at")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(`lookupGiftCertificate failed: ${error.message}`);
  if (!data) return null;
  return {
    code: data.code,
    kind: data.kind,
    productScope: data.product_scope,
    initialUnits: data.initial_units,
    remainingUnits: data.remaining_units,
    purchaserEmail: data.purchaser_email,
    recipientEmail: data.recipient_email,
    squarePaymentId: data.square_payment_id,
    status: data.status,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
  };
}

/**
 * Voids a certificate outright (distinct from `redeem_gift_certificate`'s
 * gradual depletion) — a lost/compromised/refunded-order code, dead for
 * good. `redeem_gift_certificate` only accepts `status = 'active'`, so a
 * voided code fails redemption immediately regardless of remaining units.
 * Returns false when the code doesn't exist or was already void.
 */
export async function voidGiftCertificate(code: string): Promise<boolean> {
  const { data, error } = await db()
    .from("gift_certificates")
    .update({ status: "void" })
    .eq("code", code)
    .neq("status", "void")
    .select("code");
  if (error) throw new Error(`voidGiftCertificate failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}
