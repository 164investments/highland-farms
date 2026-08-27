import type { Metadata } from "next";
import { Fragment, Suspense } from "react";
import Image from "next/image";
import {
  Clock,
  Users,
  Droplets,
  TreePine,
  Check,
  MapPin,
  Flame,
  Leaf,
  ArrowRight,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ImageCarousel } from "@/components/gallery/ImageCarousel";
import { FAQAccordion } from "@/components/shared/FAQAccordion";
import {
  BookingButton,
  BookingModalRoot,
  BookingStickyCTA,
} from "@/components/shared/BookingButton";
import { TourVideo } from "@/components/shared/TourVideo";
import { NextAvailability } from "@/components/shared/NextAvailability";
import { GoogleReviewsSection } from "@/components/shared/GoogleReviewsSection";
import { ReviewBadge } from "@/components/shared/ReviewBadge";
import { InlineEmailCapture } from "@/components/shared/InlineEmailCapture";
import { nordicSpaFAQ } from "@/data/nordic-spa";
import { BOOKING_LINKS, CONTACT, bookingUrl } from "@/lib/constants";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { NativeBookingSection } from "@/components/booking/NativeBookingSection";

export const metadata: Metadata = {
  title: "Sauna & Cold Plunge Near Portland — Mt. Hood Nordic Spa",
  description:
    "Outdoor wood-burning sauna & cold plunge 50 minutes from Portland, Oregon. Public 90-minute Nordic spa sessions for up to 6 guests at Highland Farms in the Mt. Hood National Forest. $75/person — book your sauna day trip.",
  alternates: { canonical: "/nordic-spa" },
  openGraph: {
    title: "Sauna & Cold Plunge Near Portland — Highland Farms Mt. Hood",
    description:
      "Outdoor wood-burning sauna, wet sauna & cold plunge 50 minutes from Portland. Public 90-minute sessions for up to 6 guests in an old-growth Mt. Hood forest.",
    url: "https://highlandfarmsoregon.com/nordic-spa",
    type: "website",
    images: [
      {
        url: "/images/spa/spa-1.jpg",
        width: 1200,
        height: 630,
        alt: "Outdoor sauna and cold plunge near Portland in the Mt. Hood National Forest",
      },
    ],
  },
};

