import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
globalThis.fetch = async () => { throw new Error("Gift catalog tests must not make network requests"); };
const { GIFT_PRODUCTS, getGiftProduct, giftScopeAllows } = await import("../src/lib/booking/gift-products.ts");

test("all sixteen current experience gifts retain verified prices, guest counts and scope", () => {
  const expected = [
    ["tour", "farm-tour", [2, 3, 4, 5, 6], [15000, 22500, 30000, 37500, 45000]],
    ["spa", "nordic-spa", [1, 2, 3, 4, 5, 6], [7500, 15000, 22500, 30000, 37500, 45000]],
    ["day", "combo", [2, 3, 4, 5, 6], [30000, 45000, 60000, 75000, 90000]],
  ] as const;
  assert.equal(GIFT_PRODUCTS.length, 19);
  assert.equal(new Set(GIFT_PRODUCTS.map((p) => p.id)).size, 19);
  assert.equal(new Set(GIFT_PRODUCTS.map((p) => p.acuityId)).size, 19);
  for (const [family, scope, guests, prices] of expected) {
    const products = GIFT_PRODUCTS.filter((p) => p.family === family);
    assert.deepEqual(products.map((p) => p.guests), [...guests]);
    assert.deepEqual(products.map((p) => p.amountCents), [...prices]);
    for (const product of products) {
      assert.equal(product.kind, "value");
      assert.equal(product.units, product.amountCents);
      assert.equal(product.productScope, scope);
      assert.equal(product.expiryDays, null);
      assert.equal(getGiftProduct(product.acuityId!), product);
    }
  }
});

test("current spa packs preserve legacy three-visit ID and verified 180-day terms", () => {
  const packs = GIFT_PRODUCTS.filter((p) => p.family === "pack");
  assert.deepEqual(packs.map((p) => [p.id, p.acuityId, p.units, p.amountCents]), [
    ["spa-3-visit", "2189863", 3, 19900],
    ["spa-5-visit", "2189865", 5, 29900],
    ["spa-10-visit", "2189866", 10, 54900],
  ]);
  for (const pack of packs) {
    assert.equal(pack.kind, "visits");
    assert.equal(pack.productScope, "nordic-spa");
    assert.equal(pack.expiryDays, 180);
    assert.match(pack.blurb, /within 180 days/);
  }
  assert.equal(getGiftProduct("tour-for-two")?.amountCents, 15000);
  assert.equal(getGiftProduct("spa-for-two")?.amountCents, 15000);
  assert.equal(getGiftProduct("1543499"), undefined, "legacy $45 gift has no eligible appointment types");
  assert.equal(getGiftProduct("unrecognized-gift"), undefined);
});

test("Highland Day credit covers either or both advertised legs, never unrelated services", () => {
  assert.equal(giftScopeAllows("value", "combo", ["farm-tour", "nordic-spa"]), true);
  assert.equal(giftScopeAllows("value", "combo", ["farm-tour"]), true);
  assert.equal(giftScopeAllows("value", "combo", ["nordic-spa"]), true);
  assert.equal(giftScopeAllows("value", "combo", ["wedding-call"]), false);
  assert.equal(giftScopeAllows("value", "combo", ["farm-tour", "wedding-call"]), false);
  assert.equal(giftScopeAllows("value", "farm-tour", ["nordic-spa"]), false);
  assert.equal(giftScopeAllows("value", "nordic-spa", ["farm-tour", "nordic-spa"]), false);
  assert.equal(giftScopeAllows("value", null, ["farm-tour"]), true, "existing unscoped credit remains supported");
  assert.equal(giftScopeAllows("value", null, []), false);
});

test("visit balances only cover one matching service leg", () => {
  assert.equal(giftScopeAllows("visits", "nordic-spa", ["nordic-spa"]), true);
  assert.equal(giftScopeAllows("visits", "nordic-spa", ["farm-tour"]), false);
  assert.equal(giftScopeAllows("visits", "nordic-spa", ["nordic-spa", "farm-tour"]), false);
  assert.equal(giftScopeAllows("visits", null, ["nordic-spa"]), false);
  assert.equal(giftScopeAllows("visits", "combo", ["nordic-spa"]), false);
});
