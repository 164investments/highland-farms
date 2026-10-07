import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "@/components/forms/ContactForm";
import { StructuredData } from "@/components/layout/StructuredData";
import { FieldReview, GOOGLE_REVIEW_LINK, FieldReviewTier } from "@/components/field/Reviews";
import { JsonLd, faqPageJsonLd } from "@/components/field/Faq";
import { FieldStickyBar } from "@/components/field/StickyBar";
import {
  FieldArrow,
  FieldDrawing,
  PendingSlot,
  Plate,
  fieldLabelClass,
  FieldStars,
} from "@/components/ui/FieldGuide";
import { REVIEWS } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import { formatWeddingDate, weddingPortfolio } from "@/data/wedding-portfolio";
import { WeddingsHero } from "./WeddingsHero";
import {
  COST_ANSWER,
  GETTING_HERE_ANSWER,
  RAIN_CLOSE,
  RAIN_LEAD,
  RESTROOMS_ANSWER,
  VENDORS_ANSWER,
  weddingFAQ,
} from "./faq";
import {
  WEDDINGS_CALL_QUOTE,
  WEDDINGS_CONNOR_QUOTE,
  WEDDINGS_COOS_QUOTE,
  WEDDINGS_FOREST_QUOTE,
  WEDDINGS_RAIN_QUOTE,
  WEDDINGS_SPA_QUOTE,
} from "./quotes";

