import { cn } from "@/lib/utils";
import { featuredQuotes } from "@/lib/reviews";
import { shortName, type QuoteSpec } from "@/lib/review-quotes";

interface FieldQuoteProps {
  spec: QuoteSpec;
  /** Add the spec's topic to the attribution ("Married here in 2025"). */
  withTopic?: boolean;
  className?: string;
  quoteClassName?: string;
  metaClassName?: string;
}

/**
 * One verbatim Google review line, Field Guide style: italic Cormorant quote,
 * small-caps attribution "Olivia B. · Google review". Renders nothing when
 * the quote no longer resolves from the snapshot (review edited or removed).
 */
export function FieldQuote({
  spec,
  withTopic = false,
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
        {shortName(q.name)}
        {withTopic && <> &middot; {q.topic}</>} &middot; Google review
      </figcaption>
    </figure>
  );
}
