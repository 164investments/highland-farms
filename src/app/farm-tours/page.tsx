import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { Clock, Users, Heart, Sparkles, Star } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ImageCarousel } from "@/components/gallery/ImageCarousel";
import { FAQAccordion } from "@/components/shared/FAQAccordion";
import { EventCategoryCards } from "@/components/shared/EventCategoryCards";
import {
  BookingButton,
  BookingModalRoot,
  BookingStickyCTA,
} from "@/components/shared/BookingButton";
import { TourVideo } from "@/components/shared/TourVideo";
import { TourSpaCombo } from "@/components/shared/TourSpaCombo";
import { NextAvailability } from "@/components/shared/NextAvailability";
import {
  GoogleReviewsSection,
  GOOGLE_REVIEW_LINK,
  REVIEW_COUNT,
  REVIEW_RATING,
} from "@/components/shared/GoogleReviewsSection";
import { farmTourFAQ } from "@/data/farm-tours";
import { BOOKING_LINKS, bookingUrl } from "@/lib/constants";

const GROUP_PRICING = [
  { guests: 2, total: 150 },
  { guests: 3, total: 225 },
  { guests: 4, total: 300 },
  { guests: 5, total: 375 },
  { guests: 6, total: 450 },
];

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
            Private 60-minute tour for up to 6 guests · $75 per person
            <br />
            50 minutes from Portland at the base of Mt. Hood
          </p>
          <div className="mt-8">
            <BookingButton
              href={bookingUrl(BOOKING_LINKS.farmTour, "farm-tours-hero")}
              label="Book Your Tour"
              size="lg"
              className="bg-white text-charcoal hover:bg-cream"
            />
          </div>
          <a
            href={GOOGLE_REVIEW_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-white/80 underline-offset-4 hover:text-white hover:underline font-sans"
          >
            <Star className="h-4 w-4 fill-current" />
            <span>
              {REVIEW_RATING} · {REVIEW_COUNT} Google reviews
            </span>
          </a>
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

      {/* Tour Video */}
      <TourVideo
        videoSrc="/videos/farm-tour-pov.mp4"
        posterSrc="/videos/farm-tour-pov-poster.jpg"
        posterAlt="A guest meeting the Highland cows during a tour"
        eyebrow="A glimpse from the field"
        heading="See what a tour feels like"
        body="A short walk through the farm — meet the herd, the guardian dogs, and the views you'll wake up to."
        bookingHref={bookingUrl(BOOKING_LINKS.farmTour, "farm-tours-video")}
      />

      {/* Pricing & Details */}
      <section className="py-20 lg:py-28 bg-cream">
        <Container className="max-w-3xl">
          <SectionHeading
            eyebrow="Book Your Tour"
            title="Tour Details & Pricing"
          />

          <div className="rounded-xl bg-white p-8 shadow-sm">
            <div className="mb-5 flex items-center justify-center gap-1.5 text-sm text-charcoal font-sans">
              <Star className="h-4 w-4 fill-forest text-forest" />
              <span className="font-normal">{REVIEW_RATING}</span>
              <span className="text-muted">·</span>
              <a
                href={GOOGLE_REVIEW_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted underline-offset-4 hover:text-charcoal hover:underline"
              >
                {REVIEW_COUNT} Google reviews
              </a>
            </div>
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

            <div className="mt-6 rounded-lg bg-cream/60 p-5">
              <p className="mb-3 text-xs font-normal uppercase tracking-[0.18em] text-sage font-sans">
                Total for your group
              </p>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-charcoal font-sans sm:grid-cols-3">
                {GROUP_PRICING.map(({ guests, total }) => (
                  <li
                    key={guests}
                    className="flex items-baseline justify-between"
                  >
                    <span className="text-muted">
                      {guests} guests
                    </span>
                    <span className="font-normal text-forest">${total}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex justify-center">
              <Suspense fallback={null}>
                <NextAvailability />
              </Suspense>
            </div>

            <div className="mt-6">
              <BookingButton
                href={bookingUrl(BOOKING_LINKS.farmTour, "farm-tours-pricing")}
                label="Book Your Tour"
                size="lg"
                className="w-full"
              />
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
            <BookingButton
              href={bookingUrl(BOOKING_LINKS.giftCertificates, "farm-tours-gift")}
              label="Purchase Gift Certificates"
              variant="outline"
              title="Purchase a gift certificate"
            />
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
          <div className="mb-8 rounded-lg border border-cream-dark/50 bg-cream/40 p-5 text-sm text-charcoal font-sans font-light leading-relaxed sm:p-6">
            <p className="mb-2 text-xs font-normal uppercase tracking-[0.18em] text-sage">
              Before you arrive
            </p>
            <p>
              Closed-toe shoes recommended — dress in layers. We&rsquo;re at the
              base of Mt. Hood and the weather can shift quickly. Tours run rain
              or shine, with covered areas throughout the farm.
            </p>
          </div>
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

      {/* Tour + Spa Combo Upsell */}
      <TourSpaCombo utmContent="farm-tours-combo" />

      <EventCategoryCards />

      {/* Sticky Mobile CTA */}
      <BookingStickyCTA
        label="Book Your Farm Tour"
        href={bookingUrl(BOOKING_LINKS.farmTour, "farm-tours-sticky-mobile")}
      />

      {/* Modal mount — listens for openBookingModal() calls from every CTA */}
      <BookingModalRoot />

      {/* Bottom padding for sticky CTA on mobile */}
      <div className="h-20 lg:hidden" />
    </>
  );
}