function NordicSpaSchema() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: nordicSpaFAQ.map((item) => ({
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
  { src: "/images/spa/spa-sauna-interior.jpg", alt: "Cedar sauna interior with Himalayan salt-brick wall" },
  { src: "/images/spa/spa-exterior-cabin.jpg", alt: "Black-clad spa cabin with cedar deck and cold plunge in the forest" },
  { src: "/images/spa/spa-relaxation-towels.jpg", alt: "Spa relaxation room with white shiplap, cedar ceiling, and rolled towels" },
  { src: "/images/spa/spa-exterior-plunge-moss.jpg", alt: "Cold plunge tub set into the cedar deck beside a moss-covered old-growth tree" },
  { src: "/images/spa/spa-sauna-stove.jpg", alt: "Harvia wood-burning sauna stove visible from the spa entry" },
  { src: "/images/spa/spa-communal-table.jpg", alt: "Cedar communal table and bench seating between sauna sessions" },
  { src: "/images/spa/spa-exterior-deck-plunge.jpg", alt: "Cedar deck with cold plunge tub surrounded by ferns and old-growth forest" },
  { src: "/images/spa/spa-relaxation-view.jpg", alt: "Spa lounge looking out to the cedar deck and the forest" },
  { src: "/images/spa/spa-bench-towels.jpg", alt: "Bench seating with fresh towels and view into the cedar sauna" },
  { src: "/images/spa/spa-exterior-wide.jpg", alt: "Wide view of the spa cabin, deck, and cold plunge nestled in old-growth forest" },
  { src: "/images/spa/spa-8.jpg", alt: "Friends laughing together in the cedar sauna" },
  { src: "/images/spa/spa-3.jpg", alt: "Guests in robes relaxing on the spa deck" },
];

const heroPills = [
  { icon: Leaf, label: "Peaceful & Restorative" },
  { icon: Users, label: "Limited to 6 Guests" },
  { icon: Clock, label: "90-Minute Sessions" },
  { icon: MapPin, label: "Just 50 Min from Portland" },
];

const includedItems = [
  "Wood-Burning Cedar Sauna",
  "Wet Steam Sauna",
  "Cold Plunge",
  "Robes & Towels",
  "Up to 6 Guests per Session",
  "Open Year-Round",
];

const sessionFeatures = [
  {
    icon: Flame,
    title: "Wood-Burning Sauna",
    desc: "Cedar dry sauna heated by a wood stove, nestled in the trees",
  },
  {
    icon: Droplets,
    title: "Wet Sauna",
    desc: "Soothing steam sauna to open and relax",
  },
  {
    icon: TreePine,
    title: "Cold Plunge",
    desc: "Invigorating cold water immersion surrounded by forest",
  },
  {
    icon: Users,
    title: "Never Crowded",
    desc: "Limited to just 6 guests — unlike packed Portland spas",
  },
  {
    icon: Clock,
    title: "90 Full Minutes",
    desc: "Cycle between heat and cold at your own pace",
  },
  {
    icon: Check,
    title: "Robes & Towels",
    desc: "Provided for every guest — just bring a swimsuit",
  },
];

export default function NordicSpaPage() {
  const heroBookingHref = bookingUrl(BOOKING_LINKS.nordicSpa, "nordic-spa-hero");
  const pricingBookingHref = bookingUrl(
    BOOKING_LINKS.nordicSpa,
    "nordic-spa-pricing",
  );
  const closingBookingHref = bookingUrl(
    BOOKING_LINKS.nordicSpa,
    "nordic-spa-closing",
  );
  const stickyBookingHref = bookingUrl(
    BOOKING_LINKS.nordicSpa,
    "nordic-spa-sticky-mobile",
  );

  return (
    <>
      <NordicSpaSchema />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden pt-[var(--header-h,120px)] lg:min-h-[88vh]">
        <Image
          src="/images/spa/spa-1.jpg"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Asymmetric gradient — heavier on the left for readable text */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />

        <Container className="relative z-10 flex items-center py-8 lg:min-h-[calc(88vh-var(--header-h,120px))] lg:py-16">
          <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:gap-14">
            {/* Left: hero text — width is unconstrained so the pill row fits on a single line at lg+ */}
            <div className="text-white">
              <p className="text-[0.7rem] font-normal uppercase tracking-[0.28em] text-white/70 font-sans">
                Reset · Restore · Reconnect
              </p>
              <h1 className="mt-5 max-w-xl text-4xl font-normal leading-[1.05] sm:text-5xl md:text-6xl">
                Sauna &amp; Cold Plunge<br className="hidden sm:inline" />{" "}
                in the Forest
              </h1>
              {/* Ornamental leaf separator — decorative, hidden on mobile to lift the CTA */}
              <div
                aria-hidden
                className="mt-6 hidden max-w-[130px] items-center gap-3 lg:flex"
              >
                <span className="h-px flex-1 bg-white/35" />
                <Leaf
                  className="h-4 w-4 -rotate-12 text-white/65"
                  strokeWidth={1.5}
                />
                <span className="h-px flex-1 bg-white/35" />
              </div>
              <p className="mt-4 max-w-lg text-lg text-white/85 leading-relaxed font-sans font-light lg:mt-6">
                Wood-burning sauna, steam sauna, and cold plunge tucked
                into old-growth forest — public sessions for up to 6 guests,
                50&nbsp;minutes from Portland.
              </p>

              {/* Icon + label pairs — 2×2 grid below lg, single row with separators on lg+ */}
              <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 lg:mt-8 lg:flex lg:flex-nowrap lg:items-center lg:gap-x-4 lg:gap-y-5">
                {heroPills.map(({ icon: Icon, label }, i) => (
                  <Fragment key={label}>
                    {i > 0 && (
                      <span
                        aria-hidden
                        className="hidden h-10 w-px shrink-0 bg-white/20 lg:block"
                      />
                    )}
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-cream/25 bg-forest/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
                        <Icon
                          className="h-5 w-5 text-cream"
                          strokeWidth={1.5}
                        />
                      </span>
                      <span className="max-w-[5.75rem] text-[13px] leading-snug text-white/90 font-sans">
                        {label}
                      </span>
                    </div>
                  </Fragment>
                ))}
              </div>

              {/* Dual CTA */}
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4 lg:mt-8">
                <BookingButton
                  href={heroBookingHref}
                  label="Book Your Session"
                  size="lg"
                  className="bg-white text-charcoal hover:bg-cream"
                  title="Book your Nordic Spa session"
                />
                <a
                  href="#details"
                  className="inline-flex items-center gap-1.5 text-[0.75em] font-normal uppercase tracking-[0.18em] text-white/90 underline-offset-4 hover:underline font-sans"
                >
                  Learn more <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              {/* Trust */}
              <div className="mt-5 lg:mt-7">
                <ReviewBadge variant="card" />
              </div>
            </div>

            {/* Right: What's Included overlay card (lg+ only) */}
            <aside className="hidden rounded-2xl border border-white/15 bg-charcoal/55 p-7 text-white shadow-2xl backdrop-blur-md lg:block">
              <p className="text-[0.7rem] font-normal uppercase tracking-[0.22em] text-white/65 font-sans">
                What&apos;s Included
              </p>
              <ul className="mt-5 space-y-3.5 text-[0.9375rem] font-sans">
                {includedItems.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage/30">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </Container>
      </section>

      {/* ─── EVERYTHING FOR A PERFECT SESSION ─── */}
      <section id="details" className="bg-cream py-14 sm:py-20 lg:py-28">
        <Container className="max-w-7xl">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.55fr_1fr] lg:gap-14">
            {/* Left: heading + features */}
            <div>
              <div className="text-center">
                <h2 className="text-3xl font-light tracking-tight sm:text-4xl lg:text-[2.5rem]">
                  Everything for a Perfect Session
                </h2>
                <div
                  aria-hidden
                  className="mx-auto mt-4 flex max-w-[110px] items-center gap-3"
                >
                  <span className="h-px flex-1 bg-forest/30" />
                  <Leaf
                    className="h-3.5 w-3.5 -rotate-12 text-forest/55"
                    strokeWidth={1.5}
                  />
                  <span className="h-px flex-1 bg-forest/30" />
                </div>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-4">
                {sessionFeatures.map((item) => (
                  <div key={item.title} className="text-center">
                    <item.icon
                      className="mx-auto h-7 w-7 text-forest"
                      strokeWidth={1.5}
                    />
                    <h3 className="mt-3 text-[0.6875rem] font-medium uppercase tracking-[0.12em] leading-tight text-charcoal font-sans">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs text-muted leading-snug font-sans">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: two photo cards */}
            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-sm">
                <Image
                  src="/images/spa/spa-3.jpg"
                  alt="Guest soaking in the cedar cold plunge surrounded by old-growth forest"
                  fill
                  sizes="(max-width: 1024px) 50vw, 22vw"
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-sm">
                <Image
                  src="/images/spa/spa-2.jpg"
                  alt="Cedar spa deck at dusk with string lights and the cold plunge tub"
                  fill
                  sizes="(max-width: 1024px) 50vw, 22vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── REPEAT-CUSTOMER NUDGE ─── */}
      <div className="border-y border-cream-dark/30 bg-warm-white py-5 text-center">
        <Container>
          <p className="text-sm text-muted font-sans leading-relaxed">
            <span className="font-normal text-forest">
              80% of our spa guests come back.
            </span>{" "}
            With 6 spots per session and only 5 days a week, weekends tend to
            book early.
          </p>
        </Container>
      </div>

      {/* ─── SOCIAL PROOF ─── */}
      <GoogleReviewsSection
        topic="spa"
        max={6}
        eyebrow="What spa guests are saying"
        background="cream"
      />

      {/* ─── GALLERY ─── */}
      <section className="bg-background py-14 sm:py-20 lg:py-28">
        <Container>
          <SectionHeading
            title="The Spa"
            subtitle="A peaceful retreat surrounded by quiet beauty."
          />
          <ImageCarousel images={galleryImages} aspectRatio="video" />
        </Container>
      </section>

      {/* ─── SPA VIDEO ─── */}
      <TourVideo
        videoSrc="/videos/spa-meta-ad.mp4"
        posterSrc="/videos/spa-meta-ad-poster.jpg"
        posterAlt="The Nordic spa deck and cedar sauna nestled in the forest"
        eyebrow="A few quiet minutes"
        heading="What 90 minutes in the forest feels like"
        body="A short clip from the spa — wood smoke from the sauna, the cold plunge through the trees, then quiet on the cedar deck."
        bookingHref={bookingUrl(BOOKING_LINKS.nordicSpa, "nordic-spa-video")}
        bookingLabel="Book Your Session"
        background="warm-white"
      />

      {/* ─── PRICING + BOOKING ─── */}
      <section className="bg-cream py-14 sm:py-20 lg:py-28">
        <Container className="max-w-3xl">
          <SectionHeading
            eyebrow="Book Your Session"
            title="Session Details & Pricing"
          />

          <div className="rounded-xl bg-white p-8 shadow-sm">
            <div className="mb-5 flex justify-center">
              <ReviewBadge variant="pill" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-cream-light pb-4">
                <span className="text-base font-normal text-charcoal font-sans">
                  Nordic Spa Session
                </span>
                <span className="text-lg font-normal text-forest font-sans">
                  $75 per person
                </span>
              </div>
              <ul className="space-y-2.5 text-sm text-muted font-sans">
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-forest" />
                  90-minute session
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-forest" />
                  Up to 6 guests per session
                </li>
                <li className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-forest" />
                  Dry sauna, wet sauna &amp; cold plunge
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-forest" />
                  Robes &amp; towels provided
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-forest" />
                  Open year-round, rain or shine
                </li>
              </ul>
            </div>

            <div className="mt-6 flex justify-center">
              <Suspense fallback={null}>
                <NextAvailability product="spa" />
              </Suspense>
            </div>

            <div className="mt-6">
              <NativeBookingSection product="nordic-spa" />
              {!nativeCalendarEnabled() && (
                <BookingButton
                  href={pricingBookingHref}
                  label="Book Your Session"
                  size="lg"
                  className="w-full"
                  title="Book your Nordic Spa session"
                />
              )}
              <p className="mt-3 text-center text-xs text-muted font-sans">
                Spa runs Tue / Wed / Fri / Sat / Sun
              </p>
              <p className="mt-1.5 text-center text-xs text-muted font-sans">
                Strict cancellation policy: all bookings are final. No refunds
                or reschedules.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── WORTH THE DRIVE ─── */}
      <section className="bg-warm-white py-14 sm:py-20 lg:py-28">
        <Container className="max-w-4xl">
          <SectionHeading
            eyebrow="Worth the Drive"
            title="50 Minutes from Portland"
            subtitle="A scenic drive east on US-26 through the Sandy River valley to old-growth forest at the base of Mt. Hood."
          />

          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { from: "Portland", time: "~50 min" },
              { from: "Gresham", time: "~30 min" },
              { from: "Sandy", time: "~15 min" },
              { from: "Hood River", time: "~40 min" },
            ].map((d) => (
              <div
                key={d.from}
                className="rounded-lg bg-cream p-4 text-center"
              >
                <span className="block text-lg font-normal text-forest">
                  {d.time}
                </span>
                <span className="mt-1 block text-xs text-muted font-sans">
                  from {d.from}
                </span>
              </div>
            ))}
          </div>

          <p className="mx-auto max-w-xl text-center text-sm text-muted leading-relaxed font-sans">
            Our Nordic spa near Portland is one of Oregon&apos;s most intimate
            outdoor sauna experiences — limited to just 6 guests per session,
            surrounded by old-growth forest instead of city walls.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted font-sans">
            <MapPin className="h-4 w-4 shrink-0 text-forest" />
            <span>
              {CONTACT.address}, {CONTACT.city}, {CONTACT.state} {CONTACT.zip}
            </span>
          </div>
          <p className="mt-1 text-center text-xs text-muted font-sans">
            Free on-site parking · Directions in your booking confirmation
          </p>
        </Container>
      </section>

      {/* ─── FAQ ─── */}
      <section className="bg-background py-14 sm:py-20 lg:py-28">
        <Container className="max-w-3xl">
          <SectionHeading
            title="Frequently Asked Questions"
            subtitle="Everything you need to know before your visit."
          />
          <FAQAccordion items={nordicSpaFAQ} />
        </Container>
      </section>

      {/* ─── NOT-READY CAPTURE (catches the long-research-cycle visitor) ─── */}
      <InlineEmailCapture
        source="spa-page"
        eyebrow="Not ready to book?"
        heading="Get first dibs on weekend openings"
        body="With only 6 spots per session and the spa open 5 days a week, weekends fill fast. Leave your email and we'll let you know the moment new sessions open up."
        buttonLabel="Notify Me"
        background="sage"
      />

      {/* ─── CLOSING: TAGLINE + TESTIMONIAL + CTA + SCARCITY ─── */}
      <section className="relative overflow-hidden bg-forest text-white">
        <div className="absolute inset-0 opacity-15">
          <Image
            src="/images/spa/spa-2.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 bg-forest/85" />

        <Container className="relative z-10 py-16 lg:py-20">
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1fr_1.4fr_1fr] md:gap-12">
            <div className="text-center md:text-left">
              <span
                aria-hidden
                className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full border border-cream/35"
              >
                <Leaf
                  className="h-5 w-5 text-cream"
                  strokeWidth={1.5}
                />
              </span>
              <p className="text-xl font-normal leading-snug font-display sm:text-2xl">
                More than a spa—it&rsquo;s a return to nature.
              </p>
              <p className="mt-3 text-sm text-white/70 font-sans leading-relaxed">
                Leave feeling refreshed, reconnected, and renewed.
              </p>
            </div>

            <div className="text-center">
              <p className="text-lg italic leading-relaxed font-display sm:text-xl">
                &ldquo;The sauna was great and the surroundings were
                beautiful. They took wonderful care of us.&rdquo;
              </p>
              <p className="mt-4 text-xs font-normal uppercase tracking-[0.18em] text-white/60 font-sans">
                — Roman S., Google Review
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 md:items-end">
              <BookingButton
                href={closingBookingHref}
                label="Book Your Session"
                size="lg"
                className="bg-cream text-charcoal hover:bg-white"
                title="Book your Nordic Spa session"
              />
              <p className="text-center text-xs text-white/65 font-sans md:text-right">
                Spots fill up fast. Reserve your time today.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── FARM TOUR UPSELL ─── */}
      <section className="bg-cream py-14 sm:py-20 lg:py-28">
        <Container className="max-w-3xl text-center">
          <div className="mb-5 flex justify-center">
            <Image
              src="/images/illustrations/highland-cow-mirrored.png"
              alt=""
              width={200}
              height={160}
              className="h-24 w-auto opacity-60"
              aria-hidden="true"
            />
          </div>
          <h2 className="text-2xl font-normal sm:text-3xl">
            Make It a Full Day
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base text-muted font-sans font-light leading-relaxed">
            Meet the Scottish Highland Cows, then unwind at the spa. Most
            guests book a farm tour + spa session for a half-day escape from
            Portland.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button href="/farm-tours">Book a Farm Tour</Button>
            <Button
              href={BOOKING_LINKS.giftCertificates}
              variant="outline"
              external
            >
              Gift Certificates
            </Button>
          </div>
        </Container>
      </section>

      {/* Sticky mobile CTA */}
      <BookingStickyCTA
        label="Book Now · $75/person"
        href={stickyBookingHref}
        title="Book your Nordic Spa session"
      />

      {/* Modal mount — listens for openBookingModal() calls from every CTA */}
      <BookingModalRoot />

      {/* Bottom padding for sticky CTA on mobile */}
      <div className="h-20 lg:hidden" />
    </>
  );
}
