import type { Metadata } from "next";
import { HeroSection } from "@/components/home/HeroSection";
import { SocialProofBar } from "@/components/home/SocialProofBar";
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
      <HeroSection />
      <SocialProofBar />
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

      {/* Sticky mobile CTA for Meta ad traffic */}
      <StickyMobileCTA
        label="Plan Your Wedding"
        href="/weddings"
      />
      {/* Bottom padding for sticky CTA on mobile */}
      <div className="h-20 lg:hidden" />
    </>
  );
}
