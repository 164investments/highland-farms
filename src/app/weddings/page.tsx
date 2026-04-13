import type { Metadata } from "next";
import Image from "next/image";
import { Check, Users, TreePine, Camera, UtensilsCrossed, Music, Heart } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ImageGallery } from "@/components/gallery/ImageGallery";
import { FAQAccordion } from "@/components/shared/FAQAccordion";
import { ContactForm } from "@/components/forms/ContactForm";
import { StickyMobileCTA } from "@/components/shared/StickyMobileCTA";
import { CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Oregon Farm Wedding Venue — All-Inclusive at Mt. Hood",
  description:
    "Oregon's premier farm wedding venue at the base of Mt. Hood — 50 minutes from Portland. All-inclusive outdoor weddings with Scottish Highland Cows, on-site lodging for 20 guests, Nordic spa & full event coordination.",
  alternates: { canonical: "/weddings" },
  openGraph: {
    title: "Oregon Farm Wedding Venue — Highland Farms at Mt. Hood",
    description:
      "All-inclusive farm and forest wedding venue near Portland, Oregon. Five acres of old-growth forest, Scottish Highland Cows, on-site lodging for 20 guests, and dedicated event coordination.",
    url: "https://highlandfarmsoregon.com/weddings",
    type: "website",
    images: [
      {
        url: "/images/hero/wedding-hero.jpg",
        width: 1200,
        height: 630,
        alt: "Forest wedding ceremony at Highland Farms Oregon farm wedding venue",
      },
    ],
  },
};

const weddingFAQ = [
  {
    question: "What type of wedding venue is Highland Farms?",
    answer:
      "Highland Farms is an all-inclusive farm and forest wedding venue at the base of Mt. Hood in Brightwood, Oregon. You get exclusive use of our private 5-acre property with Scottish Highland Cows, on-site lodging for 20 guests, a Nordic spa, and dedicated event coordination — all just 50 minutes from Portland.",
  },
  {
    question: "How far is Highland Farms from Portland?",
    answer:
      "We're located in Brightwood, Oregon — about 50 minutes east of Portland via US-26 (the Mt. Hood Highway). For Portland-area couples, Highland Farms is a destination wedding experience without a long travel burden for your guests.",
  },
  {
    question: "Is Highland Farms an all-inclusive wedding venue?",
    answer:
      "Yes. Every Highland Farms wedding includes exclusive property use, on-site lodging for up to 20 guests across our William Wallace Lodge, Bonnie Lass Cottage, and The Camp, full kitchen access for your caterer, Highland Cow photo opportunities, Nordic spa access, and dedicated event coordination.",
  },
  {
    question: "What makes Highland Farms different from other Oregon wedding venues?",
    answer:
      "Three things: exclusivity, intimacy, and setting. You get the entire 5-acre farm to yourselves — not a shared venue. Our Scottish Highland Cows create one-of-a-kind wedding photos. And our old-growth forest setting is unlike any other Oregon wedding venue. Plus, you're just 50 minutes from Portland.",
  },
  {
    question: "Is this an outdoor wedding venue?",
    answer:
      "Yes. Highland Farms features stunning outdoor forest ceremony sites and reception areas surrounded by old-growth evergreens, moss-draped trees, and a spring-fed pond. The farm also has indoor spaces within the lodge for shelter if needed.",
  },
  {
    question: "When should I book my Oregon farm wedding?",
    answer:
      "We recommend booking 12–18 months in advance. Summer and fall weekends fill earliest. 2027 bookings are now open — contact us to check your date.",
  },
  {
    question: "Do you allow outside catering?",
    answer:
      "Yes. Our full kitchen is available to your catering team throughout the event. We can also recommend experienced local caterers who know our property well.",
  },
];

