import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Durable payment state is private: all access uses the service-role client. */
let client: SupabaseClient | undefined;
function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Payments need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export type CheckoutKind = "shop" | "booking" | "gift";
export type AttemptStatus = "pending" | "processing" | "paid" | "expired" | "review";
export interface StockItem { variant_id: string; quantity: number }
export interface StripeAttempt {
  id: string;
  idempotency_key: string;
  request_hash: string;
  kind: CheckoutKind;
  status: AttemptStatus;
  reference: string;
  amount_cents: number;
  due_cents: number;
  snapshot: Record<string, unknown>;
  stock_items: StockItem[];
  booking_ids: string[];
  gift_code: string | null;
  gift_units: number;
  gift_applied_cents: number;
  session_id: string | null;
  payment_intent_id: string | null;
  expires_at: string;
  processing_until: string | null;
  result: Record<string, unknown> | null;
  notified_at: string | null;
  /** Cancelled booking confirmations are suppressed, never recorded as delivered. */
  confirmation_suppressed_at?: string | null;
  square_synced_at: string | null;
  refunded_cents: number;
  created_at: string;
  updated_at: string;
}
export interface ReserveAttemptInput {
  id?: string;
  idempotencyKey: string;
  requestHash: string;
  kind: CheckoutKind;
  reference: string;
  amountCents: number;
  /** Prepared and priced by the server, never passed through from the browser. */
  snapshot: Record<string, unknown>;
  stockItems?: StockItem[];
  giftCode?: string | null;
  expiresAt?: string;
}
export interface ClaimAttemptResult { acquired: boolean; attempt: StripeAttempt }

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(name, args);
  if (error) throw error;
  if (data === null) throw new Error(`${name} returned no result`);
  return data as T;
}

/** Capacity, gifts, and idempotency binding are committed in ONE transaction. */
export function reserveAttempt(input: ReserveAttemptInput): Promise<StripeAttempt> {
  return rpc("reserve_stripe_checkout", { p_attempt: {
    id: input.id, idempotency_key: input.idempotencyKey, request_hash: input.requestHash,
    kind: input.kind, reference: input.reference, amount_cents: input.amountCents,
    snapshot: input.snapshot, stock_items: input.stockItems ?? [],
    gift_code: input.giftCode ?? null, expires_at: input.expiresAt,
  } });
}

export function attachSession(id: string, sessionId: string): Promise<StripeAttempt> {
  return rpc("attach_stripe_session", { p_id: id, p_session_id: sessionId });
}

