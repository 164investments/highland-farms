import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "@/components/forms/ContactForm";
import { StructuredData } from "@/components/layout/StructuredData";
import { FieldReview } from "@/components/field/Reviews";
import { WeddingCallLink } from "@/components/field/WeddingCallLink";
import { JsonLd, faqPageJsonLd } from "@/components/field/Faq";
import { FieldStickyBar } from "@/components/field/StickyBar";
import {
  FieldArrow,
  FieldDrawing,
  PendingSlot,
  Plate,
  fieldLabelClass,
} from "@/components/ui/FieldGuide";
import { cn } from "@/lib/utils";
import { formatWeddingDate, weddingPortfolio } from "@/data/wedding-portfolio";
import { WEDDING_FORM_INTRO } from "@/components/home/home-data";
import { WeddingsHero } from "./WeddingsHero";
import { LookbookCard } from "./LookbookLink";
import {
  ALCOHOL_INSURANCE_ANSWER,
  COST_ANSWER,
  GETTING_HERE_ANSWER,
  RAIN_CLOSE,
  RAIN_LEAD,
  RESTROOMS_ANSWER,
  VENDORS_PENDING,
  weddingFAQ,
} from "./faq";
import {
  WEDDINGS_CALL_QUOTE,
  WEDDINGS_CONNOR_QUOTE,
  WEDDINGS_FOREST_QUOTE,
  WEDDINGS_RAIN_QUOTE,
  WEDDINGS_SPA_QUOTE,
} from "./quotes";

export const metadata: Metadata = {
  title: { absolute: "Forest Wedding Venue near Mt. Hood, with Highland Cows | Highland Farms" },
  description:
    "Whimsical forest weddings with Scottish Highland cows as honorary guests, about an hour from Portland. See real weddings and check your date.",
  alternates: { canonical: "/weddings" },
  openGraph: {
    title: "Forest Wedding Venue near Mt. Hood, with Highland Cows | Highland Farms",
    description:
      "Whimsical forest weddings with Scottish Highland cows as honorary guests, about an hour from Portland. See real weddings and check your date.",
    url: "https://highlandfarmsoregon.com/weddings",
    type: "website",
    images: [
      {
        url: "/images/hero/wedding-hero.jpg",
        width: 1200,
        height: 630,
        // The file is a couple on a fallen log in the forest, not a ceremony (images.csv).
        alt: "A couple on a fallen log in the forest, she in a long white dress",
      },
    ],
  },
};

const sectionLabel = fieldLabelClass;
const h2Class = "field-heading font-display text-[36px] leading-[1.02] text-ink lg:text-[56px]";
const bodyLarge = "font-sans text-[16px] leading-[1.6] text-ink-body lg:text-[18px]";

const SLEEP = [
  { drawing: "lodge", name: "William Wallace Lodge", detail: "Sleeps 8" },
  { drawing: "cottage", name: "Bonnie Lass Cottage", detail: "Sleeps 8" },
  { drawing: "airstream-camp", name: "The Camp", detail: "Sleeps 4, Airstream and canvas tents" },
] as const;

const INCLUSIONS = [
  ["Tables, chairs", "19 wood harvest tables, 125 chairs"],
  ["Lights", "Firefly string lights over dinner"],
  ["Dance floor", "18 by 18 feet, checkered"],
  ["Sound", "Two speakers and a microphone"],
  ["Warmth", "Six patio heaters"],
  ["Restrooms", "A three-stall restroom trailer"],
  ["Bar and arbor", "Live-edge cedar"],
  ["Spaces", "The Ceremony Patio, the Cocktail Terrace and the Grove"],
] as const;

const faqSummary =
  "flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-[22px] font-semibold leading-tight text-ink lg:text-[26px] [&::-webkit-details-marker]:hidden";
const faqBody = "pb-6 font-sans text-[16px] leading-[1.6] text-ink-body";

