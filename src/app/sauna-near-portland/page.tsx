import type { Metadata } from "next";
import Image from "next/image";
import { Check, Clock, Users, Droplets, MapPin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FAQAccordion } from "@/components/shared/FAQAccordion";
import { StickyMobileCTA } from "@/components/shared/StickyMobileCTA";
import { BOOKING_LINKS, CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Sauna Near Portland, Oregon — Private Outdoor Sauna & Cold Plunge",
  description:
    "The best sauna near Portland, Oregon. Private wood-burning sauna & cold plunge just 50 minutes from downtown Portland in the Mt. Hood National Forest. $75/person — book online.",
  alternates: { canonical: "/sauna-near-portland" },
  openGraph: {
    title: "Sauna Near Portland — Highland Farms Mt. Hood Nordic Spa",
    description:
      "Private outdoor sauna & cold plunge 50 minutes from Portland, Oregon. Escape to old-growth forest at the base of Mt. Hood. Book your sauna day trip.",
    url: "https://highlandfarmsoregon.com/sauna-near-portland",
    type: "website",
    images: [
      {
        url: "/images/spa/spa-1.jpg",
        width: 1200,
        height: 630,
        alt: "Outdoor sauna and cold plunge near Portland Oregon at Highland Farms",
      },
    ],
  },
};

const faqItems = [
  {
    question: "How far is the sauna from Portland?",
    answer:
      "Highland Farms is located in Brightwood, Oregon — approximately 50 minutes east of downtown Portland via US-26 (the Mt. Hood Highway). From Gresham and Troutdale it's about 30 minutes. From Sandy it's just 15 minutes.",
  },
  {
    question: "Is this a private sauna near Portland?",
    answer:
      "Yes — completely private. When you book a session at Highland Farms, you get the entire Nordic spa area exclusively for your group. No shared locker rooms, no strangers, just your group of up to 6 guests and the old-growth forest.",
  },
  {
    question: "What's included in a sauna session?",
    answer:
      "Each 60-minute session includes access to our wood-burning cedar dry sauna, wet sauna, and cold plunge tub — all nestled in our old-growth Mt. Hood forest. We provide towels and robes. Bring your swimsuit and comfortable shoes.",
  },
  {
    question: "How much does the sauna near Portland cost?",
    answer:
      "Sessions are $75 per person for a 60-minute private session. Up to 6 guests per session. Book online through our scheduling system — no deposit required at booking.",
  },
  {
    question: "Can I combine the sauna with a Highland Cow farm tour?",
    answer:
      "Absolutely — it's our most popular combo. Book a farm tour the hour before or after your spa session for the full Highland Farms experience. You'll meet the Scottish Highland Cows, then unwind in the Nordic spa.",
  },
  {
    question: "Is the sauna available year-round?",
    answer:
      "Yes! The sauna runs year-round. Winter sessions are especially magical — soaking in the cold plunge with snow on the evergreens and steam rising around you is an experience you won't forget.",
  },
  {
    question: "What's the cancellation policy?",
    answer:
      "Please contact us at least 24 hours in advance to reschedule. Spa reservations are non-refundable, but we'll work with you to find a better date and time.",
  },
];

function SaunaNearPortlandSchema() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Outdoor Sauna Near Portland — Highland Farms Nordic Spa",
    description:
      "Private wood-burning sauna, wet sauna & cold plunge 50 minutes from Portland, Oregon. 60-minute sessions for up to 6 guests in an old-growth Mt. Hood forest.",
    url: "https://highlandfarmsoregon.com/sauna-near-portland",
    provider: {
      "@type": "LocalBusiness",
      name: "Highland Farms Oregon",
      address: {
        "@type": "PostalAddress",
        streetAddress: CONTACT.address,
        addressLocality: CONTACT.city,
        addressRegion: CONTACT.state,
        postalCode: CONTACT.zip,
        addressCountry: "US",
      },
    },
    areaServed: {
      "@type": "City",
      name: "Portland",
      "@id": "https://en.wikipedia.org/wiki/Portland,_Oregon",
    },
    offers: {
      "@type": "Offer",
      price: "75",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: BOOKING_LINKS.nordicSpa,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
    </>
  );
}

