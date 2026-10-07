import { FIVE_STAR_COUNT } from "@/lib/reviews";
import { InquiryForm, type InquiryFormProps } from "./InquiryForm";

export type ContactFormProps = Omit<InquiryFormProps, "fiveStarCount">;

/**
 * The inquiry form ("Check your date"), for weddings, celebrations and the
 * contact page. A server component on purpose: it reads the five-star count
 * here and hands the client form a number, so the 290 KB review snapshot is
 * never shipped to the browser. Mapping to Supabase, email, HubSpot,
 * BookedIQ and GA4 lives in src/lib/inquiry-mapping.ts.
 */
export function ContactForm(props: ContactFormProps) {
  return <InquiryForm {...props} fiveStarCount={FIVE_STAR_COUNT} />;
}
