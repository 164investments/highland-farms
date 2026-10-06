import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildQuote,
  HOME_QUOTES,
  SPA_QUOTE,
  WEDDING_QUOTE,
  shortName,
  type QuoteSpec,
} from "../src/lib/review-quotes.ts";

const snapshot = JSON.parse(
  readFileSync(new URL("../src/data/google-reviews.json", import.meta.url), "utf8"),
) as { reviews: { author_name: string; publish_time: string; text: string }[] };

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

function check(spec: QuoteSpec) {
  const r = snapshot.reviews.find(
    (x) => x.author_name === spec.author && x.publish_time?.startsWith(spec.date),
  );
  assert.ok(r, `review not found: ${spec.author} ${spec.date}`);
  const quote = buildQuote(r.text, spec);
  assert.ok(quote, `quote could not be built (sentence changed?): ${spec.author}`);
  const body = quote.replace(/\s*…$/, "");
  assert.ok(body.length > 20, "quote too short");
  assert.ok(
    norm(r.text).includes(norm(body)),
    `quote is not verbatim in the snapshot: ${quote}`,
  );
  // Whole sentences only: must end on terminal punctuation.
  assert.match(body, /[.!?]["'”’)]*$|\)$|:\)$/, `quote cuts a sentence: ${body}`);
}

test("homepage testimonials are verbatim Google reviews", () => {
  for (const spec of HOME_QUOTES) check(spec);
});

test("nordic-spa quote is one intact sentence from the real review", () => {
  check(SPA_QUOTE);
});

test("wedding first-screen quote is Olivia Brown's words, verbatim", () => {
  check(WEDDING_QUOTE);
  const r = snapshot.reviews.find(
    (x) => x.author_name === WEDDING_QUOTE.author && x.publish_time?.startsWith(WEDDING_QUOTE.date),
  )!;
  // The approved boards print exactly this; a reworded review must fail here, not ship.
  assert.equal(
    buildQuote(r.text, WEDDING_QUOTE),
    "Connor & his team made it so I didn’t have to lift a finger all day.",
  );
  // "Married here in 2025": the review says she married "just a few days ago".
  assert.ok(r.publish_time.startsWith("2025-"));
  assert.match(r.text, /got married at highland farms just a few days ago/i);
});

test("shortName shows a first name and last initial", () => {
  assert.equal(shortName("Olivia Brown"), "Olivia B.");
  assert.equal(shortName("  Mary  Ann  smith "), "Mary S.");
  assert.equal(shortName("Maya C"), "Maya C.");
  assert.equal(shortName("Cher"), "Cher");
});
