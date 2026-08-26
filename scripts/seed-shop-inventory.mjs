#!/usr/bin/env node
// Seed shop_inventory from the recovered Squarespace catalog.
//
// Safe to re-run: uses ON CONFLICT DO NOTHING, so it only ever inserts
// variants the table has never seen. It will NOT overwrite a live count the
// farm has since corrected — that would silently resurrect the stale
// 2026-06-05 numbers.
//
//   node scripts/seed-shop-inventory.mjs            # insert missing only
//   node scripts/seed-shop-inventory.mjs --report   # show current vs seed
//
// Needs SUPABASE_DB_URL (the pooler connection string).

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let pg;
try {
  pg = require("pg");
} catch {
  console.error("pg is not installed. Run: npm install pg --no-save");
  process.exit(1);
}

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error("SUPABASE_DB_URL is not set.");
  process.exit(1);
}

const catalog = JSON.parse(
  readFileSync(
    new URL("../docs/squarespace-catalog-recovered-2026-06-05.json", import.meta.url),
    "utf8",
  ),
);

const rows = [];
for (const product of Object.values(catalog)) {
  for (const variant of product.variants) {
    rows.push({
      variantId: variant.sku,
      stock: variant.stock?.unlimited ? null : (variant.stock?.quantity ?? 0),
    });
  }
}

const report = process.argv.includes("--report");
const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  if (report) {
    const { rows: live } = await client.query(
      "select variant_id, stock, updated_at from shop_inventory order by variant_id",
    );
    const bySku = new Map(live.map((r) => [r.variant_id, r]));
    console.log(`live rows: ${live.length}  |  seed rows: ${rows.length}`);
    for (const r of rows) {
      const l = bySku.get(r.variantId);
      const liveStock = l ? (l.stock === null ? "unlimited" : l.stock) : "MISSING";
      const seedStock = r.stock === null ? "unlimited" : r.stock;
      if (String(liveStock) !== String(seedStock)) {
        console.log(`  ${r.variantId}  live=${liveStock}  seed=${seedStock}`);
      }
    }
  } else {
    const res = await client.query(
      `insert into shop_inventory (variant_id, stock)
       select * from unnest($1::text[], $2::int[])
       on conflict (variant_id) do nothing`,
      [rows.map((r) => r.variantId), rows.map((r) => r.stock)],
    );
    const { rows: [{ count }] } = await client.query("select count(*) from shop_inventory");
    console.log(`inserted ${res.rowCount} new variant(s); table now holds ${count}`);
  }
} finally {
  await client.end();
}
