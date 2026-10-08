import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { StructuredData } from "@/components/layout/StructuredData";
import { FieldReview, FieldReviewTier, GOOGLE_REVIEW_LINK } from "@/components/field/Reviews";
import { FieldStickyBar } from "@/components/field/StickyBar";
import { JsonLd, cancellationAnswer, faqPageJsonLd } from "@/components/field/Faq";
import { BookingModalRoot } from "@/components/shared/BookingButton";
import { HighlandDayBlock } from "@/components/shared/HighlandDayBlock";
import { BookingPolicyNote, KnowBeforeYouBook, type KnowRow } from "@/components/shared/KnowBeforeYouBook";
import { NextAvailability } from "@/components/shared/NextAvailability";
import { TourPicker } from "@/components/shared/VisitPickers";
import { VisitFaq } from "@/components/shared/VisitFaq";
import { NativeBookingSection } from "@/components/booking/NativeBookingSection";
import {
  FieldArrow,
  FieldCatalogue,
  FieldDrawing,
  FieldLink,
  FieldNo,
  FieldSection,
  FieldSectionHeader,
  FieldSequence,
  Plate,
} from "@/components/ui/FieldGuide";
import { TOUR_LEAD_TIME, TOUR_PARTY_SIZES, TOUR_TIMES, farmTourFAQ } from "@/data/farm-tours";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { BOOKING_LINKS, CONTACT, bookingUrl } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ToursHero } from "./ToursHero";
import {
  TOURS_COWS_QUOTE,
  TOURS_HUG_QUOTE,
  TOURS_NOTES,
  TOURS_SCOTLAND_QUOTE,
} from "./quotes";

