#!/usr/bin/env node
// Pull prices from Square into the website catalog.
//
// Square is the price source of truth (Hayden, 2026-08-26). This reports, and
// with --apply rewrites, the prices in src/app/shop/data.ts for every variant
// linked to a Square variation.
//
//   node scripts/sync-square-prices.mjs           # show what would change
//   node scripts/sync-square-prices.mjs --apply   # rewrite data.ts
//
// Only LINKED variants are touched. Apparel, plush and the bouquets have no
// Square counterpart, so Square has no opinion on their price and they are left
// alone. A Square variation with no set price (a custom-price or duplicate line)
// is skipped and reported, never treated as $0.
//
// Needs SQUARE_ACCESS_TOKEN and SUPABASE_DB_URL.

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const SQUARE_API = "https://connect.squareup.com/v2";
const SQUARE_VERSION = "2025-06-18";

const token = process.env.SQUARE_ACCESS_TOKEN;
const dbUrl = process.env.SUPABASE_DB_URL;
if (!token || !dbUrl) {
  console.error("SQUARE_ACCESS_TOKEN and SUPABASE_DB_URL are both required.");
  process.exit(1);
}
const apply = process.argv.includes("--apply");

const require = createRequire(import.meta.url);
const pg = require("pg");

const res = await fetch(`${SQUARE_API}/catalog/list?types=ITEM`, {
  headers: { Authorization: `Bearer ${token}`, "Square-Version": SQUARE_VERSION },
});
const catalog = await res.json();
if (!res.ok) {
  console.error("Square catalog read failed:", JSON.stringify(catalog.errors ?? catalog));
  process.exit(1);
}

const square = new Map();
for (const obj of catalog.objects ?? []) {
  for (const v of obj.item_data?.variations ?? []) {
    square.set(v.id, {
      name: obj.item_data.name,
      priceCents: v.item_variation_data?.price_money?.amount ?? null,
    });
  }
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
const { rows: links } = await client.query(
  "select variant_id, square_variation_id from shop_inventory where square_variation_id is not null",
);
await client.end();

const dataPath = new URL("../src/app/shop/data.ts", import.meta.url);
let source = readFileSync(dataPath, "utf8");

const changes = [];
const skipped = [];

for (const link of links) {
  const sq = square.get(link.square_variation_id);
  if (!sq) {
    skipped.push({ variantId: link.variant_id, why: "no longer in the Square catalog" });
    continue;
  }
  if (sq.priceCents == null) {
    skipped.push({ variantId: link.variant_id, why: `"${sq.name}" has no set price in Square` });
    continue;
  }

  const pattern = new RegExp(`(\\{ id: "${link.variant_id}"[^}]*?price: )([\\d.]+)`);
  const match = source.match(pattern);
  if (!match) {
    skipped.push({ variantId: link.variant_id, why: "not found in data.ts" });
    continue;
  }

  const current = Math.round(Number(match[2]) * 100);
  if (current === sq.priceCents) continue;

  changes.push({
    variantId: link.variant_id,
    name: sq.name,
    fromCents: current,
    toCents: sq.priceCents,
  });
  if (apply) {
    const next = String(sq.priceCents / 100);
    source = source.replace(pattern, (_m, head) => head + next);
  }
}

const money = (c) => `$${(c / 100).toFixed(2)}`;

if (changes.length === 0) {
  console.log(`All ${links.length} linked prices already match Square.`);
} else {
  console.log(`${changes.length} price change(s) from Square:\n`);
  for (const c of changes) {
    console.log(
      `  ${c.name.padEnd(30)} ${money(c.fromCents)} -> ${money(c.toCents)}  (${c.variantId})`,
    );
  }
}

if (skipped.length > 0) {
  console.log(`\nSkipped ${skipped.length}:`);
  for (const s of skipped) console.log(`  ${s.variantId}: ${s.why}`);
}

if (apply && changes.length > 0) {
  writeFileSync(dataPath, source);
  console.log(`\nRewrote data.ts. Commit and deploy for these to reach the storefront.`);
} else if (!apply && changes.length > 0) {
  console.log(`\nNothing written. Re-run with --apply.`);
}
