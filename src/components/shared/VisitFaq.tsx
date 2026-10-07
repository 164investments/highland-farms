import type { ReactNode } from "react";
import { FieldFaq } from "@/components/field/Faq";
import { FieldSection, FieldSectionHeader } from "@/components/ui/FieldGuide";
import type { FAQItem } from "@/lib/types";

/**
 * The visit pages' FAQ: heading left (4 of 12), closed hairline rows right
 * (8 of 12), from lg. Pages emit the FAQPage JSON-LD themselves from the same
 * array (faqPageJsonLd), so the rows and the structured data cannot differ.
 */
export function VisitFaq({
  eyebrow = "Still wondering",
  title = "Questions, answered",
  items,
}: {
  eyebrow?: ReactNode;
  title?: ReactNode;
  items: readonly FAQItem[];
}) {
  return (
    <FieldSection id="faq" aria-label={typeof title === "string" ? title : "Questions"} innerClassName="lg:grid lg:grid-cols-12 lg:gap-x-16">
      <FieldSectionHeader
        id="faq-title"
        eyebrow={eyebrow}
        title={title}
        className="lg:col-span-4"
        titleClassName="lg:text-[56px]"
      />
      <FieldFaq items={items} className="mt-6 lg:col-span-8 lg:mt-0" />
    </FieldSection>
  );
}
