import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { generateKeyPairSync } from "node:crypto";
import type { StripeAttempt } from "../src/lib/payments/store.ts";

const root = new URL("../", import.meta.url);
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(new URL(`src/${specifier.slice(2)}.ts`, root).href, context);
  try { return nextResolve(specifier, context); } catch (error) {
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
    }
    throw error;
  }
} });
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://cancel-effects-fixture.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "local-fixture-only";
process.env.RESEND_API_KEY = "re_local_fixture_only";
process.env.GA4_MEASUREMENT_ID = "";
process.env.META_PIXEL_ID = "";
const { notifyPaidAttempt } = await import("../src/lib/payments/service.ts");

type Row = { id: string; stripe_attempt_id: string; stripe_payment_intent_id: string | null; product_slug: string; starts_at: string; duration_min: number; status: string };
let attempt: StripeAttempt;
let rows: Row[] = [];
let emailFails = false;
let freezeCancels = false;
let suppressFails = false;
let calls: { url: string; method: string; body: Record<string, unknown> }[] = [];
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
globalThis.fetch = async (input, init) => {
  const url = String(input); const method = init?.method ?? "GET";
  const raw = String(init?.body ?? "");
  const body = raw.startsWith("{") ? JSON.parse(raw) : {};
  calls.push({ url, method, body });
  if (url === "https://api.resend.com/emails") return emailFails ? json({ name: "fixture_error", message: "Email unavailable" }, 503) : json({ id: "fixture-mail" });
  if (url === "https://oauth2.googleapis.com/token") return json({ access_token: "fixture-only" });
  if (url.startsWith("https://www.googleapis.com/calendar/v3/calendars/primary/events")) return json({ id: body.id, hangoutLink: "https://meet.fixture.invalid/captured" });
  assert.ok(url.startsWith("https://cancel-effects-fixture.invalid/rest/v1/"), "Unexpected external request blocked");
  if (url.includes("/bookings?") && method === "GET") return json(rows);
  if (url.includes("/bookings?") && method === "PATCH") return new Response(null, { status: 204 });
  if (url.endsWith("/rpc/set_stripe_effects_data")) {
    attempt.snapshot.effectsData ??= body.p_data;
    if (freezeCancels) rows.forEach(row => { row.status = "cancelled"; });
    return json(attempt.snapshot.effectsData);
  }
  if (url.endsWith("/rpc/suppress_stripe_booking_confirmation")) {
    if (suppressFails) return json({ code: "P0001", message: "Fixture suppression failure" }, 503);
    assert.equal(rows.every(row => row.status === "cancelled"), true);
    Object.assign(attempt, { confirmation_suppressed_at: new Date().toISOString() });
    return json(attempt);
  }
  if (url.includes("/stripe_checkout_attempts?") && method === "PATCH") {
    if (body.notified_at) attempt.notified_at = String(body.notified_at);
    return new Response(null, { status: 204 });
  }
  if (url.includes("/tracking_events")) return json({ code: "23505", message: "Already tracked" }, 409);
  throw new Error("Unexpected fixture request");
};

function setup(product = "farm-tour", combo = false) {
  process.env.GOOGLE_SA_EMAIL = ""; process.env.GOOGLE_SA_PRIVATE_KEY = "";
  calls = []; emailFails = freezeCancels = suppressFails = false;
  const id = "00000000-0000-4000-8000-000000000010";
  const legs = [{ product_slug: product, starts_at: "2027-01-02T18:00:00Z", duration_min: 60, amount_cents: product === "wedding-call" ? 0 : 15000 }];
  if (combo) legs.push({ product_slug: "nordic-spa", starts_at: "2027-01-02T20:00:00Z", duration_min: 90, amount_cents: 15000 });
  rows = legs.map((leg, index) => ({ ...leg, id: `00000000-0000-4000-8000-00000000002${index}`, stripe_attempt_id: id, stripe_payment_intent_id: product === "wedding-call" ? null : "pi_fixture", status: "confirmed" }));
  attempt = {
    id, kind: "booking", status: "paid", reference: "HFB-FIXTURE", idempotency_key: "fixture", request_hash: "fixture",
    amount_cents: product === "wedding-call" ? 0 : 15000, due_cents: product === "wedding-call" ? 0 : 15000,
    gift_code: null, gift_units: 0, gift_applied_cents: 0, stock_items: [], booking_ids: rows.map(row => row.id),
    session_id: product === "wedding-call" ? null : "cs_test_fixture", payment_intent_id: product === "wedding-call" ? null : "pi_fixture",
    created_at: "2026-10-09T20:00:00Z", updated_at: "2026-10-09T20:00:00Z", expires_at: "2026-10-09T20:45:00Z", processing_until: null,
    result: {}, notified_at: null, square_synced_at: null, refunded_cents: 0,
    snapshot: { product, legs, customer: { email: "fixture@example.invalid", phone: "5035550000", location_choice: "meet" }, tracking: { referralSource: "fixture" },
      emailData: { bookingNumber: "HFB-FIXTURE", product, legs: legs.map(leg => ({ productSlug: leg.product_slug, startsAt: leg.starts_at, durationMin: leg.duration_min })), partySize: 2, customerName: "Synthetic Fixture", customerEmail: "fixture@example.invalid", customerPhone: "5035550000", totalCents: 15000, giftAppliedCents: 0, paidCents: 15000, locationChoice: "meet" } },
  };
  return attempt;
}
const emails = () => calls.filter(call => call.url === "https://api.resend.com/emails");
const invites = () => calls.filter(call => call.url.startsWith("https://www.googleapis.com/calendar/") && call.method === "POST");

