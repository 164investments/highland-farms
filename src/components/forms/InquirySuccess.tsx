"use client";

import { useEffect, useRef } from "react";
import { CONTACT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { FieldArrow, fieldCtaClass, toRoman } from "@/components/ui/FieldGuide";

export interface InquirySuccessProps {
  firstName: string;
  email: string;
  /** "June 2027", "2027", or "" when no month or year was chosen. */
  dateText: string;
  flexible: boolean;
  wedding: boolean;
  /** Prefilled Acuity wedding-call link (wedding types only). */
  callHref?: string;
  onCallClick?: () => void;
  className?: string;
}

/**
 * Honest next steps after an inquiry: no response-time promise and the free
 * call with Connor prefilled for wedding types. It draws no frame of its own:
 * the form card (InquiryForm) is the one object, so it never nests a card in a card.
 */
export function InquirySuccess({
  firstName,
  email,
  dateText,
  flexible,
  wedding,
  callHref,
  onCallClick,
  className,
}: InquirySuccessProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the confirmation so keyboard and screen-reader users land on it.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const checkStep = dateText
    ? `Our events team checks ${dateText} against the farm calendar${flexible ? ", knowing you're flexible" : ""}.`
    : "Our events team checks the farm calendar for open dates.";

  const steps = wedding
    ? [
        checkStep,
        `They write back to ${email} with what's open.`,
        "If the farm feels right, you set a time to talk it through with Connor.",
      ]
    : [
        dateText
          ? `Our team reads your note and checks ${dateText} against the farm calendar.`
          : "Our team reads your note and checks the farm calendar.",
        `We write back to ${email}.`,
      ];

  const telHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`;

  return (
    <div role="status" className={className}>
      <p className="font-display text-[19px] italic leading-snug text-fern">
        {wedding ? "Your date request is in." : "Your note is in."}
      </p>
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="field-heading mt-1 font-display text-[34px] leading-[1.05] text-ink outline-none sm:text-[38px]"
      >
        {firstName ? `Thank you, ${firstName}.` : "Thank you."}
      </h3>

      <p className="mt-5 font-sans text-[14px] font-medium text-ink">What happens next</p>
      <ol className="mt-2 border-t border-rule">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-4 border-b border-rule py-3">
            <span aria-hidden="true" className="w-6 shrink-0 font-display text-[20px] italic leading-none text-fern">
              {toRoman(i + 1)}
            </span>
            <span className="min-w-0 font-sans text-[15px] leading-relaxed text-ink-body [overflow-wrap:anywhere]">{step}</span>
          </li>
        ))}
      </ol>

      {wedding && callHref && (
        <div className="mt-6">
          <p className="m-0 font-sans text-[15px] leading-relaxed text-ink-body">
            The call is free and takes 45 minutes.
          </p>
          <a
            href={callHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onCallClick}
            // Narrow panels wrap the label to two lines; let the button grow instead of clipping.
            className={cn(fieldCtaClass, "mt-3 h-auto min-h-[52px] w-full px-5 py-2.5 text-center")}
          >
            Book your free call with Connor
            <FieldArrow />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      )}

      <p className="mt-6 font-sans text-[14px] leading-relaxed text-ink-note">
        Prefer the phone? Call{" "}
        <a href={telHref} className="font-medium text-pine underline underline-offset-4">
          {CONTACT.phone}
        </a>
        .
      </p>
    </div>
  );
}
