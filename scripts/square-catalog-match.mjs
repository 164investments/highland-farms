#!/usr/bin/env node
// Propose website-variant ↔ Square-variation links.
//
//   node scripts/square-catalog-match.mjs            # print the report
//   node scripts/square-catalog-match.mjs --json      # machine-readable
//   node scripts/square-catalog-match.mjs --apply     # write confident matches
//
// Nothing is applied without --apply, and --apply only writes matches this
// script rates "confident". Everything else is a question for the farm, because
// guessing here means a POS sale decrements the wrong product.
//
// Needs SQUARE_ACCESS_TOKEN and (for --apply) SUPABASE_DB_URL.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const SQUARE_API = "https://connect.squareup.com/v2";
const SQUARE_VERSION = "2025-06-18";

const token = process.env.SQUARE_ACCESS_TOKEN;
if (!token) {
  console.error("SQUARE_ACCESS_TOKEN is not set.");
  process.exit(1);
}

const apply = process.argv.includes("--apply");
const asJson = process.argv.includes("--json");

/** Strip the noise so "Mangalitsa - Thick Cut Bacon" meets "Bacon". */
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/mangalitsa|highland farms?|highland|farm|the dream|scottish/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(1|one|a)\b/g, " ")
    .replace(/\blb\b|\blbs\b|\bpack\b|\bdozen\b/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(name) {
  return new Set(normalize(name).split(" ").filter((t) => t.length > 2));
}

/** Jaccard overlap — cheap, and good enough on a 28×53 grid. */
function similarity(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / new Set([...ta, ...tb]).size;
}

async function squareCatalog() {
  const res = await fetch(`${SQUARE_API}/catalog/list?types=ITEM`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Square-Version": SQUARE_VERSION,
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body.errors ?? body));

  const rows = [];
  for (const obj of body.objects ?? []) {
    const item = obj.item_data;
    for (const v of item.variations ?? []) {
      const iv = v.item_variation_data;
      rows.push({
        variationId: v.id,
        itemName: item.name,
        variationName: iv.name ?? null,
        priceCents: iv.price_money?.amount ?? null,
        trackInventory: Boolean(iv.track_inventory),
        sku: iv.sku ?? null,
      });
    }
  }
  return rows;
}

function websiteCatalog() {
  const raw = JSON.parse(
    readFileSync(
      new URL("../docs/squarespace-catalog-recovered-2026-06-05.json", import.meta.url),
      "utf8",
    ),
  );
  const rows = [];
  for (const [slug, product] of Object.entries(raw)) {
    for (const v of product.variants) {
      const attrs = v.attributes ?? {};
      const label = Object.values(attrs)[0] ?? null;
      rows.push({
        variantId: v.sku,
        slug,
        name: product.title,
        label,
        priceCents: Math.round(Number(v.price.decimalValue) * 100),
      });
    }
  }
  return rows;
}

const square = await squareCatalog();
const website = websiteCatalog();

// Square line items that are clearly event/venue services, not farm-store goods.
const NOT_MERCHANDISE =
  /deposit|wedding|bartender|potty|dance floor|photo ?shoot|vehicle|string lights|tables|chairs|final payment|tour|spa|greeter|airstream|rental|security/i;
const sellable = square.filter((s) => !NOT_MERCHANDISE.test(s.itemName));

