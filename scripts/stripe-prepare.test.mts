import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash, generateKeyPairSync } from "node:crypto";
import type { StripeAttempt } from "../src/lib/payments/store.ts";

// Native Node test runner, with the same source aliases Next/TypeScript use.
const root = new URL("../", import.meta.url);
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(new URL(`src/${specifier.slice(2)}.ts`, root).href, context);
  try { return nextResolve(specifier, context); } catch (error) {
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(pathToFileURL(fileURLToPath(candidate)).href, context);
    }
    throw error;
  }
} });
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://stripe-tests.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "stripe-test-placeholder";
process.env.NEXT_PUBLIC_NATIVE_CALENDAR = "true";
process.env.RESEND_API_KEY = "re_stripe_test_placeholder";
process.env.SQUARE_ACCESS_TOKEN = "square-test-placeholder";
process.env.SQUARE_LOCATION_ID = "square-test-location";

const { parseCheckoutInput, checkoutRequestHash, prepareCheckout, CheckoutError } = await import("../src/lib/payments/prepare.ts");
const { pacificDateStr } = await import("../src/lib/booking/time.ts");
const { sendBookingEmails } = await import("../src/lib/booking/confirmation-email.ts");
const { sendOrderEmails } = await import("../src/lib/shop/order-email.ts");
const { sendGiftEmails } = await import("../src/lib/booking/gift-email.ts");
const { sendCheckoutEffects } = await import("../src/lib/payments/effects.ts");
const { createWeddingCallEvent } = await import("../src/lib/booking/google-calendar.ts");

const date = pacificDateStr(new Date(Date.now() + 7 * 86400000));
const shop = { kind: "shop", idempotencyKey: "stripe-test-cart", fulfillment: "pickup", customer: { name: " Test Buyer ", email: "buyer@example.com", phone: "9715550100" }, items: [{ variantId: "SQ2659367", quantity: 1 }] };
const booking = { kind: "booking", idempotencyKey: "stripe-test-booking", product: "farm-tour", date, time: "10:00", partySize: 2, customer: { firstName: "Test", lastName: "Guest", email: "guest@example.com", phone: "9715550100" }, referralSource: "Friend", policyAgreed: true };
const gift = { kind: "gift", idempotencyKey: "stripe-test-gift", productId: "tour-for-two", purchaser: { name: "Test Buyer", email: "buyer@example.com" } };
let calls: { url: string; method: string; body: string; headers: Headers }[] = [];
let mappingFails = false;
let emailFails = false;
let blackout = false;
let effectsMode = false;
let frozenShopEffectsData: Record<string, unknown> | null = null;
let adjustmentFailures = 0;
let inventoryMissingTimestamp = false;
let adjustmentApiErrors = false;
let calendarMode = false;
let calendarEventId = "";
globalThis.fetch = async (input, init) => {
  const url = String(input);
  const method = init?.method ?? "GET";
  calls.push({ url, method, body: String(init?.body ?? ""), headers: new Headers(init?.headers) });
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  if (url.startsWith("https://api.resend.com/emails")) return emailFails ? json({ name: "validation_error", message: "Simulated failure" }, 422) : json({ id: "test-email" });
  if (calendarMode && url === "https://oauth2.googleapis.com/token") return json({ access_token: "test-token" });
  if (calendarMode && url.startsWith("https://www.googleapis.com/calendar/v3/calendars/primary/events")) {
    if (method === "POST") { calendarEventId = JSON.parse(String(init?.body)).id; return json({ error: { message: "Already exists" } }, 409); }
    return json({ id: calendarEventId, hangoutLink: "https://meet.google.com/test-meet-link" });
  }
  if (effectsMode && url === "https://connect.squareup.com/v2/inventory/changes/batch-create") {
    if (adjustmentFailures > 0) { adjustmentFailures--; throw new Error("Simulated unknown inventory outcome"); }
    if (adjustmentApiErrors) return json({ errors: [{ code: "FIXTURE_ERROR", detail: "Simulated partial response" }] });
    return json({ counts: [] });
  }
  if (effectsMode && url === "https://connect.squareup.com/v2/inventory/counts/batch-retrieve") return json({ counts: [{ catalog_object_id: "square-test-plush", location_id: "square-test-location", state: "IN_STOCK", quantity: "9", ...(inventoryMissingTimestamp ? {} : { calculated_at: new Date().toISOString().replace("Z", "123456Z") }) }] });
  assert.ok(url.startsWith("https://stripe-tests.invalid/rest/v1/"), `Unexpected external request: ${url}`);
  if (effectsMode && (url.includes("/rpc/mark_cart_recovered") || url.includes("/rpc/sync_square_stock"))) return json(1);
  if (effectsMode && url.includes("/rpc/set_stripe_effects_data")) {
    frozenShopEffectsData ??= JSON.parse(String(init?.body)).p_data;
    return json(frozenShopEffectsData);
  }
  if (effectsMode && url.includes("/stripe_checkout_attempts?") && method === "PATCH") return new Response(null, { status: 204 });
  assert.equal(method, "GET", "Preparation may only read state");
  if (url.includes("/shop_inventory?")) return mappingFails ? json({ message: "Simulated mapping failure" }, 503) : json([{ variant_id: "SQ2659367", square_variation_id: "square-test-plush" }]);
  if (url.includes("/booking_schedule_exceptions?")) return json([
    { product_slug: "farm-tour", on_date: date, start_times: ["10:00", "11:00"], capacity: 1 },
    { product_slug: "nordic-spa", on_date: date, start_times: ["11:00", "11:30", "12:00"], capacity: 6 },
    { product_slug: "wedding-call", on_date: date, start_times: ["10:00"], capacity: 1 },
  ]);
  if (url.includes("/booking_blackouts?")) return json(blackout ? [{ kind: "closed", starts_on: date, ends_on: date, product_slugs: ["farm-tour"] }] : []);
  if (url.includes("/booking_schedules?") || url.includes("/bookings?")) return json([]);
  if (url.includes("/booking_timed_blackouts?")) return json([]);
  throw new Error(`Unexpected mocked request: ${url}`);
};

