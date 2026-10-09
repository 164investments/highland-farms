import { createHmac, timingSafeEqual } from "node:crypto";

/** Server-only Stripe transport. Checkout collects cards; this app never does. */
export interface StripeIntent {
  id: string;
  status: string;
  amount: number;
  amount_received: number;
  currency: string;
  metadata?: Record<string, string>;
  latest_charge?: string | StripeCharge | null;
}

export interface StripeCharge {
  id: string;
  payment_intent: string | { id: string };
  amount: number;
  amount_refunded: number;
  currency: string;
}

export interface StripeSession {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired";
  payment_status: string;
  amount_total: number;
  currency: string;
  expires_at: number;
  client_reference_id: string | null;
  metadata: Record<string, string>;
  payment_intent: StripeIntent | string | null;
  livemode: boolean;
}

export class StripeError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "StripeError";
    this.status = status;
  }
}

export function stripeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYMENT_PROVIDER === "stripe";
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_ACCOUNT_ID);
}

export function stripeLiveMode(): boolean {
  return /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? "");
}

export async function stripeRequest<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: URLSearchParams; idempotencyKey?: string } = {},
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !/^(sk|rk)_(live|test)_/.test(key)) throw new StripeError("Stripe is not configured", 503);
  if (!/^\/v1\/[a-z0-9_/?=&%.-]+$/i.test(path)) throw new Error("Invalid Stripe API path");
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  if (options.body) headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: options.method ?? "GET", headers, body: options.body,
    cache: "no-store", signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok) {
    // Do not propagate gateway messages: some contain customer input or keys.
    throw new StripeError(`Stripe request failed (${response.status}, ${data.error?.code ?? "api_error"})`, response.status);
  }
  return data as T;
}

let verifiedKey: string | undefined;
export async function verifyStripeAccount(): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY;
  const expected = process.env.STRIPE_ACCOUNT_ID;
  if (!expected || !key) throw new StripeError("Stripe account is not configured", 503);
  if (verifiedKey === `${expected}:${key}`) return;
  const account = await stripeRequest<{ id: string; charges_enabled: boolean }>("/v1/account");
  if (account.id !== expected || !account.charges_enabled) {
    throw new StripeError("Stripe account is not ready for payments", 503);
  }
  verifiedKey = `${expected}:${key}`;
}

export interface CheckoutSessionInput {
  id: string;
  reference: string;
  kind: "shop" | "booking" | "gift";
  amountCents: number;
  email: string;
  description: string;
  expiresAt: string;
  cancelPath?: "/farm-tours" | "/nordic-spa" | "/weddings";
}

export async function createCheckoutSession(input: CheckoutSessionInput): Promise<StripeSession> {
  await verifyStripeAccount();
  const origin = checkoutOrigin();
  const cancelPath = input.kind === "shop" ? "/shop/checkout" : input.kind === "gift" ? "/gift-certificates" : input.cancelPath ?? "/farm-tours";
  // The DB reservation lasts five minutes longer than the hosted session.
  // Deterministic expiry/metadata keep retries byte-identical for Stripe.
  const expires = Math.floor(Date.parse(input.expiresAt) / 1000) - 300;
  const body = new URLSearchParams({
    mode: "payment", customer_email: input.email,
    client_reference_id: input.id,
    success_url: `${origin}/payments/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${cancelPath}?payment=cancelled`,
    expires_at: String(expires),
    "payment_method_types[0]": "card",
    "payment_intent_data[capture_method]": "manual",
    "payment_intent_data[description]": input.description,
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(input.amountCents),
    "line_items[0][price_data][product_data][name]": input.description,
    "line_items[0][quantity]": "1",
  });
  for (const [name, value] of Object.entries({ attempt_id: input.id, kind: input.kind, reference: input.reference })) {
    body.set(`metadata[${name}]`, value);
    body.set(`payment_intent_data[metadata][${name}]`, value);
  }
  return stripeRequest<StripeSession>("/v1/checkout/sessions", {
    method: "POST", body, idempotencyKey: `checkout:${input.id}`,
  });
}

export function checkoutOrigin(): string {
  // Return destinations come from deployment configuration, never the request.
  const origin = process.env.STRIPE_CHECKOUT_ORIGIN ?? "https://highlandfarmsoregon.com";
  const url = new URL(origin);
  const local = process.env.NODE_ENV === "development" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.origin !== origin || (!local && !["https://highlandfarmsoregon.com", "https://www.highlandfarmsoregon.com"].includes(origin))) {
    throw new Error("Invalid checkout origin");
  }
  return origin;
}

export function getCheckoutSession(id: string): Promise<StripeSession> {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) throw new StripeError("Invalid checkout session", 400);
  return stripeRequest(`/v1/checkout/sessions/${id}?expand%5B%5D=payment_intent`);
}

