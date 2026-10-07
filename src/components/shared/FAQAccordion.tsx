"use client";

import { useState, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FAQItem } from "@/lib/types";

interface FAQAccordionProps {
  items: FAQItem[];
  /** "field" is the Field Guide paper style (Cormorant questions, ink answers). */
  variant?: "default" | "field";
}

export function FAQAccordion({ items, variant = "default" }: FAQAccordionProps) {
  const field = variant === "field";
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const id = useId();

  return (
    <div
      className={field ? "divide-y divide-rule border-y border-rule" : "divide-y divide-cream-dark"}
      role="region"
      aria-label="Frequently asked questions"
    >
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        const buttonId = `${id}-button-${i}`;
        const panelId = `${id}-panel-${i}`;

        return (
          <div key={i}>
            <h3>
              <button
                id={buttonId}
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className={
                  field
                    ? "flex min-h-[56px] w-full items-center justify-between gap-4 py-3 text-left"
                    : "flex w-full items-center justify-between py-5 text-left"
                }
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <span
                  className={
                    field
                      ? "font-display text-[20px] font-semibold leading-[1.2] text-ink lg:text-[23px]"
                      : "text-base font-normal text-charcoal pr-4 font-sans"
                  }
                >
                  {item.question}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform duration-200",
                    field ? "text-pine" : "text-muted",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className={cn(
                "overflow-hidden transition-all duration-200",
                isOpen ? (field ? "pb-5" : "max-h-96 pb-5") : "max-h-0"
              )}
            >
              <p
                className={
                  field
                    ? "m-0 max-w-[62ch] font-sans text-[15px] leading-[1.6] text-ink-body lg:text-[16px]"
                    : "text-sm text-muted leading-relaxed font-sans font-light"
                }
              >
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
