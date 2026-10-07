import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { StructuredData } from "@/components/layout/StructuredData";
import { FieldReview, FieldReviewTier } from "@/components/field/Reviews";
import { FieldStickyBar } from "@/components/field/StickyBar";
import { JsonLd, cancellationAnswer, faqPageJsonLd } from "@/components/field/Faq";
import { BookingModalRoot, BookingTextLink } from "@/components/shared/BookingButton";
import { HighlandDayBlock } from "@/components/shared/HighlandDayBlock";
import { BookingPolicyNote, KnowBeforeYouBook, type KnowRow } from "@/components/shared/KnowBeforeYouBook";
import { NextAvailability } from "@/components/shared/NextAvailability";
import { SpaPicker } from "@/components/shared/VisitPickers";
import { VisitFaq } from "@/components/shared/VisitFaq";
import { NativeBookingSection } from "@/components/booking/NativeBookingSection";
import {
  FieldDrawing,
  FieldSection,
  FieldSectionHeader,
  FieldSequence,
  PendingSlot,
  Plate,
} from "@/components/ui/FieldGuide";
import {
  SPA_MAX_PARTY,
  SPA_PRICE_PER_PERSON,
  SPA_PRIVATE_PRICE,
  SPA_SESSION_TIMES,
  SPA_WEEKEND,
  nordicSpaFAQ,
} from "@/data/nordic-spa";
import { BOOKING_PRODUCTS } from "@/lib/booking/products";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { BOOKING_LINKS, bookingUrl } from "@/lib/constants";
import { SpaHero } from "./SpaHero";
import { SPA_BEST_HOUR_QUOTE } from "./quotes";

const DESCRIPTION = `Wood-burning cedar sauna, wet sauna and cold plunge in the forest in Brightwood, Oregon. ${BOOKING_PRODUCTS["nordic-spa"].durationMin}-minute sessions, up to ${SPA_MAX_PARTY} guests, $${SPA_PRICE_PER_PERSON} per person.`;

export const metadata: Metadata = {
  title: { absolute: "Nordic Spa: Sauna & Cold Plunge | Highland Farms Oregon" },
  description: DESCRIPTION,
  alternates: { canonical: "/nordic-spa" },
  openGraph: {
    title: "Nordic Spa: Sauna & Cold Plunge | Highland Farms Oregon",
    description: DESCRIPTION,
    url: "https://highlandfarmsoregon.com/nordic-spa",
    type: "website",
    images: [
      {
        // The hero photo. /sauna-near-portland uses spa-1, so the two pages do not share one.
        url: "/images/spa/spa-exterior-plunge-moss.jpg",
        width: 1200,
        height: 630,
        alt: "The cold plunge on the cedar deck beside a moss-covered tree at Highland Farms",
      },
    ],
  },
};

const isProduction = process.env.NODE_ENV === "production";

/**
 * "Know before you book" rows (round 3 board). The Check-in row is a whole pending row: absent in production.
 * Round 4: the age rule holds in every session (ops fact 9); the Session row is gone, since "One spot, or
 * all six" and the meta line above the picker already say it.
 */
const knowRows: KnowRow[] = [
  { term: "Ages", detail: "16 and up, in every session, private ones included." },
  { term: "Bring", detail: "A swimsuit and walking shoes. Robes, towels and a changing area are here." },
  {
    term: "Arrival",
    detail:
      "Park on the right in the gravel past the gate. More than 15 minutes late, and your session may be shortened or cancelled at your expense.",
  },
  ...(isProduction
    ? []
    : [
        {
          term: "Check-in",
          detail: <PendingSlot inline note="PENDING CONNOR: where spa guests check in; the whole row hides until answered" />,
        },
      ]),
  { term: "Access", detail: "Not ADA accessible. The spa is reached over uneven ground and steps." },
  { term: "Timing", detail: "Book at least a day ahead." },
];