export default function SaunaNearPortlandPage() {
  return (
    <>
      <SaunaNearPortlandSchema />

      {/* Hero */}
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
          <p className="mb-4 text-xl font-normal text-white/80 font-script">
            50 Minutes from Downtown Portland
          </p>
          <h1 className="text-4xl font-normal leading-tight sm:text-5xl md:text-6xl">
            Sauna Near Portland
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/85 leading-relaxed font-sans font-light">
            Private wood-burning sauna, wet sauna & cold plunge in the Mt. Hood
            forest — Oregon&apos;s best outdoor sauna day trip from Portland.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              href={BOOKING_LINKS.nordicSpa}
              size="lg"
              className="bg-white text-charcoal hover:bg-cream"
              external
            >
              Book Your Sauna Session
            </Button>
            <Button
              href="/nordic-spa"
              variant="outline"
              size="lg"
              className="border-white/60 text-white hover:bg-white/10 hover:border-white/80 hover:text-white"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Why this is Portland's best sauna day trip */}
      <section className="py-20 lg:py-28 bg-cream">
        <Container className="max-w-4xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-lg font-normal text-sage font-script mb-3">
                Portland&apos;s Best Sauna Day Trip
              </p>
              <h2 className="text-3xl font-normal sm:text-4xl">
                A Private Outdoor Sauna — Not a City Spa
              </h2>
              <p className="mt-4 text-base text-muted leading-relaxed font-sans">
                Most &ldquo;saunas near Portland&rdquo; are indoor, shared
                facilities. Highland Farms is different. Our cedar sauna, wet
                sauna, and cold plunge are completely outdoors — nestled in five
                acres of old-growth Douglas fir at the base of Mt. Hood. Your
                session is 100% private: no strangers, no locker rooms, just
                your group and the forest.
              </p>
              <p className="mt-4 text-base text-muted leading-relaxed font-sans">
                Drive east on US-26 and in 50 minutes you&apos;ll trade city
                noise for birdsong, mountain air, and the sound of a mountain
                creek. It&apos;s the opposite of a city spa — and it&apos;s
                only $75 per person.
              </p>
              <ul className="mt-6 space-y-2">
                {[
                  "Completely private — your group only",
                  "Outdoor cedar dry sauna & wet sauna",
                  "Cold plunge in a forest setting",
                  "Towels and robes provided",
                  "60-minute sessions",
                  "Up to 6 guests per session",
                  "Free on-site parking",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-charcoal font-sans"
                  >
                    <Check className="h-4 w-4 text-forest shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              {/* Drive times */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <p className="font-sans text-xs font-normal text-charcoal uppercase tracking-widest mb-4">
                  Drive Times from Portland Area
                </p>
                <div className="space-y-3 text-sm font-sans">
                  {[
                    { from: "Portland (downtown)", time: "~50 min", via: "US-26 East" },
                    { from: "Gresham / Troutdale", time: "~30 min", via: "US-26 East" },
                    { from: "Beaverton / Hillsboro", time: "~60 min", via: "US-26 East" },
                    { from: "Sandy", time: "~15 min", via: "US-26 West" },
                  ].map((d) => (
                    <div key={d.from} className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-charcoal">{d.from}</span>
                        <span className="block text-xs text-muted">via {d.via}</span>
                      </div>
                      <span className="font-medium text-forest shrink-0">{d.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-forest shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-charcoal font-sans font-normal">
                      {CONTACT.address}
                      <br />
                      {CONTACT.city}, {CONTACT.state} {CONTACT.zip}
                    </p>
                    <p className="text-xs text-muted font-sans mt-1">
                      Free on-site parking. Directions in your booking confirmation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Session details */}
      <section className="py-20 lg:py-28 bg-warm-white">
        <Container>
          <SectionHeading
            eyebrow="The Experience"
            title="What's Included in Your Sauna Session"
            subtitle="A full hour to relax, heat up, cool down, and reconnect with nature."
          />

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                icon: Droplets,
                title: "Wood-Burning Cedar Sauna",
                description:
                  "A cedar dry sauna heated by a wood burning stove, nestled among old-growth Douglas fir. Step outside and hear only the forest.",
              },
              {
                icon: Droplets,
                title: "Wet Sauna & Cold Plunge",
                description:
                  "Follow the heat with an invigorating cold plunge — the classic Nordic contrast therapy that leaves you energized and clear-headed.",
              },
              {
                icon: Clock,
                title: "60 Minutes, Fully Private",
                description:
                  "A full hour for up to 6 guests. No timers, no strangers — just your group and the forest. Towels and robes are provided.",
              },
            ].map((feature) => (
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

      {/* Pricing CTA */}
      <section className="py-20 lg:py-28 bg-background">
        <Container className="max-w-3xl">
          <SectionHeading
            eyebrow="Book Your Session"
            title="$75 Per Person — Book Online"
          />

          <div className="rounded-xl bg-white p-8 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-cream-light pb-4">
                <span className="text-base font-normal text-charcoal font-sans">
                  Nordic Spa Session (Sauna & Cold Plunge)
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
                  Up to 6 guests — fully private
                </li>
                <li className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-forest" />
                  Dry sauna, wet sauna &amp; cold plunge
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
                Book Your Sauna Session
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Combine with farm tour */}
      <section className="py-20 lg:py-28 bg-cream">
        <Container className="max-w-3xl text-center">
          <h2 className="text-3xl font-normal sm:text-4xl">
            Make It a Full Day Trip from Portland
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-muted font-sans font-light leading-relaxed">
            Combine your sauna session with a Highland Cow farm tour — meet the
            Scottish Highland Cows, explore the forest property, then unwind in
            the Nordic spa. Most guests are back in Portland by mid-afternoon.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button href={BOOKING_LINKS.nordicSpa} external>
              Book the Spa
            </Button>
            <Button href="/farm-tours" variant="outline">
              Add a Farm Tour
            </Button>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-20 lg:py-28 bg-warm-white">
        <Container className="max-w-3xl">
          <SectionHeading
            eyebrow="Common Questions"
            title="Sauna Near Portland — FAQ"
            subtitle="Everything you need to know before you make the drive."
          />
          <FAQAccordion items={faqItems} />
        </Container>
      </section>

      <StickyMobileCTA
        label="Book Your Sauna Session"
        href={BOOKING_LINKS.nordicSpa}
        external
      />

      <div className="h-20 lg:hidden" />
    </>
  );
}
