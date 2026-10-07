/*
 * Quotes on /gift-certificates (one page per quote, CONSISTENCY #2). All are
 * surprises booked by a partner; the page never says they were certificates.
 * Pure: see farm-tours/quotes.ts.
 */
import type { QuoteSpec } from "../../lib/review-quotes";

export const GIFTS_HERO_QUOTE: QuoteSpec = {
  author: "KSchroe",
  date: "2026-09-03",
  sentenceStartsWith: "My husband surprised me with the Highland Cow",
  topic: "Farm tour",
};

export const GIFTS_VALERIE_QUOTE: QuoteSpec = {
  author: "Valerie Kitajchuk",
  date: "2026-05-20",
  sentenceStartsWith: "Thank you Highland farms",
  topic: "Farm tour",
};

/** His review does not name a visit type, so the page shows no role for it. */
export const GIFTS_STEWART_QUOTE: QuoteSpec = {
  author: "Stewart Myers",
  date: "2025-07-11",
  sentenceStartsWith: "Best surprise ever",
  sentenceCount: 2,
  topic: "Surprise",
};
