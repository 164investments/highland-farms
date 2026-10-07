import { cn } from "@/lib/utils";
import type { FAQItem } from "@/lib/types";

/*
 * The ruled FAQ: native <details>, so it needs no client JS and works with
 * JavaScript off. FAQPage JSON-LD is built from the SAME array the rows
 * render (faqPageJsonLd), so one edit in src/data updates both.
 */

/** FAQPage structured data for a list of questions. */
export function faqPageJsonLd(items: readonly FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** A <script type="application/ld+json"> safe to inline (no "</script>" break-out). */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

const POLICY = /cancel|refund|reschedul/i;

/**
 * The cancellation answer, word for word, from a FAQ data array: the
 * point-of-sale line under a booking button (CONSISTENCY #10).
 */
export function cancellationAnswer(items: readonly FAQItem[]): string | undefined {
  return items.find((item) => POLICY.test(item.question))?.answer;
}

/** CONSISTENCY #10: no FAQ opens on the policy or on a "No." answer. */
function mayOpen(item: FAQItem | undefined): boolean {
  if (!item) return false;
  return !POLICY.test(item.question) && !/^\s*no\b/i.test(item.answer);
}

const SUMMARY = {
  lg: "min-h-[60px] font-display text-[22px] font-semibold leading-tight lg:text-[26px]",
  md: "min-h-[56px] font-display text-[21px] font-semibold leading-tight lg:text-[24px]",
  sm: "min-h-12 font-sans text-[15px] font-medium leading-snug lg:text-[16px]",
} as const;

interface FieldFaqProps {
  items: readonly FAQItem[];
  /** lg 22/26 (weddings), md 21/24 (default), sm Inter 15 (short store questions). */
  size?: keyof typeof SUMMARY;
  /** One row may start open; ignored for the policy and for "No." answers. Default: all closed. */
  openIndex?: number;
  /** Also emit FAQPage JSON-LD here. Only when the page does not already emit it. */
  jsonLd?: boolean;
  className?: string;
}

export function FieldFaq({ items, size = "md", openIndex, jsonLd = false, className }: FieldFaqProps) {
  const open = openIndex !== undefined && mayOpen(items[openIndex]) ? openIndex : -1;
  return (
    <>
      {jsonLd && <JsonLd data={faqPageJsonLd(items)} />}
      <div className={cn("border-t border-rule", className)}>
        {items.map((item, i) => (
          <details key={item.question} className="group border-b border-rule" open={i === open || undefined}>
            <summary
              className={cn(
                "flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-ink [&::-webkit-details-marker]:hidden",
                SUMMARY[size],
              )}
            >
              <span>{item.question}</span>
              <span
                aria-hidden="true"
                className="shrink-0 font-sans text-[22px] font-normal leading-none text-pine transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            {item.answer
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((para, j) => (
                <p
                  key={j}
                  className="m-0 pb-5 font-sans text-[15px] leading-[1.6] text-ink-body lg:max-w-[720px] lg:text-[16px]"
                >
                  {para}
                </p>
              ))}
          </details>
        ))}
      </div>
    </>
  );
}
