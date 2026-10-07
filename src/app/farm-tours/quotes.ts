/*
 * Quotes on /farm-tours (CONSISTENCY #2: a quote appears on one page only).
 * Pure: type-only import, so scripts/review-quotes.test.mts proves each spec
 * is verbatim, whole-sentence Google text.
 */
import type { QuoteSpec } from "../../lib/review-quotes";

export const TOURS_HUG_QUOTE: QuoteSpec = {
  author: "Courtney Johnson",
  date: "2026-07-31",
  sentenceStartsWith: "I highly recommend taking the trip",
  topic: "Farm tour",
};

export const TOURS_SCOTLAND_QUOTE: QuoteSpec = {
  author: "Wendy Doran",
  date: "2026-05-17",
  sentenceStartsWith: "Having done an unforgettable tour",
  topic: "Farm tour",
};

export const TOURS_COWS_QUOTE: QuoteSpec = {
  author: "Lizzy Dolce",
  date: "2026-02-19",
  sentenceStartsWith: "He introduced us",
  topic: "Farm tour",
};

export const TOURS_RAIN_QUOTE: QuoteSpec = {
  author: "Shawanda Wilder",
  date: "2025-03-21",
  sentenceStartsWith: "Chill rainy day",
  topic: "Farm tour",
};

export const TOURS_NOTES: readonly QuoteSpec[] = [
  {
    author: "Jennifer Eriksen",
    date: "2026-08-02",
    sentenceStartsWith: "Our tour guide Dante made it so enjoyable",
    topic: "Farm tour",
  },
  {
    author: "Ariel Schmidlin",
    date: "2026-05-26",
    sentenceStartsWith: "Dante gave us plenty of time",
    topic: "Farm tour",
  },
];
