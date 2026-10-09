import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "@/lib/attribution") return { shortCircuit: true,
    url: "data:text/javascript,export const getClientAttribution=()=>({updated_at:'now',utm_source:'test'})" };
  return nextResolve(specifier, context);
} });

let moduleIndex = 0;
async function browser() {
  const stored = new Map<string, string>();
  let unavailable = false;
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    location: { pathname: "/shop/checkout", hash: "", search: "" },
    sessionStorage: {
      getItem(key: string) { if (unavailable) throw new Error("Storage denied"); return stored.get(key) ?? null; },
      setItem(key: string, value: string) { if (unavailable) throw new Error("Storage denied"); stored.set(key, value); },
      removeItem(key: string) { if (unavailable) throw new Error("Storage denied"); stored.delete(key); },
    },
  } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { cookie: "" } });
  const sent: Record<string, unknown>[] = [];
  let reply: Record<string, unknown> = {};
  let status = 200;
  globalThis.fetch = async (_url, init) => {
    sent.push(JSON.parse(String(init?.body)));
    return Response.json(reply, { status });
  };
  const client = await import(`../src/lib/payments/client.ts?test=${moduleIndex++}`);
  return { client, sent, stored, respond(data: Record<string, unknown>, code = 200) { reply = data; status = code; },
    denyStorage() { unavailable = true; } };
}
const shop = { kind: "shop" as const, items: [{ variantId: "SQ-test", quantity: 1 }], customer: { email: "test@example.com" } };
const hosted = (sessionId = "cs_test_first") => ({ checkoutUrl: "https://checkout.stripe.com/c/pay/test", sessionId });

test("unknown checkout failure preserves the same retry key and excludes attribution timestamps", async () => {
  const b = await browser();
  b.respond({ error: "Retry" }, 503);
  assert.equal((await b.client.startStripeCheckout(shop)).ok, false);
  b.respond(hosted());
  assert.equal((await b.client.startStripeCheckout(shop)).ok, true);
  assert.equal(b.sent[0].idempotencyKey, b.sent[1].idempotencyKey);
  assert.equal((b.sent[0].attribution as Record<string, unknown>).updated_at, undefined);
});

test("paid shop/gift/booking retries open the verified receipt instead of producing a false checkout error", async () => {
  for (const kind of ["shop", "gift", "booking"] as const) {
    const b = await browser();
    b.respond({ success: true, status: "paid", sessionId: "cs_test_paid123", amountCents: 7500 });
    assert.deepEqual(await b.client.startStripeCheckout({ ...shop, kind }), {
      ok: true, checkoutUrl: "/payments/return?session_id=cs_test_paid123", sessionId: "cs_test_paid123",
    });
  }
});

test("verified paid/expired receipt retires its key so an identical second purchase gets a new attempt", async () => {
  for (const method of ["forgetCompletedCheckout", "forgetExpiredCheckout"] as const) {
    const b = await browser();
    b.respond(hosted());
    await b.client.startStripeCheckout(shop);
    b.client[method]("cs_test_first");
    b.respond(hosted("cs_test_second"));
    await b.client.startStripeCheckout(shop);
    assert.notEqual(b.sent[0].idempotencyKey, b.sent[1].idempotencyKey);
  }
});

test("revisiting an old receipt cannot clear a newer identical purchase", async () => {
  const b = await browser();
  b.respond(hosted());
  await b.client.startStripeCheckout(shop);
  // Save old recovery data as if the old receipt were opened in another tab.
  const oldBinding = b.stored.get("hf-stripe-session-v1:cs_test_first")!;
  b.client.forgetCompletedCheckout("cs_test_first");
  b.respond(hosted("cs_test_second"));
  await b.client.startStripeCheckout(shop);
  b.stored.set("hf-stripe-session-v1:cs_test_first", oldBinding);
  b.client.forgetCompletedCheckout("cs_test_first");
  await b.client.startStripeCheckout(shop);
  assert.equal(b.sent[1].idempotencyKey, b.sent[2].idempotencyKey);
});

test("zero-charge booking success retires its key without requiring a Stripe receipt", async () => {
  const b = await browser();
  b.respond({ success: true, bookingNumber: "HFB-test", amountCents: 0 });
  const booking = { ...shop, kind: "booking" as const };
  assert.deepEqual(await b.client.startStripeCheckout(booking), { ok: true, success: true, bookingNumber: "HFB-test", amountCents: 0 });
  await b.client.startStripeCheckout(booking);
  assert.notEqual(b.sent[0].idempotencyKey, b.sent[1].idempotencyKey);
});

test("a delayed expired response cannot retire a newer identical purchase", async () => {
  const b = await browser();
  const replies: ((response: Response) => void)[] = [];
  globalThis.fetch = async (_url, init) => {
    b.sent.push(JSON.parse(String(init?.body)));
    if (b.sent.length <= 2) return new Promise<Response>(resolve => replies.push(resolve));
    return Response.json(hosted("cs_test_second"));
  };
  const oldOne = b.client.startStripeCheckout(shop);
  const oldTwo = b.client.startStripeCheckout(shop);
  while (replies.length < 2) await new Promise(resolve => setImmediate(resolve));
  assert.equal(b.sent[0].idempotencyKey, b.sent[1].idempotencyKey);
  replies[0](Response.json({ status: "expired", error: "Expired" }, { status: 409 }));
  await oldOne;
  await b.client.startStripeCheckout(shop);
  assert.notEqual(b.sent[0].idempotencyKey, b.sent[2].idempotencyKey);
  replies[1](Response.json({ status: "expired", error: "Expired" }, { status: 409 }));
  await oldTwo;
  await b.client.startStripeCheckout(shop);
  assert.equal(b.sent[2].idempotencyKey, b.sent[3].idempotencyKey);
});

test("terminal key retirement still works when browser storage is unavailable", async () => {
  const b = await browser();
  b.denyStorage();
  b.respond(hosted());
  await b.client.startStripeCheckout(shop);
  b.client.forgetCompletedCheckout("cs_test_first");
  await b.client.startStripeCheckout(shop);
  assert.notEqual(b.sent[0].idempotencyKey, b.sent[1].idempotencyKey);
});

test("malformed paid responses and foreign checkout URLs fail closed", async () => {
  const b = await browser();
  for (const response of [
    { success: true, status: "paid", sessionId: "../outside" },
    { success: true, sessionId: "cs_test_paid123" },
    { checkoutUrl: "https://checkout.stripe.com.evil.invalid/pay", sessionId: "cs_test_other" },
    { checkoutUrl: "https://evil@checkout.stripe.com/pay", sessionId: "cs_test_other" },
  ]) {
    b.respond(response);
    const result = await b.client.startStripeCheckout(shop);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 502);
  }
});
