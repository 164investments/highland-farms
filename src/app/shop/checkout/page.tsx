import type { Metadata } from "next";
import { CheckoutBody } from "./CheckoutBody";
import { REVIEW_TIER_COUNTS } from "@/components/field/Reviews";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "";
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "";

  return <CheckoutBody
      applicationId={applicationId}
      locationId={locationId}
      reviewCount={REVIEW_TIER_COUNTS.nearCta}
      reviewTotal={REVIEW_TIER_COUNTS.compact}
    />;
}
