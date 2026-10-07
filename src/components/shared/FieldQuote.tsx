import { cn } from "@/lib/utils";
import { featuredQuotes } from "@/lib/reviews";
import { shortName, type QuoteSpec } from "@/lib/review-quotes";
import { fieldAttribution, fieldMonthYear } from "@/components/ui/FieldGuide";

interface FieldQuoteProps {
  spec: QuoteSpec;
  /** Add the spec's topic to the attribution ("Married here in 2025"). */
  withTopic?: boolean;
  /** Add "Month Year" (CONSISTENCY #2: `FIRST L. · MONTH YEAR · GOOGLE REVIEW`). */
  withDate?: boolean;
  /** Print the author in full (a business: "Kate Holt Photography"). */
  fullName?: boolean;
  className?: string;
  quoteClassName?: string;
  metaClassName?: string;
}

/**
 * One verbatim Google review line for a first screen, where the hero sets
 * the type size through quoteClassName / metaClassName. Same style as
 * FieldReview (@/components/field/Reviews), which is the default everywhere
 * else. Renders nothing when the quote no longer resolves from the snapshot.
 */
export function FieldQuote({
  spec,
  withTopic = false,
  withDate = false,
  fullName = false,
  className,
  quoteClassName,
  metaClassName,
}: FieldQuoteProps) {
  const [q] = featuredQuotes([spec]);
  if (!q) return null;

  return (
    <figure className={cn("m-0", className)}>
      <blockquote className="m-0">
        <p className={cn("m-0 font-display italic leading-[1.3] text-ink", quoteClassName)}>
          &ldquo;{q.quote}&rdquo;
        </p>
      </blockquote>
      <figcaption
        className={cn("font-sans uppercase tracking-[0.08em] text-ink-meta", metaClassName)}
      >
        {fieldAttribution({
          name: fullName ? q.name : shortName(q.name),
          role: withTopic ? q.topic : undefined,
          when: withDate ? fieldMonthYear(spec.date) : undefined,
        })}
      </figcaption>
    </figure>
  );
}
