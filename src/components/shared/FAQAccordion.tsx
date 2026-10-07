import type { FAQItem } from "@/lib/types";
import { FieldFaq } from "@/components/field/Faq";

interface FAQAccordionProps {
  items: FAQItem[];
  size?: "lg" | "md" | "sm";
  className?: string;
}

/**
 * Kept for existing import sites: renders the Field Guide FAQ (ruled
 * <details>, all closed). FAQPage JSON-LD is still emitted by each page from
 * the same data array. New code imports FieldFaq from @/components/field/Faq.
 */
export function FAQAccordion({ items, size, className }: FAQAccordionProps) {
  return <FieldFaq items={items} size={size} className={className} />;
}
