import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { reconcileStripeSession, type ReconcileAttempt, type ReconcileDependencies } from "../src/lib/payments/reconcile.ts";
import { verifyStripeEvent, createCheckoutSession, refundStripePayment, getPaymentCharge, checkoutOrigin, type StripeIntent, type StripeSession } from "../src/lib/payments/stripe.ts";

const intent = (overrides: Partial<StripeIntent> = {}): StripeIntent => ({ id: "pi_test", status: "requires_capture", amount: 15000, amount_received: 0, currency: "usd", metadata: { attempt_id: "attempt-test" }, ...overrides });
const session = (overrides: Partial<StripeSession> = {}): StripeSession => ({ id: "cs_test_example", url: null, status: "complete", payment_status: "unpaid", amount_total: 15000, currency: "usd", expires_at: 1, client_reference_id: "attempt-test", metadata: { attempt_id: "attempt-test" }, payment_intent: intent(), livemode: false, ...overrides });
function fixture(overrides: Partial<ReconcileAttempt> = {}) {
  let current: ReconcileAttempt = { id: "attempt-test", status: "pending", due_cents: 15000, session_id: "cs_test_example", payment_intent_id: null, ...overrides };
  const calls: string[] = [];
  const deps: ReconcileDependencies<ReconcileAttempt> = {
    claim: async () => { calls.push("claim"); current = { ...current, status: "processing", payment_intent_id: "pi_test" }; return { acquired: true, attempt: current }; },
    finish: async () => { calls.push("finish"); return current = { ...current, status: "paid" }; },
    expire: async () => { calls.push("expire"); return current = { ...current, status: "expired" }; },
    capture: async () => { calls.push("capture"); return intent({ status: "succeeded", amount_received: 15000 }); },
    cancel: async () => { calls.push("cancel"); return intent({ status: "canceled" }); },
  };
  return { get current() { return current; }, calls, deps };
}

test("signed webhook accepts rotating signatures and rejects tamper, stale and future events", () => {
  const raw = JSON.stringify({ id: "evt_test", type: "checkout.session.completed", livemode: false, data: { object: { id: "cs_test_example" } } });
  const now = 1800000000000;
  const ts = String(now / 1000);
  const mac = createHmac("sha256", "whsec_test").update(`${ts}.${raw}`).digest("hex");
  const sig = `t=${ts},v1=${"0".repeat(64)},v1=${mac}`;
  assert.equal(verifyStripeEvent(raw, sig, "whsec_test", now).id, "evt_test");
  assert.throws(() => verifyStripeEvent(raw + " ", sig, "whsec_test", now), /signature/);
  assert.throws(() => verifyStripeEvent(raw, sig, "whsec_test", now + 301000), /timestamp/);
  assert.throws(() => verifyStripeEvent(raw, sig, "whsec_test", now - 301000), /timestamp/);
});
test("server claims reservation before capture and finalizes only the exact paid total", async () => {
  const f = fixture();
  assert.equal((await reconcileStripeSession(session(), f.current, f.deps)).status, "paid");
  assert.deepEqual(f.calls, ["claim", "capture", "finish"]);
});
test("wrong references, session IDs, currency, totals and intents never capture", async () => {
  for (const bad of [session({ client_reference_id: "other" }), session({ id: "cs_test_other" }), session({ currency: "eur" }), session({ amount_total: 1 }), session({ payment_intent: intent({ amount: 1 }) }), session({ payment_intent: intent({ metadata: { attempt_id: "other" } }) })]) {
    const f = fixture();
    await assert.rejects(reconcileStripeSession(bad, f.current, f.deps));
    assert.deepEqual(f.calls, []);
  }
  const f = fixture({ payment_intent_id: "pi_other" });
  await assert.rejects(reconcileStripeSession(session(), f.current, f.deps));
  assert.deepEqual(f.calls, []);
});
test("duplicate paid events and another worker's active lease do not capture", async () => {
  const paid = fixture({ status: "paid" });
  await reconcileStripeSession(session(), paid.current, paid.deps);
  assert.deepEqual(paid.calls, []);
  const leased = fixture({ status: "processing" });
  leased.deps.claim = async () => ({ acquired: false, attempt: leased.current });
  assert.equal((await reconcileStripeSession(session(), leased.current, leased.deps)).status, "processing");
  assert.deepEqual(leased.calls, []);
});
test("unknown capture outcome retains durable processing claim without releasing stock", async () => {
  const f = fixture();
  f.deps.capture = async () => { f.calls.push("capture"); throw new Error("transport interrupted after request"); };
  await assert.rejects(reconcileStripeSession(session(), f.current, f.deps), /interrupted/);
  assert.equal(f.current.status, "processing");
  assert.deepEqual(f.calls, ["claim", "capture"]);
});
test("captured payment survives failed DB finalization; retry persists without recapture", async () => {
  const f = fixture();
  const finish = f.deps.finish;
  f.deps.finish = async () => { f.calls.push("failed-finish"); throw new Error("database unavailable"); };
  await assert.rejects(reconcileStripeSession(session(), f.current, f.deps));
  assert.equal(f.current.status, "processing");
  f.deps.finish = finish;
  await reconcileStripeSession(session({ payment_intent: intent({ status: "succeeded", amount_received: 15000 }) }), f.current, f.deps);
  assert.equal(f.calls.filter((c) => c === "capture").length, 1);
  assert.equal(f.current.status, "paid");
});
test("mismatched capture response leaves reservation for reconciliation", async () => {
  const f = fixture();
  f.deps.capture = async () => intent({ status: "succeeded", amount_received: 100 });
  await assert.rejects(reconcileStripeSession(session(), f.current, f.deps), /retained/);
  assert.equal(f.current.status, "processing");
  assert.deepEqual(f.calls, ["claim"]);
});
test("reservation refused after POS shortfall cancels authorization before release", async () => {
  const f = fixture();
  f.deps.claim = async () => ({ acquired: false, attempt: f.current });
  await reconcileStripeSession(session(), f.current, f.deps);
  assert.deepEqual(f.calls, ["cancel", "expire"]);
});
test("unknown cancellation outcome retains reservation", async () => {
  const f = fixture();
  f.deps.claim = async () => ({ acquired: false, attempt: f.current });
  f.deps.cancel = async () => { throw new Error("cancel response lost"); };
  await assert.rejects(reconcileStripeSession(session(), f.current, f.deps));
  assert.equal(f.current.status, "pending");
  assert.deepEqual(f.calls, []);
});
test("late completed Checkout on expired reservation cancels its authorization", async () => {
  const f = fixture({ status: "expired" });
  await reconcileStripeSession(session(), f.current, f.deps);
  assert.deepEqual(f.calls, ["cancel"]);
  await assert.rejects(reconcileStripeSession(session({ payment_intent: intent({ status: "succeeded", amount_received: 15000 }) }), f.current, f.deps), /manual reconciliation/);
});
test("expired empty session releases safely; incomplete/authentication sessions retain holds", async () => {
  const f = fixture();
  await reconcileStripeSession(session({ status: "expired", payment_intent: null }), f.current, f.deps);
  assert.deepEqual(f.calls, ["expire"]);
  for (const waiting of [session({ status: "open" }), session({ payment_intent: intent({ status: "requires_action" }) })]) {
    const g = fixture();
    await reconcileStripeSession(waiting, g.current, g.deps);
    assert.deepEqual(g.calls, []);
  }
});