export function getPaymentIntent(id: string): Promise<StripeIntent> {
  if (!/^pi_[A-Za-z0-9]+$/.test(id)) throw new StripeError("Invalid payment intent", 400);
  return stripeRequest(`/v1/payment_intents/${id}?expand%5B%5D=latest_charge`);
}

export async function getPaymentCharge(paymentIntentId: string): Promise<StripeCharge | null> {
  const intent = await getPaymentIntent(paymentIntentId);
  const charge = typeof intent.latest_charge === "string"
    ? await stripeRequest<StripeCharge>(`/v1/charges/${intent.latest_charge}`) : intent.latest_charge;
  if (!charge) return null;
  const bound = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent.id;
  if (bound !== paymentIntentId || charge.currency !== "usd" || charge.amount !== intent.amount_received) {
    throw new Error("Stripe charge binding mismatch");
  }
  return charge;
}

export function captureIntent(id: string, attemptId: string, amountCents: number): Promise<StripeIntent> {
  if (!/^pi_[A-Za-z0-9]+$/.test(id)) throw new StripeError("Invalid payment intent", 400);
  return stripeRequest(`/v1/payment_intents/${id}/capture`, {
    method: "POST", body: new URLSearchParams({ amount_to_capture: String(amountCents) }),
    idempotencyKey: `capture:${attemptId}`,
  });
}

export function cancelIntent(id: string, attemptId: string): Promise<StripeIntent> {
  if (!/^pi_[A-Za-z0-9]+$/.test(id)) throw new StripeError("Invalid payment intent", 400);
  return stripeRequest(`/v1/payment_intents/${id}/cancel`, {
    method: "POST", idempotencyKey: `cancel:${attemptId}`,
  });
}

interface StripeRefund { id: string; status: string; amount: number; metadata?: Record<string, string> }

/** Bring cumulative refunds up to the captured total. Inspect this operation's
 * existing refund first, including pending refunds, before submitting another. */
export async function refundStripePayment(input: { paymentId: string; amountCents: number; idempotencyKey: string }) {
  await verifyStripeAccount();
  const charge = await getPaymentCharge(input.paymentId);
  if (!charge || !Number.isSafeInteger(input.amountCents) || charge.amount !== input.amountCents) {
    throw new Error("Refund does not match the captured purchase");
  }
  const completed = () => ({ id: null, status: "succeeded", refundedCents: charge.amount_refunded });
  if (charge.amount_refunded >= input.amountCents) return completed();
  let cursor = "";
  // Refund lists are paginated so an earlier operation cannot be missed.
  for (;;) {
    const page = await stripeRequest<{ data: StripeRefund[]; has_more: boolean }>(
      `/v1/refunds?payment_intent=${input.paymentId}&limit=100${cursor ? `&starting_after=${cursor}` : ""}`,
    );
    const prior = page.data.find((r) => r.metadata?.operation === input.idempotencyKey);
    if (prior) return { id: prior.id, status: prior.status, refundedCents: charge.amount_refunded };
    if (!page.has_more) break;
    if (!page.data.length) throw new Error("Invalid Stripe refund pagination");
    cursor = page.data[page.data.length - 1].id;
  }
  const remaining = input.amountCents - charge.amount_refunded;
  const refund = await stripeRequest<StripeRefund>("/v1/refunds", {
    method: "POST", idempotencyKey: `${input.idempotencyKey}:${remaining}`,
    body: new URLSearchParams({ payment_intent: input.paymentId, amount: String(remaining), "metadata[operation]": input.idempotencyKey }),
  });
  // An idempotent replay can contain the refund's old pending status.
  const current = await stripeRequest<StripeRefund>(`/v1/refunds/${refund.id}`);
  const updated = await getPaymentCharge(input.paymentId);
  return { id: current.id, status: current.status, refundedCents: updated?.amount_refunded ?? charge.amount_refunded };
}

export interface StripeEvent {
  id: string;
  type: string;
  livemode: boolean;
  data: { object: { id: string; payment_intent?: string | { id: string }; amount_refunded?: number } };
}

export function verifyStripeEvent(raw: string, signature: string, secret: string, now = Date.now()): StripeEvent {
  const parts = signature.split(",").map((part) => part.trim().split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1] ?? "";
  if (!/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) throw new Error("Invalid webhook timestamp");
  const expected = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest();
  const matches = parts.some(([key, value]) => {
    if (key !== "v1" || !/^[a-f0-9]{64}$/i.test(value ?? "")) return false;
    const actual = Buffer.from(value, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
  if (!matches) throw new Error("Invalid webhook signature");
  const event = JSON.parse(raw) as StripeEvent;
  if (!event.id || !event.type || !event.data?.object?.id || typeof event.livemode !== "boolean") throw new Error("Invalid webhook event");
  return event;
}