test("failed confirmation followed by farm cancellation suppresses deferred confirmation without claiming delivery", async t => {
  t.mock.method(console, "error", () => {});
  setup(); emailFails = true;
  await assert.rejects(notifyPaidAttempt(attempt));
  assert.equal(attempt.notified_at, null);
  rows.forEach(row => { row.status = "cancelled"; });
  attempt.refunded_cents = attempt.due_cents;
  emailFails = false; calls = [];
  await notifyPaidAttempt(attempt);
  assert.equal(emails().length, 0);
  assert.equal(invites().length, 0);
  assert.equal(attempt.notified_at, null);
  assert.ok((attempt as StripeAttempt & { confirmation_suppressed_at?: string }).confirmation_suppressed_at);
  assert.equal(attempt.status, "paid");
  assert.equal(attempt.refunded_cents, attempt.due_cents);
});
test("cancelled wedding call never creates deferred Calendar invitation", async () => {
  setup("wedding-call"); rows[0].status = "cancelled";
  process.env.GOOGLE_SA_EMAIL = "fixture@local.invalid";
  process.env.GOOGLE_SA_PRIVATE_KEY = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ format: "pem", type: "pkcs8" }).toString();
  await notifyPaidAttempt(attempt);
  assert.equal(invites().length, 0); assert.equal(emails().length, 0);
});
test("active failed confirmation can still retry and mark actual delivery", async t => {
  t.mock.method(console, "error", () => {});
  setup(); emailFails = true;
  await assert.rejects(notifyPaidAttempt(attempt));
  emailFails = false; calls = [];
  await notifyPaidAttempt(attempt);
  assert.equal(emails().length, 2); assert.ok(attempt.notified_at);
});
test("active wedding call still creates its Calendar invitation and confirmations", async () => {
  setup("wedding-call");
  process.env.GOOGLE_SA_EMAIL = "fixture@local.invalid";
  process.env.GOOGLE_SA_PRIVATE_KEY = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ format: "pem", type: "pkcs8" }).toString();
  await notifyPaidAttempt(attempt);
  assert.equal(invites().length, 1); assert.equal(emails().length, 2);
  assert.ok(attempt.notified_at); assert.equal(attempt.confirmation_suppressed_at, undefined);
});
test("cancellation during payload freezing is checked again before email", async () => {
  setup(); freezeCancels = true;
  await notifyPaidAttempt(attempt);
  assert.equal(emails().length, 0); assert.equal(attempt.notified_at, null);
});
test("missing, duplicate, mismatched or partially cancelled bound legs fail closed", async () => {
  const mutations = [
    () => { rows = []; },
    () => { rows.push({ ...rows[0] }); },
    () => { rows[0].stripe_attempt_id = "another-attempt"; },
    () => { rows[0].stripe_payment_intent_id = "pi_other"; },
    () => { rows[0].starts_at = "2027-01-02T19:00:00Z"; },
    () => { rows[0].status = "completed"; },
    () => { rows[0].status = "cancelled"; },
  ];
  for (const mutate of mutations) {
    setup("farm-tour", true); mutate();
    await assert.rejects(notifyPaidAttempt(attempt));
    assert.equal(emails().length, 0); assert.equal(invites().length, 0);
    assert.equal(attempt.notified_at, null);
  }
});
test("failed durable suppression remains retryable rather than marking delivered", async () => {
  setup(); rows[0].status = "cancelled"; suppressFails = true;
  await assert.rejects(notifyPaidAttempt(attempt));
  assert.equal(emails().length, 0); assert.equal(attempt.notified_at, null);
  suppressFails = false;
  await notifyPaidAttempt(attempt);
  assert.equal(emails().length, 0);
});