// Every transport request is intercepted. Tests can never contact Stripe.
process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
process.env.STRIPE_ACCOUNT_ID = "acct_fixture";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_fixture";
let requests: { url: string; body: URLSearchParams; headers: Headers }[] = [];
let wrongAccount = false;
let refunded = 0;
let priorRefund: { id: string; status: string; amount: number; metadata: { operation: string } } | null = null;
let freeAttempt: ReconcileAttempt | null = null;
globalThis.fetch = async (url, init) => {
  const href = String(url);
  if (freeAttempt && href.startsWith("https://payments-fixture.invalid/rest/v1/rpc/")) {
    const data = href.endsWith("/expire_stripe_checkout") ? { ...freeAttempt, status: "expired" }
      : href.endsWith("/claim_stripe_attempt") ? { acquired: true, attempt: { ...freeAttempt, status: "processing" } }
      : href.endsWith("/finish_stripe_checkout") ? { ...freeAttempt, status: "paid", result: { bookingNumber: "HF-TEST" } } : null;
    assert.ok(data, `Unexpected database request: ${href}`);
    requests.push({ url: href, body: new URLSearchParams(), headers: new Headers() });
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  }
  assert.ok(href.startsWith("https://api.stripe.com/v1/"), `Unexpected network: ${href}`);
  const body = new URLSearchParams(String(init?.body ?? ""));
  requests.push({ url: href, body, headers: new Headers(init?.headers) });
  const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  if (href.endsWith("/account")) return json({ id: wrongAccount ? "acct_wrong" : "acct_fixture", charges_enabled: true });
  if (href.endsWith("/checkout/sessions")) return json(session({ url: "https://checkout.stripe.com/c/pay/test" }));
  if (href.includes("/payment_intents/")) return json(intent({ status: "succeeded", amount_received: 15000, latest_charge: { id: "ch_test", payment_intent: "pi_test", amount: 15000, amount_refunded: refunded, currency: "usd" } }));
  if (href.includes("/refunds?")) return json({ data: priorRefund ? [priorRefund] : [], has_more: false });
  if (href.endsWith("/refunds") && init?.method === "POST") {
    priorRefund = { id: "re_test", status: "succeeded", amount: Number(body.get("amount")), metadata: { operation: body.get("metadata[operation]")! } };
    refunded += priorRefund.amount;
    return json(priorRefund);
  }
  if (href.endsWith("/refunds/re_test")) return json(priorRefund);
  throw new Error(`Unmocked Stripe request: ${href}`);
};
test("hosted Checkout checks account and uses stable manual capture, trusted returns, metadata and expiry", async () => {
  requests = [];
  const input = { id: "attempt-test", reference: "HF-TEST", kind: "shop" as const, amountCents: 15000, email: "fixture@example.com", description: "Farm shop", expiresAt: new Date(Date.now() + 2700000).toISOString() };
  await createCheckoutSession(input);
  await createCheckoutSession(input);
  assert.equal(requests.filter((r) => r.url.endsWith("/account")).length, 1);
  const checkouts = requests.filter((r) => r.url.endsWith("/checkout/sessions"));
  assert.equal(checkouts[0].body.toString(), checkouts[1].body.toString());
  assert.equal(checkouts[0].body.get("payment_intent_data[capture_method]"), "manual");
  assert.equal(checkouts[0].body.get("payment_intent_data[metadata][attempt_id]"), "attempt-test");
  assert.equal(checkouts[0].body.get("line_items[0][price_data][unit_amount]"), "15000");
  assert.equal(checkouts[0].headers.get("Idempotency-Key"), "checkout:attempt-test");
  assert.match(checkouts[0].body.get("success_url")!, /^https:\/\/highlandfarmsoregon.com\/payments\/return/);
  assert.equal(Number(checkouts[0].body.get("expires_at")), Math.floor(Date.parse(input.expiresAt) / 1000) - 300);
});
test("wrong Stripe account or untrusted return origin stops session creation", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_wrongaccount";
  wrongAccount = true;
  requests = [];
  try {
    await assert.rejects(createCheckoutSession({ id: "bad", reference: "bad", kind: "shop", amountCents: 1, email: "a@example.com", description: "test", expiresAt: new Date().toISOString() }));
    assert.equal(requests.length, 1);
  } finally { wrongAccount = false; process.env.STRIPE_SECRET_KEY = "sk_test_fixture"; }
  process.env.STRIPE_CHECKOUT_ORIGIN = "https://evil.example";
  try { assert.throws(checkoutOrigin, /origin/); } finally { delete process.env.STRIPE_CHECKOUT_ORIGIN; }
});
test("full refund uses remaining cash after manual partial refund, then replay does not refund twice", async () => {
  refunded = 5000; priorRefund = null; requests = [];
  const input = { paymentId: "pi_test", amountCents: 15000, idempotencyKey: "cancel-fixture" };
  const first = await refundStripePayment(input);
  assert.equal(first.status, "succeeded");
  assert.equal(first.refundedCents, 15000);
  assert.equal(requests.find((r) => r.body.has("amount"))?.body.get("amount"), "10000");
  await refundStripePayment(input);
  assert.equal(requests.filter((r) => r.body.has("amount")).length, 1);
});
test("pending refund operation is reused rather than duplicated; wrong amount cannot refund", async () => {
  refunded = 0;
  priorRefund = { id: "re_test", status: "pending", amount: 15000, metadata: { operation: "cancel-pending" } };
  requests = [];
  const result = await refundStripePayment({ paymentId: "pi_test", amountCents: 15000, idempotencyKey: "cancel-pending" });
  assert.equal(result.status, "pending");
  assert.equal(requests.filter((r) => r.body.has("amount")).length, 0);
  await assert.rejects(refundStripePayment({ paymentId: "pi_test", amountCents: 14999, idempotencyKey: "cancel-other" }));
  assert.equal((await getPaymentCharge("pi_test"))?.amount_refunded, 0);
});

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
  try { return nextResolve(specifier, context); } catch (error) {
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
    }
    throw error;
  }
} });
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://payments-fixture.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-placeholder";
const { reconcileAttempt, publicAttempt } = await import("../src/lib/payments/service.ts");
test("abandoned zero-charge reservation expires; interrupted processing recovers with no Stripe request", async () => {
  requests = [];
  const expired = { ...fixture().current, due_cents: 0, expires_at: new Date(Date.now() - 60000).toISOString(), kind: "booking" as const, result: null };
  freeAttempt = expired;
  try {
    assert.equal((await reconcileAttempt(expired as never)).status, "expired");
    assert.deepEqual(requests.map((r) => r.url.split("/").pop()), ["expire_stripe_checkout"]);
    requests = [];
    freeAttempt = { ...expired, status: "processing" };
    const paid = await reconcileAttempt(freeAttempt as never);
    assert.equal(paid.status, "paid");
    assert.equal(publicAttempt(paid).result?.amountCents, 0);
    assert.deepEqual(requests.map((r) => r.url.split("/").pop()), ["claim_stripe_attempt", "finish_stripe_checkout"]);
  } finally { freeAttempt = null; }
});
