import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Exercise the real route, repositories, transports and email renderer. Every
// outbound request below is intercepted; an unexpected destination fails.
const root = new URL("../", import.meta.url);
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "next/server" || specifier === "next/headers") return nextResolve(`${specifier}.js`, context);
  if (specifier.startsWith("@/")) return nextResolve(new URL(`src/${specifier.slice(2)}.ts`, root).href, context);
  try { return nextResolve(specifier, context); } catch (error) {
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
    }
    throw error;
  }
} });

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://stripe-admin-tests.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "stripe-admin-test-placeholder";
process.env.SHOP_ADMIN_TOKEN = "stripe-admin-test-token";
process.env.STRIPE_SECRET_KEY = "sk_test_admin_placeholder";
process.env.STRIPE_ACCOUNT_ID = "acct_admin_test";
process.env.RESEND_API_KEY = "re_stripe_admin_placeholder";
process.env.SQUARE_ACCESS_TOKEN = "square-admin-test-placeholder";
process.env.SQUARE_LOCATION_ID = "square-admin-test-location";

const bookingId = "00000000-0000-4000-8000-000000000001";
const secondId = "00000000-0000-4000-8000-000000000002";
const attemptId = "00000000-0000-4000-8000-000000000003";
const comboId = "00000000-0000-4000-8000-000000000004";
type Mode = "succeeded" | "failed" | "pending" | "prior-pending" | "gateway-error" | "already" | "free" | "legacy";
type Call = { url: URL; method: string; body: string; headers: Headers };
let mode: Mode = "succeeded";
let calls: Call[] = [];
let bookingStatus = "confirmed";
let capturedRefund = 0;
let giftRestorations = 0;
let successfulCancellations = 0;
let secondStatus: string | null = null;

