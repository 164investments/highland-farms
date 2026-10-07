import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { StructuredData } from "@/components/layout/StructuredData";
import { FieldReview, FieldReviewTier } from "@/components/field/Reviews";
import { FieldStickyBar } from "@/components/field/StickyBar";
import { WeddingCallLink } from "@/components/field/WeddingCallLink";
import {
  FieldArrow,
  PendingSlot,
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
import { CASEY_CARD_QUOTE, MAYA_CARD_QUOTE, PORTFOLIO_KATE_QUOTE, PORTFOLIO_PLAN_QUOTE } from "./quotes";
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
  "olivia-connor": { id: "PF-01-olivia", spec: WEDDING_QUOTE },
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
          <div className="col-span-2">
            {/* The first couple's lead is 2:1 on phones so the herd stays above the 660 fold and the sticky bar. */}
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
  const styled = weddingPortfolio.filter((c) => !isConfirmed(c));
  return (
    <>
      <StructuredData pathname="/wedding-portfolio" />
      <div className="surface-paper bg-paper font-sans text-ink">
        {/* Title: promise, count and the compact review tier, then straight into the first couple's photo */}
        <header className="mx-auto max-w-[1440px] px-5 pb-4 pt-[calc(var(--header-h,104px)+0.75rem)] lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-16 lg:px-16 lg:pb-12 lg:pt-[calc(var(--header-h,128px)+3.5rem)]">
          <div className="lg:col-span-7">
            <p className={cn(eyebrowClass, "text-[17px] lg:text-[22px]")}>A journal of real weddings</p>
            <h1 className="field-heading mt-0.5 font-display text-[32px] leading-[1.0] text-ink max-[380px]:text-[29px] lg:mt-2 lg:text-[68px]">
              Married at Highland Farms
            </h1>
            <p className="mt-2 max-w-[36rem] font-sans text-[15px] leading-[1.5] text-ink-body lg:mt-5 lg:text-[18px]">
              Four of our 2025 couples, in photographs from their own wedding days.
            </p>
            <FieldReviewTier tier="hero" className="mt-2 text-[13px] lg:mt-4 lg:text-[15px]" starSize={13} />
          </div>
          {/* The phone's proof line (r4): one short sentence from the photographer of Maya & Justin. */}
          <FieldReview
            spec={PORTFOLIO_KATE_QUOTE}
            fullName
            role="Wedding"
            className="mt-2 lg:col-span-5 lg:mt-0 lg:border-l lg:border-rule lg:pl-10"
            quoteClassName="text-[19px] leading-[1.25] lg:text-[30px] lg:leading-[1.2]"
            metaClassName="mt-1 tracking-[0.06em] lg:mt-2 lg:tracking-[0.08em]"
          />
        </header>

        {/* Entries: one template, newest first after the opening couple */}
        <ol className="m-0 list-none p-0">
          {confirmedCouples.map((couple, i) => (
            <JournalEntry key={couple.slug} couple={couple} index={i} />
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
              <FieldReviewTier
                tier="nearCta"
                className="mt-2 justify-center text-[13px] lg:justify-start"
                starSize={13}
              />
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
      <FieldStickyBar primary={{ label: "Check your date", href: "/weddings#contact" }} hideWhenVisible="#plan" showOnLoad />
    </>
  );
}
