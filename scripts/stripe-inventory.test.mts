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

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://square-inventory-tests.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
process.env.SQUARE_ACCESS_TOKEN = "test-only";
process.env.SQUARE_LOCATION_ID = "fixture-location";
process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = "fixture-webhook-secret";
process.env.SQUARE_WEBHOOK_URL = "https://example.invalid/api/square/webhook";
const { createHmac } = await import("node:crypto");
const { POST } = await import("../src/app/api/square/webhook/route.ts");
let calls: { url: string; body: string }[] = [];
let readFails = false, rpcFails = false, missingTimestamp = false, superseded = false;
const stamp = "2026-10-09T20:00:00.123456789Z";
globalThis.fetch = async (input, init) => {
  const url = String(input), body = String(init?.body ?? "");
  calls.push({ url, body });
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  if (url === "https://connect.squareup.com/v2/inventory/counts/batch-retrieve") {
    return readFails ? json({ errors: [] }, 503) : json({ counts: [
      { catalog_object_id: "fixture-variation", location_id: "wrong-location", state: "IN_STOCK", quantity: "999", calculated_at: stamp },
      { catalog_object_id: "fixture-variation", location_id: "fixture-location", state: "IN_STOCK", quantity: "4", ...(missingTimestamp ? {} : { calculated_at: stamp }) },
    ] });
  }
  assert.equal(url, "https://square-inventory-tests.invalid/rest/v1/rpc/sync_square_stock_snapshot", "Inventory must not claim a webhook event or send any other writes");
  return rpcFails ? json({ code: "fixture_error", message: "Fixture RPC failure" }, 503) : json(superseded ? -1 : 1);
};
function request(location = "fixture-location", valid = true) {
  const raw = JSON.stringify({ event_id: "fixture-inventory-event", type: "inventory.count.updated", data: { object: { inventory_counts: [{ catalog_object_id: "fixture-variation", location_id: location, state: "IN_STOCK", quantity: "5" }] } } });
  const signature = createHmac("sha256", process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!).update(process.env.SQUARE_WEBHOOK_URL! + raw).digest("base64");
  return new Request(process.env.SQUARE_WEBHOOK_URL!, { method: "POST", body: raw, headers: { "x-square-hmacsha256-signature": valid ? signature : "invalid" } });
}
test("signed delayed inventory events use current canonical quantity and raw source precision, every retry", async () => {
  calls = [];
  assert.equal((await POST(request())).status, 200);
  assert.equal((await POST(request())).status, 200);
  assert.equal(calls.length, 4);
  const payload = JSON.parse(calls[1].body);
  assert.deepEqual(payload, { p_variation_id: "fixture-variation", p_quantity: 4, p_calculated_at: stamp });
  assert.deepEqual(JSON.parse(calls[3].body), payload);
  assert.deepEqual(JSON.parse(calls[0].body).location_ids, ["fixture-location"]);
});
test("failed canonical read and RPC application return503 and the same event remains retryable", async () => {
  calls = []; readFails = true;
  try { assert.equal((await POST(request())).status, 503); assert.equal(calls.length, 1); }
  finally { readFails = false; }
  rpcFails = true;
  try { assert.equal((await POST(request())).status, 503); }
  finally { rpcFails = false; }
  assert.equal((await POST(request())).status, 200);
});
test("missing source timestamp fails closed and superseded snapshot requests a canonical retry", async () => {
  calls = []; missingTimestamp = true;
  try { assert.equal((await POST(request())).status, 503); assert.equal(calls.length, 1); }
  finally { missingTimestamp = false; }
  superseded = true;
  try { assert.equal((await POST(request())).status, 503); }
  finally { superseded = false; }
  assert.equal((await POST(request())).status, 200);
});
test("unauthorized or different-location event causes no inventory requests", async () => {
  calls = [];
  assert.equal((await POST(request("fixture-location", false))).status, 401);
  assert.equal((await POST(request("other-location"))).status, 200);
  assert.equal(calls.length, 0);
});