function FaqRow({
  question,
  open,
  children,
}: {
  question: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="group border-b border-rule">
      <summary className={faqSummary}>
        {question}
        <span aria-hidden="true" className="font-sans text-[22px] font-normal text-pine group-open:hidden">
          +
        </span>
        <span aria-hidden="true" className="hidden font-sans text-[22px] font-normal text-pine group-open:inline">
          &minus;
        </span>
      </summary>
      <div className={faqBody}>{children}</div>
    </details>
  );
}

/**
 * No. 1's plate: Riley & Jordan's kiss at the fence. The homepage's No. 1 is their 04 frame, so a
 * visitor coming from home meets a new photo here; the caption is the one the data file gives it.
 */
const rileyFence = weddingPortfolio.find((c) => c.slug === "riley-jordan")!.plates[0];

/** The three real weddings shown on the teaser (the fourth, Riley & Jordan, is No. 1 above). */
const teaser = {
  maya: weddingPortfolio.find((c) => c.slug === "maya-justin")!,
  olivia: weddingPortfolio.find((c) => c.slug === "olivia-connor")!,
  sydney: weddingPortfolio.find((c) => c.slug === "sydney-casey")!,
};

export default function WeddingsPage() {
  return (
    <>
      <StructuredData pathname="/weddings" />
      <JsonLd data={faqPageJsonLd(weddingFAQ)} />

      <WeddingsHero />

      {/* No. 1 The coos (Connor's first reason, and the ad's hook). No quote here: a quote beside
          Riley & Jordan's photo reads as theirs, and none of the snapshot's reviews is confirmed as theirs. */}
      <section aria-labelledby="coos-title" className="surface-paper border-t border-rule bg-paper text-ink">
        <div className="mx-auto max-w-[1440px] px-5 py-12 lg:grid lg:grid-cols-12 lg:gap-x-16 lg:px-16 lg:py-24">
          <div className="lg:col-span-5 lg:self-center">
            <p className={sectionLabel}>No. 1 &middot; The coos</p>
            <h2 id="coos-title" className={cn(h2Class, "mt-1.5 lg:mt-3")}>
              The guest list includes cows.
            </h2>
            <p className={cn(bodyLarge, "mt-4 max-w-[34rem] lg:mt-6")}>
              Our Scottish Highland coos are your honorary wedding guests. They stand for portraits at the
              pasture fence.
            </p>
          </div>
          <div className="mt-7 lg:col-span-7 lg:mt-0">
            <Plate
              frameClassName="aspect-[4/3] p-[7px] lg:aspect-[3/2] lg:p-2.5"
              caption={rileyFence.caption}
            >
              <Image
                src={rileyFence.src}
                alt={rileyFence.alt}
                fill
                sizes="(min-width: 1024px) 58vw, calc(100vw - 40px)"
                className="object-cover"
                style={{ objectPosition: rileyFence.position }}
              />
            </Plate>
          </div>
        </div>
      </section>

      {/* No. 2 The whimsical forest */}
      <section aria-labelledby="forest-title" className="surface-paper border-t border-rule bg-paper text-ink">
        <div className="mx-auto max-w-[1440px] px-5 py-12 lg:px-16 lg:py-24">
          <div className="lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-16">
            <div className="lg:col-span-6">
              <p className={sectionLabel}>No. 2 &middot; The whimsical forest</p>
              <h2 id="forest-title" className={cn(h2Class, "mt-1.5 lg:mt-3")}>
                Say your vows under the evergreens.
              </h2>
            </div>
            <div className="lg:col-span-5 lg:col-start-8">
              <p className={cn(bodyLarge, "mt-4 lg:mt-0")}>
                Five private acres of tall evergreens, sword ferns and moss in Brightwood, Oregon. Couples here
                have married on the flagstone patio beside the pond and sat down to dinner at long tables on the
                lawn among the trees. Farm tours and the spa close to the public for weddings.
              </p>
            </div>
          </div>
          <div className="mt-7 lg:mt-12 lg:grid lg:grid-cols-12 lg:gap-x-16">
            <Plate
              className="lg:col-span-8"
              frameClassName="aspect-[4/3] p-[7px] lg:aspect-[16/10] lg:p-2.5"
              caption="A ceremony in the forest at Highland Farms."
            >
              <Image
                src="/images/weddings/forest-ceremony.jpg"
                alt="Guests seated under tall evergreens watch a couple exchange vows"
                fill
                sizes="(min-width: 1024px) 62vw, calc(100vw - 40px)"
                className="object-cover object-[60%_52%]"
              />
            </Plate>
            <div className="mt-6 lg:col-span-4 lg:mt-0 lg:flex lg:flex-col lg:gap-8">
              {/* Neutral imagery beside Kristen B.'s quote: her family's wedding is not one the page names. */}
              <Plate
                className="hidden lg:flex"
                frameClassName="aspect-[5/4] lg:p-2.5"
                captionClassName="lg:text-[17px]"
                caption="A fern trail under the old trees."
              >
                <Image
                  src="/images/farm/contact-hero.jpg"
                  alt="A narrow dirt trail through sword ferns under tall, moss-covered trees"
                  fill
                  loading="lazy"
                  sizes="30vw"
                  className="object-cover object-[50%_70%]"
                />
              </Plate>
              <FieldReview
                spec={WEDDINGS_FOREST_QUOTE}
                role="Wedding"
                quoteClassName="text-[20px] leading-[1.28] lg:text-[24px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* No. 3 Your people stay (the weekend: a sequence in time, so Roman numerals) */}
      <section aria-labelledby="weekend-title" className="surface-paper border-t border-rule bg-paper text-ink">
        <div className="mx-auto max-w-[1440px] px-5 py-12 lg:px-16 lg:py-24">
          <div className="max-w-[62rem]">
            <p className={sectionLabel}>No. 3 &middot; Your people stay</p>
            <h2 id="weekend-title" className={cn(h2Class, "mt-1.5 lg:mt-3")}>
              Your wedding is a weekend, not a day.
            </h2>
            <p className={cn(bodyLarge, "mt-4 lg:mt-6")}>
              One way to plan it.
            </p>
          </div>
          <ol className="m-0 mt-8 grid list-none gap-8 p-0 lg:mt-14 lg:grid-cols-3 lg:gap-12">
            <li className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-x-4 lg:block">
              <h3 className="field-heading col-span-2 flex items-baseline gap-3 font-display text-[26px] leading-tight text-ink lg:text-[32px]">
                <span aria-hidden="true" className="font-display text-[22px] italic text-fern lg:text-[26px]">
                  I
                </span>
                The night before
              </h3>
              <Plate
                className="mt-3 lg:mt-4"
                frameClassName="aspect-[4/5] p-[5px] lg:p-2.5"
                captionClassName="text-[14px] leading-snug lg:text-[17px]"
                caption="Settling in at the Camp."
              >
                <Image
                  src="/images/properties/camp-1.jpg"
                  alt="Guests in Adirondack chairs beside the Airstream at the Camp, under tall trees"
                  fill
                  sizes="(min-width: 1024px) 28vw, 40vw"
                  className="object-cover object-[50%_62%]"
                />
              </Plate>
              <p className="mt-3 font-sans text-[15px] leading-[1.55] text-ink-body lg:text-[16px]">
                Your people arrive and settle into the Lodge, the Cottage and the Camp. A long dinner, a fire,
                and a first visit to the herd.
              </p>
            </li>
            <li className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-x-4 lg:block">
              <h3 className="field-heading col-span-2 flex items-baseline gap-3 font-display text-[26px] leading-tight text-ink lg:text-[32px]">
                <span aria-hidden="true" className="font-display text-[22px] italic text-fern lg:text-[26px]">
                  II
                </span>
                The wedding day
              </h3>
              <Plate
                className="mt-3 lg:mt-4"
                frameClassName="aspect-[4/5] p-[5px] lg:p-2.5"
                captionClassName="text-[14px] leading-snug lg:text-[17px]"
                caption="Getting ready in a cedar-walled room."
              >
                <Image
                  src="/images/weddings/getting-ready.jpg"
                  alt="An older woman fastens a bride's dress beside a window in a cedar-walled room"
                  fill
                  sizes="(min-width: 1024px) 28vw, 40vw"
                  className="object-cover object-[55%_38%]"
                />
              </Plate>
              <p className="mt-3 font-sans text-[15px] leading-[1.55] text-ink-body lg:text-[16px]">
                Getting ready together, vows in the forest, portraits with the coos, dinner under the trees and
                dancing after dark.
              </p>
            </li>
            <li className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-x-4 lg:block">
              <h3 className="field-heading col-span-2 flex items-baseline gap-3 font-display text-[26px] leading-tight text-ink lg:text-[32px]">
                <span aria-hidden="true" className="font-display text-[22px] italic text-fern lg:text-[26px]">
                  III
                </span>
                The morning after
              </h3>
              <Plate
                className="mt-3 lg:mt-4"
                frameClassName="aspect-[4/5] p-[5px] lg:p-2.5"
                captionClassName="text-[14px] leading-snug lg:text-[17px]"
                caption="A calf and two of the herd, by the barn."
              >
                <Image
                  src="/images/farm/cows.jpg"
                  alt="A Highland calf and two shaggy Highland cows stand on straw beside a wooden barn"
                  fill
                  sizes="(min-width: 1024px) 28vw, 40vw"
                  className="object-cover object-[50%_60%]"
                />
              </Plate>
              <div className="mt-3">
                <p className="font-sans text-[15px] leading-[1.55] text-ink-body lg:text-[16px]">
                  Breakfast with everyone still here and one more visit to the coos before the drive home.
                </p>
              </div>
              {/* Included with one- and two-night weddings (Jalene, 2026-10-07). No head count: a session holds six. */}
              <div className="col-span-2 mt-3">
                <p className="font-sans text-[15px] leading-[1.55] text-ink-body lg:text-[16px]">
                  Then a morning-after spa session, included with one- and two-night weddings: the wood-burning
                  sauna, the wet sauna and the cold plunge.
                </p>
                <FieldReview
                  spec={WEDDINGS_SPA_QUOTE}
                  role="Wedding"
                  className="mt-4"
                  quoteClassName="text-[19px] leading-[1.28] lg:text-[21px]"
                />
              </div>
            </li>
          </ol>

          {/* Where your people sleep: building drawings beside a defined list */}
          <div className="mt-12 border-t-[3px] border-double border-frame pt-8 lg:mt-16 lg:grid lg:grid-cols-12 lg:gap-x-16 lg:pt-10">
            <div className="lg:col-span-3">
              <h3 className="field-heading font-display text-[28px] leading-tight text-ink lg:text-[34px]">
                Where your people sleep
              </h3>
            </div>
            {/* Each row holds only dt and dd (a valid <dl>); the decorative drawing sits inside the dt. */}
            <dl className="m-0 mt-5 grid grid-cols-3 gap-x-3 lg:col-span-9 lg:mt-0 lg:gap-x-8">
              {SLEEP.map((s) => (
                <div key={s.name}>
                  <dt className="font-display text-[17px] font-semibold leading-tight text-ink lg:text-[24px]">
                    <FieldDrawing
                      name={s.drawing}
                      className="block w-full"
                      sizes="(min-width: 1024px) 22vw, 30vw"
                    />
                    <span className="mt-1 block">{s.name}</span>
                  </dt>
                  <dd className="m-0 mt-0.5 font-sans text-[13px] leading-snug text-ink-body lg:text-[15px]">
                    {s.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* PENDING C2: the whole block, heading included, until Connor confirms the 2027 list */}
          <PendingSlot
            className="mt-12 lg:mt-16"
            note="PENDING CONNOR C2: confirm the 2027 inclusions list. Hides the whole block (heading, lede and all eight rows)."
          >
            <div className="lg:grid lg:grid-cols-12 lg:gap-x-16">
              <div className="lg:col-span-3">
                <h3 className="field-heading font-display text-[28px] leading-tight text-ink lg:text-[34px]">
                  Already here when you arrive
                </h3>
                <p className="mt-2 font-sans text-[14px] leading-[1.55] text-ink-note lg:text-[15px]">
                  You bring your caterer, your photographer and your people.
                </p>
              </div>
              <div className="mt-4 lg:col-span-9 lg:mt-0">
                <dl className="m-0 mt-2 grid border-t border-rule lg:grid-cols-2 lg:gap-x-10">
                  {INCLUSIONS.map(([term, detail]) => (
                    <div key={term} className="flex min-h-[48px] items-baseline gap-3 border-b border-rule py-2">
                      <dt className="w-[128px] shrink-0 font-display text-[19px] font-semibold leading-tight text-ink lg:w-[130px] lg:text-[21px]">
                        {term}
                      </dt>
                      <dd className="m-0 font-sans text-[14px] leading-snug text-ink-body">{detail}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </PendingSlot>
        </div>
      </section>

      {/* No. 4 Connor */}
      <section aria-labelledby="connor-title" className="surface-paper border-t border-rule bg-paper text-ink">
        <div className="mx-auto max-w-[1440px] px-5 py-12 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-16 lg:px-16 lg:py-24">
          <Plate
            className="lg:col-span-4"
            frameClassName="mx-auto aspect-[4/5] w-[78%] p-[7px] lg:w-full lg:p-2.5"
            captionClassName="mx-auto w-[78%] lg:w-full"
            caption="Connor and one of the calves, on the forest path."
          >
            <Image
              src="/images/farm/farm-life.jpg"
              alt="Connor smiling on a forest path, leading a Highland calf on a rope"
              fill
              sizes="(min-width: 1024px) 30vw, 78vw"
              className="object-cover object-[45%_88%]"
            />
          </Plate>
          <div className="mt-7 lg:col-span-7 lg:col-start-6 lg:mt-0">
            <p className={sectionLabel}>No. 4 &middot; Connor</p>
            <h2 id="connor-title" className={cn(h2Class, "mt-1.5 lg:mt-3 lg:text-[52px]")}>
              Your first call is with Connor.
            </h2>
            <p className={cn(bodyLarge, "mt-4 lg:mt-6")}>
              Connor McWilliams owns the farm. He turned an overgrown forest property in Brightwood into
              Highland Farms. The call is free and runs 45 minutes, on Google Meet or in person at the farm, and covers
              your date, your people and how a weekend here works.
            </p>
            <PendingSlot
              className="mt-3"
              note="PENDING CONNOR C3: is he on the farm for every wedding? Hides one sentence."
            >
              <p className={bodyLarge}>He is on the farm for every wedding.</p>
            </PendingSlot>
            <div className="mt-6 border-t border-rule pt-6">
              <FieldReview
                spec={WEDDINGS_CONNOR_QUOTE}
                role="Wedding"
                quoteClassName="text-[20px] leading-[1.28] lg:text-[22px]"
              />
            </div>
            <WeddingCallLink
              content="weddings-connor"
              title="Weddings Connor block: wedding call"
              className="mt-5 inline-flex min-h-11 items-center gap-2 font-sans text-[15px] font-medium text-pine hover:text-pine-dark"
            >
              Book a free 45-minute call with Connor
              <FieldArrow size={16} />
            </WeddingCallLink>
          </div>
        </div>
      </section>

      {/* Real weddings (portfolio teaser) */}
      <section aria-labelledby="real-title" className="surface-paper border-t border-rule bg-paper text-ink">
        <div className="mx-auto max-w-[1440px] px-5 py-12 lg:px-16 lg:py-24">
          <div className="lg:flex lg:items-end lg:justify-between">
            <div>
              <p className="font-display text-[18px] italic text-fern lg:text-[22px]">Real weddings</p>
              <h2 id="real-title" className="field-heading mt-1 font-display text-[36px] leading-[1.02] text-ink lg:mt-2 lg:text-[52px]">
                Couples who married here
              </h2>
            </div>
            <Link
              href="/wedding-portfolio"
              className="mt-2 hidden min-h-11 items-center gap-2 border-b border-pine-line font-sans text-[15px] font-medium text-pine lg:inline-flex lg:min-h-0 lg:pb-0.5"
            >
              See every real wedding
              <FieldArrow size={16} />
            </Link>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-6 lg:mt-12 lg:grid-cols-3 lg:gap-x-8">
            {[
              {
                couple: teaser.olivia,
                src: "/images/weddings/olivia-connor/06.jpg",
                alt: "Olivia and Connor kiss on the flagstone after their ceremony",
                position: "50% 40%",
                lead: true,
                note: undefined as string | undefined,
              },
              {
                couple: teaser.maya,
                src: "/images/weddings/maya-justin/02.jpg",
                alt: "Maya and Justin's wedding invitation, topped with a painted Highland cow in a flower crown, among pearl shoes and a bolo tie",
                position: "50% 35%",
                lead: false,
                note: "a coo on the invitation",
              },
              {
                couple: teaser.sydney,
                src: "/images/weddings/sydney-casey/03.jpg",
                alt: "Sydney and Casey with their whole wedding party, arms raised, in front of a dark-timbered building",
                position: "52% 55%",
                lead: false,
                note: undefined as string | undefined,
              },
            ].map(({ couple, src, alt, position, lead, note }) => (
              <Link
                key={couple.slug}
                href={`/wedding-portfolio/${couple.slug}`}
                className={cn("group block", lead && "col-span-2 lg:col-span-1")}
              >
                <Plate
                  frameClassName={cn(
                    lead ? "aspect-[4/3] lg:aspect-[4/5]" : "aspect-[4/5]",
                    "p-[7px] lg:p-2.5",
                  )}
                >
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    sizes={lead ? "(min-width: 1024px) 30vw, calc(100vw - 40px)" : "(min-width: 1024px) 30vw, 46vw"}
                    className="object-cover"
                    style={{ objectPosition: position }}
                  />
                </Plate>
                <p className="mt-1">
                  <span
                    className={cn(
                      "flex items-center gap-1.5 font-display font-semibold leading-tight text-ink group-hover:text-pine lg:text-[26px]",
                      lead ? "text-[22px]" : "text-[20px]",
                    )}
                  >
                    {couple.names}
                    <FieldArrow size={15} strokeWidth={1.8} className="shrink-0 text-pine" />
                  </span>
                  <span className="mt-0.5 block font-sans text-[13px] text-ink-note">
                    {formatWeddingDate(couple.date!)}
                    {note && <> &middot; {note}</>}
                  </span>
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-7 border-t border-rule pt-3 lg:mt-8 lg:border-t-0 lg:pt-0">
            <Link
              href="/wedding-portfolio"
              className="inline-flex min-h-11 items-center gap-2 font-sans text-[15px] font-medium text-pine lg:hidden"
            >
              <span className="border-b border-pine-line pb-0.5">See every real wedding</span>
              <FieldArrow size={16} />
            </Link>
            <LookbookCard placement="weddings-couples" className="mt-2 lg:mt-0 lg:max-w-[460px]" />
          </div>
        </div>
      </section>

      {/* FAQ: the real anxieties; only the cost answer starts open (CONSISTENCY #10: at most one) */}
      <section aria-labelledby="faq-title" className="surface-paper border-t border-rule bg-paper text-ink">
        <div className="mx-auto max-w-[1440px] px-5 py-12 lg:grid lg:grid-cols-12 lg:gap-x-16 lg:px-16 lg:py-24">
          <div className="lg:col-span-4">
            <p className="font-display text-[18px] italic text-fern lg:text-[22px]">Before you ask</p>
            <h2 id="faq-title" className="field-heading mt-1 font-display text-[36px] leading-[1.02] text-ink lg:mt-2 lg:text-[52px]">
              What couples ask us first
            </h2>
          </div>
          <div className="mt-6 border-t border-rule lg:col-span-8 lg:mt-0">
            <FaqRow question={weddingFAQ[0].question} open>
              <p>{COST_ANSWER}</p>
            </FaqRow>
            <FaqRow question={weddingFAQ[1].question}>
              <p>{RAIN_LEAD}</p>
              <FieldReview
                spec={WEDDINGS_RAIN_QUOTE}
                role="Wedding"
                rule
                className="mt-4"
                quoteClassName="text-[20px] leading-[1.3]"
              />
              <p className="mt-4">{RAIN_CLOSE}</p>
            </FaqRow>
            <PendingSlot note="PENDING CONNOR C5: outside caterers and photographers? Hides the vendors row; the confirmed alcohol and insurance rules show in their own row.">
              <FaqRow question="Can we bring our own vendors?">
                <p>{VENDORS_PENDING}</p>
              </FaqRow>
            </PendingSlot>
            <FaqRow question={weddingFAQ[2].question}>
              <p>{ALCOHOL_INSURANCE_ANSWER}</p>
            </FaqRow>
            <FaqRow question={weddingFAQ[3].question}>
              <p>{RESTROOMS_ANSWER}</p>
              <PendingSlot
                className="mt-3"
                note="PENDING CONNOR C2: restroom trailer. Hides one sentence."
              >
                <p>For the wedding itself there is a three-stall restroom trailer.</p>
              </PendingSlot>
            </FaqRow>
            <FaqRow question={weddingFAQ[4].question}>
              <p>{GETTING_HERE_ANSWER}</p>
            </FaqRow>
          </div>
        </div>
      </section>

      {/* Check your date (#contact): the page owns the header, the Connor note and the plate; the built form sits at right */}
      <section
        id="contact"
        aria-labelledby="contact-title"
        className="surface-paper scroll-mt-[var(--header-h,96px)] border-t-[3px] border-double border-frame bg-paper-shade text-ink"
      >
        <div className="mx-auto max-w-[1440px] px-5 py-12 lg:grid lg:grid-cols-12 lg:gap-x-16 lg:px-16 lg:py-24">
          <div className="lg:col-span-5">
            <p className="font-display text-[18px] italic text-fern lg:text-[22px]">Now booking 2027</p>
            <h2 id="contact-title" className="field-heading mt-1 font-display text-[44px] leading-[1.0] text-ink lg:mt-2 lg:text-[68px]">
              Check your date
            </h2>
            <p className={cn(bodyLarge, "mt-3 lg:mt-6")}>{WEDDING_FORM_INTRO}</p>
            <p className="m-0 mt-3 font-sans text-[14px] font-medium leading-snug text-ink-body lg:text-[16px]">
              Every September 2026 Saturday sold out.
            </p>
            {/* Desktop: the proof for the call link (Connor himself is introduced at No. 4), then the table. */}
            <div className="mt-10 hidden border-t border-rule pt-8 lg:block">
              <FieldReview
                spec={WEDDINGS_CALL_QUOTE}
                role="Wedding"
                quoteClassName="text-[22px] leading-[1.3]"
              />
              <Plate
                className="mt-10"
                frameClassName="aspect-[4/3] lg:p-2.5"
                caption="A long table on the lawn, set for dinner."
              >
                <Image
                  src="/images/weddings/reception-aerial.jpg"
                  alt="From above: one long dinner table on a lawn ringed by ferns and evergreens, patio heaters at each end"
                  fill
                  sizes="40vw"
                  className="object-cover object-[50%_55%]"
                />
              </Plate>
            </div>
          </div>

          <div className="mt-7 lg:col-span-7 lg:mt-0">
            {/* The form draws its own framed card (forms board C). */}
            <ContactForm defaultEventType="wedding" heading="" subtitle="" placement="weddings" />
            {/* Phones: the fear of the call, answered right under the form's call link. */}
            <FieldReview
              spec={WEDDINGS_CALL_QUOTE}
              role="Wedding"
              className="mt-5 lg:hidden"
              quoteClassName="text-[20px] leading-[1.3]"
            />
          </div>
        </div>
      </section>

      <FieldStickyBar primary={{ label: "Check your date", sublabel: "Two-night weddings from $13,000", href: "#contact" }} hideWhenVisible="#contact" />
    </>
  );
}
