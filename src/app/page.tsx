import type { Metadata } from "next";
import { HomeHero } from "@/components/home/HomeHero";
import { WeddingHighlights } from "@/components/home/WeddingHighlights";
import { InquirySection } from "@/components/home/InquirySection";
import { TestimonialSection } from "@/components/home/TestimonialSection";
import { ExperienceCards } from "@/components/home/ExperienceCards";
import { AccommodationsPreview } from "@/components/home/AccommodationsPreview";
import { LocationBlock } from "@/components/home/LocationBlock";
import { FinalCTA } from "@/components/home/FinalCTA";
import { InstagramEmbed } from "@/components/shared/InstagramEmbed";
import { StickyMobileCTA } from "@/components/shared/StickyMobileCTA";
import { FadeIn } from "@/components/ui/FadeIn";
import { StructuredData } from "@/components/layout/StructuredData";
import { CHECK_DATE_HREF } from "@/components/layout/Masthead";

export const metadata: Metadata = {
  title: "Highland Farms | Oregon's Premier Farm Wedding Venue",
  description:
    "All-inclusive farm and forest weddings at the base of Mt. Hood. Highland Cow farm tours, Nordic spa, and luxury farm stays in Brightwood, Oregon.",
  // Explicit trailing slash to match sitemap.ts's `${BASE_URL}/` entry for
  // the homepage — relying on metadataBase + "/" resolution here was
  // rendering without the trailing slash, disagreeing with the sitemap.
  alternates: { canonical: "https://highlandfarmsoregon.com/" },
  openGraph: {
    title: "Highland Farms | Oregon's Premier Farm Wedding Venue",
    description:
      "All-inclusive farm and forest weddings at the base of Mt. Hood. Highland Cow farm tours, Nordic spa, and luxury farm stays in Brightwood, Oregon.",
    images: [
      {
        url: "/images/hero/farm-aerial.jpg",
        width: 1200,
        height: 630,
        alt: "Aerial view of Highland Farms at the base of Mt. Hood",
      },
    ],
  },
};

export default function Home() {
  return (
    <>
      <StructuredData pathname="/" />
      {/* The first screen carries the review stars, so the separate review strip is gone. */}
      <HomeHero />
      <FadeIn>
        <WeddingHighlights />
      </FadeIn>
      <FadeIn>
        <InquirySection />
      </FadeIn>
      <FadeIn>
        <TestimonialSection />
      </FadeIn>
      <FadeIn>
        <ExperienceCards />
      </FadeIn>
      <FadeIn>
        <AccommodationsPreview />
      </FadeIn>
      <FadeIn>
        <InstagramEmbed />
      </FadeIn>
      <FadeIn>
        <LocationBlock />
      </FadeIn>
      <FinalCTA />

      {/* Sticky mobile CTA: hidden while the hero's own CTA (data-hero-cta) is on screen */}
      <StickyMobileCTA
        label="Check your date"
        href={CHECK_DATE_HREF}
      />
      {/* Bottom padding for sticky CTA on mobile */}
      <div className="h-20 lg:hidden" />
    </>
  );
}
