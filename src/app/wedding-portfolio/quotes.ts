/*
 * Quotes on /wedding-portfolio and its couple pages (CONSISTENCY #2). Pure:
 * scripts/review-quotes.test.mts proves each spec verbatim. Kate Holt's review
 * supplies a different sentence here than on any other page.
 */
import type { QuoteSpec } from "../../lib/review-quotes";

/**
 * Portfolio "Planning yours?": a couple's own words above the button. A 2026
 * wedding, so it never reads as one of the four 2025 couples above it; used
 * on no other page.
 */
export const PORTFOLIO_PLAN_QUOTE: QuoteSpec = {
  author: "Megan Civelli",
  date: "2026-07-03",
  sentenceStartsWith: "We couldn't have asked for a more beautiful venue",
  topic: "Wedding",
};

/** Couple page (Maya & Justin), "From their photographer". */
export const COUPLE_KATE_QUOTE: QuoteSpec = {
  author: "Kate Holt Photography",
  date: "2026-03-01",
  sentenceStartsWith: "From woodland trails",
  topic: "Wedding",
};

/** PF-01 (pending Connor): Maya C.'s one line on her portfolio card. */
export const MAYA_CARD_QUOTE: QuoteSpec = {
  author: "Maya C",
  date: "2025-10-01",
  sentenceStartsWith: "An absolutely stunning and unique venue",
  topic: "Wedding",
};

/** PF-01 (pending Connor): Casey M.'s one line on the Sydney & Casey card. */
export const CASEY_CARD_QUOTE: QuoteSpec = {
  author: "Casey Mcevers",
  date: "2025-04-30",
  sentenceStartsWith: "I recently hosted my wedding here",
  topic: "Wedding",
};

/** PF-01 (pending Connor): the lead sentence under Maya & Justin's date. */
export const MAYA_LEAD_QUOTE: QuoteSpec = {
  author: "Maya C",
  date: "2025-10-01",
  sentenceStartsWith: "We had our wedding at Highland Farms",
  topic: "Wedding",
};

/** PF-01 (pending Connor): the bride's review, first two sentences at quote size. */
export const MAYA_REVIEW_OPENING: QuoteSpec = {
  author: "Maya C",
  date: "2025-10-01",
  sentenceStartsWith: "We had our wedding at Highland Farms",
  sentenceCount: 2,
  topic: "Wedding",
};

/** PF-01 (pending Connor): the rest of the bride's review, every word kept. */
export const MAYA_REVIEW_REST: QuoteSpec = {
  author: "Maya C",
  date: "2025-10-01",
  sentenceStartsWith: "Everyone on staff was so kind",
  sentenceCount: 4,
  topic: "Wedding",
};

/**
 * Styled sets, above "Planning yours?": a wedding photographer on the farm's
 * forest. Not the set's photographer, and labelled so; her review gives a
 * different sentence on home and on the Whole Farm page.
 */
export const STYLED_PHOTOGRAPHER_QUOTE: QuoteSpec = {
  author: "Leanna Little",
  date: "2026-01-01",
  sentenceStartsWith: "The forest trails are lined with hazelnut shells",
  topic: "Wedding",
};