function reset(nextMode: Mode) {
  mode = nextMode; calls = []; bookingStatus = "confirmed";
  capturedRefund = mode === "already" ? 20000 : 0;
  giftRestorations = 0; successfulCancellations = 0;
  secondStatus = null;
}
function targetRow() {
  return {
    id: bookingId, booking_number: "HFB-ADMIN-TEST-1", product_slug: "farm-tour",
    starts_at: "2027-01-01T18:00:00.000Z", duration_min: 60, party_size: 2, units: 1,
    status: bookingStatus, first_name: "Test", last_name: "Guest", email: "guest@example.invalid",
    phone: "5035550100", amount_cents: 15000, square_payment_id: mode === "legacy" ? "square-admin-payment" : null,
    stripe_payment_intent_id: mode === "legacy" || mode === "free" ? null : "pi_admin",
    stripe_attempt_id: mode === "legacy" ? null : attemptId, refunded_cents: capturedRefund,
    gift_certificate_code: mode === "legacy" ? null : "ADMIN-GIFT", gift_amount_cents: mode === "legacy" ? 0 : 10000,
    referral_source: "Friend", source: "native", notes: null,
    combo_group: mode === "legacy" ? null : comboId, created_at: "2026-10-09T20:00:00.000Z",
  };
}
function attempt() {
  return {
    id: attemptId, kind: "booking", status: "paid", reference: "HFB-ADMIN-TEST",
    booking_ids: [bookingId, secondId], due_cents: mode === "free" ? 0 : 20000,
    amount_cents: 30000, payment_intent_id: mode === "free" ? null : "pi_admin",
    gift_code: "ADMIN-GIFT", gift_units: 10000, gift_applied_cents: mode === "free" ? 30000 : 10000,
    refunded_cents: capturedRefund,
  };
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  const method = init?.method ?? "GET";
  const body = String(init?.body ?? "");
  calls.push({ url, method, body, headers: new Headers(init?.headers) });
  if (url.origin === "https://stripe-admin-tests.invalid") {
    if (url.pathname === "/rest/v1/bookings" && method === "GET") return json(url.searchParams.has("id") && url.searchParams.get("id")?.startsWith("in.")
      ? [targetRow(), { ...targetRow(), id: secondId, product_slug: "nordic-spa", status: secondStatus ?? bookingStatus }] : targetRow());
    if (url.pathname === "/rest/v1/stripe_checkout_attempts" && method === "GET") return json(attempt());
    if (url.pathname === "/rest/v1/rpc/record_stripe_refund" && method === "POST") {
      assert.deepEqual(JSON.parse(body), { p_payment_intent_id: "pi_admin", p_refunded_cents: capturedRefund });
      return json(true);
    }
    if (url.pathname === "/rest/v1/rpc/cancel_stripe_booking" && method === "POST") {
      assert.deepEqual(JSON.parse(body), { p_attempt_id: attemptId, p_reason: "Farm weather closure" });
      const first = bookingStatus === "confirmed";
      if (first) { bookingStatus = "cancelled"; giftRestorations++; successfulCancellations++; }
      return json({ cancelledIds: first ? [bookingId, secondId] : [], bookingNumber: "HFB-ADMIN-TEST",
        customerName: "Test Guest", customerEmail: "guest@example.invalid", giftRestored: first,
        legs: [{ productSlug: "farm-tour", startsAt: "2027-01-01T18:00:00.000Z" }, { productSlug: "nordic-spa", startsAt: "2027-01-01T20:00:00.000Z" }] });
    }
    if (url.pathname === "/rest/v1/bookings" && method === "PATCH") {
      assert.equal(mode, "legacy", "Stripe cancellation must use the atomic RPC");
      assert.equal(url.searchParams.get("status"), "eq.confirmed");
      assert.equal(JSON.parse(body).status, "cancelled");
      bookingStatus = "cancelled";
      return json(targetRow());
    }
    if (url.pathname === "/rest/v1/booking_audit" && method === "POST") return new Response(null, { status: 204 });
  }
  if (url.origin === "https://api.stripe.com") {
    assert.notEqual(mode, "legacy"); assert.notEqual(mode, "free");
    if (url.pathname === "/v1/account") return json({ id: "acct_admin_test", charges_enabled: true });
    if (url.pathname === "/v1/payment_intents/pi_admin") return json({ id: "pi_admin", amount: 20000, amount_received: 20000, currency: "usd", status: "succeeded",
      latest_charge: { id: "ch_admin", payment_intent: "pi_admin", amount: 20000, amount_refunded: capturedRefund, currency: "usd" } });
    if (url.pathname === "/v1/refunds" && method === "GET") return json({ has_more: false, data: mode === "prior-pending" ? [{ id: "re_prior", status: "pending", amount: 20000, metadata: { operation: `booking-cancel-${attemptId}` } }] : [] });
    if (url.pathname === "/v1/refunds" && method === "POST") {
      const fields = new URLSearchParams(body);
      assert.equal(fields.get("payment_intent"), "pi_admin");
      assert.equal(fields.get("amount"), "20000");
      assert.equal(fields.get("metadata[operation]"), `booking-cancel-${attemptId}`);
      assert.equal(new Headers(init?.headers).get("idempotency-key"), `booking-cancel-${attemptId}:20000`);
      if (mode === "gateway-error") return json({ error: { code: "fixture_failure" } }, 500);
      if (mode === "succeeded") capturedRefund = 20000;
      return json({ id: "re_admin", status: mode, amount: 20000 });
    }
    if (url.pathname === "/v1/refunds/re_admin" && method === "GET") return json({ id: "re_admin", status: mode, amount: 20000 });
  }
  if (url.origin === "https://connect.squareup.com" && url.pathname === "/v2/refunds" && method === "POST") {
    assert.equal(mode, "legacy");
    assert.equal(JSON.parse(body).payment_id, "square-admin-payment");
    assert.equal(JSON.parse(body).amount_money.amount, 15000);
    return json({ refund: { id: "square-admin-refund", status: "COMPLETED" } });
  }
  if (url.origin === "https://api.resend.com" && url.pathname === "/emails" && method === "POST") return json({ id: "email-admin-test" });
  throw new Error(`Unexpected mocked request: ${method} ${url}`);
};

const { POST } = await import("../src/app/api/shop/admin/booking/cancel/route.ts");
function request(authorized = true, refund = true) {
  return new Request("https://highlandfarmsoregon.com/api/shop/admin/booking/cancel", {
    method: "POST", headers: { "Content-Type": "application/json", ...(authorized ? { Authorization: "Bearer stripe-admin-test-token" } : {}) },
    body: JSON.stringify({ id: bookingId, refund, reason: "Farm weather closure" }),
  });
}
const cancelCalls = () => calls.filter(c => c.url.pathname === "/rest/v1/rpc/cancel_stripe_booking");
const refundWrites = () => calls.filter(c => c.url.origin === "https://api.stripe.com" && c.url.pathname === "/v1/refunds" && c.method === "POST");
const emails = () => calls.filter(c => c.url.origin === "https://api.resend.com");

test("unauthorized cancellation returns 401 before any reads or writes", async () => {
  reset("succeeded");
  assert.equal((await POST(request(false))).status, 401);
  assert.equal(calls.length, 0);
  assert.equal(bookingStatus, "confirmed");
});

