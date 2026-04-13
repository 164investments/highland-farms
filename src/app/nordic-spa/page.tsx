import type { Metadata } from "next";
import Image from "next/image";
import {
  Clock,
  Users,
  Droplets,
  TreePine,
  Sparkles,
  Check,
  MapPin,
  Flame,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ImageCarousel } from "@/components/gallery/ImageCarousel";
import { FAQAccordion } from "@/components/shared/FAQAccordion";
import { StickyMobileCTA } from "@/components/shared/StickyMobileCTA";
import { nordicSpaFAQ } from "@/data/nordic-spa";
import { BOOKING_LINKS, CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Sauna & Cold Plunge Near Portland — Mt. Hood Nordic Spa",
  description:
    "Outdoor wood-burning sauna & cold plunge 50 minutes from Portland, Oregon. Intimate 60-minute Nordic spa sessions limited to 6 guests at Highland Farms in the Mt. Hood National Forest. $75/person — book your sauna day trip.",
  alternates: { canonical: "/nordic-spa" },
  openGraph: {
    title: "Sauna & Cold Plunge Near Portland — Highland Farms Mt. Hood",
    description:
      "Outdoor wood-burning sauna, wet sauna & cold plunge 50 minutes from Portland. Intimate 60-minute sessions limited to 6 guests in an old-growth Mt. Hood forest.",
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
  { src: "/images/spa/spa-1.jpg", alt: "Cedar spa deck nestled among old-growth forest" },
  { src: "/images/spa/spa-2.jpg", alt: "Spa deck with cold plunge tub and string lights" },
  { src: "/images/spa/spa-8.jpg", alt: "Friends laughing together in the cedar sauna" },
  { src: "/images/spa/spa-3.jpg", alt: "Guests in robes relaxing on the spa deck" },
  { src: "/images/spa/spa-6.jpg", alt: "Inside the cedar sauna" },
  { src: "/images/spa/spa-9.jpg", alt: "Sauna interior view through cedar doorway" },
  { src: "/images/spa/spa-7.jpg", alt: "Overhead view of the Nordic spa area" },
  { src: "/images/spa/spa-robes.jpg", alt: "Two guests in robes enjoying the cedar sauna" },
];

export default function NordicSpaPage() {
  return (
    <>
      <NordicSpaSchema />

      {/* ─── HERO ─── */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden pt-[var(--header-h,120px)]">
        <Image
          src="/images/spa/spa-1.jpg"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/35" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center text-white">
          {/* Key facts pills — answer top questions immediately */}
          <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
            {["Limited to 6 Guests", "60 Minutes", "$75 / Person", "Never Crowded"].map(
              (pill) => (
                <span
                  key={pill}
                  className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] tracking-wide text-white/90 backdrop-blur-sm font-sans"
                >
                  {pill}
                </span>
              )
            )}
          </div>

          <h1 className="text-4xl font-normal leading-tight sm:text-5xl md:text-6xl">
            Sauna &amp; Cold Plunge in the Forest
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-lg text-white/85 leading-relaxed font-sans font-light">
            Wood-burning sauna, wet sauna, and cold plunge in old-growth
            forest — limited to 6 guests per session, 50 minutes from
            Portland on the Mt.&nbsp;Hood corridor.
          </p>

          {/* Trust bar */}
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white/70 font-sans">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Sparkles key={i} className="h-3 w-3 text-accent" />
              ))}
            </div>
            <span>4.9 · 146 Google Reviews</span>
          </div>

          <div className="mt-7">
            <Button
              href={BOOKING_LINKS.nordicSpa}
              size="lg"
              className="bg-white text-charcoal hover:bg-cream"
              external
            >
              Book Your Session
            </Button>
          </div>
        </div>
      </section>

      {/* ─── WHAT'S INCLUDED ─── */}
      <section className="py-16 lg:py-20 bg-cream">
        <Container className="max-w-3xl">
          <SectionHeading
            eyebrow="What's Included"
            title="Everything for a Perfect Session"
          />

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
            {[
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
                title: "60 Full Minutes",
                desc: "Cycle between heat and cold at your own pace",
              },
              {
                icon: Check,
                title: "Robes & Towels",
                desc: "Provided for every guest — just bring a swimsuit",
              },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest/10">
                  <item.icon className="h-5 w-5 text-forest" />
                </div>
                <h3 className="mt-3 text-sm font-normal text-charcoal font-display">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-muted leading-relaxed font-sans">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ─── SOCIAL PROOF (moved from section 8 → 3) ─── */}
      <section className="py-16 lg:py-20 bg-warm-white">
        <Container className="max-w-3xl text-center">
          <div className="flex justify-center mb-4">
            {[...Array(5)].map((_, i) => (
              <Sparkles key={i} className="h-4 w-4 text-accent" />
            ))}
          </div>
          <blockquote>
            <p className="text-xl font-normal leading-relaxed text-charcoal sm:text-2xl font-display">
              &ldquo;We loved walking the property, taking in the peaceful
              forest setting, and soaking in the hot tub under the stars. This
              was easily one of the highlights of our Oregon trip.&rdquo;
            </p>
          </blockquote>
          <p className="mt-5 text-sm text-charcoal font-sans font-normal">
            Emily T.
          </p>
          <p className="mt-0.5 text-xs text-muted font-sans font-light">
            Google Review
          </p>
          <div className="mt-5 flex items-center justify-center gap-4 text-sm text-muted font-sans">
            <span>4.9 / 5 · 146 reviews</span>
            <a
              href="https://share.google/jrLOI4AhnpzbPPBpF"
              target="_blank"
              rel="noopener noreferrer"
              className="text-forest hover:text-forest-light transition-colors"
            >
              Read reviews →
            </a>
          </div>
        </Container>
      </section>

      {/* ─── GALLERY ─── */}
      <section className="py-16 lg:py-20 bg-background">
        <Container>
          <SectionHeading
            title="The Spa"
            subtitle="A peaceful retreat surrounded by quiet beauty."
          />
          <ImageCarousel images={galleryImages} aspectRatio="video" />
        </Container>
      </section>

      {/* ─── PRICING + BOOKING ─── */}
      <section className="py-16 lg:py-20 bg-cream">
        <Container className="max-w-3xl">
          <SectionHeading
            eyebrow="Book Your Session"
            title="Session Details & Pricing"
          />

          <div className="rounded-xl bg-white p-8 shadow-sm">
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
                  60-minute session
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

            <div className="mt-8">
              <Button
                href={BOOKING_LINKS.nordicSpa}
                size="lg"
                className="w-full"
                external
              >
                Book Your Session
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── WORTH THE DRIVE ─── */}
      <section className="py-16 lg:py-20 bg-warm-white">
        <Container className="max-w-4xl">
          <SectionHeading
            eyebrow="Worth the Drive"
            title="50 Minutes from Portland"
            subtitle="A scenic drive east on US-26 through the Sandy River valley to old-growth forest at the base of Mt. Hood."
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
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
                <span className="block text-xs text-muted font-sans mt-1">
                  from {d.from}
                </span>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted leading-relaxed font-sans max-w-xl mx-auto">
            Our Nordic spa near Portland is one of Oregon&apos;s most intimate
            outdoor sauna experiences — limited to just 6 guests per session,
            surrounded by old-growth forest instead of city walls.
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-muted font-sans mt-6">
            <MapPin className="h-4 w-4 text-forest shrink-0" />
            <span>
              {CONTACT.address}, {CONTACT.city}, {CONTACT.state} {CONTACT.zip}
            </span>
          </div>
          <p className="text-center text-xs text-muted font-sans mt-1">
            Free on-site parking · Directions in your booking confirmation
          </p>
        </Container>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-16 lg:py-20 bg-background">
        <Container className="max-w-3xl">
          <SectionHeading
            title="Frequently Asked Questions"
            subtitle="Everything you need to know before your visit."
          />
          <FAQAccordion items={nordicSpaFAQ} />
        </Container>
      </section>

      {/* ─── FARM TOUR UPSELL (delayed to after booking decision) ─── */}
      <section className="py-16 lg:py-20 bg-cream">
        <Container className="max-w-3xl text-center">
          <div className="flex justify-center mb-5">
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
            Meet the Scottish Highland Cows, then unwind at the spa. Most guests
            book a farm tour + spa session for a half-day escape from Portland.
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

      <StickyMobileCTA
        label="Book Now · $75/person"
        href={BOOKING_LINKS.nordicSpa}
        external
      />

      <div className="h-20 lg:hidden" />
    </>
  );
}
