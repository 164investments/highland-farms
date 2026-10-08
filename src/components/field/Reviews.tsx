import { cn } from "@/lib/utils";
import {
  FIVE_STAR_COUNT,
  GOOGLE_REVIEW_LINK,
  REVIEW_COUNT,
  featuredQuotes,
} from "@/lib/reviews";
import { shortName, type QuoteSpec } from "@/lib/review-quotes";
import {
  FieldArrow,
  FieldQuoteView,
  FieldReviewLine,
  FieldStars,
  fieldMonthYear,
  reviewTierText,
  type FieldQuoteSize,
  type ResolvedFieldQuote,
  type ReviewTier,
} from "@/components/ui/FieldGuide";

/*
 * Review primitives bound to the Google snapshot. SERVER ONLY: this module
 * imports src/lib/reviews.ts, which bundles google-reviews.json. A client
 * component must not import it; resolve on the server page and pass
 * `REVIEW_TIER_COUNTS[tier]` or `resolveFieldQuote(spec)` down as props, then
 * render FieldReviewLine / FieldQuoteView from ui/FieldGuide.
 */

/** The count each tier shows (CONSISTENCY #1). */
export const REVIEW_TIER_COUNTS: Record<ReviewTier, number> = {
  hero: REVIEW_COUNT,
  nearCta: FIVE_STAR_COUNT,
  compact: REVIEW_COUNT,
};

export { GOOGLE_REVIEW_LINK };

interface ResolveOptions {
  /** Print the author as Google shows it (a business: "Kate Holt Photography"). Default "Olivia B.". */
  fullName?: boolean;
  /** Add the spec's topic ("Married here"), or a given role, between the name and the date. */
  role?: boolean | string;
  /** Include "Month Year" (default true; CONSISTENCY #2). */
  withDate?: boolean;
}

/**
 * Resolve a QuoteSpec against the snapshot. Null when the review was edited
 * or removed upstream, so the caller renders nothing rather than a stale line.
 */
export function resolveFieldQuote(spec: QuoteSpec, opts: ResolveOptions = {}): ResolvedFieldQuote | null {
  const [q] = featuredQuotes([spec]);
  if (!q) return null;
  const role = typeof opts.role === "string" ? opts.role : opts.role ? q.topic : undefined;
  return {
    quote: q.quote,
    name: opts.fullName ? q.name : shortName(q.name),
    when: opts.withDate === false ? "" : fieldMonthYear(spec.date),
    role,
    rating: q.rating,
  };
}

interface FieldReviewProps extends ResolveOptions {
  spec: QuoteSpec;
  size?: FieldQuoteSize;
  rule?: boolean;
  stars?: boolean;
  className?: string;
  quoteClassName?: string;
  metaClassName?: string;
}

/** One verbatim Google review in the one quote style. Renders nothing if it no longer resolves. */
export function FieldReview({
  spec,
  fullName,
  role,
  withDate,
  ...view
}: FieldReviewProps) {
  const q = resolveFieldQuote(spec, { fullName, role, withDate });
  if (!q) return null;
  return <FieldQuoteView {...q} {...view} />;
}

interface FieldReviewTierProps {
  tier: ReviewTier;
  /** Link the line to the Google profile. */
  link?: boolean;
  /** Whose reviews, for a line under one stay: "Highland Farms". */
  subject?: string;
  starSize?: number;
  className?: string;
}

/** Stars plus the tier sentence, with the count read from the snapshot. */
export function FieldReviewTier({ tier, link = false, subject, starSize, className }: FieldReviewTierProps) {
  return (
    <FieldReviewLine
      tier={tier}
      count={REVIEW_TIER_COUNTS[tier]}
      total={REVIEW_COUNT}
      href={link ? GOOGLE_REVIEW_LINK : undefined}
      subject={subject}
      starSize={starSize}
      className={className}
    />
  );
}

interface FieldReviewListProps extends ResolveOptions {
  specs: readonly QuoteSpec[];
  /**
   * The list's heading: a tier sentence with stars, or null for none (when the
   * section header already carries it). Default "compact": a review list sits
   * away from any button, so it never shows the five-star number.
   */
  heading?: ReviewTier | null;
  headingAs?: "h2" | "h3";
  /** The closing link: "plain" ("Read them on Google"), "count" ("Read all N reviews on Google"), or none. */
  link?: "plain" | "count" | false;
  /** Desktop columns. */
  columns?: 1 | 3;
  size?: FieldQuoteSize;
  stars?: boolean;
  className?: string;
}

/** Hairline-ruled verbatim quotes: no avatars, no cards. Quotes match the page's topic. */
export function FieldReviewList({
  specs,
  heading = "compact",
  headingAs: Heading = "h3",
  link = "plain",
  columns = 1,
  size = "md",
  stars = false,
  fullName,
  role,
  withDate,
  className,
}: FieldReviewListProps) {
  const quotes = specs.flatMap((spec) => {
    const q = resolveFieldQuote(spec, { fullName, role, withDate });
    return q ? [{ key: `${spec.author}-${spec.date}`, q }] : [];
  });
  if (quotes.length === 0) return null;
  const three = columns === 3;
  return (
    <div className={className}>
      {heading && (
        <Heading className="field-heading m-0 flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-[28px] leading-tight text-ink lg:text-[36px]">
          <FieldStars size={17} />
          <span>{reviewTierText(heading, REVIEW_TIER_COUNTS[heading], undefined, REVIEW_COUNT)}</span>
        </Heading>
      )}
      <ul
        role="list"
        className={cn(
          "m-0 list-none border-t border-rule p-0",
          heading && "mt-4",
          three && "lg:grid lg:grid-cols-3 lg:gap-x-12 lg:border-t-0",
        )}
      >
        {quotes.map(({ key, q }) => (
          <li
            key={key}
            className={cn("border-b border-rule py-5", three && "lg:border-b-0 lg:border-t lg:py-8")}
          >
            <FieldQuoteView {...q} size={size} stars={stars} />
          </li>
        ))}
      </ul>
      {link && (
        <a
          href={GOOGLE_REVIEW_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center gap-2 font-sans text-[15px] font-medium text-pine"
        >
          <span className="border-b border-pine-line pb-0.5">
            {link === "count" ? `Read all ${REVIEW_COUNT} reviews on Google` : "Read them on Google"}
          </span>
          <FieldArrow />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </div>
  );
}