for (const consumed of ["completed", "no_show"] as const) {
  test(`${consumed} booking cannot trigger a Stripe refund or gift restoration`, async () => {
    reset("succeeded"); bookingStatus = consumed;
    assert.equal((await POST(request())).status, 409);
    assert.equal(calls.filter((c) => c.url.origin === "https://api.stripe.com").length, 0);
    assert.equal(cancelCalls().length, 0);
    assert.equal(giftRestorations, 0);
  });
}
test("a consumed sibling blocks whole-combo refund before gateway access", async () => {
  reset("succeeded"); secondStatus = "completed";
  assert.equal((await POST(request())).status, 409);
  assert.equal(calls.filter((c) => c.url.origin === "https://api.stripe.com").length, 0);
  assert.equal(cancelCalls().length, 0);
  assert.equal(bookingStatus, "confirmed");
});

for (const failure of ["gateway-error", "failed", "pending", "prior-pending"] as const) {
  test(`${failure} Stripe refund preserves the whole booking and gift`, async t => {
    t.mock.method(console, "error", () => {});
    reset(failure);
    const response = await POST(request());
    assert.equal(response.status, failure === "gateway-error" ? 500 : 409);
    assert.equal(bookingStatus, "confirmed");
    assert.equal(cancelCalls().length, 0);
    assert.equal(successfulCancellations, 0);
    assert.equal(giftRestorations, 0);
    assert.equal(emails().length, 0);
    assert.equal(refundWrites().length, failure === "prior-pending" ? 0 : 1);
    assert.equal(calls.filter(c => c.url.pathname === "/rest/v1/bookings" && c.method !== "GET").length, 0);
  });
}

test("successful canonical refund precedes atomic combo cancellation and one gift restoration", async () => {
  reset("succeeded");
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, cancelledIds: [bookingId, secondId], refunded: true, refundId: "re_admin", refundError: null, giftRestored: true });
  const persisted = calls.findIndex(c => c.url.pathname === "/rest/v1/rpc/record_stripe_refund");
  const cancelled = calls.findIndex(c => c.url.pathname === "/rest/v1/rpc/cancel_stripe_booking");
  const lastChargeRead = calls.findLastIndex(c => c.url.pathname === "/v1/payment_intents/pi_admin");
  assert.ok(lastChargeRead < persisted && persisted < cancelled);
  assert.equal(successfulCancellations, 1); assert.equal(giftRestorations, 1);
  assert.equal(emails().length, 1);
  const email = JSON.parse(emails()[0].body);
  assert.match(email.html, /full refund is on its way/);
  assert.match(email.html, /gift certificate has been restored/);
  assert.match(email.html, /Private Farm Tour/); assert.match(email.html, /Nordic Forest Spa/);
  assert.equal(calls.filter(c => c.url.origin === "https://connect.squareup.com").length, 0);
});

test("retry after completed refund/cancellation sends no second refund, restore, or email", async () => {
  reset("succeeded");
  assert.equal((await POST(request())).status, 200);
  const response = await POST(request());
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.cancelledIds, []); assert.equal(result.refunded, true); assert.equal(result.giftRestored, false);
  assert.equal(refundWrites().length, 1); assert.equal(cancelCalls().length, 2);
  assert.equal(successfulCancellations, 1); assert.equal(giftRestorations, 1); assert.equal(emails().length, 1);
});

test("already-refunded payment completes a still-confirmed booking without another gateway refund", async () => {
  reset("already");
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).refunded, true);
  assert.equal(refundWrites().length, 0); assert.equal(cancelCalls().length, 1); assert.equal(giftRestorations, 1);
});

test("zero-charge cancellation uses its Stripe attempt and restores gift without payment calls", async () => {
  reset("free");
  const response = await POST(request());
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.refunded, false); assert.equal(result.giftRestored, true);
  assert.equal(cancelCalls().length, 1); assert.equal(giftRestorations, 1);
  assert.equal(calls.filter(c => ["https://api.stripe.com", "https://connect.squareup.com"].includes(c.url.origin)).length, 0);
  assert.equal(calls.filter(c => c.url.pathname === "/rest/v1/rpc/record_stripe_refund").length, 0);
});

test("legacy Square booking keeps the Square refund path without Stripe calls", async () => {
  reset("legacy");
  const response = await POST(request());
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.refunded, true); assert.equal(result.refundId, "square-admin-refund");
  assert.equal(calls.filter(c => c.url.origin === "https://connect.squareup.com").length, 1);
  assert.equal(calls.filter(c => c.url.origin === "https://api.stripe.com").length, 0);
  assert.equal(cancelCalls().length, 0); assert.equal(emails().length, 1);
});
