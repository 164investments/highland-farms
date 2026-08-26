import type { Metadata } from "next";
import { CheckoutBody } from "./CheckoutBody";

export const metadata: Metadata = {
  title: "Checkout | Highland Farms",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "";
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "";

  return <CheckoutBody applicationId={applicationId} locationId={locationId} />;
}
