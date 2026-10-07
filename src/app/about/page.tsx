import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { StructuredData } from "@/components/layout/StructuredData";
import { CHECK_DATE_HREF } from "@/components/layout/chrome";
import { WeddingCallLink } from "@/components/field/WeddingCallLink";
import { FieldReview, FieldReviewTier, GOOGLE_REVIEW_LINK } from "@/components/field/Reviews";
import { FieldStickyBar } from "@/components/field/StickyBar";
import {
  FieldArrow,
  FieldDrawing,
  FieldLeader,
  FieldLink,
  PendingSlot,
  Plate,
  fieldCtaClass,
  fieldEyebrowClass,
  type FieldDrawingName,
} from "@/components/ui/FieldGuide";
import { TOUR_PARTY_SIZES } from "@/data/farm-tours";
import { REVIEW_COUNT } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import {
  ABOUT_FINLEY_QUOTE,
  ABOUT_HERO_QUOTE,
  ABOUT_ORIGIN_QUOTE,
  ABOUT_TEAM_QUOTE,
} from "./quotes";

export const metadata: Metadata = {
  title: "About Highland Farms: Connor's Forest Farm in Brightwood",
  description:
    "Meet Connor McWilliams and the herd at Highland Farms, a private forest farm in Brightwood, Oregon: Highland cows, five forested acres, weddings, tours and stays.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Highland Farms: Connor's Forest Farm in Brightwood",
    description:
      "Meet Connor McWilliams and the herd at Highland Farms, a private forest farm in Brightwood, Oregon.",
    images: [
      {
        url: "/images/farm/about-hero.jpg",
        width: 1200,
        height: 630,
        alt: "Highland Farms in Brightwood, Oregon",
      },
    ],
  },
};

const TOUR_FOR_TWO = TOUR_PARTY_SIZES.find((p) => p.guests === 2)?.total ?? 150;

const eyebrow = cn(fieldEyebrowClass, "m-0 text-[17px] lg:text-[20px]");
const h2 = "field-heading m-0 mt-1 font-display text-[30px] leading-[1.05] lg:text-[46px]";
const doubleRule = "border-t-[3px] border-double border-frame";

interface Resident {
  drawing: FieldDrawingName;
  kind: string;
  /** Names no animal: animal names wait on Connor (truth-E), so they live only in the PendingSlot below. */
  title: string;
  line: string;
  quote?: ReactNode;
}

const residentQuote = "text-[17px] leading-[1.3] lg:text-[19px]";

function residents(): Resident[] {
  return [
    {
      drawing: "highland-cow",
      kind: "Scottish Highland cows",
      title: "The herd",
      line: "Shaggy, gentle and out on every tour, rain or shine. You can feed, brush and pet them.",
    },
    {
      drawing: "highland-calf",
      kind: "Highland calves",
      title: "The newest arrivals",
      line: "Highland calves are born on the farm.",
    },
    {
      drawing: "icelandic-sheep",
      kind: "Icelandic sheep",
      title: "The flock at the end of the fern trail",
      line: "Curly fleece and small curled horns.",
    },
    {
      drawing: "white-peacock",
      kind: "The peacocks",
      title: "The farm’s alarm clock",
      line: "They run their own wake-up service and take no requests.",
    },
    {
      drawing: "guardian-dog",
      kind: "The farm dogs",
      title: "The guardians",
      line: "They keep an eye on the herd, and on everyone who comes to visit it.",
    },
    {
      drawing: "hen",
      kind: "The hens",
      title: "The egg layers",
      line: "Their eggs go to the farm shop by the dozen, for pickup or local delivery.",
    },
  ];
}

/** What the roster says once Connor confirms who is on the farm now (dev only, inside the PendingSlot). */
const NAMED_ROSTER = [
  "No. 1 title “Finley, Arthur and the herd” (Finley: one review, June 2025; Arthur: Linda V., February 2026), with Chelyn J.’s Finley quote in place of Amber H.’s.",
  "No. 4 title “Albie, the farm’s alarm clock”, line “Albie runs his own wake-up service and takes no requests.” (Albie: July 2026).",
  "No. 5 title “Bear and Beau” (Kristin Barnes’s review, May 2026).",
];

const landRows = [
  { term: "The forest", detail: "Old trees draped in moss, with fern trails and the Acorn Trail running through." },
  { term: "The pond", detail: "Natural and spring-fed." },
  { term: "The pasture", detail: "Home to the herd, between the barn and the Cottage." },
];

