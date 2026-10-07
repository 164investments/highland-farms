import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildQuote,
  HOME_QUOTES,
  SPA_QUOTE,
  THANKSGIVING_FAMILY_QUOTE,
  THANKSGIVING_QUOTE,
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

test("thanksgiving quote is a Lodge family stay, verbatim", () => {
  check(THANKSGIVING_QUOTE);
  const r = snapshot.reviews.find(
    (x) => x.author_name === THANKSGIVING_QUOTE.author && x.publish_time?.startsWith(THANKSGIVING_QUOTE.date),
  )!;
  // "Family stay in the Lodge" is the attribution; the review must still say so.
  assert.match(r.text, /my family and i spent a few nights in the lodge/i);
});

test("thanksgiving family quote is about the cows, verbatim", () => {
  check(THANKSGIVING_FAMILY_QUOTE);
  const r = snapshot.reviews.find(
    (x) => x.author_name === THANKSGIVING_FAMILY_QUOTE.author && x.publish_time?.startsWith(THANKSGIVING_FAMILY_QUOTE.date),
  )!;
  assert.equal(
    buildQuote(r.text, THANKSGIVING_FAMILY_QUOTE),
    "Our 2 yr old daughter woke up every morning so excited to say good morning to the cows.",
  );
  assert.match(r.text, /stay in the cottage/i);
});

test("shortName shows a first name and last initial", () => {
  assert.equal(shortName("Olivia Brown"), "Olivia B.");
  assert.equal(shortName("  Mary  Ann  smith "), "Mary S.");
  assert.equal(shortName("Maya C"), "Maya C.");
  assert.equal(shortName("Cher"), "Cher");
});

test("sentenceCount takes consecutive whole sentences from the starting one", () => {
  const text = "First one. Second starts here. Third follows! Fourth.";
  assert.equal(
    buildQuote(text, { author: "x", date: "2020-01-01", topic: "t", sentenceStartsWith: "Second starts", sentenceCount: 2 }),
    "Second starts here. Third follows!",
  );
  assert.equal(
    buildQuote(text, { author: "x", date: "2020-01-01", topic: "t", sentenceStartsWith: "Second starts" }),
    "Second starts here.",
  );
});

// Every page keeps its quote specs in a pure `quotes.ts` (type-only imports), so
// this test proves each exported spec is verbatim, whole-sentence Google text.
test("every page quote spec (src/**/quotes.ts) is verbatim from the snapshot", async () => {
  const { globSync } = await import("node:fs");
  const root = new URL("../", import.meta.url);
  const files = globSync("src/**/quotes.ts", { cwd: root.pathname });
  assert.ok(files.length > 0, "no quotes.ts files found");
  const isSpec = (v: unknown): v is QuoteSpec =>
    !!v && typeof v === "object" && "author" in v && "date" in v && "topic" in v;
  let checked = 0;
  for (const f of files) {
    const mod = await import(new URL(f, root).href);
    for (const value of Object.values(mod)) {
      const specs = Array.isArray(value) ? value : [value];
      for (const s of specs) if (isSpec(s)) { check(s); checked++; }
    }
  }
  assert.ok(checked > 0, "found quote files but no specs");
});
