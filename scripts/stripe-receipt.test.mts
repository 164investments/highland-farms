import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") return nextResolve(`${specifier}.js`, context);
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
  try { return nextResolve(specifier, context); } catch (error) {
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
    }
    throw error;
  }
} });
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://receipt-fixture.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "local-fixture-only";
process.env.STRIPE_SECRET_KEY = "sk_test_receipt_fixture";
process.env.STRIPE_ACCOUNT_ID = "acct_receipt_fixture";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_receipt_fixture";
const { reconcileSession } = await import("../src/lib/payments/service.ts");
const { StripeError } = await import("../src/lib/payments/stripe.ts");
const { GET } = await import("../src/app/api/payments/stripe/status/route.ts");

const sessionId = "cs_test_MatrixUnknownReceipt";
const attemptId = "00000000-0000-4000-8000-000000000001";
const session = {
  id: sessionId, livemode: false, client_reference_id: attemptId,
  metadata: { attempt_id: attemptId }, payment_intent: "pi_receiptFixture",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
const request = () => new Request(`https://receipt-fixture.invalid/api/payments/stripe/status?session_id=${sessionId}`);

function intercept(t: TestContext, handler: (url: URL) => Response | Promise<Response>) {
  const calls: URL[] = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.ok(url.origin === "https://api.stripe.com" || url.origin === "https://receipt-fixture.invalid", "Unexpected external request blocked");
    calls.push(url);
    return handler(url);
  });
  return calls;
}

test("nonexistent canonical Checkout session returns no receipt without accessing reservations", async t => {
  const calls = intercept(t, () => json({ error: { code: "resource_missing" } }, 404));
  assert.equal(await reconcileSession(sessionId), null);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].pathname, `/v1/checkout/sessions/${sessionId}`);
});

test("status route returns 404 for a valid but nonexistent Checkout session", async t => {
  intercept(t, () => json({ error: { code: "resource_missing" } }, 404));
  const response = await GET(request());
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Receipt not found." });
});

test("temporary initial Stripe failure stays retryable in reconciliation and status route", async t => {
  intercept(t, () => json({ error: { code: "api_error" } }, 503));
  await assert.rejects(reconcileSession(sessionId), error => error instanceof StripeError && error.status === 503);
  const response = await GET(request());
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /still in progress/);
});

test("an untyped initial transport failure with status 404 is not treated as a missing session", async t => {
  const failure = Object.assign(new Error("Fixture transport failure"), { status: 404 });
  intercept(t, () => { throw failure; });
  await assert.rejects(reconcileSession(sessionId), error => error === failure);
});

test("a later missing payment intent remains an error and a retryable receipt response", async t => {
  const calls = intercept(t, url => {
    if (url.pathname.startsWith("/v1/checkout/sessions/")) return json(session);
    if (url.pathname === "/rest/v1/stripe_checkout_attempts") return json({ id: attemptId, status: "expired" });
    assert.equal(url.pathname, "/v1/payment_intents/pi_receiptFixture");
    return json({ error: { code: "resource_missing" } }, 404);
  });
  await assert.rejects(reconcileSession(sessionId), error => error instanceof StripeError && error.status === 404);
  assert.equal(calls.length, 3);
  assert.equal((await GET(request())).status, 503);
});

test("a later database 404 remains a reconciliation error and retryable receipt response", async t => {
  intercept(t, url => {
    if (url.pathname.startsWith("/v1/checkout/sessions/")) return json(session);
    assert.equal(url.pathname, "/rest/v1/stripe_checkout_attempts");
    return json({ code: "42P01", message: "Fixture relation unavailable" }, 404);
  });
  await assert.rejects(reconcileSession(sessionId), error => (error as { code?: string }).code === "42P01");
  assert.equal((await GET(request())).status, 503);
});
