import { createCheckoutSession, getCheckoutSession, getPaymentIntent, getPaymentCharge, captureIntent, cancelIntent, stripeLiveMode, StripeError, type StripeSession } from "./stripe";
import { attachSession, getAttempt, getAttemptBySession, claimAttempt, finishAttempt, expireAttempt, markNotified, suppressBookingConfirmation, recordStripeRefund, type StripeAttempt } from "./store";
import { reconcileStripeSession } from "./reconcile";
import { sendCheckoutEffects } from "./effects";
import type { ShopSnapshot, BookingSnapshot, GiftSnapshot } from "./prepare";

export function publicAttempt(attempt: StripeAttempt) {
  // The high-entropy Stripe session is a receipt capability. Never expose the
  // persisted request/customer snapshot, internal ids, or payment intent here.
  return { status: attempt.status, kind: attempt.kind, reference: attempt.reference,
    result: attempt.result ? { ...attempt.result, amountCents: attempt.due_cents } : null };
}

export async function notifyPaidAttempt(attempt: StripeAttempt): Promise<void> {
  if (attempt.status !== "paid" || attempt.notified_at || (attempt.kind === "booking" && attempt.confirmation_suppressed_at)) return;
  const outcome = await sendCheckoutEffects(attempt);
  if (outcome === "suppressed") await suppressBookingConfirmation(attempt.id);
  else await markNotified(attempt.id);
}

export async function reconcileSession(sessionId: string): Promise<StripeAttempt | null> {
  let session: StripeSession;
  try {
    session = await getCheckoutSession(sessionId);
  } catch (error) {
    // Only a missing Checkout Session means the receipt does not exist. Later
    // payment or storage failures must remain retryable reconciliation errors.
    if (error instanceof StripeError && error.status === 404) return null;
    throw error;
  }
  if (session.livemode !== stripeLiveMode()) throw new Error("Stripe checkout mode mismatch");
  let attempt = await getAttemptBySession(session.id);
  if (!attempt && /^[0-9a-f-]{36}$/i.test(session.metadata.attempt_id ?? "")) {
    attempt = await getAttempt(session.metadata.attempt_id);
  }
  if (!attempt) return null; // another integration on the same Stripe account
  if (session.client_reference_id !== attempt.id || session.metadata.attempt_id !== attempt.id) {
    throw new Error("Stripe session reference mismatch");
  }
  // Late sessions can belong to expired attempts whose create response was
  // lost. Reconcile/cancel those without reopening the DB reservation.
  if (attempt.status !== "expired") attempt = await attachSession(attempt.id, session.id);
  if (typeof session.payment_intent === "string") session.payment_intent = await getPaymentIntent(session.payment_intent);
  const result = await reconcileStripeSession(session, attempt, {
    claim: claimAttempt, finish: finishAttempt, expire: expireAttempt,
    capture: captureIntent, cancel: cancelIntent,
  });
  if (result.status === "paid" && result.payment_intent_id) {
    // A dashboard refund event can precede payment finalization; fetch its
    // cumulative total again after the payment is bound in durable storage.
    const charge = await getPaymentCharge(result.payment_intent_id);
    if (charge?.amount_refunded) await recordStripeRefund(result.payment_intent_id, charge.amount_refunded);
  }
  return result;
}

export async function reconcileAttempt(attempt: StripeAttempt): Promise<StripeAttempt> {
  if (attempt.status === "paid") return attempt;
  if (attempt.due_cents === 0) {
    if (attempt.status === "pending" && Date.parse(attempt.expires_at) <= Date.now()) return expireAttempt(attempt.id);
    const claim = await claimAttempt(attempt.id, null);
    return claim.acquired ? finishAttempt(attempt.id, null, 0) : claim.attempt;
  }
  if (attempt.session_id) return (await reconcileSession(attempt.session_id)) ?? attempt;
  if (Date.parse(attempt.expires_at) < Date.now() && attempt.status === "pending") {
    // Session creation has deterministic expiry 5 min BEFORE this deadline.
    // It uses manual capture, and capture is impossible without a persisted
    // processing claim. A lost create response may leave an authorization,
    // but never a captured payment. Late completed webhooks cancel that hold.
    return expireAttempt(attempt.id);
  }
  return attempt;
}

export async function hostedSession(attempt: StripeAttempt): Promise<StripeSession> {
  if (attempt.session_id) return getCheckoutSession(attempt.session_id);
  const snapshot = attempt.snapshot;
  const email = attempt.kind === "shop" ? (snapshot as ShopSnapshot).emailData.customerEmail
    : attempt.kind === "booking" ? (snapshot as BookingSnapshot).emailData.customerEmail
    : (snapshot as GiftSnapshot).purchaserEmail;
  const name = attempt.kind === "shop" ? "Farm shop order"
    : attempt.kind === "booking" ? (snapshot as BookingSnapshot).emailData.legs.map((leg) => leg.productSlug === "nordic-spa" ? "Nordic Forest Spa" : leg.productSlug === "farm-tour" ? "Private Farm Tour" : "Wedding Call").join(" + ")
    : (snapshot as GiftSnapshot).product.name;
  const session = await createCheckoutSession({
    id: attempt.id, reference: attempt.reference, kind: attempt.kind,
    amountCents: attempt.due_cents, email, description: `${name} · ${attempt.reference}`,
    expiresAt: attempt.expires_at,
    cancelPath: attempt.kind === "booking" && (snapshot as BookingSnapshot).product === "nordic-spa" ? "/nordic-spa"
      : attempt.kind === "booking" && (snapshot as BookingSnapshot).product === "wedding-call" ? "/weddings" : "/farm-tours",
  });
  await attachSession(attempt.id, session.id);
  return session;
}
