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
 */
export async function forceConfirmBookings(
  ids: string[],
  paymentId: string | null,
  giftCode: string | null,
  giftCents: number,
): Promise<void> {
  const supa = db();
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supa
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
      .eq("status", "pending");
    if (error) throw new Error(`forceConfirm failed on ${ids[i]}: ${error.message}`);
  }
}

/** Best-effort audit write. Never throws — auditing must not break a booking. */
export async function auditBooking(
  action: string,
  bookingId: string | null,
  detail: Record<string, unknown>,
): Promise<void> {
  const { error } = await db().from("booking_audit").insert({
    actor: "system",
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

export async function restoreGiftCertificate(code: string, units: number): Promise<void> {
  const { error } = await db().rpc("restore_gift_certificate", {
    p_code: code,
    p_units: units,
  });
  if (error) {
    console.error("[booking] restore_gift_certificate FAILED:", code, units, error.message);
  }
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