function WeddingsSchema() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: weddingFAQ.map((item) => ({
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

const included = [
  { icon: TreePine, text: "Exclusive use of the entire 5-acre property" },
  { icon: Users, text: "On-site lodging for up to 20 guests" },
  { icon: UtensilsCrossed, text: "Full kitchen access for catering" },
  { icon: Camera, text: "Highland Cow photo opportunities" },
  { icon: Music, text: "Ceremony and reception areas" },
  { icon: Heart, text: "Dedicated event coordination" },
];

const galleryImages = [
  { src: "/images/weddings/ceremony-3.jpg", alt: "Couple kissing with Highland Cow calf on forest bridge" },
  { src: "/images/weddings/forest-ceremony.jpg", alt: "Forest ceremony under towering evergreens" },
  { src: "/images/weddings/couple.jpg", alt: "Forest ceremony setup with wooden arch" },
  { src: "/images/weddings/reception-toast.jpg", alt: "Guests toasting at outdoor forest dinner" },
  { src: "/images/weddings/details.jpg", alt: "Couple with Scottish Highland Cows at golden hour" },
  { src: "/images/weddings/guests.jpg", alt: "Bride crowd surfing at outdoor dance floor" },
  { src: "/images/weddings/getting-ready.jpg", alt: "Bride getting ready in the cedar cabin" },
  { src: "/images/weddings/couple-dinner.jpg", alt: "Couple at sweetheart table with string lights" },
  { src: "/images/weddings/sunset.jpg", alt: "Evening reception at Highland Farms" },
];

export default function WeddingsPage() {
  return (
    <>
      <WeddingsSchema />
      {/* Hero */}
      <section className="relative flex min-h-[75vh] items-center justify-center overflow-hidden pt-[var(--header-h,120px)]">
        <Image
          src="/images/weddings/hero.jpg"
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
            Oregon Farm Wedding Venue
          </p>
          <h1 className="text-4xl font-normal leading-tight sm:text-5xl md:text-6xl">
            Your Dream Wedding in the Forest
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/85 leading-relaxed font-sans font-light">
            Exchange vows under towering evergreens, celebrate with Scottish Highland Cows,
            and host your closest family and friends on-site at the base of Mt. Hood.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button href="/contact" size="lg" className="bg-white text-charcoal hover:bg-cream">
              Get Your Custom Quote
            </Button>
            <Button
              href="#gallery"
              variant="outline"
              size="lg"
              className="border-white/60 text-white hover:bg-white/10 hover:border-white/80 hover:text-white"
            >
              View Gallery
            </Button>
          </div>
        </div>
      </section>

      {/* Why Highland Farms */}
      <section className="py-20 lg:py-28 bg-warm-white">
        <Container className="max-w-4xl">
          <SectionHeading
            eyebrow="Why Highland Farms"
            title="An All-Inclusive Experience"
            subtitle="We take care of everything so you can focus on what matters — each other."
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {included.map((item) => (
              <div
                key={item.text}
                className="flex items-start gap-4 rounded-xl bg-white p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cream shrink-0">
                  <item.icon className="h-5 w-5 text-forest" />
                </div>
                <p className="text-sm text-charcoal leading-relaxed font-sans">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* The Venue */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-lg font-normal text-sage font-script mb-3">
                The Venue
              </p>
              <h2 className="text-3xl font-normal sm:text-4xl">
                Five Enchanted Acres
              </h2>
              <p className="mt-4 text-base text-muted leading-relaxed font-sans">
                Highland Farms sits on five forested acres at the base of Mt.
                Hood. The property features a cedar mill lodge,
                spring-fed pond, old-growth trees draped in moss, and of course —
                our beloved Scottish Highland Cows.
              </p>
              <p className="mt-4 text-base text-muted leading-relaxed font-sans">
                Your wedding party can stay on site in the William Wallace Lodge,
                Bonnie Lass Cottage and Camp, making it a true destination wedding
                experience for up to 20 of your closest people.
              </p>

              <ul className="mt-6 space-y-2">
                {[
                  "Forest ceremony sites",
                  "Outdoor reception areas",
                  "Highland Cow photo ops",
                  "The Nordic Spa",
                  "Cedar Hot Tubs",
                  "On-site accommodations for 20",
                  "Full kitchen for catering",
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

            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <Image
                src="/images/hero/farm-aerial.jpg"
                alt="Aerial view of Highland Farms wedding venue"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Gallery */}
      <section id="gallery" className="py-20 lg:py-28 bg-cream">
        <Container>
          <SectionHeading
            title="Wedding Gallery"
            subtitle="See real celebrations at Highland Farms."
          />
          <ImageGallery images={galleryImages} columns={3} />
          <div className="mt-10 text-center">
            <Button href="/wedding-portfolio" variant="outline">
              View Full Wedding Portfolio &rarr;
            </Button>
          </div>
        </Container>
      </section>

      {/* Testimonial */}
      <section className="py-20 lg:py-28 bg-background">
        <Container className="max-w-3xl text-center">
          <div className="flex justify-center mb-6">
            {[...Array(5)].map((_, i) => (
              <Heart key={i} className="h-4 w-4 fill-accent text-accent" />
            ))}
          </div>
          <blockquote>
            <p className="text-xl font-normal leading-relaxed text-charcoal sm:text-2xl font-display">
              &ldquo;We had our wedding at Highland Farms and I can not recommend
              them highly enough!! An absolutely stunning and unique venue that
              surpassed our wildest dreams! Connor made every part of the process
              so simple and seamless!&rdquo;
            </p>
          </blockquote>
          <p className="mt-6 text-sm text-charcoal font-sans font-normal">
            Hannah M.
          </p>
          <p className="mt-0.5 text-xs text-muted font-sans font-light">
            Google Review — Wedding
          </p>
          <a
            href="https://share.google/jrLOI4AhnpzbPPBpF"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-sm font-light text-forest hover:text-forest-light transition-colors font-sans tracking-wide"
          >
            Read all 146+ reviews on Google &rarr;
          </a>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-20 lg:py-28 bg-warm-white">
        <Container className="max-w-3xl">
          <SectionHeading
            eyebrow="Common Questions"
            title="Oregon Farm Wedding Venue FAQ"
            subtitle="Everything you want to know about hosting your wedding at Highland Farms."
          />
          <FAQAccordion items={weddingFAQ} />
        </Container>
      </section>

      {/* Inquiry Form */}
      <section className="py-20 lg:py-28 bg-background">
        <Container className="max-w-4xl">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/illustrations/farm-scene.png"
              alt=""
              width={280}
              height={160}
              className="h-24 w-auto opacity-50"
              aria-hidden="true"
            />
          </div>
          <SectionHeading
            eyebrow="Ready to Start Planning?"
            title="Check Availability for Your Date"
            subtitle="2027 dates are filling quickly. Every wedding at Highland Farms is unique — tell us your vision and we'll create a custom package."
          />
          <div className="mx-auto max-w-xl rounded-xl border border-cream-dark bg-white p-6 sm:p-8 shadow-sm">
            <ContactForm
              defaultEventType="wedding"
              heading=""
              subtitle=""
              ctaText="Check Availability"
            />
          </div>
          <p className="mt-6 text-center text-sm text-muted font-sans">
            Prefer to talk? Call us at{" "}
            <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} className="text-forest font-medium hover:text-forest-light transition-colors">
              {CONTACT.phone}
            </a>
          </p>
        </Container>
      </section>

      {/* Sticky mobile CTA */}
      <StickyMobileCTA
        label="Get Your Custom Quote"
        href="/contact"
      />
      <div className="h-20 lg:hidden" />
    </>
  );
}
