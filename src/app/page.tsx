import type { Metadata } from "next";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeReasons } from "@/components/home/HomeReasons";
import { HomeRealWeddings } from "@/components/home/HomeRealWeddings";
import { InquirySection } from "@/components/home/InquirySection";
import { HomeVisitIndex } from "@/components/home/HomeVisitIndex";
import { HomeClosing } from "@/components/home/HomeClosing";
import { FieldStickyBar } from "@/components/field/StickyBar";
import { StructuredData } from "@/components/layout/StructuredData";

const DESCRIPTION =
  "Whimsical forest weddings with Highland cows as honorary guests, plus private farm tours, a Nordic spa and farm stays, about an hour from Portland.";

export const metadata: Metadata = {
  title: { absolute: "Highland Farms Oregon | Forest Weddings, Cow Tours, Sauna" },
  description: DESCRIPTION,
  // Explicit trailing slash to match sitemap.ts's `${BASE_URL}/` entry for
  // the homepage — relying on metadataBase + "/" resolution here was
  // rendering without the trailing slash, disagreeing with the sitemap.
  alternates: { canonical: "https://highlandfarmsoregon.com/" },
  openGraph: {
    title: "Highland Farms Oregon | Forest Weddings, Cow Tours, Sauna",
    description: DESCRIPTION,
    images: [
      {
        url: "/images/hero/farm-aerial.jpg",
        width: 1200,
        height: 630,
        alt: "Aerial view of Highland Farms, a private forest farm in Brightwood, Oregon",
      },
    ],
  },
};

export default function Home() {
  return (
    <>
      <StructuredData pathname="/" />
      {/* The first screen carries the review stars, so there is no separate review strip. */}
      <HomeHero />
      {/* The rest of the page on the paper surface too (the hero carries its own), so focus rings are
          pine (6.6:1) rather than the sage default (2.5:1), and the ground matches the board. */}
      <div className="surface-paper bg-paper text-ink">
        <HomeReasons />
        <HomeRealWeddings />
        <InquirySection />
        <HomeVisitIndex />
        <HomeClosing />
      </div>

      {/* Phone sticky action: after the hero CTA scrolls away, hidden while the form is on screen.
          The bar reserves its own height; no page spacer. */}
      <FieldStickyBar
        primary={{ label: "Check your date", href: "#check-your-date" }}
        hideWhenVisible="#check-your-date"
      />
    </>
  );
}
