/*
 * The one guest quote on /contact, set beside the inquiry form (CONSISTENCY #2:
 * a quote appears on one page only). Pure: no imports besides the type, so the
 * review-quotes test can load it directly and prove it verbatim.
 */
import type { QuoteSpec } from "../../lib/review-quotes";

/** A mother of the bride on the team's planning and replies: what a couple weighs at the form. */
export const CONTACT_FORM_QUOTE: QuoteSpec = {
  author: "Renee Kirk",
  date: "2025-07-01",
  sentenceStartsWith: "Connor and his team were friendly, helpful, responsive",
  topic: "Wedding",
};
