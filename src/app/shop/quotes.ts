import type { QuoteSpec } from "@/lib/review-quotes";

/*
 * The farm store's verbatim Google quotes (finish/boards/shop/NOTES.md,
 * consistency pass). One quote on one page: none of these appears on another
 * page. `topic` is the visit type shown in the attribution line (CONSISTENCY #2).
 * Resolve on the server with `resolveFieldQuote(spec, { role: true })`.
 *
 * Not yet in scripts/review-quotes.test.mts (not a shop file): the primary adds
 * SHOP_QUOTES there so a reworded review fails the build instead of shipping.
 */

/** /shop, Mangalitsa shelf. */
export const SHOP_SHELF_QUOTE: QuoteSpec = {
  author: "Brit Lawson",
  date: "2025-05-12",
  sentenceStartsWith: "Had recommendations for local places",
  topic: "Wedding",
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
