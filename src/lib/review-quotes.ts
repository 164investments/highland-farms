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

/** Quote on /nordic-spa. */
export const SPA_QUOTE: QuoteSpec = {
  author: "Roman Sannikov",
  date: "2026-02-24",
  sentenceStartsWith: "The sauna was great",
  topic: "Nordic Forest Spa",
};