export default function AboutPage() {
  return (
    <>
      <StructuredData pathname="/about" />
      <div className="surface-paper bg-paper pt-[var(--header-h)] font-sans text-ink">
        {/* 1. Hero */}
        <section aria-labelledby="about-title" className="px-5 pb-10 pt-3 lg:px-16 lg:pb-20 lg:pt-14">
          <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16">
            <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
              <p className={eyebrow}>About Highland Farms</p>
              <h1
                id="about-title"
                className="field-heading m-0 mt-1 font-display text-[25px] leading-[1.04] min-[360px]:text-[30px] min-[400px]:text-[35px] min-[400px]:leading-[1.02] lg:mt-3 lg:text-[64px]"
              >
                A private forest farm, and a herd with names.
              </h1>
            </div>

            {/* Phone crop: an aspect-ratio frame (inner about 1.68:1 at every width) from Connor's face down to
                the calf's muzzle, so the photo's one caption (CAPTIONS.md) is true on both breakpoints.
                "Check your date" still ends above 660px at 393x660 (rule 15). */}
            <Plate
              className="mt-2.5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0"
              frameClassName="aspect-[353/217] max-[374px]:aspect-[353/180] lg:aspect-auto lg:h-[640px]"
              caption="Connor and a calf."
            >
              <Image
                src="/images/farm/farm-life.jpg"
                alt="Connor McWilliams, in a Highland Farms vest, walking a Highland calf on a lead along a forest path"
                fill
                priority
                sizes="(min-width: 1024px) 520px, 100vw"
                className="object-cover object-[50%_58%] lg:object-[50%_55%]"
              />
            </Plate>

            <div className="lg:col-start-1 lg:row-start-2 lg:mt-7">
              <p className="m-0 mt-1.5 text-[15px] leading-[1.45] max-[374px]:text-[14px] text-ink-body lg:mt-0 lg:max-w-[540px] lg:text-[18px] lg:leading-[1.6]">
                Five forested acres about an hour from Portland, home to a herd of Highland cows.
              </p>
              <FieldReviewTier tier="hero" className="mt-1.5 text-[14px] lg:mt-5 lg:text-[15px]" />
              <div className="mt-2.5 lg:mt-6 lg:border-t lg:border-rule lg:pt-6">
                <p className="m-0 mb-2 font-display text-[18px] leading-snug max-[399px]:hidden lg:mb-0 lg:text-[24px]">
                  Planning a wedding here?
                </p>
                <FieldLink
                  href={CHECK_DATE_HREF}
                  data-hero-cta=""
                  className={cn(fieldCtaClass, "w-full lg:mt-2.5 lg:w-auto")}
                >
                  Check your date
                  <FieldArrow />
                </FieldLink>
                <FieldReview
                  spec={ABOUT_HERO_QUOTE}
                  role="Wedding"
                  size="sm"
                  className="mt-5 lg:mt-7 lg:max-w-[540px]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2. How it began */}
        <section
          aria-labelledby="about-began-title"
          className={cn(doubleRule, "px-5 pb-10 pt-9 lg:px-16 lg:pb-20 lg:pt-20")}
        >
          <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-x-16">
            <div className="lg:col-start-2 lg:row-start-1">
              <p className={eyebrow}>How it began</p>
              <h2 id="about-began-title" className={h2}>
                It started as five overgrown acres.
              </h2>
              {/* flex + gap, not space-y: the paragraphs' m-0 cancelled space-y, so the two ran together. */}
              <div className="mt-4 flex flex-col gap-4 text-[15px] leading-[1.65] text-ink-body lg:mt-6 lg:max-w-[600px] lg:text-[17px]">
                <p className="m-0">
                  Connor grew up loving ranch life on the Church ranch in Salinas, California. He worked as a general
                  contractor until that work could buy a farm and livestock of his own, and he never pictured a farm
                  without guests on it.
                </p>
                <p className="m-0">
                  The land he found in Brightwood had spent decades growing back into forest. He and his crew cleared
                  it, kept the old trees, and rebuilt the place around them.
                </p>
              </div>
              <FieldReview
                spec={ABOUT_ORIGIN_QUOTE}
                role="Stay"
                size="sm"
                className="mt-6 lg:mt-8 lg:max-w-[600px]"
                quoteClassName="text-[20px] lg:text-[24px]"
              />
              <PendingSlot
                note="PENDING CONNOR C7: the year the farm opened, as one line: “Opened in 20XX.”"
                className="mt-4"
              />
            </div>
            <Plate
              className="mt-7 lg:col-start-1 lg:row-start-1 lg:mt-2"
              frameClassName="h-[240px] lg:h-[460px]"
              caption="The patio, the lawn and the Lodge, from above."
            >
              <Image
                src="/images/farm/farm-aerial-patio-lawn-lodge-dusk.jpg"
                alt="Styled aerial view of Highland Farms at dusk: the flagstone patio and dance floor, the lawn path and guests outside the Lodge"
                fill
                loading="lazy"
                sizes="(min-width: 1024px) 520px, 100vw"
                className="object-cover object-[70%_50%]"
              />
            </Plate>
          </div>
        </section>

        {/* 3. The residents. Production names no animal: names wait on Connor and live only in the PendingSlot. */}
        <section
          aria-labelledby="about-residents-title"
          className={cn(doubleRule, "px-5 pb-10 pt-9 lg:px-16 lg:pb-20 lg:pt-20")}
        >
          <div className="mx-auto max-w-[1312px]">
            <div className="lg:flex lg:items-end lg:justify-between lg:gap-16">
              <div>
                <p className={eyebrow}>Who lives here</p>
                <h2 id="about-residents-title" className={h2}>
                  Meet the residents.
                </h2>
              </div>
              <div className="lg:max-w-[460px]">
                <p className="m-0 mt-3 text-[15px] leading-[1.6] text-ink-body lg:mt-0 lg:text-[16px]">
                  Every farm tour goes into the pen with the herd. These are the ones guests write home about.
                </p>
                <PendingSlot
                  note="PENDING CONNOR: animal names. Confirm who is on the farm now; until then production shows the animals without names. Once confirmed, restore:"
                  className="mt-2"
                >
                  <ul className="m-0 list-disc pl-4 font-sans text-[12px] leading-snug text-ink-note">
                    {NAMED_ROSTER.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <FieldReview
                    spec={ABOUT_FINLEY_QUOTE}
                    role="Farm tour"
                    size="sm"
                    className="mt-2"
                    quoteClassName={residentQuote}
                  />
                </PendingSlot>
              </div>
            </div>

            <ol
              role="list"
              className="m-0 mt-6 list-none border-t border-rule p-0 lg:mt-10 lg:grid lg:grid-cols-3 lg:border-l"
            >
              {residents().map((r, i) => (
                <li
                  key={r.kind}
                  className="grid grid-cols-[100px_1fr] gap-x-4 border-b border-rule py-5 lg:flex lg:flex-col lg:border-r lg:px-8 lg:pb-8 lg:pt-6"
                >
                  <FieldDrawing
                    name={r.drawing}
                    className="h-[100px] w-[100px] lg:h-[200px] lg:w-full"
                    sizes="(min-width: 1024px) 300px, 100px"
                  />
                  <div className="lg:mt-3">
                    <p className="m-0 text-[11px] uppercase tracking-[0.14em] text-ink-meta">
                      No. {i + 1} · {r.kind}
                    </p>
                    <h3 className="m-0 mt-1 font-display text-[23px] font-semibold leading-[1.1] lg:text-[27px]">
                      {r.title}
                    </h3>
                    <p className="m-0 mt-1.5 text-[14px] leading-[1.5] text-ink-body lg:text-[15px]">{r.line}</p>
                    {r.quote}
                  </div>
                </li>
              ))}
            </ol>
            <FieldLink
              href="/farm-tours"
              className="mt-2 flex min-h-[56px] items-center gap-3 border-b border-rule max-[374px]:py-2 lg:mt-4"
            >
              <span className="flex min-w-0 flex-col min-[375px]:contents">
                <span className="font-display text-[22px] font-medium leading-tight">See tour dates</span>
                <span className="hidden min-[375px]:contents">
                  <FieldLeader />
                </span>
                <span className="whitespace-nowrap text-[13px] text-ink-note">Private, ${TOUR_FOR_TWO} for two</span>
              </span>
              <span className="ml-auto min-[375px]:ml-0">
                <FieldArrow size={16} className="text-fern" />
              </span>
            </FieldLink>
          </div>
        </section>

        {/* 4. The land */}
        <section
          aria-labelledby="about-land-title"
          className={cn(doubleRule, "px-5 pb-10 pt-9 lg:px-16 lg:pb-20 lg:pt-20")}
        >
          <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start lg:gap-x-16">
            <div>
              <p className={eyebrow}>The lay of the land</p>
              <h2 id="about-land-title" className={h2}>
                The forest, a spring-fed pond, and the pasture.
              </h2>
              <dl className="m-0 mt-5 flex flex-col border-t border-rule lg:mt-8">
                {landRows.map((row) => (
                  <div
                    key={row.term}
                    className="grid grid-cols-[96px_1fr] items-baseline gap-x-3 border-b border-rule py-3 lg:grid-cols-[150px_1fr] lg:gap-x-6 lg:py-4"
                  >
                    <dt className="font-display text-[20px] font-semibold leading-tight lg:text-[24px]">{row.term}</dt>
                    <dd className="m-0 text-[14px] leading-[1.5] text-ink-body lg:text-[16px]">{row.detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <Plate
              className="mt-8 lg:mt-2"
              frameClassName="h-[280px] lg:h-[560px]"
              caption="A fern trail under the old trees."
            >
              <Image
                src="/images/farm/contact-hero.jpg"
                alt="A narrow dirt trail through sword ferns under tall, moss-covered trees"
                fill
                loading="lazy"
                sizes="(min-width: 1024px) 520px, 100vw"
                className="object-cover object-[50%_70%]"
              />
            </Plate>
          </div>
        </section>

        {/* 5. Connor and his team */}
        <section
          aria-labelledby="about-team-title"
          className={cn(doubleRule, "px-5 pb-12 pt-9 lg:px-16 lg:pb-24 lg:pt-20")}
        >
          <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16">
            <div className="lg:col-start-2 lg:row-start-1">
              <p className={eyebrow}>Who looks after you</p>
              <h2 id="about-team-title" className={h2}>
                Connor and his team.
              </h2>
              <p className="m-0 mt-4 text-[15px] leading-[1.65] text-ink-body lg:mt-6 lg:max-w-[600px] lg:text-[17px]">
                Connor McWilliams owns and runs Highland Farms. Tour guests are met at the carved Highland cow out front by
                his team, who know every animal by name.
              </p>
            </div>
            <div className="mt-6 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-2">
              <Plate
                frameClassName="h-[300px] lg:h-[600px]"
                caption="A guide, two guests and a calf, in the barn."
              >
                <Image
                  src="/images/farm/cow-2.jpg"
                  alt="A farm guide in a cap and two guests petting a pale, shaggy Highland calf inside the barn"
                  fill
                  loading="lazy"
                  sizes="(min-width: 1024px) 520px, 100vw"
                  className="object-cover object-[50%_60%]"
                />
              </Plate>
              <PendingSlot
                note="PENDING CONNOR: the guide's first name, to name him in this caption"
                className="mt-1"
              />
            </div>
            <div className="lg:col-start-2 lg:row-start-2">
              <div className="mt-6 border-y border-rule py-5 lg:mt-8">
                <FieldReview
                  spec={ABOUT_TEAM_QUOTE}
                  role="Farm tour"
                  size="sm"
                  quoteClassName="text-[20px] lg:text-[23px]"
                />
              </div>
              <p className="m-0 mt-1">
                <FieldLink
                  href={GOOGLE_REVIEW_LINK}
                  external
                  className={cn(
                    "inline-flex min-h-11 items-center text-[14px] text-ink-body underline decoration-rule underline-offset-4",
                  )}
                >
                  Read all {REVIEW_COUNT} reviews on Google
                </FieldLink>
              </p>
            </div>
          </div>
        </section>

        {/* 6. The wedding close: the page ends on its primary action. A real couple with the herd proves the headline;
            placed here, away from the resident plates, so CONSISTENCY #11 holds. One caption, from CAPTIONS.md. */}
        <section
          aria-labelledby="about-wedding-title"
          className={cn(doubleRule, "px-5 pb-12 pt-9 lg:px-16 lg:pb-24 lg:pt-20")}
        >
          <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16">
            <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
              <p className={eyebrow}>Weddings at Highland Farms</p>
              <h2
                id="about-wedding-title"
                className="field-heading m-0 mt-1 font-display text-[31px] leading-[1.04] lg:text-[48px]"
              >
                Your wedding, with the coos as honorary guests.
              </h2>
            </div>
            <Plate
              className="mt-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0"
              frameClassName="aspect-[3/2] lg:aspect-auto lg:h-[384px]"
              caption="Riley & Jordan with two of the herd, June 2025."
            >
              <Image
                src="/images/weddings/riley-jordan/04.jpg"
                alt="Riley and Jordan at the pasture fence, between a black and a white Highland cow"
                fill
                loading="lazy"
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover object-[50%_60%]"
              />
            </Plate>
            <div className="mt-5 lg:col-start-1 lg:row-start-2 lg:mt-6">
              <p className="m-0 text-[15px] leading-[1.6] text-ink-body lg:max-w-[560px] lg:text-[17px]">
                Whimsical forest weddings for up to 125 guests. Your wedding is a weekend, not a day: up to 20 of your
                people can stay on the farm.
              </p>
              <FieldLink href={CHECK_DATE_HREF} className={cn(fieldCtaClass, "mt-5 w-full lg:mt-7 lg:w-auto")}>
                Check your date
                <FieldArrow />
              </FieldLink>
              <WeddingCallLink
                content="about-wedding"
                title="About: wedding call"
                className="mt-1 flex min-h-11 items-center justify-center text-[14px] font-medium text-pine lg:justify-start lg:text-[15px]"
              >
                <span className="border-b border-pine-line pb-0.5">Book a free 45-minute call with Connor</span>
              </WeddingCallLink>
            </div>
          </div>
        </section>
      </div>

      {/* Phone sticky action: appears once the hero button scrolls away. */}
      <FieldStickyBar
        primary={{ label: "Check your date", sublabel: "Two-night weddings from $13,000", href: CHECK_DATE_HREF }}
      />
    </>
  );
}
