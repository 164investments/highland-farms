import type { QuoteSpec } from "@/lib/review-quotes";

/*
 * The farm store's verbatim Google quotes (finish/boards/shop/NOTES.md,
 * consistency pass). One quote on one page: none of these sentences appears on
 * another page. `topic` is the visit type shown in the attribution line
 * (CONSISTENCY #2). Resolve on the server with `resolveFieldQuote(spec, { role: true })`.
 * scripts/review-quotes.test.mts loads every quotes.ts under src/, so a reworded
 * review fails the test instead of shipping.
 */

/**
 * /shop, under the Mangalitsa shelf: a buyer there wants to know whether the
 * meat is good, and this sentence names the bacon and tenderloin on that shelf
 * (Cialdini r4; it replaced Brit L.'s line about convenience). Lauren Case
 * stayed in the Cottage and ordered farm food for the stay. Her review gives a
 * different sentence ("Our 2 yr old ...") to the Cottage stay page, which the
 * one-review, different-sentences exception allows (CONSISTENCY #2).
 */
export const SHOP_SHELF_QUOTE: QuoteSpec = {
  author: "Lauren Case",
  date: "2025-11-25",
  sentenceStartsWith: "It was so delicious",
  topic: "Stay",
};

/** /shop/[slug] for Highland beef, under the buy box. */
export const SHOP_BEEF_QUOTE: QuoteSpec = {
  author: "emily FL",
  date: "2023-12-02",
  sentenceStartsWith: "The owner is transparent",
  topic: "Farm tour",
};

/** /shop/cart, under the summary. */
export const SHOP_CART_QUOTE: QuoteSpec = {
  author: "David Woolley",
  date: "2026-06-08",
  sentenceStartsWith: "Love the fact that we could pay",
  topic: "Shop order",
};

/** /shop/thank-you, beside the tour and spa links. */
export const SHOP_THANKS_QUOTE: QuoteSpec = {
  author: "elisa colter",
  date: "2026-05-09",
  sentenceStartsWith: "Being able to brush, pet",
  topic: "Farm tour",
};

export const SHOP_QUOTES: QuoteSpec[] = [
  SHOP_SHELF_QUOTE,
  SHOP_BEEF_QUOTE,
  SHOP_CART_QUOTE,
  SHOP_THANKS_QUOTE,
];