test("retry hash binds customer/commercial details and ignores client price/payment/tracking noise", () => {
  const original = checkoutRequestHash(parseCheckoutInput(shop));
  assert.equal(checkoutRequestHash(parseCheckoutInput({ ...shop, idempotencyKey: "another-test-key", sourceId: "untrusted-token", amountCents: 1, attribution: { utm_source: "new" }, clientId: "new", referer: "https://example.com" })), original);
  assert.notEqual(checkoutRequestHash(parseCheckoutInput({ ...shop, customer: { ...shop.customer, email: "other@example.com" } })), original);
  assert.notEqual(checkoutRequestHash(parseCheckoutInput({ ...shop, items: [{ variantId: "SQ2659367", quantity: 2 }] })), original);
});
test("duplicate SKU normalization binds equivalent carts identically and rejects combined quantities over 99", () => {
  const one = parseCheckoutInput({ ...shop, items: [{ variantId: "SQ2659367", quantity: 2 }] });
  const two = parseCheckoutInput({ ...shop, items: [...shop.items, ...shop.items] });
  assert.equal(checkoutRequestHash(one), checkoutRequestHash(two));
  assert.throws(() => parseCheckoutInput({ ...shop, items: [{ variantId: "SQ2659367", quantity: 60 }, { variantId: "SQ2659367", quantity: 40 }] }), /more than we can sell/);
});
test("shop uses catalog price, snakecase persistence data, linked Square inventory, and no writes", async () => {
  calls = [];
  const result = await prepareCheckout({ ...shop, amountCents: 1, items: [{ variantId: "SQ2659367", quantity: 3 }] });
  assert.equal(result.quiet, false);
  if (result.quiet) return;
  assert.equal(result.amountCents, 19500);
  assert.equal(result.snapshot.order.total_cents, 19500);
  assert.equal(result.snapshot.items[0].quantity, 3);
  assert.deepEqual(result.snapshot.squareLines, [{ squareVariationId: "square-test-plush", quantity: 3 }]);
  assert.match(result.reference, /^HF-\d{6}-[0-9A-F]{16}$/);
  assert.equal(calls.length, 1);
});
test("shop delivery requires an address, allowed ZIP and minimum subtotal; adds canonical fee", async () => {
  await assert.rejects(prepareCheckout({ ...shop, fulfillment: "delivery" }), /delivery address/);
  await assert.rejects(prepareCheckout({ ...shop, fulfillment: "delivery", delivery: { address: "Test", city: "Test", zip: "10001" } }), /don't deliver/);
  await assert.rejects(prepareCheckout({ ...shop, fulfillment: "delivery", delivery: { address: "Test", city: "Test", zip: "97011" }, items: [{ variantId: "SQ7516247", quantity: 1 }] }), /Local delivery starts/);
  const delivered = await prepareCheckout({ ...shop, fulfillment: "delivery", delivery: { address: "Test", city: "Test", zip: "97011" } });
  if (delivered.quiet) throw new Error("unexpected");
  assert.equal(delivered.amountCents, 8000);
});
test("mapping read failures stop shop preparation instead of silently losing inventory effects", async (t) => {
  t.mock.method(console, "error", () => {});
  mappingFails = true;
  try { await assert.rejects(prepareCheckout(shop), /mapping read failed/); } finally { mappingFails = false; }
});
test("honeypots quietly succeed without any database request", async () => {
  calls = [];
  for (const input of [shop, booking, gift]) assert.equal((await prepareCheckout({ ...input, website: "bot" })).quiet, true);
  assert.equal(calls.length, 0);
});
test("native booking/gift kill switch returns 404 before reads", async () => {
  process.env.NEXT_PUBLIC_NATIVE_CALENDAR = "false";
  calls = [];
  try {
    for (const input of [booking, gift]) await assert.rejects(prepareCheckout(input), (error) => error instanceof CheckoutError && error.status === 404);
    assert.equal(calls.length, 0);
  } finally { process.env.NEXT_PUBLIC_NATIVE_CALENDAR = "true"; }
});
test("booking derives party price/units and UTC slot, and normalizes gift code", async () => {
  const result = await prepareCheckout({ ...booking, giftCode: " hfgc-test-code ", amountCents: 1 });
  assert.equal(result.quiet, false);
  if (result.quiet) return;
  assert.equal(result.amountCents, 15000);
  assert.equal(result.snapshot.legs[0].party_size, 2);
  assert.equal(result.snapshot.legs[0].units, 1);
  assert.equal(pacificDateStr(new Date(result.snapshot.legs[0].starts_at)), date);
  assert.equal(result.snapshot.giftCode, "HFGC-TEST-CODE");
  assert.equal(result.snapshot.customer.booking_number, result.reference);
});
test("booking rejects invalid date/time, minimum party violations and unoffered/blackout slots", async () => {
  for (const extra of [{ date: "2026-02-30" }, { time: "25:00" }, { partySize: 1 }, { time: "17:00" }, { date: "2020-01-01" }, { date: "2099-01-01" }]) await assert.rejects(prepareCheckout({ ...booking, ...extra }));
  blackout = true;
  try { await assert.rejects(prepareCheckout(booking), /isn't offered/); } finally { blackout = false; }
});
test("combo requires second leg and enforces the 30-minute gap", async () => {
  await assert.rejects(prepareCheckout({ ...booking, product: "combo" }), /Pick a spa time/);
  await assert.rejects(prepareCheckout({ ...booking, product: "combo", spaTime: "11:00" }), /overlap/);
  const result = await prepareCheckout({ ...booking, product: "combo", spaTime: "11:30" });
  assert.equal(result.quiet, false);
  if (!result.quiet) { assert.equal(result.amountCents, 30000); assert.equal(result.snapshot.legs.length, 2); }
});
test("gift is canonical fixed-price product with generated code and no prepayment writes", async () => {
  calls = [];
  const result = await prepareCheckout({ ...gift, productId: "spa-3-visit", amountCents: 1 });
  assert.equal(result.quiet, false);
  if (!result.quiet) { assert.equal(result.amountCents, 19900); assert.equal(result.snapshot.product.units, 3); assert.equal(result.snapshot.product.expiryDays, 180); assert.match(result.snapshot.code, /^HFGC-[A-Z2-9]{4}-[A-Z2-9]{4}$/); }
  assert.equal(calls.length, 0);
});
test("new gift options use canonical face value and reject unsupported legacy products", async () => {
  calls = [];
  for (const [productId, amountCents, kind, scope, units] of [
    ["2114519", 7500, "value", "nordic-spa", 7500],
    ["2116473", 90000, "value", "combo", 90000],
    ["spa-5-visit", 29900, "visits", "nordic-spa", 5],
    ["spa-10-visit", 54900, "visits", "nordic-spa", 10],
  ] as const) {
    const result = await prepareCheckout({ ...gift, productId, amountCents: 1 });
    assert.equal(result.quiet, false);
    if (result.quiet) throw new Error("unexpected");
    assert.equal(result.amountCents, amountCents);
    assert.equal(result.snapshot.product.kind, kind);
    assert.equal(result.snapshot.product.productScope, scope);
    assert.equal(result.snapshot.product.units, units);
  }
  await assert.rejects(prepareCheckout({ ...gift, productId: "1543499" }), /gift/i);
  assert.equal(calls.length, 0);
});
test("strict email helpers reject resolved provider errors; legacy defaults stay best effort", async (t) => {
  t.mock.method(console, "error", () => {});
  const prepared = await Promise.all([prepareCheckout(shop), prepareCheckout(booking), prepareCheckout(gift)]);
  const data = prepared.map((r) => { assert.equal(r.quiet, false); if (r.quiet) throw new Error("unexpected"); return r.snapshot; });
  emailFails = true;
  try {
    await assert.rejects(sendOrderEmails(data[0].emailData, { strict: true, idempotencyKey: "test-shop" }), /delivery failed/);
    await assert.rejects(sendBookingEmails(data[1].emailData, { strict: true, idempotencyKey: "test-booking" }), /delivery failed/);
    await assert.rejects(sendGiftEmails(data[2], { strict: true, idempotencyKey: "test-gift" }), /delivery failed/);
    await sendBookingEmails(data[1].emailData);
  } finally { emailFails = false; }
});
test("booking email retry payload and recipient idempotency keys use fixed timestamp", async () => {
  const result = await prepareCheckout(booking);
  if (result.quiet) throw new Error("unexpected");
  calls = [];
  const options = { strict: true, idempotencyKey: "test-booking-retry", timestamp: "2026-10-09T20:00:00.000Z" };
  await sendBookingEmails(result.snapshot.emailData, options);
  await sendBookingEmails(result.snapshot.emailData, options);
  assert.equal(calls.length, 4);
  assert.equal(calls[0].body, calls[2].body);
  assert.equal(calls[1].body, calls[3].body);
  assert.equal(calls[0].headers.get("idempotency-key"), "test-booking-retry-customer");
  assert.equal(calls[1].headers.get("idempotency-key"), "test-booking-retry-farm");
  const ics = Buffer.from(JSON.parse(calls[0].body).attachments[0].content, "base64").toString();
  assert.ok(ics.includes("DTSTAMP:20261009T200000Z\r\n"));
  assert.ok(!ics.includes("\r\r\n"));
});

test("gift receipts use the stored pack expiry and keep retry payloads stable", async () => {
  const prepared = await prepareCheckout({ ...gift, productId: "spa-5-visit", recipientEmail: "recipient@example.com" });
  if (prepared.quiet) throw new Error("unexpected");
  const data = { ...prepared.snapshot, expiresAt: "2027-04-07T20:00:00.000Z" };
  calls = [];
  await sendGiftEmails(data, { strict: true, idempotencyKey: "test-pack-expiry" });
  await sendGiftEmails(data, { strict: true, idempotencyKey: "test-pack-expiry" });
  assert.equal(calls.length, 6);
  for (const index of [0, 1]) {
    assert.match(JSON.parse(calls[index].body).html, /April 7, 2027.*180 days from purchase/s);
    assert.equal(calls[index].body, calls[index + 3].body);
    assert.equal(calls[index].headers.get("idempotency-key"), calls[index + 3].headers.get("idempotency-key"));
  }
  calls = [];
  await sendGiftEmails({ ...data, expiresAt: null });
  assert.doesNotMatch(JSON.parse(calls[0].body).html, /Use your visits by/);
});

test("paid shop retries keep Square adjustment payload stable and refresh stock after clearing hold", async () => {
  const prepared = await prepareCheckout(shop);
  if (prepared.quiet) throw new Error("unexpected");
  const attempt: StripeAttempt = {
    id: "00000000-0000-4000-8000-000000000001", idempotency_key: prepared.idempotencyKey, request_hash: prepared.requestHash,
    kind: "shop", status: "paid", reference: prepared.reference, amount_cents: prepared.amountCents, due_cents: prepared.amountCents,
    snapshot: prepared.snapshot, stock_items: [], booking_ids: [], gift_code: null, gift_units: 0, gift_applied_cents: 0,
    session_id: "test-session", payment_intent_id: "test-payment", expires_at: new Date().toISOString(), processing_until: null,
    result: {}, notified_at: null, square_synced_at: null, created_at: "2026-10-09T20:00:00.000Z", updated_at: "2026-10-09T20:00:00.000Z",
  };
  calls = []; effectsMode = true; frozenShopEffectsData = null; adjustmentFailures = 1;
  try {
    const started = Date.now();
    await assert.rejects(sendCheckoutEffects(attempt), /downstream effects/);
    assert.equal(calls.filter((c) => c.method === "PATCH").length, 0, "Unknown adjustment outcome must retain the hold");
    await Promise.all([sendCheckoutEffects(attempt), sendCheckoutEffects(attempt)]);
    const adjustments = calls.filter((c) => c.url.includes("/inventory/changes/"));
    assert.equal(adjustments.length, 3);
    assert.equal(adjustments[0].body, adjustments[1].body);
    assert.equal(adjustments[0].body, adjustments[2].body);
    const timestamp = JSON.parse(adjustments[0].body).changes[0].adjustment.occurred_at;
    assert.ok(Date.parse(timestamp) >= started - 1500 && Date.parse(timestamp) <= started,
      "A delayed paid effect must date its sale at first submission, not checkout reservation");
    const firstFreeze = calls.findIndex((c) => c.url.includes("/rpc/set_stripe_effects_data"));
    const firstAdjustment = calls.findIndex((c) => c.url.includes("/inventory/changes/"));
    const firstCleared = calls.findIndex((c) => c.method === "PATCH");
    const firstRead = calls.findIndex((c) => c.url.includes("/inventory/counts/"));
    const firstSync = calls.findIndex((c) => c.url.includes("/rpc/sync_square_stock"));
    assert.ok(firstFreeze < firstAdjustment && firstAdjustment < firstRead && firstRead < firstCleared && firstCleared < firstSync);
    assert.equal(JSON.parse(calls[firstSync].body).p_quantity, 9);
    assert.match(JSON.parse(calls[firstSync].body).p_calculated_at, /\.\d{9}Z$/, "Square source timestamp retains raw precision");
    calls = [];
    await sendCheckoutEffects({ ...attempt, square_synced_at: attempt.created_at });
    assert.equal(calls.filter((c) => c.url.includes("/inventory/changes/")).length, 0);
    assert.equal(calls.filter((c) => c.url.includes("/rpc/sync_square_stock")).length, 1);
    calls = [];
    frozenShopEffectsData = { squareInventoryOccurredAt: new Date(Date.now() - 25 * 3600000).toISOString() };
    await assert.rejects(sendCheckoutEffects(attempt), (error: unknown) => error instanceof AggregateError
      && error.errors.some((cause: Error) => /manual reconciliation.*reservation retained/.test(cause.message)));
    assert.equal(calls.filter((c) => c.url.includes("/inventory/changes/") || c.method === "PATCH").length, 0,
      "An aged unknown adjustment cannot be re-dated or release inventory");
    calls = []; inventoryMissingTimestamp = true; frozenShopEffectsData = null;
    await assert.rejects(sendCheckoutEffects({ ...attempt, id: "00000000-0000-4000-8000-000000000002" }), /downstream effects/);
    assert.equal(calls.filter((c) => c.method === "PATCH" || c.url.includes("/rpc/sync_square_stock")).length, 0,
      "Missing canonical timestamp cannot clear a paid reservation or apply an unstamped count");
    calls = []; inventoryMissingTimestamp = false; adjustmentApiErrors = true; frozenShopEffectsData = null;
    await assert.rejects(sendCheckoutEffects({ ...attempt, id: "00000000-0000-4000-8000-000000000003" }), /downstream effects/);
    assert.equal(calls.filter((c) => c.method === "PATCH" || c.url.includes("/inventory/counts/")).length, 0,
      "A200response with Square errors cannot clear inventory or be treated as a successful adjustment");
    await assert.rejects(sendCheckoutEffects({ ...attempt, status: "pending" }), /finalized paid/);
  } finally { effectsMode = false; frozenShopEffectsData = null; adjustmentFailures = 0; inventoryMissingTimestamp = false; adjustmentApiErrors = false; }
});

test("wedding calendar retry reads the same deterministic event after a create conflict", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  process.env.GOOGLE_SA_EMAIL = "calendar-test@example.com";
  process.env.GOOGLE_SA_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  calendarMode = true; calls = [];
  try {
    const bookingNumber = "HFB-TEST-CALENDAR";
    const opts = { startIso: `${date}T17:00:00Z`, durationMin: 45, guestEmail: "guest@example.com", guestName: "Test Guest", locationChoice: "meet" as const, bookingNumber };
    const first = await createWeddingCallEvent(opts);
    const second = await createWeddingCallEvent(opts);
    assert.deepEqual(first, second);
    assert.equal(first?.eventId, createHash("sha256").update(`highland-wedding-call:${bookingNumber}`).digest("hex"));
    assert.equal(first?.meetLink, "https://meet.google.com/test-meet-link");
    const creates = calls.filter((c) => c.method === "POST" && c.url.includes("/calendar/v3/"));
    assert.equal(creates.length, 2);
    assert.equal(creates[0].body, creates[1].body);
  } finally {
    calendarMode = false;
    delete process.env.GOOGLE_SA_EMAIL;
    delete process.env.GOOGLE_SA_PRIVATE_KEY;
  }
});
