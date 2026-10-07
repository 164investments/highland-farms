import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildQuote, type QuoteSpec } from "../src/lib/review-quotes.ts";
import { ALL_STAY_QUOTES } from "../src/components/stay/stay-content.ts";

const snapshot = JSON.parse(
  readFileSync(new URL("../src/data/google-reviews.json", import.meta.url), "utf8"),
) as { reviews: { author_name: string; publish_time: string; text: string; rating: number }[] };

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

function check(spec: QuoteSpec) {
  const r = snapshot.reviews.find(
    (x) => x.author_name === spec.author && x.publish_time?.startsWith(spec.date),
  );
  assert.ok(r, `review not found: ${spec.author} ${spec.date}`);
  const quote = buildQuote(r.text, spec);
  assert.ok(quote, `quote could not be built (sentence changed?): ${spec.author}`);
  assert.ok(norm(r.text).includes(norm(quote)), `quote is not verbatim in the snapshot: ${quote}`);
  // Whole sentences, none trimmed with an ellipsis (CONSISTENCY #2).
  assert.match(quote, /[.!?]["'”’)]*$/, `quote cuts a sentence: ${quote}`);
  assert.equal(r.rating, 5, `not a five-star review: ${spec.author}`);
}

test("every /stay, /stay/[slug] and /celebrations quote is verbatim in the Google snapshot", () => {
  for (const spec of ALL_STAY_QUOTES) check(spec);
});

test("no review is quoted twice across the stays and celebrations pages", () => {
  const keys = ALL_STAY_QUOTES.map((s) => `${s.author}|${s.date}`);
  assert.equal(new Set(keys).size, keys.length, "a review is used on two pages");
});
