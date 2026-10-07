/*
 * Guest quotes on /weddings, one per place (CONSISTENCY #2). Pure: no imports
 * besides the type, so scripts/review-quotes.test.mts proves each one verbatim.
 * Attribution reads "NAME · WEDDING · MONTH YEAR · GOOGLE REVIEW" (role "Wedding").
 */
import type { QuoteSpec } from "../../lib/review-quotes";

/** No. 1, The coos: a parent of the bride on Connor and the herd. */
export const WEDDINGS_COOS_QUOTE: QuoteSpec = {
  author: "Mellani Calvin",
  date: "2025-09-08",
  sentenceStartsWith: "He even brushed them out",
  sentenceCount: 2,
  topic: "Wedding",
};

/** No. 2, The whimsical forest. */
export const WEDDINGS_FOREST_QUOTE: QuoteSpec = {
  author: "Kristen Brown",
  date: "2025-05-01",
  sentenceStartsWith: "My daughter and son-in-law dreamed",
  topic: "Wedding",
};

/** Weekend III, the morning after. Hidden with the sauna sentence until Connor answers. */
export const WEDDINGS_SPA_QUOTE: QuoteSpec = {
  author: "Amy Daisy",
  date: "2026-07-28",
  sentenceStartsWith: "The spa was also a hit",
  topic: "Wedding",
};

/** No. 4, Connor. */
export const WEDDINGS_CONNOR_QUOTE: QuoteSpec = {
  author: "Casey Hoyer",
  date: "2026-09-11",
  sentenceStartsWith: "It's a genuinely beautiful property",
  topic: "Wedding",
};

/** FAQ: what if it rains. */
export const WEDDINGS_RAIN_QUOTE: QuoteSpec = {
  author: "Elise Hooghkirk",
  date: "2026-09-16",
  sentenceStartsWith: "It rained on the wedding day",
  topic: "Wedding",
};

/** Beside the form: the fear of the call, answered. */
export const WEDDINGS_CALL_QUOTE: QuoteSpec = {
  author: "Tatum Paullus",
  date: "2026-06-30",
  sentenceStartsWith: "Connor approached our call softly",
  topic: "Wedding",
};
