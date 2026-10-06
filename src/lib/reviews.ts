/**
 * Single source of truth for Google review social proof.
 *
 * Everything derives from `src/data/google-reviews.json`, the snapshot written
 * by `scripts/pull-gmb-reviews.mjs` (Google Business Profile v4 API). Import
 * from here rather than hardcoding a count or a rating anywhere — the snapshot
 * is refreshed on a schedule and any literal will silently go stale.
 *
 * Display rules live in the three-tier spec: hero uses REVIEW_COUNT, near-CTA
 * uses FIVE_STAR_COUNT, inline uses REVIEW_COUNT. Never show REVIEW_RATING as a
 * decimal in the UI — it is for structured data only.
 */
import googleReviews from "@/data/google-reviews.json";
import { buildQuote, type QuoteSpec } from "@/lib/review-quotes";

export type Review = (typeof googleReviews.reviews)[number];

export const GOOGLE_REVIEW_LINK = "https://share.google/jrLOI4AhnpzbPPBpF";

/** Total reviews on the profile. */
export const REVIEW_COUNT = googleReviews.user_rating_count;

/** Average rating. Structured data / JSON-LD only — never rendered as a decimal. */
export const REVIEW_RATING = googleReviews.rating;

/** Reviews at a perfect 5 stars — the near-CTA "rational framing" number. */
export const FIVE_STAR_COUNT = googleReviews.reviews.filter(
  (r) => r.rating === 5,
).length;

/** ISO date (YYYY-MM-DD) the snapshot was pulled from Google. */
export const REVIEWS_FETCHED_AT = googleReviews.fetched_at;

export const REVIEWS: Review[] = googleReviews.reviews;

/** Find one review by exact author name and publish date (YYYY-MM-DD). */
export function findReview(author: string, date: string): Review | undefined {
  return REVIEWS.find(
    (r) => r.author_name === author && r.publish_time?.startsWith(date),
  );
}

export interface FeaturedQuote {
  quote: string;
  name: string;
  rating: number;
  topic: string;
}

/** Resolve quote specs to verbatim quotes from the snapshot (missing reviews are dropped). */
export function featuredQuotes(specs: QuoteSpec[]): FeaturedQuote[] {
  return specs.flatMap((spec) => {
    const r = findReview(spec.author, spec.date);
    if (!r?.text) return [];
    return [
      {
        quote: buildQuote(r.text, spec),
        name: r.author_name ?? spec.author,
        rating: r.rating,
        topic: spec.topic,
      },
    ];
  });
}
