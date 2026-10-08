import type { Metadata } from "next";
import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { StructuredData } from "@/components/layout/StructuredData";
import { FieldReview, FieldReviewTier } from "@/components/field/Reviews";
import { FieldStickyBar } from "@/components/field/StickyBar";
import { WeddingCallLink } from "@/components/field/WeddingCallLink";
import {
  FieldArrow,
  FieldDrawing,
  PendingSlot,
  Plate,
  fieldCtaClass,
} from "@/components/ui/FieldGuide";
import { cn } from "@/lib/utils";
import { WEDDING_QUOTE } from "@/lib/review-quotes";
import {
  confirmedCouples,
  formatWeddingDate,
  isConfirmed,
  PLANNING_OFFER,
  weddingPortfolio,
  type WeddingCouple,
} from "@/data/wedding-portfolio";
import { CASEY_CARD_QUOTE, MAYA_CARD_QUOTE, PORTFOLIO_PLAN_QUOTE } from "./quotes";
import { LookbookCard } from "@/app/weddings/LookbookLink";
import { WEDDING_FORM_INTRO } from "@/components/home/home-data";

export const metadata: Metadata = {
  title: "Wedding Portfolio",
  description:
    "Browse real weddings at Highland Farms, Oregon. See how couples have celebrated their love in our forest and farm setting, about an hour from Portland.",
  alternates: { canonical: "/wedding-portfolio" },
  openGraph: {
    title: "Wedding Portfolio | Highland Farms Oregon",
    description:
      "Browse real weddings at Highland Farms, Oregon. See how couples have celebrated their love in our forest and farm setting.",
    images: [
      {
        url: "/images/weddings/couple.jpg",
        width: 1200,
        height: 630,
        alt: "The flagstone ceremony site, with rows of chairs facing the timber arch under tall trees",
      },
    ],
  },
};

const eyebrowClass = "font-display italic text-fern";
const dateClass = "font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-fern lg:text-[12px]";
const storyLinkClass = "font-sans text-[15px] font-medium text-pine";

/** Pending one-line couple quotes (PF-01): shown only in development until Connor confirms who wrote them. */
const CARD_QUOTES: Record<string, { id: string; spec: typeof MAYA_CARD_QUOTE }> = {
  "maya-justin": { id: "PF-01-maya", spec: MAYA_CARD_QUOTE },
  "sydney-casey": { id: "PF-01-casey", spec: CASEY_CARD_QUOTE },
};

function StoryLink({ couple, className }: { couple: WeddingCouple; className: string }) {
  return (
    <Link href={`/wedding-portfolio/${couple.slug}`} className={className}>
      <span className="border-b border-pine-line pb-0.5">Read {couple.names}&apos;s story</span>
      <FieldArrow size={16} />
    </Link>
  );
}

