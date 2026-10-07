/**
 * Pure helpers for quoting real Google reviews verbatim.
 *
 * No imports on purpose: scripts/review-quotes.test.mts loads this file
 * directly (node cannot resolve the "@/" alias) and proves every rendered
 * quote is a substring of the review snapshot. Quotes are whole sentences in
 * their original order; a trimmed quote ends with an ellipsis, never stitched.
 */

export interface QuoteSpec {
  /** author_name exactly as Google shows it. */
  author: string;
  /** publish_time date (YYYY-MM-DD), to disambiguate repeat authors. */
  date: string;
  /** Take the first N sentences (default 1). */
  firstSentences?: number;
  /** Instead, take the single sentence that starts with this text. */
  sentenceStartsWith?: string;
  /** Short, true topic used in the attribution line. */
  topic: string;
}

export function splitSentences(text: string): string[] {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.match(/[^.!?]+(?:[.!?]+["'”’)]*)(?=\s|$)|[^.!?]+$/g)?.map((s) => s.trim()) ?? [];
}

/** Returns null (never throws) when the review text no longer contains the sentence, e.g. after an edit upstream. */
export function buildQuote(text: string, spec: QuoteSpec): string | null {
  const sentences = splitSentences(text);
  if (spec.sentenceStartsWith) {
    const hit = sentences.find((s) => s.includes(spec.sentenceStartsWith!));
    if (!hit) return null;
    // Drop leftovers from the previous sentence (e.g. an emoticon) before the match.
    return hit.slice(hit.indexOf(spec.sentenceStartsWith));
  }
  const n = spec.firstSentences ?? 1;
  const picked = sentences.slice(0, n).join(" ");
  if (!picked) return null;
  return sentences.length > n ? `${picked} …` : picked;
}

/** Quotes featured on the homepage (wedding + stay). */
export const HOME_QUOTES: QuoteSpec[] = [
  { author: "Maya C", date: "2025-10-01", firstSentences: 2, topic: "Wedding" },
  { author: "Emily Enns", date: "2025-06-20", firstSentences: 2, topic: "Farm stay" },
];

/**
 * Wedding quote in the home and /weddings first screens. Olivia Brown's review
 * (2025-07-29) opens "I got married at highland farms just a few days ago and
 * Connor & his team made it so I didn’t have to lift a finger all day." The
 * quote is that sentence from "Connor" on, verbatim; she married here in 2025.
 */
export const WEDDING_QUOTE: QuoteSpec = {
  author: "Olivia Brown",
  date: "2025-07-29",
  sentenceStartsWith: "Connor & his team made it",
  topic: "Married here in 2025",
};

/** "Olivia Brown" -> "Olivia B.". A single name is returned as is. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last.charAt(0).toUpperCase()}.`;
}

/** Quote on /nordic-spa. */
export const SPA_QUOTE: QuoteSpec = {
  author: "Roman Sannikov",
  date: "2026-02-24",
  sentenceStartsWith: "The sauna was great",
  topic: "Nordic Forest Spa",
};

/**
 * Quote on /thanksgiving. Kamakila Waiwaiole's review (2025-06-23) opens "My
 * family and I spent a few nights in the lodge a couple weeks back." It does
 * not mention Thanksgiving, so the attribution says Lodge, not the package.
 */
export const THANKSGIVING_QUOTE: QuoteSpec = {
  author: "Kamakila Waiwaiole",
  date: "2025-06-23",
  sentenceStartsWith: "The property is delicately maintained",
  topic: "Family stay in the Lodge",
};

/**
 * Second /thanksgiving quote, beside the herd photo. Lauren Case stayed in the
 * Cottage with a toddler in November 2025; the sentence is about the cows.
 */
export const THANKSGIVING_FAMILY_QUOTE: QuoteSpec = {
  author: "Lauren Case",
  date: "2025-11-25",
  sentenceStartsWith: "Our 2 yr old daughter",
  topic: "Family stay in the Cottage",
};
