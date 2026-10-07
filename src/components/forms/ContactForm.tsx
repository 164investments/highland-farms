import { FIVE_STAR_COUNT, REVIEW_COUNT } from "@/lib/reviews";
import { eventYearOptions } from "@/lib/inquiry-mapping";
import { InquiryForm, type InquiryFormProps } from "./InquiryForm";

export type ContactFormProps = Omit<InquiryFormProps, "fiveStarCount" | "reviewTotal" | "yearOptions">;

/**
 * The inquiry form ("Check your date"), for weddings, celebrations and the
 * contact page. A server component on purpose: it reads the five-star count
 * here and hands the client form a number, so the 290 KB review snapshot is
 * never shipped to the browser. Mapping to Supabase, email, HubSpot,
 * BookedIQ and GA4 lives in src/lib/inquiry-mapping.ts.
 *
 * The year options are computed here too, on the server (at build time for a
 * prerendered page), so hydration sees the same list the HTML has; the client
 * form switches to the visitor's current years after it mounts.
 */
export function ContactForm(props: ContactFormProps) {
  return <InquiryForm {...props} fiveStarCount={FIVE_STAR_COUNT} reviewTotal={REVIEW_COUNT} yearOptions={eventYearOptions()} />;
}