function JournalEntry({ couple, index }: { couple: WeddingCouple; index: number }) {
  const flip = index % 2 === 1; // text right, photos left, on desktop
  const quote = CARD_QUOTES[couple.slug];
  const [lead, a, b] = couple.journal;
  const href = `/wedding-portfolio/${couple.slug}`;
  const frame = "border border-frame bg-paper-light p-[6px] lg:p-2.5";
  const photo = (p: (typeof couple.journal)[number], aspect: string, sizes: string, priority = false) => (
    <div className={cn(frame, aspect)}>
      <div className="relative h-full w-full overflow-hidden">
        <Image
          src={p.src}
          alt={p.alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-cover", p.className)}
          style={{ objectPosition: p.position }}
        />
      </div>
    </div>
  );
  return (
    <li className={index === 0 ? "border-t-[3px] border-double border-frame" : "border-t border-rule"}>
      <article
        aria-labelledby={`entry-${couple.slug}`}
        className={cn(
          "mx-auto max-w-[1440px] px-5 lg:grid lg:grid-cols-12 lg:gap-x-16 lg:px-16",
          index === 0 ? "pb-9 pt-3 lg:py-16" : "py-9 lg:py-16",
        )}
      >
        <div className={cn("lg:col-span-4 lg:self-center", flip && "lg:order-2")}>
          {couple.date && <p className={dateClass}>{formatWeddingDate(couple.date)}</p>}
          <h2
            id={`entry-${couple.slug}`}
            className="field-heading mt-1 font-display text-[34px] leading-[1.02] text-ink lg:mt-2 lg:text-[48px]"
          >
            <Link href={href} className="hover:text-pine">
              {couple.names}
            </Link>
          </h2>
          {couple.photographer ? (
            <p className="mt-1 font-sans text-[13px] text-ink-note lg:text-[14px]">
              Photographed by {couple.photographer.name}
            </p>
          ) : (
            <PendingSlot note="PENDING CONNOR: photographer credit. No credit is embedded in these files. Hides the 'Photographed by' line.">
              <p className="font-sans text-[13px] text-ink-note">Photographed by [name from Connor]</p>
            </PendingSlot>
          )}
          <p
            className={cn(
              "mt-1.5 font-sans text-[15px] leading-[1.5] text-ink-body lg:mt-4 lg:text-[17px]",
              couple.photographer && "mt-2 leading-[1.55]",
            )}
          >
            {couple.story}
          </p>
          {quote && (
            <PendingSlot
              className="mt-4"
              note={`PENDING CONNOR PF-01: confirm this reviewer is the couple. Hides ${quote.id}, one quote.`}
            >
              <FieldReview spec={quote.spec} role="Wedding" quoteClassName="text-[19px] leading-[1.3] lg:text-[20px]" />
            </PendingSlot>
          )}
          <StoryLink couple={couple} className={cn(storyLinkClass, "mt-6 hidden min-h-11 items-center gap-2 lg:inline-flex lg:min-h-0")} />
        </div>
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden="true"
          className={cn(
            "mt-3 grid grid-cols-2 gap-3 lg:col-span-8 lg:mt-0 lg:gap-5",
            index !== 0 && "mt-4",
            flip ? "lg:order-1" : "lg:order-2",
          )}
        >
          <div className={cn("col-span-2", index === 0 && "max-lg:hidden")}>
            {/* The first couple's lead is the title page's plate on phones (header), so it shows here from lg only. */}
            {photo(
              lead,
              index === 0 ? "aspect-[2/1] lg:aspect-[3/2]" : "aspect-[16/9] lg:aspect-[3/2]",
              "(min-width: 1024px) 60vw, calc(100vw - 40px)",
              index === 0,
            )}
          </div>
          {photo(a, "aspect-[4/5] lg:aspect-[3/2]", "(min-width: 1024px) 30vw, 46vw")}
          {photo(b, "aspect-[4/5] lg:aspect-[3/2]", "(min-width: 1024px) 30vw, 46vw")}
        </Link>
        <StoryLink couple={couple} className={cn(storyLinkClass, "mt-3 inline-flex min-h-11 items-center gap-2 lg:hidden")} />
      </article>
    </li>
  );
}

export default function WeddingPortfolioPage() {
  const opening = confirmedCouples[0];
  // The opening plate is the couple's own lead frame; its caption and alt come from the couple's page data.
  const openingFrame = opening?.plates.find((p) => p.src === opening.journal[0].src);
  const openingCaption = openingFrame?.caption;
  const openingAlt = opening?.images.find((p) => p.src === opening.journal[0].src)?.alt ?? "";
  const styled = weddingPortfolio.filter((c) => !isConfirmed(c));
  return (
    <>
      <StructuredData pathname="/wedding-portfolio" />
      <div className="surface-paper bg-paper font-sans text-ink">
        {/* Title (board B8, journal B): on phones a centred title page, the drawn coo, the count as the eyebrow,
            the H1 and the whole Riley & Jordan plate; the sticky bar (two-night line) is the one button and the one price.
            Stars and the Olivia Brown quote land after the first couple. Desktop keeps the two-column title. */}
        <header className="mx-auto max-w-[1440px] px-5 pb-4 pt-[calc(var(--header-h,104px)+0.75rem)] max-lg:text-center lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-16 lg:px-16 lg:pb-12 lg:pt-[calc(var(--header-h,128px)+3.5rem)]">
          <div className="lg:col-span-7">
            <FieldDrawing
              name="highland-cow-head"
              eager
              className="mx-auto h-9 w-9 min-[380px]:h-[46px] min-[380px]:w-[46px] lg:hidden"
              sizes="46px"
            />
            <p className={cn(eyebrowClass, "mt-1 text-[16px] min-[380px]:text-[17px] lg:hidden")}>Four of our 2025 couples</p>
            <p className={cn(eyebrowClass, "hidden text-[22px] lg:block")}>A journal of real weddings</p>
            <h1 className="field-heading mt-0.5 font-display text-[32px] leading-[1.0] text-ink max-[380px]:text-[29px] lg:mt-2 lg:text-[68px]">
              Married at Highland Farms
            </h1>
            <p className="mt-5 hidden max-w-[36rem] font-sans text-[18px] leading-[1.5] text-ink-body lg:block">
              Four of our 2025 couples, in photographs from their own wedding days.
            </p>
            <FieldReviewTier tier="hero" className="mt-4 hidden text-[15px] lg:flex" starSize={13} />
          </div>
          {opening && (
            <Link href={`/wedding-portfolio/${opening.slug}`} className="mt-3 block lg:hidden">
              <Plate
                frameClassName="aspect-[3/2] min-[380px]:aspect-[4/3] p-[6px]"
                caption={openingCaption}
                captionClassName="text-[14px] min-[380px]:text-[15px]"
              >
                <Image
                  src={opening.journal[0].src}
                  alt={openingAlt}
                  fill
                  priority
                  sizes="calc(100vw - 54px)"
                  className="object-cover"
                  style={{ objectPosition: "50% 75%" }}
                />
              </Plate>
            </Link>
          )}
          <FieldReview
            spec={WEDDING_QUOTE}
            fullName
            role="Wedding"
            className="hidden lg:col-span-5 lg:block lg:border-l lg:border-rule lg:pl-10"
            quoteClassName="lg:text-[30px] lg:leading-[1.2]"
            metaClassName="lg:mt-2 lg:tracking-[0.08em]"
          />
        </header>

        {/* Entries: one template, newest first after the opening couple */}
        <ol className="m-0 list-none p-0">
          {confirmedCouples.map((couple, i) => (
            <Fragment key={couple.slug}>
              <JournalEntry couple={couple} index={i} />
              {i === 0 && (
                <li aria-label="What guests say" className="border-t border-rule px-5 py-6 lg:hidden">
                  <FieldReviewTier tier="hero" className="justify-center text-[13px]" starSize={13} />
                  <FieldReview
                    spec={WEDDING_QUOTE}
                    fullName
                    role="Wedding"
                    className="mt-3"
                    quoteClassName="text-[19px] leading-[1.25]"
                    metaClassName="mt-1 tracking-[0.06em]"
                  />
                </li>
              )}
              {i === 1 && (
                <li aria-label="The 2027 look book" className="border-t border-rule px-5 py-4 lg:px-16">
                  <LookbookCard placement="portfolio-couples" className="mx-auto max-w-[460px] lg:mx-0" />
                </li>
              )}
            </Fragment>
          ))}
        </ol>

        {/* The one ask, right after the four real couples (above the styled sets) */}
        <section id="plan" aria-labelledby="close-title" className="border-t border-rule">
          <div className="mx-auto max-w-[1440px] px-5 py-12 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-16 lg:px-16 lg:py-20">
            <div className="lg:col-span-7">
              <h2 id="close-title" className="field-heading font-display text-[36px] leading-[1.02] text-ink lg:text-[56px]">
                Planning yours?
              </h2>
              <p className="mt-3 max-w-[34rem] font-sans text-[16px] leading-[1.6] text-ink-body lg:text-[18px]">
                {PLANNING_OFFER} {WEDDING_FORM_INTRO}
              </p>
            </div>
            <div className="mt-6 lg:col-span-5 lg:mt-0">
              {/* A couple's own words directly above the button (a 2026 wedding, not one of the four above). */}
              <FieldReview
                spec={PORTFOLIO_PLAN_QUOTE}
                role="Wedding"
                className="mb-5"
                quoteClassName="text-[20px] leading-[1.3] lg:text-[22px]"
              />
              <Link href="/weddings#contact" className={cn(fieldCtaClass, "w-full lg:w-auto")}>
                Check your date
                <FieldArrow />
              </Link>
              <WeddingCallLink
                content="portfolio-plan"
                title="Portfolio: wedding call"
                className="mt-1 flex min-h-11 items-center justify-center font-sans text-[14px] font-medium text-pine lg:justify-start"
              >
                Or book a free 45-minute call with Connor
              </WeddingCallLink>
            </div>
          </div>
        </section>

        {/* Photographed at the farm: the sets not confirmed as real weddings. Wording is true either way. */}
        <section
          aria-labelledby="more-title"
          className="border-t-[3px] border-double border-frame bg-paper-shade"
        >
          <div className="mx-auto max-w-[1440px] px-5 py-10 lg:px-16 lg:py-16">
            <div className="max-w-[40rem]">
              <p className={cn(eyebrowClass, "text-[18px] lg:text-[22px]")}>Also photographed here</p>
              <h2 id="more-title" className="field-heading mt-1 font-display text-[30px] leading-[1.04] text-ink lg:mt-2 lg:text-[44px]">
                Made at the farm
              </h2>
              <p className="mt-3 font-sans text-[15px] leading-[1.6] text-ink-body lg:text-[17px]">
                Two more sets made at the farm, credited to the photographers who took them.
              </p>
            </div>
            <div className="mt-6 grid gap-6 lg:mt-10 lg:grid-cols-2 lg:gap-12">
              {styled.map((set) => {
                const cover = set.journal[0];
                return (
                  <Link key={set.slug} href={`/wedding-portfolio/${set.slug}`} className="group flex gap-3 min-[380px]:gap-4 lg:gap-6">
                    <div className="aspect-[4/5] w-[38%] shrink-0 border border-frame bg-paper-light p-[6px] min-[380px]:w-[42%] lg:w-[46%] lg:p-2.5">
                      <div className="relative h-full w-full overflow-hidden">
                        <Image
                          src={cover.src}
                          alt={cover.alt}
                          fill
                          sizes="(min-width: 1024px) 22vw, 40vw"
                          className="object-cover"
                          style={{ objectPosition: cover.position }}
                        />
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <h3 className="field-heading font-display text-[22px] leading-tight text-ink [overflow-wrap:anywhere] group-hover:text-pine min-[380px]:text-[24px] lg:text-[32px]">
                        By {set.photographer?.name}
                      </h3>
                      <p className="mt-2 font-sans text-[14px] leading-[1.55] text-ink-body lg:text-[16px]">
                        {set.story}
                      </p>
                      <span className="mt-2 inline-flex min-h-11 items-center font-sans text-[15px] font-medium text-pine lg:mt-4 lg:min-h-0">
                        <span className="border-b border-pine-line pb-0.5">See the photographs</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
            <PendingSlot
              className="mt-6"
              note="PENDING CONNOR C5: is Jen & Ryan a real wedding or a styled shoot? If real, it moves into the journal above with its true names and date. Hannah & Max is a marketing shoot (AJ, 2026-10-07). Note never ships."
            />
          </div>
        </section>

      </div>

      {/* No first-screen button on this page, so the bar shows from load. */}
      <FieldStickyBar primary={{ label: "Check your date", sublabel: "Two-night weddings from $13,000", href: "/weddings#contact" }} hideWhenVisible="#plan" showOnLoad />
    </>
  );
}