export async function getAttempt(id: string): Promise<StripeAttempt | null> {
  const { data, error } = await db().from("stripe_checkout_attempts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as StripeAttempt | null;
}

export async function getAttemptBySession(sessionId: string): Promise<StripeAttempt | null> {
  const { data, error } = await db().from("stripe_checkout_attempts").select("*").eq("session_id", sessionId).maybeSingle();
  if (error) throw error;
  return data as StripeAttempt | null;
}

export async function getAttemptByIdempotencyKey(key: string): Promise<StripeAttempt | null> {
  const { data, error } = await db().from("stripe_checkout_attempts").select("*").eq("idempotency_key", key).maybeSingle();
  if (error) throw error;
  return data as StripeAttempt | null;
}

export function claimAttempt(id: string, piId: string | null): Promise<ClaimAttemptResult> {
  return rpc("claim_stripe_attempt", { p_id: id, p_payment_intent_id: piId });
}

/** Call only after capture succeeded, or for an entirely gift-covered/free booking. */
export function finishAttempt(id: string, piId: string | null, amountCents: number): Promise<StripeAttempt> {
  return rpc("finish_stripe_checkout", { p_id: id, p_payment_intent_id: piId, p_paid_cents: amountCents });
}

/** Caller MUST first establish that Stripe can no longer charge this session. */
export function expireAttempt(id: string): Promise<StripeAttempt> {
  return rpc("expire_stripe_checkout", { p_id: id });
}

/** Includes paid attempts whose downstream effects still need retrying. */
export async function listRecoverableAttempts(limit = 100): Promise<StripeAttempt[]> {
  const { data, error } = await db().from("stripe_checkout_attempts").select("*")
    .or("status.in.(pending,processing,review),and(status.eq.paid,notified_at.is.null,or(kind.neq.booking,confirmation_suppressed_at.is.null))")
    .order("updated_at", { ascending: true }).order("id", { ascending: true })
    .limit(Math.max(1, Math.min(1000, Math.trunc(limit) || 100)));
  if (error) throw error;
  return (data ?? []) as StripeAttempt[];
}

export async function markNotified(id: string): Promise<void> {
  const { error } = await db().from("stripe_checkout_attempts")
    .update({ notified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id).eq("status", "paid").is("notified_at", null);
  if (error) throw error;
}

/** Rotate every inspected attempt behind the remaining queue, including open
 * sessions and failed gateways, so a busy first page cannot starve recovery. */
export async function markReconciled(id: string): Promise<void> {
  const { error } = await db().from("stripe_checkout_attempts")
    .update({ updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

/** Call after the idempotent Square inventory adjustment succeeds, then refresh
 * Square's absolute counts so reservations are no longer subtracted twice. */
export async function markSquareSynced(id: string): Promise<void> {
  const { error } = await db().from("stripe_checkout_attempts")
    .update({ square_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id).eq("kind", "shop").eq("status", "paid").is("square_synced_at", null);
  if (error) throw error;
}

export function freezeEffectsData(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return rpc("set_stripe_effects_data", { p_id: id, p_data: data });
}

/** Fresh domain state, with complete binding checks before customer-facing effects. */
export async function bookingConfirmationState(attempt: StripeAttempt): Promise<"confirmed" | "cancelled"> {
  const ids = attempt.booking_ids;
  const legs = attempt.snapshot.legs;
  if (attempt.kind !== "booking" || attempt.status !== "paid" || !ids.length
      || new Set(ids).size !== ids.length || !Array.isArray(legs) || legs.length !== ids.length) {
    throw new Error("Booking confirmation group is incomplete");
  }
  const { data, error } = await db().from("bookings")
    .select("id,stripe_attempt_id,stripe_payment_intent_id,product_slug,starts_at,duration_min,status")
    .in("id", ids);
  if (error) throw error;
  if (!data || data.length !== ids.length || new Set(data.map(row => row.id)).size !== ids.length) {
    throw new Error("Booking confirmation group is incomplete");
  }
  const remainingLegs = [...legs];
  for (const row of data) {
    if (!ids.includes(row.id) || row.stripe_attempt_id !== attempt.id
        || row.stripe_payment_intent_id !== attempt.payment_intent_id) {
      throw new Error("Booking confirmation group binding mismatch");
    }
    const index = remainingLegs.findIndex(leg => leg && row.product_slug === leg.product_slug
      && Number.isFinite(Date.parse(row.starts_at)) && Date.parse(row.starts_at) === Date.parse(leg.starts_at)
      && row.duration_min === leg.duration_min);
    if (index < 0) throw new Error("Booking confirmation snapshot mismatch");
    remainingLegs.splice(index, 1);
  }
  if (data.every(row => row.status === "cancelled")) return "cancelled";
  if (data.every(row => row.status === "confirmed")) return "confirmed";
  throw new Error("Booking confirmation group has consumed or inconsistent state");
}

/** RPC revalidates all cancelled rows under locks before recording suppression. */
export function suppressBookingConfirmation(id: string): Promise<StripeAttempt> {
  return rpc("suppress_stripe_booking_confirmation", { p_id: id });
}

/** Pass canonical cumulative Charge.amount_refunded, never one refund delta. */
export function recordStripeRefund(paymentIntentId: string, refundedCents: number): Promise<boolean> {
  return rpc("record_stripe_refund", { p_payment_intent_id: paymentIntentId, p_refunded_cents: refundedCents });
}

export interface StripeBookingCancellation {
  cancelledIds: string[];
  bookingNumber: string;
  customerName: string;
  customerEmail: string | null;
  legs: { productSlug: string; startsAt: string }[];
  giftRestored: boolean;
}

/** If refunding, complete the idempotent gateway refund BEFORE calling this. */
export function cancelStripeBooking(attemptId: string, reason: string): Promise<StripeBookingCancellation> {
  return rpc("cancel_stripe_booking", { p_attempt_id: attemptId, p_reason: reason });
}
