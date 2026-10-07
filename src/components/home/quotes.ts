/**
 * Review quote specs the homepage prints (finish/boards/home NOTES, rounds 2
 * and 3). Pure data, no imports beyond the type, so a test can load it.
 * CONSISTENCY #2: each quote appears on one page only. These three are used
 * on no other page.
 */
import type { QuoteSpec } from "@/lib/review-quotes";

/** Reason No. 1, "The coos": evidence that the coos are in the photos. */
export const HOME_COO_QUOTE: QuoteSpec = {
  author: "Olivia Daisy",
  date: "2026-07-22",
  sentenceStartsWith: "They did everything",
  topic: "Wedding",
};

/** The one wedding review: a working wedding photographer. */
export const HOME_PHOTOGRAPHER_QUOTE: QuoteSpec = {
  author: "Leanna Little",
  date: "2026-01-01",
  sentenceStartsWith: "I was lucky enough to photograph",
  topic: "Wedding",
};

/** Visitor proof under "Visiting the farm" (she rented the Cottage). */
export const HOME_VISIT_QUOTE: QuoteSpec = {
  author: "Jennifer Hildebrand",
  date: "2026-04-14",
  sentenceStartsWith: "We enjoyed the Nordic spa",
  topic: "Stay",
};
