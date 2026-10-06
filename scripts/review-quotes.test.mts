import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildQuote,
  HOME_QUOTES,
  SPA_QUOTE,
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
