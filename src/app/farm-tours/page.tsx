import type { Metadata } from "next";
import Image from "next/image";
import { Clock, Users, Heart, Sparkles, Gift } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ImageCarousel } from "@/components/gallery/ImageCarousel";
import { FAQAccordion } from "@/components/shared/FAQAccordion";
import { EventCategoryCards } from "@/components/shared/EventCategoryCards";
import { StickyMobileCTA } from "@/components/shared/StickyMobileCTA";
import { GoogleReviewsSection } from "@/components/shared/GoogleReviewsSection";
import { farmTourFAQ } from "@/data/farm-tours";
import { BOOKING_LINKS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Highland Cow Farm Tours — Brightwood, Oregon",
  description:
    "Book a private Highland Cow farm tour near Portland, Oregon. Meet Scottish Highland Cows, Icelandic Sheep, White Peacocks, guardian dogs, chickens, Guinea Fowl, and more. $75 per person, 60-minute private experiences at the base of Mt. Hood in Brightwood.",
  alternates: { canonical: "/farm-tours" },
  openGraph: {
    title: "Highland Cow Farm Tours at Highland Farms Oregon",
    description:
      "Private 60-minute farm tours for up to 6 guests. Meet Scottish Highland Cows and farm animals at the base of Mt. Hood.",
    url: "https://highlandfarmsoregon.com/farm-tours",
    type: "website",
    images: [
      {
        url: "/images/farm/highland-cows-hero.jpg",
        width: 1200,
        height: 630,
        alt: "Scottish Highland Cows at Highland Farms",
      },
    ],
  },
};

function FarmTourSchema() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: farmTourFAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
    />
  );
}

const galleryImages = [
  { src: "/images/farm/farm-animals.jpg", alt: "Guests petting a Highland Cow during a barn tour" },
  { src: "/images/farm/cow-calf.jpg", alt: "Young girl feeding a Highland Cow calf" },
  { src: "/images/farm/agritourism-stay.jpg", alt: "Couple meeting Scottish Highland Cows in the forest" },
  { src: "/images/farm/white-peacock.jpg", alt: "White peacock perched in the barn" },
  { src: "/images/farm/farm-life.jpg", alt: "Farm guide walking with a Highland Cow calf in the forest" },
  { src: "/images/farm/cows.jpg", alt: "Highland Cow mama and calf near the barn" },
  { src: "/images/farm/geese.jpg", alt: "Farmer bonding with a resting Highland Cow" },
  { src: "/images/farm/farm-visit.jpg", alt: "Highland Cow close-up with shaggy hair and horns" },
];

const features = [
  {
    icon: Heart,
    title: "Meet the Animals",
    description:
      "Scottish Highland Cows, Icelandic Sheep, White Peacocks, guardian dogs, chickens, and Guinea Fowl.",
  },
  {
    icon: Users,
    title: "Private & Personal",
    description:
      "Up to 6 guests per tour. It's just you, your group, and the animals — no crowds.",
  },
  {
    icon: Clock,
    title: "60-Minute Experience",
    description:
      "Plenty of time to brush, pet, and photograph the Scottish Highland Cows and explore the farm.",
  },
  {
    icon: Sparkles,
    title: "Perfect for All Ages",
    description:
      "From toddlers to grandparents, everyone falls in love with our gentle Scottish Highland Cows.",
  },
];

export default function FarmToursPage() {
  return (
    <>
      <FarmTourSchema />
      {/* Hero */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden pt-[var(--header-h,120px)]">
        <Image
          src="/images/farm/hero.jpg"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/35" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center text-white">
          <p className="mb-4 text-xl font-normal text-white/80 font-script">
            Highland Farms Oregon
          </p>
          <h1 className="text-4xl font-normal leading-tight sm:text-5xl md:text-6xl">
            Meet Our Scottish Highland Cows
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/85 leading-relaxed font-sans font-light">
            Book a private farm tour and get up close with our gentle Highland
            Cows, Icelandic Sheep, White Peacocks, guardian dogs, and more.
          </p>
          <div className="mt-8">
            <Button
              href={BOOKING_LINKS.farmTour}
              size="lg"
              className="bg-white text-charcoal hover:bg-cream"
              external
            >
              Book Your Tour
            </Button>
          </div>
        </div>
      </section>

      {/* What to Expect */}
      <section className="py-20 lg:py-28 bg-warm-white">
        <Container>
          <SectionHeading
            eyebrow="What to Expect"
            title="A Private Farm Experience"
            subtitle="Your 60-minute tour is an intimate, hands-on experience with our animals."
          />

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cream">
                  <feature.icon className="h-6 w-6 text-forest" />
                </div>
                <h3 className="mt-5 text-lg font-normal text-charcoal font-display">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted leading-relaxed font-sans font-light">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Gallery */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <SectionHeading
            title="Life on the Farm"
            subtitle="Get a glimpse of the animals you'll meet on your tour."
          />
          <ImageCarousel images={galleryImages} aspectRatio="photo" />
        </Container>
      </section>

      {/* Pricing & Details */}
      <section className="py-20 lg:py-28 bg-cream">
        <Container className="max-w-3xl">
          <SectionHeading
            eyebrow="Book Your Tour"
            title="Tour Details & Pricing"
          />

          <div className="rounded-xl bg-white p-8 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-cream-light pb-4">
                <span className="text-base font-normal text-charcoal font-sans">
                  Private Highland Cow Farm Tour
                </span>
                <span className="text-lg font-normal text-forest font-sans">
                  $75 per person
                </span>
              </div>
              <ul className="space-y-2.5 text-sm text-muted font-sans">
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-forest" />
                  60-minute private experience
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-forest" />
                  Up to 6 guests per tour
                </li>
                <li className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-forest" />
                  Hands-on interaction with all animals
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Button
                href={BOOKING_LINKS.farmTour}
                size="lg"
                className="w-full"
                external
              >
                Book Your Tour
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Gift Certificates */}
      <section className="py-20 lg:py-28 bg-background">
        <Container className="max-w-3xl text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/illustrations/highland-cow-white.png"
              alt=""
              width={200}
              height={160}
              className="h-28 w-auto opacity-60"
              aria-hidden="true"
            />
          </div>
          <h2 className="text-3xl font-normal sm:text-4xl">
            Give the Gift of Highland Farms
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-muted font-sans font-light leading-relaxed">
            Farm tours and spa sessions make unforgettable gifts. Purchase a
            gift certificate for someone special.
          </p>
          <div className="mt-8">
            <Button href={BOOKING_LINKS.giftCertificates} variant="outline" external>
              Purchase Gift Certificates
            </Button>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-20 lg:py-28 bg-warm-white">
        <Container className="max-w-3xl">
          <SectionHeading
            title="Frequently Asked Questions"
            subtitle="Everything you need to know about our farm tours."
          />
          <FAQAccordion items={farmTourFAQ} />
        </Container>
      </section>

      {/* Social Proof */}
      <GoogleReviewsSection
        topic="tour"
        max={6}
        eyebrow="What tour guests are saying"
        background="cream"
      />

      <EventCategoryCards />

      {/* Sticky Mobile CTA */}
      <StickyMobileCTA
        label="Book Your Farm Tour"
        href={BOOKING_LINKS.farmTour}
        external
      />

      {/* Bottom padding for sticky CTA on mobile */}
      <div className="h-20 lg:hidden" />
    </>
  );
}
