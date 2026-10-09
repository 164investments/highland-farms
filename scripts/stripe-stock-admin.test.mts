import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://stock-admin-tests.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "stock-admin-placeholder";
process.env.SHOP_ADMIN_TOKEN = "stock-admin-test-token";
const inventory = await import("../src/app/api/shop/admin/inventory/route.ts");
const count = await import("../src/app/api/shop/admin/count/route.ts");
let calls: { path: string; body: Record<string, unknown> }[] = [];
let failure: { code: string; message: string } | null = null;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.origin, "https://stock-admin-tests.invalid", "No Square or other outbound request is permitted");
  assert.equal(init?.method, "POST", "Inventory must use the guarded RPC, never direct PATCH");
  assert.ok(["/rest/v1/rpc/update_shop_inventory_admin", "/rest/v1/rpc/apply_stock_count"].includes(url.pathname));
  const body = JSON.parse(String(init?.body));
  calls.push({ path: url.pathname, body });
  const data = failure ?? (url.pathname.endsWith("apply_stock_count") ? 2 : {
    variant_id: body.p_variant_id, stock: Object.hasOwn(body.p_patch, "stock") ? body.p_patch.stock : 9,
    low_stock_threshold: body.p_patch.low_stock_threshold ?? 4,
  });
  return new Response(JSON.stringify(data), { status: failure ? 400 : 200, headers: { "Content-Type": "application/json" } });
};
function request(body: unknown, authorized = true) {
  return new Request("https://example.invalid/admin", { method: "POST", body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...(authorized ? { Authorization: "Bearer stock-admin-test-token" } : {}) } });
}
function reset(error: typeof failure = null) { calls = []; failure = error; }

test("unauthorized and invalid admin inventory/count requests perform no writes", async () => {
  reset();
  assert.equal((await inventory.POST(request({ variantId: "fixture", stock: 10 }, false))).status, 401);
  assert.equal((await count.POST(request({ countedBy: "Fixture", items: [{ variantId: "fixture", counted: 10 }] }, false))).status, 401);
  assert.equal((await inventory.POST(request({ variantId: "fixture", stock: -1 }))).status, 400);
  assert.equal((await inventory.POST(request({ variantId: "fixture" }))).status, 400);
  assert.equal(calls.length, 0);
});
test("stock and NULL edits use one row-locked RPC with the existing response shape", async () => {
  reset();
  const response = await inventory.POST(request({ variantId: "fixture", stock: null, lowStockThreshold: 8 }));
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{ path: "/rest/v1/rpc/update_shop_inventory_admin", body: {
    p_variant_id: "fixture", p_patch: { stock: null, low_stock_threshold: 8 },
  } }]);
  assert.deepEqual(await response.json(), { ok: true, variant_id: "fixture", stock: null, low_stock_threshold: 8 });
});
test("threshold-only edits omit stock and remain possible while reservations exist", async () => {
  reset();
  assert.equal((await inventory.POST(request({ variantId: "fixture", lowStockThreshold: 7 }))).status, 200);
  assert.deepEqual(calls[0].body, { p_variant_id: "fixture", p_patch: { low_stock_threshold: 7 } });
});
test("unresolved stock guard returns actionable conflict without fallback mutation", async () => {
  reset({ code: "55000", message: "variant has unresolved Stripe stock reservations; reconcile before counting" });
  const response = await inventory.POST(request({ variantId: "fixture", stock: 10 }));
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /unresolved Stripe stock reservations/);
  assert.equal(calls.length, 1);
});
test("unknown inventory stays404 and database failures stay500", async () => {
  reset({ code: "P0002", message: "unknown variant" });
  assert.equal((await inventory.POST(request({ variantId: "fixture", stock: 10 }))).status, 404);
  reset({ code: "fixture_error", message: "fixture outage" });
  assert.equal((await inventory.POST(request({ variantId: "fixture", stock: 10 }))).status, 500);
  assert.equal(calls.length, 1);
});
test("count batch retains one atomic RPC and surfaces the reservation conflict", async () => {
  reset({ code: "55000", message: "variant has unresolved Stripe stock reservations; reconcile before counting" });
  const body = { countedBy: "Fixture", items: [{ variantId: "one", counted: 10 }, { variantId: "two", counted: 2 }] };
  assert.equal((await count.POST(request(body))).status, 409);
  assert.deepEqual(calls, [{ path: "/rest/v1/rpc/apply_stock_count", body: {
    p_counted_by: "Fixture", p_items: [{ variant_id: "one", counted: 10 }, { variant_id: "two", counted: 2 }],
  } }]);
  reset();
  const response = await count.POST(request(body));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, applied: 2 });
  assert.equal(calls.length, 1);
});
