import type { Metadata } from "next";
import Link from "next/link";
import { FieldArrow, fieldCtaClass } from "@/components/ui/FieldGuide";
import { CONTACT } from "@/lib/constants";
import { PICKUP_LOCATION } from "@/lib/shop/fulfillment";

// Recommendation (shop board, ORD-01): 301 this route to /shop in next.config.ts.
// Until then it points people to the working store instead of the old
// "checkout is being rebuilt" stopgap.
export const metadata: Metadata = {
  title: "Order From the Farm",
  description:
    "Order Mangalitsa pork, Highland beef, eggs and Highland Farms apparel from the farm store in Brightwood, Oregon. Free farm pickup or local delivery.",
  robots: { index: false, follow: true },
};

const TEL = `tel:+1${CONTACT.phone.replace(/\D/g, "")}`;

export default function ShopOrderPage() {
  return (
    <div className="surface-paper bg-paper pt-[var(--header-h,104px)] font-sans text-ink">
      <section className="px-5 pb-14 pt-8 lg:px-16 lg:pb-24 lg:pt-16">
        <div className="mx-auto max-w-[760px]">
          <p className="m-0 font-display text-[17px] italic text-fern lg:text-[22px]">The Highland Farms store</p>
          <h1 className="field-heading m-0 mt-1 font-display text-[34px] leading-[1.04] lg:text-[52px]">Order from the farm.</h1>
          <p className="m-0 mt-4 text-[15px] leading-[1.6] text-ink-body lg:text-[17px]">
            Order and pay in the farm store. Pickup is free at {PICKUP_LOCATION.address}, or we deliver locally. We
            don&apos;t ship.
          </p>
          <Link href="/shop" className={`${fieldCtaClass} mt-6`}>
            Go to the farm store
            <FieldArrow />
          </Link>
          <p className="m-0 mt-6 border-t border-rule pt-4 text-[14px] text-ink-body">
            Questions about an order? Call{" "}
            <a href={TEL} className="whitespace-nowrap font-medium text-pine">
              {CONTACT.phone}
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
