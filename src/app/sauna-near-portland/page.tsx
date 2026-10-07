import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { StructuredData } from "@/components/layout/StructuredData";
import { FieldReview, FieldReviewTier } from "@/components/field/Reviews";
import { FieldStickyBar } from "@/components/field/StickyBar";
import { JsonLd, cancellationAnswer, faqPageJsonLd } from "@/components/field/Faq";
import { BookingButton, BookingModalRoot, BookingTextLink } from "@/components/shared/BookingButton";
import { HighlandDayBlock } from "@/components/shared/HighlandDayBlock";
import { BookingPolicyNote, KnowBeforeYouBook, type KnowRow } from "@/components/shared/KnowBeforeYouBook";
import { NextAvailability } from "@/components/shared/NextAvailability";
import { SpaPicker } from "@/components/shared/VisitPickers";
import { VisitFaq } from "@/components/shared/VisitFaq";
import {
  FieldArrow,
  FieldRows,
  FieldSection,
  FieldSectionHeader,
  PendingSlot,
  Plate,
  fieldCtaClass,
} from "@/components/ui/FieldGuide";
import {
  SPA_MAX_PARTY,
  SPA_PRICE_PER_PERSON,
  SPA_PRIVATE_PRICE,
  SPA_SESSION_TIMES,
  SPA_WEEKEND,
} from "@/data/nordic-spa";
import { properties } from "@/data/properties";
import { BOOKING_PRODUCTS } from "@/lib/booking/products";
import { BOOKING_LINKS, CONTACT, bookingUrl } from "@/lib/constants";
import type { FAQItem } from "@/lib/types";
import { SAUNA_DRIVE_QUOTES, SAUNA_HERO_QUOTE } from "./quotes";

const SPA_MINUTES = BOOKING_PRODUCTS["nordic-spa"].durationMin;

const DESCRIPTION = `Looking for a sauna near Portland? A wood-burning cedar sauna, a wet sauna and a cold plunge in the forest in Brightwood, about an hour from downtown. $${SPA_PRICE_PER_PERSON} per person.`;

export const metadata: Metadata = {
  title: { absolute: "Sauna Near Portland, Outdoor Wood-Fired | Highland Farms" },
  description: DESCRIPTION,
  alternates: { canonical: "/sauna-near-portland" },
  openGraph: {
    title: "Sauna Near Portland, Outdoor Wood-Fired | Highland Farms",
    description: DESCRIPTION,
    url: "https://highlandfarmsoregon.com/sauna-near-portland",
    type: "website",
    images: [
      {
        // The hero photo (/nordic-spa's og image is its own hero).
        url: "/images/spa/spa-1.jpg",
        width: 1200,
        height: 630,
        alt: "Wood smoke rising from the chimney of the spa cabin among tall mossy trees at Highland Farms",
      },
    ],
  },
};

const stayCapacity = (slug: string) => properties.find((p) => p.slug === slug)?.guests;

/**
 * This page's own FAQ (round 3 board): four entries, none repeating a row on
 * the page. The cancellation answer is one of the six identical copies; keep
 * its exact sentence.
 */
const faqItems: FAQItem[] = [
  {
    question: "Can we stay the night?",
    answer: `Yes, on the farm: the Lodge and the Cottage each sleep ${stayCapacity("lodge")}, and the Camp sleeps ${stayCapacity("camp")}. If your spa date is past the open calendar, call ${CONTACT.phone} and we’ll book it for you.`,
  },
  {
    question: "Can I book the sauna for today?",
    answer:
      "Online booking closes a day ahead. If you’re already at the farm, ask us: a same-day spot is sometimes open.",
  },
  {
    question: "Can I give a sauna session as a gift?",
    answer: "Yes. Gift certificates for the Nordic spa are on our gift certificates page.",
  },
  {
    question: "What's the cancellation policy?",
    answer:
      "Our cancellation policy is strict. All spa bookings are final: no refunds, no reschedules, no credits, and no transfers, including for no-shows. Please confirm your date, time, and guest count before you book. The only exception is if we cancel for severe weather or for the safety of our animals or guests, in which case we will refund or rebook you.",
  },
];

function serviceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Outdoor Sauna Near Portland: Highland Farms Nordic Spa",
    description: `Public wood-burning sauna, wet sauna & cold plunge about an hour from Portland, Oregon. ${SPA_MINUTES}-minute sessions for up to ${SPA_MAX_PARTY} guests, outdoors in the forest at Highland Farms in Brightwood.`,
    url: "https://highlandfarmsoregon.com/sauna-near-portland",
    // Reference the canonical business node rather than inlining a second,
    // thinner LocalBusiness: an inline copy fragments the entity across the
    // page that matters most for "sauna near Portland".
    provider: { "@id": "https://highlandfarmsoregon.com/#business" },
    areaServed: {
      "@type": "City",
      name: "Portland",
      "@id": "https://en.wikipedia.org/wiki/Portland,_Oregon",
    },
    offers: {
      "@type": "Offer",
      price: String(SPA_PRICE_PER_PERSON),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: BOOKING_LINKS.nordicSpa,
    },
  };
}

/** Drive times to the farm gate, without traffic (OSRM free-flow, 2026-10-06). */
const DRIVE = [
  { place: "Downtown Portland", time: "65 min", strong: true },
  { place: "Gresham", time: "40 min" },
  { place: "Sandy", time: "20 min" },
] as const;

const BUYS: { term: string; detail: string }[] = [
  { term: "The heat", detail: "A cedar sauna with a wood-burning stove" },
  { term: "The steam", detail: "A wet sauna, for a softer heat" },
  { term: "The cold", detail: "A plunge outside on the cedar deck, under the trees" },
  {
    term: "The crowd",
    detail: `Six guests at most, or just your group if you book all six spots ($${SPA_PRIVATE_PRICE})`,
  },
  { term: "The setting", detail: "A private forest farm of five acres" },
  { term: "The season", detail: "October to March is sauna season. Sessions run as booked, rain or shine." },
  { term: "The neighbors", detail: "A herd of Highland cows (tours are booked separately)" },
  { term: "The price", detail: `$${SPA_PRICE_PER_PERSON} per person for ${SPA_MINUTES} minutes, robes and towels included` },
];

const knowRows: KnowRow[] = [
  { term: "Ages", detail: "16 and up only." },
  { term: "Bring", detail: "A swimsuit and walking shoes. Robes and towels are here." },
  {
    term: "Session",
    detail: `Shared, up to six guests, unless you book all six spots. It ends at ${SPA_MINUTES} minutes.`,
  },
  {
    term: "Timing",
    detail:
      "Book at least a day ahead. More than 15 minutes late, and your session may be shortened or cancelled at your expense.",
  },
  { term: "Access", detail: "Not ADA accessible; uneven ground and steps." },
];