const results = [];
for (const w of website) {
  const scored = sellable
    .map((s) => ({ s, score: similarity(w.name, s.itemName) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const runnerUp = scored[1];

  // Confident = a strong match that is also clearly better than the next one.
  // A product with several near-equal candidates is exactly where an automatic
  // guess does damage.
  const confident =
    best && best.score >= 0.6 && (!runnerUp || best.score - runnerUp.score >= 0.2);

  results.push({
    variantId: w.variantId,
    website: w.name + (w.label ? ` (${w.label})` : ""),
    websitePriceCents: w.priceCents,
    match: best && best.score > 0.25 ? best.s : null,
    score: best ? Number(best.score.toFixed(2)) : 0,
    confident: Boolean(confident),
    priceConflict:
      best && best.s.priceCents != null && best.s.priceCents !== w.priceCents,
  });
}

// Demote any Square variation claimed by more than one website variant. The
// website sells Pork Shoulder Roast in three weight tiers; Square has a single
// "Pork Shoulder Roast". Auto-linking all three would point three products at
// one count and decrement the wrong thing on every sale. Square needs three
// variations, or the farm needs to tell us which one is which — either way it's
// a human decision, and the DB's unique index would reject it regardless.
const claims = new Map();
for (const r of results) {
  if (!r.match) continue;
  claims.set(r.match.variationId, (claims.get(r.match.variationId) ?? 0) + 1);
}
for (const r of results) {
  if (r.match && claims.get(r.match.variationId) > 1) {
    r.confident = false;
    r.contested = true;
  }
}

const confident = results.filter((r) => r.confident);
const uncertain = results.filter((r) => !r.confident && r.match);
const unmatched = results.filter((r) => !r.match);
const matchedIds = new Set(results.filter((r) => r.match).map((r) => r.match.variationId));
const squareOnly = sellable.filter((s) => !matchedIds.has(s.variationId));

if (asJson) {
  console.log(JSON.stringify({ confident, uncertain, unmatched, squareOnly }, null, 2));
} else {
  const money = (c) => (c == null ? "—" : `$${(c / 100).toFixed(2)}`);
  console.log(`\nWebsite variants: ${website.length}   Square sellable variations: ${sellable.length}\n`);

  console.log(`── CONFIDENT MATCHES (${confident.length}) ─────────────────────────────`);
  for (const r of confident) {
    const flag = r.priceConflict ? `  ⚠️ PRICE ${money(r.websitePriceCents)} vs Square ${money(r.match.priceCents)}` : "";
    const track = r.match.trackInventory ? "" : "  [Square not tracking stock]";
    console.log(`  ${r.website.padEnd(46)} → ${r.match.itemName}${flag}${track}`);
  }

  console.log(`\n── NEEDS A HUMAN (${uncertain.length}) ────────────────────────────────`);
  for (const r of uncertain) {
    const why = r.contested
      ? "several website variants claim this one Square item"
      : `score ${r.score}`;
    console.log(`  ${r.website.padEnd(46)} → ${r.match.itemName}?  (${why})`);
  }

  console.log(`\n── ON THE WEBSITE, NOT IN SQUARE (${unmatched.length}) ────────────────`);
  for (const r of unmatched) console.log(`  ${r.website}`);

  console.log(`\n── IN SQUARE, NOT ON THE WEBSITE (${squareOnly.length}) ───────────────`);
  for (const s of squareOnly) console.log(`  ${s.itemName.padEnd(46)} ${money(s.priceCents)}`);

  const untracked = confident.filter((r) => !r.match.trackInventory).length;
  console.log(
    `\nSummary: ${confident.length} confident, ${uncertain.length} uncertain, ` +
      `${unmatched.length} website-only, ${squareOnly.length} Square-only.`,
  );
  console.log(
    `${untracked} of the confident matches have inventory tracking OFF in Square — ` +
      `until that's on, a POS sale still can't reach the website.\n`,
  );
}

if (apply) {
  const require = createRequire(import.meta.url);
  const pg = require("pg");
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("SUPABASE_DB_URL is not set; nothing applied.");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let applied = 0;
  try {
    for (const r of confident) {
      await client.query("select map_square_variant($1,$2,$3)", [
        r.variantId,
        r.match.variationId,
        r.match.itemName,
      ]);
      applied += 1;
    }
  } finally {
    await client.end();
  }
  console.log(`Applied ${applied} confident mapping(s). Uncertain ones left unmapped on purpose.`);
}