export default function NordicSpaPage() {
  const native = nativeCalendarEnabled();
  const policy = cancellationAnswer(nordicSpaFAQ);

  return (
    <>
      <StructuredData pathname="/nordic-spa" />
      <JsonLd data={faqPageJsonLd(nordicSpaFAQ)} />

      {/* S1 First screen: the spot picker is the CTA */}
      <SpaHero />

      <div className="surface-paper bg-paper font-sans text-ink">
        {/* S2 One spa quote */}
        <FieldSection rule="double" pad="none" innerClassName="py-10 lg:py-20" aria-label="What spa guests say">
          <FieldReview
            spec={SPA_BEST_HOUR_QUOTE}
            role="Nordic spa"
            size="lg"
            className="max-w-[900px]"
            quoteClassName="text-[26px] leading-[1.22] lg:text-[40px]"
            metaClassName="mt-3 lg:text-[11px]"
          />
        </FieldSection>

        {/* S3 The ritual (a sequence in time) */}
        <FieldSection id="ritual" aria-label="The ritual" innerClassName="lg:grid lg:grid-cols-12 lg:gap-x-16">
          <div className="lg:col-span-6">
            <FieldSectionHeader
              eyebrow="The ritual, at your own pace"
              title="Ninety minutes, hot and cold, in the forest"
              titleClassName="lg:text-[60px]"
            />
            <FieldSequence
              className="mt-7"
              items={[
                { id: "heat", title: "Heat", body: "The dry cedar sauna, heated by a wood-burning stove." },
                { id: "steam", title: "Steam", body: "The wet sauna, for a softer heat." },
                { id: "cold", title: "Cold", body: "The cold plunge, outside on the cedar deck." },
                {
                  id: "rest",
                  title: "Rest",
                  body: "Robe on, out on the deck or in the lounge. Then round again until the ninety minutes are up.",
                },
              ]}
            />
          </div>
          <div className="mt-9 lg:col-span-6 lg:mt-0">
            <Plate
              className="lg:mt-0"
              frameClassName="h-[240px] lg:h-[520px]"
              caption="Robes on, out on the deck."
            >
              <Image
                src="/images/spa/spa-3.jpg"
                alt="Three guests in white robes leaning on the deck rail among ferns"
                fill
                sizes="(min-width: 1440px) 600px, (min-width: 1024px) 45vw, calc(100vw - 54px)"
                className="object-cover object-[45%_40%]"
              />
            </Plate>
          </div>
        </FieldSection>

        {/* S4 One spot, or all six */}
        <FieldSection
          id="six"
          aria-label="One spot, or all six"
          innerClassName="lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-16"
        >
          <Plate
            className="lg:col-span-5"
            frameClassName="h-[280px] lg:h-[620px]"
            caption="A shared session on the cedar benches."
          >
            <Image
              src="/images/spa/spa-8.jpg"
              alt="Guests in swimsuits talking on the cedar sauna benches"
              fill
              sizes="(min-width: 1440px) 520px, (min-width: 1024px) 40vw, calc(100vw - 54px)"
              className="object-cover object-[50%_45%]"
            />
          </Plate>
          <div className="mt-8 lg:col-span-7 lg:mt-0">
            <FieldSectionHeader
              eyebrow="How a session works"
              title="One spot, or all six"
              intro={`Each session has six spots. Book one or a few, and you may share the sauna with another small party. Bring five friends and book all six: the session is yours alone, $${SPA_PRIVATE_PRICE} for the six of you.`}
              introClassName="lg:mt-3"
            />
            <p className="m-0 mt-3 font-sans text-[14px] leading-[1.55] text-ink-note lg:text-[15px]">
              Sessions start at {SPA_SESSION_TIMES}. Open days change week to week, so check the calendar.
            </p>
            <div className="mt-7 grid grid-cols-[64px_1fr] items-center gap-4 border-t border-rule pt-6 lg:grid-cols-[96px_1fr]">
              <FieldDrawing name="vine-maple-leaf" className="h-16 w-16 lg:h-24 lg:w-24" sizes="96px" />
              <p className="m-0 font-display text-[21px] italic leading-[1.3] text-ink lg:text-[26px]">
                October to March is sauna season. Rain changes nothing here: sessions run as booked, all year.
              </p>
            </div>
          </div>
        </FieldSection>

        {/* S5 Book (#availability is the masthead action's target) */}
        <FieldSection
          id="availability"
          rule="double"
          tone="light"
          eyebrow="Book your session"
          title="Pick your spots, then a time"
          intro={`$${SPA_PRICE_PER_PERSON} per person · ${BOOKING_PRODUCTS["nordic-spa"].durationMin} minutes · Up to ${SPA_MAX_PARTY} guests · Ages 16+`}
          introClassName="max-w-none text-[12px] uppercase tracking-[0.1em] text-ink lg:text-[13px]"
        >
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-16">
            <div className="mt-7 lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:mt-12">
              {native ? (
                <NativeBookingSection product="nordic-spa" />
              ) : (
                <>
                  <SpaPicker
                    where="pricing"
                    prefix="nordic-spa"
                    label="How many are coming? Pick to see sessions"
                    labelId="book-size-label"
                  />
                  <BookingPolicyNote text={policy} className="mt-2.5 text-[13px] leading-[1.4] text-ink-note" />
                  <p className="m-0 mt-3 font-sans text-[13px] leading-[1.5] text-ink-note lg:text-[14px]">
                    <Suspense fallback={null}>
                      <NextAvailability product="spa" variant="text" label="Next open:" />
                    </Suspense>
                    {SPA_WEEKEND && ` ${SPA_WEEKEND}`}
                  </p>
                  <FieldReviewTier tier="nearCta" className="mt-2" />
                  <PendingSlot className="mt-4" note="DECIDE D4: visit packs line (3 for $199, 5 for $299, 10 for $549, six months). Show only after Hayden decides and the Acuity pack copy says 90 minutes">
                    <p className="m-0 font-sans text-[13px] leading-[1.55] text-ink-note lg:text-[14px]">
                      Coming back this winter? Visit packs: 3 for $199, 5 for $299, 10 for $549, each good for six
                      months.{" "}
                      <BookingTextLink
                        href={bookingUrl(BOOKING_LINKS.giftCertificates, "nordic-spa-packs")}
                        label="See visit packs"
                        title="Spa visit packs"
                        className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap font-medium text-pine underline underline-offset-4"
                      />
                    </p>
                  </PendingSlot>
                </>
              )}
            </div>
            <div className="mt-9 lg:col-span-6 lg:col-start-1 lg:row-start-1 lg:mt-12">
              <KnowBeforeYouBook framed={false} rows={knowRows} />
            </div>
          </div>
        </FieldSection>

        <HighlandDayBlock utmPrefix="nordic-spa-day" />

        <VisitFaq items={nordicSpaFAQ} />
      </div>

      <FieldStickyBar
        primary={
          native
            ? { label: "See open sessions", sublabel: `$${SPA_PRICE_PER_PERSON} per person`, href: "#book" }
            : {
                label: "See open sessions",
                sublabel: `$${SPA_PRICE_PER_PERSON} per person`,
                booking: { title: "Book your Nordic Spa session" },
                href: bookingUrl(BOOKING_LINKS.nordicSpa, "nordic-spa-sticky-mobile"),
              }
        }
        hideWhenVisible={["[data-hero-cta]", "#availability"]}
      />

      {/* Modal mount: listens for openBookingModal() calls from every CTA */}
      <BookingModalRoot />
    </>
  );
}
