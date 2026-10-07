import type { Metadata } from "next";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { Container } from "@/components/ui/Container";
import { GiftBody } from "./GiftBody";
import { StaticGifts } from "./StaticGifts";
import { StructuredData } from "@/components/layout/StructuredData";

const DESCRIPTION =
  "Give a private Highland Farms farm tour, a Nordic spa session, or a Highland Day with both. The code arrives by email, usually within minutes of checkout, and they pick the date.";

export const metadata: Metadata = {
  title: "Gift Certificates",
  description: DESCRIPTION,
  alternates: { canonical: "/gift-certificates" },
  openGraph: {
    title: "Gift Certificates | Highland Farms",
    description: DESCRIPTION,
    url: "https://highlandfarmsoregon.com/gift-certificates",
    type: "website",
    images: [
      {
        url: "/images/farm/agritourism-stay.jpg",
        width: 1200,
        height: 630,
        alt: "Two people feeding a shaggy Highland calf in the hay, the herd behind them",
      },
    ],
  },
};

/**
 * One URL, two pages. Native calendar off (today): the static gifts page,
 * whose rows open the Acuity gift catalog in the booking modal. Native
 * calendar on: the native purchase flow (GiftBody), unchanged.
 */
export default function GiftCertificatesPage() {
  return (
    <>
      <StructuredData pathname="/gift-certificates" />
      {nativeCalendarEnabled() ? (
        <Container className="pt-[calc(var(--header-h,128px)+1.5rem)] pb-16 lg:pb-20">
          <div className="mx-auto max-w-3xl">
            <p className="font-sans text-xs uppercase tracking-[0.28em] text-forest/70">Gift Certificates</p>
            <h1 className="mt-3 text-4xl text-forest">Give Highland Farms.</h1>
            <p className="mt-3 font-sans text-stone-600">
              A farm tour, a spa session, or a 3-visit spa pack. Pick one, and we&apos;ll
              email the code, usually within minutes.
            </p>
            <div id="choose" className="mt-8 scroll-mt-[var(--header-h,128px)]">
              <GiftBody />
            </div>
          </div>
        </Container>
      ) : (
        <StaticGifts />
      )}
    </>
  );
}