export const metadata: Metadata = {
  title: { absolute: "Mt. Hood Forest Wedding Venue with Highland Cows | Highland Farms" },
  description:
    "Whimsical forest weddings with Scottish Highland cows as honorary guests, about an hour from Portland at the base of Mt. Hood. See real weddings and check your date.",
  alternates: { canonical: "/weddings" },
  openGraph: {
    title: "Mt. Hood Forest Wedding Venue with Highland Cows | Highland Farms",
    description:
      "Whimsical forest weddings with Scottish Highland cows as honorary guests, about an hour from Portland at the base of Mt. Hood. See real weddings and check your date.",
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

/** Reviews that name Connor (also spelled Conner or Conor), read from the snapshot. */
const CONNOR_REVIEW_COUNT = REVIEWS.filter((r) => /conner|connor|conor/i.test(r.text)).length;

const sectionLabel = fieldLabelClass;
const h2Class = "field-heading font-display text-[36px] leading-[1.02] text-ink lg:text-[56px]";
const bodyLarge = "font-sans text-[16px] leading-[1.6] text-ink-body lg:text-[18px]";
const inlineLinkClass =
  "inline-flex min-h-11 items-center font-medium text-pine underline decoration-pine-line underline-offset-4";

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

      {/* No. 1 The coos (Connor's first reason, and the ad's hook) */}
      <section aria-labelledby="coos-title" className="surface-paper border-t border-rule bg-paper text-ink">
        <div className="mx-auto max-w-[1440px] px-5 py-12 lg:grid lg:grid-cols-12 lg:gap-x-16 lg:px-16 lg:py-24">
          <div className="lg:col-span-5 lg:self-center">
            <p className={sectionLabel}>No. 1 &middot; The coos</p>
            <h2 id="coos-title" className={cn(h2Class, "mt-1.5 lg:mt-3")}>
              The guest list includes cows.
            </h2>
            <p className={cn(bodyLarge, "mt-4 max-w-[34rem] lg:mt-6")}>
              Our Scottish Highland coos are your honorary wedding guests. They stand for portraits at the
              pasture fence, and your guests get to meet them too.
            </p>
            <div className="mt-8 hidden border-t border-rule pt-6 lg:block">
              <p className="font-sans text-[12px] uppercase tracking-[0.1em] text-ink-meta">
                A parent of the bride, on Connor and the herd
              </p>
              <FieldReview
                spec={WEDDINGS_COOS_QUOTE}
                role="Wedding"
                className="mt-2"
                quoteClassName="text-[24px] leading-[1.28]"
              />
            </div>
          </div>
          <div className="mt-7 lg:col-span-7 lg:mt-0">
            <Plate
              frameClassName="aspect-[4/3] p-[7px] lg:aspect-[3/2] lg:p-2.5"
              caption="Riley & Jordan with two of the herd, June 2025."
            >
              <Image
                src="/images/weddings/riley-jordan/04.jpg"
                alt="Riley and Jordan at the pasture fence between a black Highland cow and a white Highland cow"
                fill
                sizes="(min-width: 1024px) 58vw, calc(100vw - 40px)"
                className="object-cover object-[52%_60%]"
              />
            </Plate>
          </div>
          <div className="mt-8 border-t border-rule pt-5 lg:hidden">
            <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-ink-meta">
              A parent of the bride, on Connor and the herd
            </p>
            <FieldReview
              spec={WEDDINGS_COOS_QUOTE}
              role="Wedding"
              className="mt-2"
              quoteClassName="text-[21px] leading-[1.28]"
            />
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
                Five private acres of tall evergreens, sword ferns and moss in Brightwood, Oregon. You marry on
                a flagstone patio under a timber arch, beside the pond, and dinner is set at long tables on the
                lawn among the trees.
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
              <Plate
                className="hidden lg:flex"
                frameClassName="aspect-[5/4] lg:p-2.5"
                captionClassName="lg:text-[17px]"
                caption="Maya & Justin, September 2025."
              >
                <Image
                  src="/images/weddings/maya-justin/01.jpg"
                  alt="Maya and Justin, small among tall mossy trees and ferns, her veil lifting"
                  fill
                  sizes="30vw"
                  className="object-cover object-[40%_62%]"
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
              Make a weekend of it, with your closest people staying on the farm.
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
                caption="The trail to the Nordic spa."
              >
                <Image
                  src="/images/spa/spa-5.jpg"
                  alt="A small group walks a forest trail toward the black spa cabin"
                  fill
                  sizes="(min-width: 1024px) 28vw, 40vw"
                  className="object-cover object-[62%_50%]"
                />
              </Plate>
              <div className="mt-3">
                <p className="font-sans text-[15px] leading-[1.55] text-ink-body lg:text-[16px]">
                  Breakfast with everyone still here and one more visit to the coos before the drive home.
                </p>
              </div>
              <PendingSlot
                className="col-span-2 mt-3"
                note="PENDING CONNOR (morning-after-sauna): is the sauna included or a paid add-on? Hides the sauna sentence and Amy D.'s spa quote. If an add-on, ship 'Book the sauna for your people the morning after.' with no price."
              >
                <p className="font-sans text-[15px] leading-[1.55] text-ink-body lg:text-[16px]">
                  Then the morning-after sauna for your people: the wood-burning sauna and the cold plunge.
                </p>
                <FieldReview
                  spec={WEDDINGS_SPA_QUOTE}
                  role="Wedding"
                  className="mt-4"
                  quoteClassName="text-[19px] leading-[1.28] lg:text-[21px]"
                />
              </PendingSlot>
            </li>
          </ol>

          {/* Where your people sleep: building drawings beside a defined list */}
          <div className="mt-12 border-t-[3px] border-double border-frame pt-8 lg:mt-16 lg:grid lg:grid-cols-12 lg:gap-x-16 lg:pt-10">
            <div className="lg:col-span-3">
              <h3 className="field-heading font-display text-[28px] leading-tight text-ink lg:text-[34px]">
                Where your people sleep
              </h3>
              <a
                href="/lookbook.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-11 items-center gap-2 font-sans text-[15px] font-medium text-pine lg:mt-4"
              >
                <span className="border-b border-pine-line pb-0.5">See the 2027 look book (PDF)</span>
                <FieldArrow size={16} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
            <dl className="m-0 mt-5 grid grid-cols-3 gap-x-3 lg:col-span-9 lg:mt-0 lg:gap-x-8">
              {SLEEP.map((s) => (
                <div key={s.name} className="flex flex-col items-start">
                  <FieldDrawing
                    name={s.drawing}
                    className="w-full"
                    sizes="(min-width: 1024px) 22vw, 30vw"
                  />
                  <div className="mt-1">
                    <dt className="font-display text-[17px] font-semibold leading-tight text-ink lg:text-[24px]">
                      {s.name}
                    </dt>
                    <dd className="m-0 mt-0.5 font-sans text-[13px] leading-snug text-ink-body lg:text-[15px]">
                      {s.detail}
                    </dd>
                  </div>
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

      {/* No. 4 Connor (the call is offered twice on this page: hero and form) */}
      <section aria-labelledby="connor-title" className="surface-paper border-t border-rule bg-paper text-ink">
        <div className="mx-auto max-w-[1440px] px-5 py-12 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-16 lg:px-16 lg:py-24">
          <Plate
            className="lg:col-span-4"
            frameClassName="mx-auto aspect-[4/5] w-[78%] p-[7px] lg:w-full lg:p-2.5"
            captionClassName="mx-auto w-[78%] lg:w-full"
            caption="Connor, with one of the calves."
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
              Connor McWilliams owns the farm. He grew up on a ranch in Salinas, California, worked as a
              general contractor, and turned an overgrown forest property in Brightwood into Highland Farms.
              The call is free and runs 45 minutes: your date, your people and how a weekend here works.
            </p>
            <PendingSlot
              className="mt-3"
              note="PENDING CONNOR C3: is he on the farm for every wedding? Hides one sentence."
            >
              <p className={bodyLarge}>He is on the farm for every wedding.</p>
            </PendingSlot>
            <p className="mt-4 flex items-center gap-2.5 font-sans text-[14px] text-ink-note lg:text-[15px]">
              <FieldStars size={14} />
              <span>Guests name Connor in {CONNOR_REVIEW_COUNT} Google reviews.</span>
            </p>
            <div className="mt-6 border-t border-rule pt-6">
              <FieldReview
                spec={WEDDINGS_CONNOR_QUOTE}
                role="Wedding"
                quoteClassName="text-[20px] leading-[1.28] lg:text-[22px]"
              />
            </div>
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
              See the real weddings
              <FieldArrow size={16} />
            </Link>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-6 lg:mt-12 lg:grid-cols-3 lg:gap-x-8">
            <Link href="/wedding-portfolio/maya-justin" className="group col-span-2 block lg:col-span-1">
              <Plate frameClassName="aspect-[4/3] p-[7px] lg:aspect-[4/5] lg:p-2.5">
                <Image
                  src="/images/weddings/maya-justin/02.jpg"
                  alt="Maya and Justin's wedding invitation, topped with a painted Highland cow in a flower crown, among pearl shoes and a bolo tie"
                  fill
                  sizes="(min-width: 1024px) 30vw, calc(100vw - 40px)"
                  className="object-cover object-[50%_35%]"
                />
              </Plate>
              <p className="mt-1">
                <span className="block font-display text-[22px] font-semibold leading-tight text-ink group-hover:text-pine lg:text-[26px]">
                  Maya &amp; Justin
                </span>
                <span className="mt-0.5 block font-sans text-[13px] text-ink-note">
                  {formatWeddingDate(teaser.maya.date!)} &middot; a coo on the invitation
                </span>
              </p>
            </Link>
            {[
              {
                couple: teaser.olivia,
                src: "/images/weddings/olivia-connor/06.jpg",
                alt: "Olivia and Connor kiss on the flagstone after their ceremony",
                position: "50% 40%",
              },
              {
                couple: teaser.sydney,
                src: "/images/weddings/sydney-casey/03.jpg",
                alt: "Sydney and Casey with their whole wedding party, arms raised, in front of a dark-timbered building",
                position: "52% 55%",
              },
            ].map(({ couple, src, alt, position }) => (
              <Link key={couple.slug} href={`/wedding-portfolio/${couple.slug}`} className="group block">
                <Plate frameClassName="aspect-[4/5] p-[7px] lg:p-2.5">
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    sizes="(min-width: 1024px) 30vw, 46vw"
                    className="object-cover"
                    style={{ objectPosition: position }}
                  />
                </Plate>
                <p className="mt-1">
                  <span className="block font-display text-[20px] font-semibold leading-tight text-ink group-hover:text-pine lg:text-[26px]">
                    {couple.names}
                  </span>
                  <span className="mt-0.5 block font-sans text-[13px] text-ink-note">
                    {formatWeddingDate(couple.date!)}
                  </span>
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-7 flex flex-col gap-1 border-t border-rule pt-5 lg:mt-12 lg:flex-row lg:items-center lg:justify-between lg:pt-8">
            <Link
              href="/wedding-portfolio"
              className="inline-flex min-h-11 items-center gap-2 font-sans text-[15px] font-medium text-pine lg:hidden"
            >
              <span className="border-b border-pine-line pb-0.5">See the real weddings</span>
              <FieldArrow size={16} />
            </Link>
            <div className="flex flex-wrap items-center gap-x-2.5">
              <FieldReviewTier tier="compact" className="text-[14px] lg:text-[15px]" starSize={13} />
              <a
                href={GOOGLE_REVIEW_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center font-sans text-[14px] font-medium text-pine underline decoration-pine-line underline-offset-4 lg:min-h-0 lg:text-[15px]"
              >
                Read them<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ: the real anxieties; rain and cost start open */}
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
            <FaqRow question={weddingFAQ[1].question} open>
              <p>{COST_ANSWER}</p>
              <p className="mt-2 flex flex-wrap gap-x-6">
                <a href="#contact" className={inlineLinkClass}>
                  Check your date
                </a>
                <a href="/lookbook.pdf" target="_blank" rel="noopener noreferrer" className={inlineLinkClass}>
                  See the 2027 look book<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
            </FaqRow>
            <FaqRow question={weddingFAQ[2].question}>
              <p>{VENDORS_ANSWER}</p>
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
            <p className={cn(bodyLarge, "mt-3 lg:mt-6")}>
              Tell us your month and guest count, and we&apos;ll check the farm calendar for you. No commitment.
            </p>
            <div className="mt-10 hidden border-t border-rule pt-8 lg:block">
              <div className="flex items-start gap-5">
                <Image
                  src="/images/team/connor-mcwilliams.jpg"
                  alt="Connor McWilliams"
                  width={192}
                  height={192}
                  sizes="96px"
                  className="h-24 w-24 shrink-0 border border-frame bg-paper-light object-cover p-[5px]"
                />
                <div>
                  <p className="font-display text-[24px] font-semibold leading-tight text-ink">Rather talk first?</p>
                  <p className="mt-1.5 font-sans text-[15px] leading-[1.55] text-ink-body">
                    The call under the button is with Connor himself: 45 minutes, free, on video or walking the
                    farm.
                  </p>
                </div>
              </div>
              <FieldReview
                spec={WEDDINGS_CALL_QUOTE}
                role="Wedding"
                className="mt-6"
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
            <div className="lg:border lg:border-frame lg:bg-paper lg:p-10">
              <ContactForm defaultEventType="wedding" heading="" subtitle="" placement="weddings" />
            </div>
            {/* phones only: Connor's face and the fear of the call, answered where the call is offered */}
            <div className="mt-6 flex items-center gap-3 lg:hidden">
              <Image
                src="/images/team/connor-mcwilliams.jpg"
                alt="Connor McWilliams"
                width={192}
                height={192}
                sizes="48px"
                className="h-12 w-12 shrink-0 border border-frame bg-paper-light object-cover p-[3px]"
              />
              <p className="font-sans text-[14px] leading-[1.45] text-ink-body">
                With Connor himself, on video or walking the farm.
              </p>
            </div>
            <FieldReview
              spec={WEDDINGS_CALL_QUOTE}
              role="Wedding"
              className="mt-5 lg:hidden"
              quoteClassName="text-[20px] leading-[1.3]"
            />
          </div>
        </div>
      </section>

      <FieldStickyBar primary={{ label: "Check your date", href: "#contact" }} hideWhenVisible="#contact" />
    </>
  );
}