export const metadata: Metadata = {
  title: { absolute: "Highland Cow Farm Tour near Portland | Highland Farms" },
  description:
    "Brush, pet and photograph Scottish Highland cows on a private 60-minute farm tour in Brightwood, about an hour from Portland. $150 for two.",
  alternates: { canonical: "/farm-tours" },
  openGraph: {
    title: "Highland Cow Farm Tour near Portland | Highland Farms",
    description:
      "Brush, pet and photograph Scottish Highland cows on a private 60-minute farm tour in Brightwood, about an hour from Portland. $150 for two.",
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

const TOUR_FOR_TWO = TOUR_PARTY_SIZES[0].total;
const EACH_ADDITIONAL = TOUR_PARTY_SIZES[1].total - TOUR_PARTY_SIZES[0].total;
const TEL = `tel:+1${CONTACT.phone.replace(/\D/g, "")}`;

const body15 = "m-0 mt-2.5 max-w-[560px] font-sans text-[15px] leading-[1.6] text-ink-body lg:text-[17px]";
const hook =
  "field-heading m-0 font-display text-[34px] leading-[1.02] text-ink lg:text-[48px]";

/** "Know before you book" rows for the tour (board 5; prices from TOUR_PARTY_SIZES). */
const knowRows: KnowRow[] = [
  {
    term: "Ages",
    detail: `5 and up are $${EACH_ADDITIONAL}. Kids 4 and under come free and don't count toward your group.`,
  },
  {
    term: "Group",
    detail: (
      <>
        Online booking covers two or more paying guests. One adult with a little one? Call{" "}
        <a href={TEL} className="whitespace-nowrap text-pine underline underline-offset-4">
          {CONTACT.phone}
        </a>{" "}
        and we&apos;ll set it up.
      </>
    ),
  },
  {
    term: "Wear and access",
    detail:
      "Closed-toe shoes are required. Dress in layers; October to March, bring rain boots and a rain jacket. Not ADA accessible: the paths can't take a wheelchair, walker or stroller, and there is no seated version.",
  },
  {
    term: "Arrival",
    detail:
      "Park on the right in the gravel past the gate and meet your guide at the carved Highland cow. More than 10 minutes late, and your tour may be shortened or cancelled at your expense.",
  },
  { term: "Timing", detail: "Book at least a day ahead. Dates open about three to four months out." },
];

const sheep = [
  {
    id: "icelandic-sheep",
    drawing: "icelandic-sheep" as const,
    title: "Icelandic sheep",
    subtitle: "Ovis aries, Icelandic breed",
    body: "At the end of the fern-forest trail. A northern breed with a thick double fleece.",
  },
];

/** Peacocks, dogs and hens: compact rows on phones (drawing left, one line), three across on desktop; cows and sheep stay full. */
const meet = [
  {
    id: "white-peacock",
    drawing: "white-peacock" as const,
    title: "White peacocks",
    subtitle: "Pavo cristatus, white form",
    body: "Look up in the barn.",
  },
  {
    id: "guardian-dog",
    drawing: "guardian-dog" as const,
    title: "Guardian dogs",
    subtitle: "Canis familiaris, on duty",
    body: "On duty with the herd and flock. Please leave pets at home.",
  },
  {
    id: "hen",
    drawing: "hen" as const,
    title: "Hens, guinea fowl",
    subtitle: "Gallus gallus · Numida meleagris",
    body: "You'll hear the guinea fowl before you see them.",
  },
];

export default function FarmToursPage() {
  const native = nativeCalendarEnabled();
  const policy = cancellationAnswer(farmTourFAQ);

  return (
    <>
      <StructuredData pathname="/farm-tours" />
      <JsonLd data={faqPageJsonLd(farmTourFAQ)} />

      {/* S1 First screen: the group-size rows are the CTA */}
      <ToursHero />

      <div className="surface-paper bg-paper font-sans text-ink">
        {/* S2 The short version: message match for the ads */}
        <FieldSection
          rule="double"
          aria-label="The short version"
          innerClassName="lg:grid lg:grid-cols-12 lg:gap-x-16"
        >
          <div className="lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:self-center">
            <h2 className="m-0 font-display text-[20px] italic text-fern lg:text-[24px]">The short version</h2>
            <ul role="list" className="m-0 mt-3 list-none border-t border-rule p-0">
              <li className="border-b border-rule py-6 lg:py-8">
                <h3 className={hook}>Yes, you can hug them.</h3>
                <p className={body15}>
                  You go into the pen with your guide to feed, brush and pet the Highland cows. Bring a phone with
                  room for photos.
                </p>
                <FieldReview spec={TOURS_HUG_QUOTE} role="Farm tour" size="sm" className="mt-4" />
                <Plate
                  className="mt-5 lg:hidden"
                  frameClassName="h-[250px]"
                  caption="A guide, two guests and a calf, in the barn."
                >
                  <Image
                    src="/images/farm/cow-2.jpg"
                    alt="A guide and two guests petting a shaggy Highland calf in the barn"
                    fill
                    sizes="calc(100vw - 54px)"
                    className="object-cover object-[50%_62%]"
                  />
                </Plate>
              </li>
              <li className="border-b border-rule py-6 lg:py-8">
                <p className="m-0 font-display text-[22px] italic leading-[1.2] text-ink lg:text-[28px]">
                  Not a petting zoo. No passport needed.
                </p>
                <p className={body15}>
                  Every tour is private: your group of two to six, your own guide, and sixty minutes on a working
                  farm in the forest. No crowd at the fence. Scottish Highland cows in Brightwood, Oregon, about an
                  hour from Portland.
                </p>
                <FieldReview spec={TOURS_SCOTLAND_QUOTE} role="Farm tour" size="sm" className="mt-4" />
              </li>
            </ul>
          </div>
          <Plate
            className="hidden lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:flex"
            frameClassName="lg:h-[640px]"
            caption="A guide, two guests and a calf, in the barn."
          >
            <Image
              src="/images/farm/cow-2.jpg"
              alt="A guide and two guests petting a shaggy Highland calf in the barn"
              fill
              sizes="(min-width: 1440px) 520px, 40vw"
              className="object-cover object-[50%_62%] lg:object-[50%_50%]"
            />
          </Plate>
        </FieldSection>

        {/* S3 Who you'll meet: the field guide (plates are the index) */}
        <FieldSection
          id="meet"
          eyebrow="A field guide to the farm"
          title="Who you'll meet"
          intro="The Highland cows are the main event: you go into the pen with them. Here's who else you'll meet along the way."
        >
          {/* Phone: the drawing sits above the text, so the name, the body and Lizzy D.'s quote run the full column. */}
          <article className="mt-8 grid grid-cols-1 items-start gap-4 border-t border-rule pt-6 lg:mt-14 lg:grid-cols-12 lg:gap-x-16 lg:pt-10">
            <div className="lg:col-span-7 lg:self-center">
              <p className="m-0 font-sans text-[11px] uppercase tracking-[0.16em] text-ink-meta">No. 1</p>
              <h3 className="field-heading m-0 mt-1 font-display text-[32px] leading-[1.02] text-ink lg:text-[52px]">
                Highland cows
              </h3>
              <p className="m-0 mt-1 font-display text-[16px] italic text-ink-note lg:text-[20px]">
                Bos taurus, Highland breed. From Scotland.
              </p>
              <p className={cn(body15, "mt-3")}>
                The reason you came. Your guide takes you into the pen and shows you how to feed and brush them.
                Then it&apos;s your turn.
              </p>
              <FieldReview
                spec={TOURS_COWS_QUOTE}
                role="Farm tour"
                size="sm"
                className="mt-4 max-w-[560px]"
              />
            </div>
            <FieldDrawing
              name="highland-cow"
              className="order-first w-[160px] lg:order-none lg:col-span-5 lg:w-[420px] lg:justify-self-end"
              sizes="(min-width: 1024px) 420px, 160px"
            />
          </article>

          <FieldCatalogue
            className="mt-6 lg:mt-12"
            start={2}
            columns={1}
            mediaLayout="side"
            ruled
            items={sheep.map((m) => ({
              id: m.id,
              title: m.title,
              subtitle: m.subtitle,
              body: m.body,
              media: (
                <FieldDrawing
                  name={m.drawing}
                  className="h-[64px] w-[64px] lg:h-[200px] lg:w-[300px]"
                  sizes="(min-width: 1024px) 300px, 64px"
                />
              ),
            }))}
          />

          <ul role="list" className="m-0 grid list-none divide-y divide-rule border-y border-rule p-0 lg:grid-cols-3 lg:gap-x-10 lg:divide-y-0 lg:py-8">
            {meet.map((m, i) => (
              <li key={m.id} className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-4 py-3 lg:flex lg:flex-col lg:items-start lg:py-0">
                <FieldDrawing
                  name={m.drawing}
                  className="row-span-2 h-[56px] w-[56px] lg:h-[160px] lg:w-full"
                  sizes="(min-width: 1024px) 300px, 56px"
                />
                <h3 className="field-heading m-0 flex items-baseline gap-2 font-display text-[19px] leading-tight text-ink lg:mt-2 lg:block lg:text-[26px]">
                  <FieldNo n={3 + i} className="lg:mb-0.5 lg:block" />
                  {m.title}
                </h3>
                <p className="m-0 font-sans text-[13px] leading-[1.45] text-ink-body lg:mt-1 lg:text-[15px]">{m.body}</p>
              </li>
            ))}
          </ul>
        </FieldSection>

        {/* S4 The hour, in order */}
        <FieldSection
          id="hour"
          aria-label="The hour, in order"
          innerClassName="lg:grid lg:grid-cols-12 lg:gap-x-16"
        >
          <div className="lg:col-span-6">
            <FieldSectionHeader eyebrow="Sixty minutes, start to finish" title="The hour, in order" />
            <FieldSequence
              className="mt-7"
              items={[
                {
                  id: "gate",
                  title: "The gate",
                  body: "Pull through the gate, park on the right in the gravel and look for the parking sign.",
                  footer: (
                    <Plate
                      className="mt-5 lg:hidden"
                      frameClassName="h-[210px]"
                      caption="The carved Highland cow and the Highland Farms sign."
                    >
                      <Image
                        src="/images/farm/hero.jpg"
                        alt="The carved wooden Highland cow holding the Highland Farms sign, the Lodge behind"
                        fill
                        sizes="calc(100vw - 54px)"
                        className="object-cover object-[38%_45%]"
                      />
                    </Plate>
                  ),
                },
                {
                  id: "carved-cow",
                  title: "The carved Highland cow",
                  body: `Your guide meets you at the carved Highland cow. Tours start at ${TOUR_TIMES}, on the hour.`,
                },
                {
                  id: "pen",
                  title: "The pen",
                  body: "In with the Highland cows. Your guide hands you the brush and the feed, and tells you who's who. Ask your guide anything.",
                },
                {
                  id: "ferns",
                  title: "The fern forest",
                  body: "Walk the trail through the fern forest to the Icelandic sheep.",
                  footer: (
                    <Plate className="mt-5 lg:hidden" frameClassName="h-[210px]" caption="Ferns along the creek.">
                      <Image
                        src="/images/farm/forest-creek.jpg"
                        alt="A small stream running between sword ferns and mossy rocks"
                        fill
                        sizes="calc(100vw - 54px)"
                        className="object-cover object-[50%_55%]"
                      />
                    </Plate>
                  ),
                },
              ]}
            />
          </div>

          <div className="hidden lg:col-span-6 lg:flex lg:flex-col lg:gap-10">
            <Plate frameClassName="lg:h-[460px]" caption="The carved Highland cow and the Highland Farms sign.">
              <Image
                src="/images/farm/hero.jpg"
                alt="The carved wooden Highland cow holding the Highland Farms sign, the Lodge behind"
                fill
                sizes="(min-width: 1440px) 600px, 45vw"
                className="object-cover object-[38%_45%]"
              />
            </Plate>
            <Plate frameClassName="lg:h-[560px]" caption="Ferns along the creek.">
              <Image
                src="/images/farm/forest-creek.jpg"
                alt="A small stream running between sword ferns and mossy rocks"
                fill
                sizes="(min-width: 1440px) 600px, 45vw"
                className="object-cover object-[50%_55%]"
              />
            </Plate>
          </div>
        </FieldSection>

        {/* S5 Field notes from guests */}
        <FieldSection
          id="notes"
          eyebrow="In their words"
          title="Field notes from guests"
          aside={<FieldReviewTier tier="compact" />}
        >
          <Plate
            className="mt-7 lg:mt-10"
            frameClassName="h-[260px] lg:h-[420px]"
            caption="A guide leads a Highland calf down the forest trail."
          >
            <Image
              src="/images/farm/farm-life.jpg"
              alt="A smiling guide in a Highland Farms vest leading a shaggy Highland calf on a rope down a gravel trail through the forest"
              fill
              sizes="(min-width: 1024px) 1200px, calc(100vw - 54px)"
              className="object-cover object-[50%_60%]"
            />
          </Plate>
          <ul
            role="list"
            className="m-0 mt-7 list-none border-t border-rule p-0 lg:mt-10 lg:grid lg:grid-cols-2 lg:gap-x-16 lg:border-t-0"
          >
            {TOURS_NOTES.map((spec) => (
              <li
                key={spec.author}
                className="border-b border-rule py-6 lg:border-b-0 lg:border-t lg:py-8"
              >
                <FieldReview spec={spec} role="Farm tour" size="lg" />
              </li>
            ))}
          </ul>
          <a
            href={GOOGLE_REVIEW_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-11 items-center gap-2 font-sans text-[15px] font-medium text-pine"
          >
            <span className="border-b border-pine-line pb-0.5">Read every review on Google</span>
            <FieldArrow />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </FieldSection>

        {/* S6 Book: the picker, the strict line at the point of sale, Know before you book */}
        <FieldSection
          id="choose"
          rule="double"
          tone="light"
          eyebrow="Book your tour"
          title="Pick your group, then your date"
          intro="Private tour · 60 minutes · 2 to 6 guests · Rain or shine"
          introClassName="max-w-none text-[12px] uppercase tracking-[0.1em] text-ink lg:text-[13px]"
        >
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-16">
            <div className="mt-7 lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:mt-12">
              {native ? (
                <NativeBookingSection product="farm-tour" />
              ) : (
                <>
                  <TourPicker
                    where="pricing"
                    label="How many are coming? Pick to see dates"
                    labelId="book-size-label"
                  />
                  <p className="m-0 mt-3 font-sans text-[13px] leading-[1.5] text-ink-note lg:text-[14px]">
                    <Suspense fallback={null}>
                      <NextAvailability variant="text" label="Next open tour:" />
                    </Suspense>{" "}
                    Tours at {TOUR_TIMES}.
                    {TOUR_LEAD_TIME && ` The typical tour is booked ${TOUR_LEAD_TIME} ahead.`}
                  </p>
                </>
              )}
            </div>
            <div className="mt-9 lg:col-span-6 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-12">
              <KnowBeforeYouBook framed={false} rows={knowRows} />
            </div>
            {!native && (
              <div className="lg:col-span-6 lg:col-start-7 lg:row-start-2">
                <BookingPolicyNote text={policy} />
              </div>
            )}
          </div>
        </FieldSection>

        {/* S7b Give a farm tour */}
        <FieldSection
          id="give"
          pad="compact"
          eyebrow={<span data-season-only="gift">For the holidays</span>}
          title="Give a farm tour"
          size="lg"
          titleClassName="text-[32px] leading-[1.02] lg:text-[48px]"
          intro={`$${TOUR_FOR_TWO} for two, the same price as booking it. They pick the date.`}
        >
          <FieldLink
            href="/gift-certificates"
            className="mt-2 inline-flex min-h-11 items-center gap-2 font-sans text-[15px] font-medium text-pine"
          >
            <span className="border-b border-pine-line pb-0.5">See gift certificates</span>
            <FieldArrow />
          </FieldLink>
        </FieldSection>

        <VisitFaq items={farmTourFAQ} />

        <HighlandDayBlock utmPrefix="farm-tours-day" line="add-spa" />
      </div>

      <FieldStickyBar
        primary={
          native
            ? { label: "See tour dates", sublabel: `$${TOUR_FOR_TWO} for two`, href: "#book" }
            : {
                label: "See tour dates",
                sublabel: `$${TOUR_FOR_TWO} for two`,
                booking: { title: "Book your farm tour" },
                href: bookingUrl(BOOKING_LINKS.farmTourForTwo, "farm-tours-sticky-mobile"),
              }
        }
        hideWhenVisible={["[data-hero-cta]", "#choose"]}
      />

      {/* Modal mount: listens for openBookingModal() calls from every CTA */}
      <BookingModalRoot />
    </>
  );
}
