import type { StripeIntent, StripeSession } from "./stripe.ts";

/** The DB lease and Stripe's payment state jointly decide whether to capture.
 * No network exception is treated as a declined payment or releases stock. */
export interface ReconcileAttempt {
  id: string;
  status: "pending" | "processing" | "paid" | "expired" | "review";
  due_cents: number;
  session_id: string | null;
  payment_intent_id: string | null;
}

export interface ReconcileDependencies<T extends ReconcileAttempt> {
  claim(id: string, paymentIntentId: string): Promise<{ acquired: boolean; attempt: T }>;
  finish(id: string, paymentIntentId: string, amountCents: number): Promise<T>;
  expire(id: string): Promise<T>;
  capture(id: string, attemptId: string, amountCents: number): Promise<StripeIntent>;
  cancel(id: string, attemptId: string): Promise<StripeIntent>;
}

export async function reconcileStripeSession<T extends ReconcileAttempt>(
  session: StripeSession,
  attempt: T,
  dependencies: ReconcileDependencies<T>,
): Promise<T> {
  if (session.client_reference_id !== attempt.id || session.metadata.attempt_id !== attempt.id ||
      (attempt.session_id && attempt.session_id !== session.id)) {
    throw new Error("Stripe session does not match its checkout attempt");
  }
  if (session.currency !== "usd" || session.amount_total !== attempt.due_cents) {
    throw new Error("Stripe session amount does not match reserved purchase");
  }
  if (attempt.status === "paid" || attempt.status === "review") return attempt;
  const intent = session.payment_intent;
  if (typeof intent === "string") throw new Error("Payment intent must be expanded");
  if (!intent) {
    return session.status === "expired" ? dependencies.expire(attempt.id) : attempt;
  }
  if (intent.metadata?.attempt_id !== attempt.id || intent.currency !== "usd" ||
      intent.amount !== attempt.due_cents || (attempt.payment_intent_id && attempt.payment_intent_id !== intent.id)) {
    throw new Error("Stripe payment does not match reserved purchase");
  }
  if (attempt.status === "expired") {
    // A lost session-create response can arrive after its reservation expired.
    // It must never become a charge, even if Checkout completed meanwhile.
    if (intent.status === "requires_capture") {
      const canceled = await dependencies.cancel(intent.id, attempt.id);
      if (canceled.status !== "canceled") throw new Error("Authorization cancellation is not confirmed");
    } else if (intent.status === "succeeded") {
      throw new Error("Captured payment needs manual reconciliation after reservation expired");
    }
    return attempt;
  }
  if (intent.status === "canceled") return dependencies.expire(attempt.id);
  if (session.status !== "complete") return attempt;
  if (!["requires_capture", "succeeded"].includes(intent.status)) return attempt;

  const claim = await dependencies.claim(attempt.id, intent.id);
  if (!claim.acquired) {
    // An expired reservation must never be charged. Cancel the authorization
    // before releasing anything; an unknown cancel outcome retains the hold.
    if (claim.attempt.status === "pending" || claim.attempt.status === "expired") {
      if (intent.status === "succeeded") throw new Error("Captured payment needs manual reconciliation after reservation expired");
      const canceled = await dependencies.cancel(intent.id, attempt.id);
      if (canceled.status !== "canceled") throw new Error("Authorization cancellation is not confirmed");
      return dependencies.expire(attempt.id);
    }
    return claim.attempt;
  }
  const payment = intent.status === "succeeded"
    ? intent : await dependencies.capture(intent.id, attempt.id, attempt.due_cents);
  if (payment.id !== intent.id || payment.status !== "succeeded" || payment.currency !== "usd" ||
      payment.amount !== attempt.due_cents || payment.amount_received !== attempt.due_cents) {
    throw new Error("Captured payment requires reconciliation; reservation retained");
  }
  // If this write fails, the durable processing attempt survives. A webhook
  // retry or the reconciliation cron sees 'succeeded' and repeats only the DB
  // transaction, using the same payment intent and reservation.
  return dependencies.finish(attempt.id, intent.id, payment.amount_received);
}