export default function SaunaNearPortlandPage() {
  const policy = cancellationAnswer(faqItems);

  return (
    <>
      <StructuredData pathname="/sauna-near-portland" />
      <JsonLd data={faqPageJsonLd(faqItems)} />
      <JsonLd data={serviceSchema()} />

      {/* S1 First screen: the forest, and "is it worth the drive?" answered by a guest */}
      <section
        aria-labelledby="sauna-hero-title"
        className="surface-paper bg-paper pt-[var(--header-h,104px)] text-ink"
      >
        <div className="mx-auto flex max-w-[1440px] flex-col px-5 pb-8 pt-[18px] lg:grid lg:min-h-[clamp(600px,calc(100svh_-_var(--header-h,128px)),900px)] lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:grid-rows-[1fr_repeat(6,auto)_1fr] lg:gap-x-16 lg:px-10 lg:pb-10 lg:pt-11 xl:px-10 min-[90rem]:px-16">
          <Plate
            className="lg:col-start-2 lg:row-start-1 lg:row-end-9"
            frameClassName="h-[190px] max-[359px]:h-[120px] lg:h-auto lg:min-h-0 lg:flex-1"
            captionClassName="mt-px max-[359px]:hidden lg:mt-0.5"
            caption="Smoke from the sauna stove, through the trees."
          >
            <Image
              src="/images/spa/spa-1.jpg"
              alt="Wood smoke rising from the chimney of the black spa cabin among tall mossy trees"
              fill
              priority
              fetchPriority="high"
              sizes="(min-width: 1440px) 600px, (min-width: 1024px) 45vw, calc(100vw - 56px)"
              className="object-cover object-[55%_55%]"
            />
          </Plate>

          <p className="m-0 mt-3.5 font-display text-[18px] italic text-fern lg:col-start-1 lg:row-start-2 lg:mt-0 lg:text-[22px]">
            Sauna near Portland
          </p>
          <h1
            id="sauna-hero-title"
            className="field-heading mt-0.5 text-[34px] leading-[1.02] text-ink max-[359px]:text-[29px] lg:col-start-1 lg:row-start-3 lg:mt-1 lg:text-[48px] xl:text-[56px]"
          >
            A forest sauna, about an hour from Portland
          </h1>
          <p className="m-0 mt-2.5 font-sans text-[14px] leading-[1.5] text-ink-body lg:col-start-1 lg:row-start-4 lg:mt-5 lg:max-w-[560px] lg:text-[17px] lg:leading-[1.6]">
            Drive east on US-26 and trade the city for a wood-fired cedar sauna, a wet sauna and a cold plunge on a
            deck in the trees.
          </p>
          <p className="m-0 mt-3 font-sans text-[12px] uppercase tracking-[0.08em] text-ink lg:col-start-1 lg:row-start-5 lg:mt-6 lg:text-[13px]">
            ${SPA_PRICE_PER_PERSON} per person &middot; {SPA_MINUTES} minutes &middot; Up to {SPA_MAX_PARTY} &middot; Ages 16+
          </p>

          <div data-hero-cta className="mt-3 lg:col-start-1 lg:row-start-6 lg:mt-6">
            <BookingButton
              href={bookingUrl(BOOKING_LINKS.nordicSpa, "sauna-near-portland-hero")}
              label="See open sessions"
              title="Book your sauna session"
              className={`${fieldCtaClass} w-full rounded-none py-0 normal-case shadow-none hover:shadow-none lg:w-auto`}
            >
              See open sessions
              <FieldArrow />
            </BookingButton>
            <p className="m-0 mt-2 text-center font-sans text-[12px] text-ink-note lg:text-left lg:text-[14px]">
              <Suspense fallback={null}>
                <NextAvailability product="spa" variant="text" label="Next open:" />
              </Suspense>
            </p>
          </div>

          <div className="mt-4 border-t border-rule pt-3.5 lg:col-start-1 lg:row-start-7 lg:mt-7 lg:max-w-[560px] lg:pt-5">
            <FieldReviewTier tier="hero" />
            <FieldReview
              spec={SAUNA_HERO_QUOTE}
              role="Nordic spa"
              size="sm"
              className="mt-2"
              metaClassName="mt-1 lg:text-[11px]"
            />
          </div>
        </div>
      </section>

      <div className="surface-paper bg-paper font-sans text-ink">
        {/* S2 The drive: times to the gate, without traffic */}
        <FieldSection id="drive" rule="double" aria-label="The drive" innerClassName="lg:grid lg:grid-cols-12 lg:gap-x-16">
          <div className="lg:col-span-6">
            <FieldSectionHeader
              id="drive-title"
              eyebrow="East on US-26"
              title="The drive is part of it"
              intro="Out of town on US-26, through Gresham and Sandy, into the trees. Times are to the farm gate, without traffic."
              introClassName="max-w-[560px] lg:text-[17px]"
            />
            <ol className="m-0 mt-7 list-none p-0" aria-label="Drive times to Highland Farms">
              {DRIVE.map((d) => (
                <li
                  key={d.place}
                  className="grid grid-cols-[28px_1fr_auto] items-baseline gap-x-3 border-t border-rule py-4"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 h-2.5 w-2.5 justify-self-center rounded-full border-2 border-pine bg-paper"
                  />
                  <span className="font-display text-[23px] font-semibold leading-tight lg:text-[26px]">{d.place}</span>
                  <span className={`font-sans text-[15px] lg:text-[17px] ${"strong" in d ? "font-semibold" : ""}`}>
                    {d.time}
                  </span>
                </li>
              ))}
              <li className="grid grid-cols-[28px_1fr] items-baseline gap-x-3 border-y border-rule bg-paper-shade py-4 pr-3">
                <span aria-hidden="true" className="mt-2 h-3 w-3 justify-self-center rounded-full bg-pine" />
                <span>
                  <span className="block font-display text-[23px] font-semibold leading-tight lg:text-[26px]">
                    Highland Farms, Brightwood
                  </span>
                  <span className="mt-1 block font-sans text-[14px] leading-[1.5] text-ink-body">
                    {CONTACT.address}. Pull through the gate and park on the right in the gravel.
                  </span>
                </span>
              </li>
            </ol>
            <p className="m-0 mt-4 font-sans text-[13px] leading-[1.6] text-ink-note lg:text-[14px]">
              From Beaverton, about 1 hour 20 minutes; from Hillsboro, about 1.5 hours. Coming down from the
              mountain? Government Camp is about 25 minutes away.
            </p>
          </div>
          <Plate
            className="mt-9 lg:col-span-6 lg:mt-0"
            frameClassName="h-[230px] lg:h-[600px]"
            caption="Where the road ends: the deck and the plunge, beside a giant tree."
          >
            <Image
              src="/images/spa/spa-exterior-deck-plunge.jpg"
              alt="The cold plunge set into the cedar deck, ferns and a huge tree trunk beside it"
              fill
              sizes="(min-width: 1440px) 600px, (min-width: 1024px) 45vw, calc(100vw - 54px)"
              className="object-cover object-[55%_60%]"
            />
          </Plate>
        </FieldSection>

        {/* S3 What the drive buys you: our own facts only */}
        <FieldSection
          id="buys"
          eyebrow="A city sauna, or this one"
          title="What the drive buys you"
        >
          <FieldRows
            size="list"
            rows={BUYS}
            className="mt-8 lg:mt-12 lg:grid lg:grid-cols-2 lg:gap-x-16"
            rowClassName="py-3.5 lg:gap-3 lg:py-4"
            termClassName="w-[116px] text-[20px] lg:w-[170px] lg:text-[24px]"
            detailClassName="lg:text-[16px]"
          />
        </FieldSection>

        {/* S4 People who made the drive (the five-star count sits only at the booking action) */}
        <FieldSection
          id="drive-proof"
          eyebrow="In their words"
          title="People who made the drive"
          aside={<FieldReviewTier tier="compact" />}
        >
          <ul
            role="list"
            className="m-0 mt-7 list-none border-t border-rule p-0 lg:mt-10 lg:grid lg:grid-cols-2 lg:gap-x-16 lg:border-t-0"
          >
            {SAUNA_DRIVE_QUOTES.map((spec) => (
              <li key={spec.author} className="border-b border-rule py-6 lg:border-b-0 lg:border-t lg:py-8">
                <FieldReview spec={spec} role="Nordic spa" size="lg" />
              </li>
            ))}
          </ul>
        </FieldSection>

        {/* S5 Book (#book is the masthead action's target) */}
        <FieldSection
          id="book"
          rule="double"
          tone="light"
          eyebrow="Book the sauna"
          title="Pick your spots, then a time"
          intro={`$${SPA_PRICE_PER_PERSON} per person · ${SPA_MINUTES} minutes · Sessions at ${SPA_SESSION_TIMES}`}
          introClassName="max-w-none text-[12px] uppercase tracking-[0.1em] text-ink lg:text-[13px]"
        >
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-16">
            <div className="mt-7 lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:mt-12">
              <SpaPicker
                where="pricing"
                prefix="sauna-near-portland"
                label="How many are coming? Pick to see sessions"
                labelId="book-size-label"
              />
              <p className="m-0 mt-3 font-sans text-[13px] leading-[1.5] text-ink-note lg:text-[14px]">
                <Suspense fallback={null}>
                  <NextAvailability product="spa" variant="text" label="Next open:" />
                </Suspense>
                {SPA_WEEKEND && ` ${SPA_WEEKEND}`} Booking all six? Choose 6 spots on the calendar.
              </p>
              <FieldReviewTier tier="nearCta" className="mt-2" />
              <BookingPolicyNote
                text={policy}
                className="mt-5 border-t border-rule pt-4 text-[12px] text-ink-body lg:text-[13px]"
              />
              <PendingSlot
                className="mt-4"
                note="DECIDE D4: visit packs line (3 for $199, 5 for $299, 10 for $549, six months). Show only after Hayden decides and the Acuity pack copy says 90 minutes"
              >
                <p className="m-0 font-sans text-[13px] leading-[1.55] text-ink-note lg:text-[14px]">
                  Coming back this winter? Visit packs: 3 for $199, 5 for $299, 10 for $549, each good for six months.{" "}
                  <BookingTextLink
                    href={bookingUrl(BOOKING_LINKS.giftCertificates, "sauna-near-portland-packs")}
                    label="See visit packs"
                    title="Spa visit packs"
                    className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap font-medium text-pine underline underline-offset-4"
                  />
                </p>
              </PendingSlot>
            </div>
            <div className="mt-9 lg:col-span-6 lg:col-start-1 lg:row-start-1 lg:mt-12">
              <KnowBeforeYouBook framed={false} rows={knowRows} />
            </div>
          </div>
        </FieldSection>

        <HighlandDayBlock utmPrefix="sauna-near-portland-day" />

        <VisitFaq eyebrow="Before you make the drive" title="Sauna near Portland: questions" items={faqItems} />
      </div>

      <FieldStickyBar
        primary={{
          label: "See open sessions",
          sublabel: `$${SPA_PRICE_PER_PERSON} per person`,
          booking: { title: "Book your sauna session" },
          href: bookingUrl(BOOKING_LINKS.nordicSpa, "sauna-near-portland-sticky-mobile"),
        }}
        hideWhenVisible="#book"
      />

      {/* Modal mount: listens for openBookingModal() calls from every CTA */}
      <BookingModalRoot />
    </>
  );
}
