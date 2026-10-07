import type { Metadata } from "next";
import Link from "next/link";
import { properties } from "@/data/properties";
import { BOOKING_LINKS, bookingUrl } from "@/lib/constants";
import { StructuredData } from "@/components/layout/StructuredData";
import {
  FieldArrow,
  FieldRows,
  FieldSectionHeader,
  Plate,
  fieldCtaClass,
  fieldEyebrowClass,
  fieldLabelClass,
  fieldTextLinkClass,
} from "@/components/ui/FieldGuide";
import { FieldReview, FieldReviewTier } from "@/components/field/Reviews";
import { FieldPriceRow } from "@/components/field/PriceRows";
import { FieldStickyBar } from "@/components/field/StickyBar";
import { BookingModalRoot, BookingTextLink } from "@/components/shared/BookingButton";
import { StayKnowRows, StayLaterStayLine } from "@/components/stay/StayLines";
import { StayDrawing, StayPhoto } from "@/components/stay/StayParts";
import {
  STAY_CONTENT,
  STAY_HERO_QUOTE,
  capitalize,
  numberWord,
} from "@/components/stay/stay-content";
import {
  SPA_PER_PERSON,
  SPA_PRIVATE_SESSION,
  STAY_DIRECT_LINE,
  THANKSGIVING_DATES,
  THANKSGIVING_NIGHTS,
  TOUR_EACH_ADDITIONAL,
  TOUR_FOR_TWO,
  thanksgivingPackage,
} from "@/components/stay/stay-facts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "Farm Stay near Mt. Hood, Oregon | Highland Farms" },
  description:
    "Stay on a working Highland cow farm in Brightwood. William Wallace Lodge, Bonnie Lass Cottage, or the whole farm. About an hour from Portland, near Mt. Hood.",
  alternates: { canonical: "/stay" },
  openGraph: {
    title: "Farm Stay near Mt. Hood, Oregon | Highland Farms",
    description:
      "Stay on a working Highland cow farm in Brightwood. William Wallace Lodge, Bonnie Lass Cottage, or the whole farm. About an hour from Portland, near Mt. Hood.",
    url: "https://highlandfarmsoregon.com/stay",
    type: "website",
    images: [
      {
        url: "/images/properties/whole-farm.jpg",
        width: 1200,
        height: 630,
        alt: "Highland Farms accommodations in Brightwood, Oregon",
      },
    ],
  },
};

const HERO_PHOTO = {
  src: "/images/properties/lodge.jpg", // Bonnie Lass Cottage (legacy filename)
  alt: "Guests relaxing on the patio of Bonnie Lass Cottage, a cedar cabin with a barn-style roof among tall firs",
  position: "50% 62%",
};

const LODGE_PKG = thanksgivingPackage("lodge");
const FARM_PKG = thanksgivingPackage("whole-farm");

/** Stay pages in data order, each with its page content. */
const stays = properties.map((p, i) => ({ property: p, content: STAY_CONTENT[p.slug], no: i + 1 }));
const bySlug = (slug: string) => stays.find((s) => s.property.slug === slug)!;

const SECTION_LABEL_CLASS = cn(fieldLabelClass, "font-medium");

export default function StayPage() {
  const lodge = bySlug("lodge");
  const cottage = bySlug("cottage");
  const camp = bySlug("camp");
  const farm = bySlug("whole-farm");

  return (
    <div className="surface-paper bg-paper pt-[var(--header-h,104px)] font-sans text-ink">
      <StructuredData pathname="/stay" />

      {/* 1. Hero. Phone: promise, photo, proof, then the headcount picker. Desktop: copy, one CTA to the comparison, photo. */}
      <section className="px-5 pt-5 pb-9 lg:px-16 lg:pt-14 lg:pb-20">
        <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-16">
          <div className="lg:col-start-1 lg:row-start-1">
            {/* Phones: the drive, which the desktop intro sentence carries (CONSISTENCY #7, once per screen). */}
            <p className={cn("m-0 text-[17px] lg:text-[22px]", fieldEyebrowClass)}>
              <span className="lg:hidden">Farm stays, about an hour from Portland</span>
              <span className="hidden lg:inline">Farm stays in Brightwood, Oregon</span>
            </p>
            <h1 className="field-heading m-0 mt-1 font-display text-[35px] leading-[1.02] text-ink lg:mt-3 lg:text-[62px]">
              Stay the night on a Highland cow farm.
            </h1>
            <p className="m-0 mt-5 hidden font-sans text-[18px] leading-[1.6] text-ink-body lg:block lg:max-w-[500px]">
              Four ways to stay on five forested acres, about an hour from Portland: a cedar lodge for {lodge.property.guests}, a
              cottage by the cows for {cottage.property.guests}, an Airstream camp for {camp.property.guests}, or the whole farm for{" "}
              {farm.property.guests}.
            </p>
            <FieldReviewTier tier="hero" link className="mt-1 hidden lg:flex" />
            <a
              href="#compare"
              data-hero-cta
              className={cn(fieldCtaClass, "mt-6 hidden lg:inline-flex")}
            >
              Check dates and price
              <FieldArrow />
            </a>
          </div>

          <div className="mt-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0">
            <Plate
              caption="Bonnie Lass Cottage, beside the cow pasture."
              frameClassName="h-[148px] min-[380px]:h-[184px] lg:h-[600px]"
            >
              <StayPhoto photo={HERO_PHOTO} sizes="(min-width: 1024px) 58vw, 100vw" priority />
            </Plate>
          </div>

          <div className="lg:col-start-1 lg:row-start-2 lg:mt-8 lg:self-start">
            <FieldReviewTier tier="hero" link className="lg:hidden" />
            <nav id="pick" aria-label="Choose a stay by group size" data-hero-cta className="scroll-mt-[var(--header-h,104px)] lg:hidden">
              <p className={cn("m-0 mt-1", SECTION_LABEL_CLASS)}>How many are coming?</p>
              <div className="mt-2 flex flex-col border-t border-ink/70">
                {stays.map(({ property: p, content: c }) => (
                  <a
                    key={p.slug}
                    href={`#${p.slug}`}
                    className="flex min-h-[64px] items-center gap-3 border-b border-rule py-2"
                  >
                    <StayDrawing drawings={c.drawings} className="h-[40px] w-[50px] shrink-0" sizes="50px" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-display text-[20px] font-semibold leading-tight text-ink">
                        Up to {p.guests} <span className="font-normal text-ink-body">&middot; {p.name}</span>
                      </span>
                      <span className="font-sans text-[12px] leading-snug text-ink-note">{c.picker(p)}</span>
                    </span>
                    <span className="text-pine">
                      <FieldArrow />
                    </span>
                  </a>
                ))}
              </div>
            </nav>
            <p className="m-0 mt-4 font-sans text-[13px] leading-[1.5] text-ink-note lg:mt-0 lg:max-w-[460px] lg:text-[14px]">
              {STAY_DIRECT_LINE}
            </p>
            <div className="mt-4 lg:max-w-[460px]">
              <FieldReview
                spec={STAY_HERO_QUOTE.spec}
                role={STAY_HERO_QUOTE.role}
                size="sm"
                rule
                quoteClassName="text-[17px] lg:text-[19px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Compare (desktop only; on phones the hero picker does this job). */}
      <section
        id="compare"
        aria-labelledby="compare-title"
        className="hidden scroll-mt-[var(--header-h,104px)] border-t-[3px] border-double border-frame px-16 pt-16 pb-4 lg:block"
      >
        <div className="mx-auto max-w-[1312px]">
          <div className="flex items-end justify-between gap-16">
            <FieldSectionHeader
              id="compare-title"
              size="md"
              eyebrow="The four stays, side by side"
              title="Which stay fits your group?"
            />
            <p className="m-0 max-w-[420px] font-sans text-[16px] leading-[1.55] text-ink-body">
              Pick by how many are coming. Every stay is on the same working farm, with the Highland cows in the pasture.
            </p>
          </div>
          <table className="mt-10 w-full table-fixed border-collapse font-sans text-[16px] text-ink-body">
            <caption className="sr-only">The four Highland Farms stays compared: guests, bedrooms, baths and hot tubs</caption>
            <colgroup>
              <col className="w-[200px]" />
              {stays.map(({ property: p }) => (
                <col key={p.slug} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-ink/70">
                <th scope="col">
                  <span className="sr-only">Stay</span>
                </th>
                {stays.map(({ property: p, content: c }) => (
                  <th key={p.slug} scope="col" className="px-4 pb-3 text-left align-bottom">
                    <a
                      href={`#${p.slug}`}
                      className="flex flex-col justify-end gap-3 font-display text-[26px] font-semibold leading-[1.05] text-ink"
                    >
                      <StayDrawing
                        drawings={c.drawings}
                        className={c.drawings.length > 1 ? "h-[120px] w-[150px] max-w-full" : "h-[120px] w-auto max-w-full object-left"}
                        sizes={c.drawings.length > 1 ? "80px" : "220px"}
                      />
                      {c.compareName}
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-rule">
                <th scope="row" className={cn("py-4 text-left", fieldLabelClass, "font-medium tracking-[0.14em]")}>
                  Sleeps
                </th>
                {stays.map(({ property: p }) => (
                  <td
                    key={p.slug}
                    className="px-4 py-3 font-display text-[40px] font-medium leading-none text-ink [font-variant-numeric:lining-nums]"
                  >
                    {p.guests}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-rule">
                <th scope="row" className={cn("py-4 text-left", fieldLabelClass, "font-medium tracking-[0.14em]")}>
                  Bedrooms
                </th>
                {stays.map(({ property: p, content: c }) => (
                  <td key={p.slug} className="px-4 py-4">
                    {c.compareBedrooms(p)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-rule">
                <th scope="row" className={cn("py-4 text-left", fieldLabelClass, "font-medium tracking-[0.14em]")}>
                  Baths
                </th>
                {stays.map(({ property: p }) => (
                  <td key={p.slug} className="px-4 py-4">
                    {p.slug === "whole-farm" ? `${p.baths}, plus the Camp` : p.baths}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-rule">
                <th scope="row" className={cn("py-4 text-left", fieldLabelClass, "font-medium tracking-[0.14em]")}>
                  Hot tub
                </th>
                {stays.map(({ property: p, content: c }) => (
                  <td key={p.slug} className={cn("px-4 py-4", c.compareHotTub === "None" && "text-ink-meta")}>
                    {c.compareHotTub}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">
                  <span className="sr-only">Dates</span>
                </th>
                {stays.map(({ property: p }) => (
                  <td key={p.slug} className="px-4">
                    <a
                      href={`#${p.slug}`}
                      className="flex min-h-11 items-center gap-1 font-sans text-[15px] font-medium text-pine"
                    >
                      Check dates and price
                      <FieldArrow size={14} />
                    </a>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. The four sheets, in data order. */}
      <section id="stays" aria-label="The four stays" className="scroll-mt-[var(--header-h,104px)] px-5 pb-6 lg:px-16 lg:pb-10">
        <div className="mx-auto flex max-w-[1312px] flex-col">
          {stays.map(({ property: p, content: c, no }, i) => {
            const flip = i % 2 === 1;
            return (
              <article
                key={p.slug}
                id={p.slug}
                className={cn(
                  "scroll-mt-[var(--header-h,104px)] border-t border-rule pt-8 pb-10 lg:grid lg:gap-16 lg:pt-16 lg:pb-20",
                  flip ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" : "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]",
                )}
              >
                <div className={flip ? "lg:order-2" : undefined}>
                  <Plate caption={c.sheet.photo.caption} frameClassName="h-[240px] lg:h-[520px]">
                    <StayPhoto photo={c.sheet.photo} sizes="(min-width: 1024px) 58vw, 100vw" />
                  </Plate>
                </div>
                <div className={cn("mt-5 lg:mt-0 lg:self-center", flip && "lg:order-1")}>
                  <p className={cn("m-0", SECTION_LABEL_CLASS)}>
                    No. {no} &middot; Sleeps {p.guests}
                  </p>
                  <h2 className="field-heading m-0 mt-1 font-display text-[34px] leading-[1.02] text-ink lg:text-[48px]">
                    {p.name}
                  </h2>
                  <p className="m-0 mt-1 font-display text-[18px] italic leading-snug text-fern lg:text-[21px]">{c.sheet.who}</p>
                  <FieldRows
                    size="list"
                    className="mt-4"
                    rows={c.sheet.rows(p)}
                    rowClassName="min-h-[42px] items-baseline gap-3 py-2 lg:min-h-[50px] lg:gap-5 lg:py-2"
                    termClassName="w-[92px] lg:w-[118px]"
                    detailClassName="text-[14px] leading-snug lg:text-[16px]"
                  />
                  <p className="m-0 mt-4 font-sans text-[15px] leading-[1.6] text-ink-body lg:text-[16px]">{c.sheet.sentence}</p>
                  <div className="mt-5">
                    <FieldReview
                      spec={c.sheet.quote.spec}
                      role={c.sheet.quote.role}
                      size="sm"
                      rule
                      quoteClassName="text-[18px] lg:text-[20px]"
                    />
                  </div>
                  <Link
                    href={`/stay/${p.slug}#book`}
                    aria-label={`Check dates and price for ${p.name}`}
                    data-sticky-stop
                    className={cn(fieldCtaClass, "mt-6 w-full lg:w-auto")}
                  >
                    Check dates and price
                    <FieldArrow />
                  </Link>
                </div>
              </article>
            );
          })}

          {/* Seasonal: hidden after 2026-11-28 by html[data-season]. Real photo only (the styled image stays on /thanksgiving). */}
          <section
            aria-label="Thanksgiving package"
            data-season-only="thanksgiving-links"
            className="border-t-[3px] border-double border-frame py-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-16 lg:py-14"
          >
            <Plate
              caption="The Lodge dining room, which seats ten."
              frameClassName="h-[180px] lg:h-[300px]"
            >
              <StayPhoto
                photo={{
                  src: "/images/properties/lodge-dining-room.jpg",
                  alt: "The Lodge dining room with a long table and chairs for ten beside wide windows",
                  position: "50% 55%",
                }}
                sizes="(min-width: 1024px) 40vw, 100vw"
              />
            </Plate>
            <div className="mt-5 lg:mt-0">
              <p className={cn("m-0 text-[17px] lg:text-[20px]", fieldEyebrowClass)}>Or, for the holiday</p>
              <h2 className="field-heading m-0 mt-1 font-display text-[28px] leading-[1.05] text-ink lg:text-[40px]">
                A Highland Farms Thanksgiving
              </h2>
              <p className="m-0 mt-2 font-sans text-[15px] leading-[1.55] text-ink-body lg:text-[16px]">
                {THANKSGIVING_DATES}. {THANKSGIVING_NIGHTS.cap}, holiday meals, a Nordic spa session and a guided farm tour, for{" "}
                {LODGE_PKG.guests} at the Lodge or {FARM_PKG.guests} across the whole farm.
              </p>
              <div className="mt-4 border-t border-rule">
                <FieldPriceRow size="md" label={`The Lodge, for ${LODGE_PKG.guests}`} price={LODGE_PKG.priceLabel} />
                <FieldPriceRow size="md" label={`The whole farm, for ${FARM_PKG.guests}`} price={FARM_PKG.priceLabel} />
              </div>
              <Link
                href="/thanksgiving"
                className={cn("mt-4 inline-flex min-h-11 items-center gap-1.5", fieldTextLinkClass)}
              >
                See the Thanksgiving packages
                <FieldArrow size={16} />
              </Link>
            </div>
          </section>
        </div>
      </section>

      {/* 4. Know before you book. */}
      <section aria-labelledby="know-title" className="bg-paper-shade px-5 py-10 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <FieldSectionHeader id="know-title" size="md" eyebrow="Every stay" title="Know before you book" />
          <StayKnowRows
            variant="index"
            className="mt-5 lg:mt-0"
            pendingNote="PENDING JALENE: the exact cancellation terms for each stay, to state here and on each stay page"
          />
        </div>
      </section>

      {/* 5. Cross-sell for overnight guests (BookingTextLink keeps booking_start). */}
      <section aria-labelledby="addon-title" className="px-5 py-10 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-[1312px]">
          <FieldSectionHeader
            id="addon-title"
            size="md"
            eyebrow="While you're on the farm"
            title="Add the herd, or the sauna."
          />
          <div className="mt-6 grid grid-cols-1 gap-10 lg:mt-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <Plate frameClassName="h-[200px] lg:h-[340px]">
                <StayPhoto
                  photo={{
                    src: "/images/hero/carousel-5.jpg",
                    alt: "Hands holding out hay to two shaggy Highland cows at the fence",
                    position: "50% 45%",
                  }}
                  sizes="(min-width: 1024px) 48vw, 100vw"
                />
              </Plate>
              <h3 className="field-heading m-0 mt-4 font-display text-[26px] leading-[1.05] text-ink lg:text-[32px]">
                A private farm tour
              </h3>
              <p className="m-0 mt-1.5 font-sans text-[15px] leading-[1.55] text-ink-body">
                An hour with the Highland cows for your group only: feed, brush and pet them. 2 to 6 guests, rain or shine.
              </p>
              <div className="mt-3 border-t border-rule">
                <FieldPriceRow size="md" label="2 guests" price={`$${TOUR_FOR_TWO}`} />
              </div>
              <p className="m-0 mt-2 font-sans text-[13px] text-ink-note">
                ${TOUR_EACH_ADDITIONAL} for each additional guest. Kids 4 and under are free.
              </p>
              <BookingTextLink
                href={bookingUrl(BOOKING_LINKS.farmTourForTwo, "stay-add-tour")}
                label="See tour dates"
                title="Private farm tour"
                className={cn("mt-3 inline-flex min-h-11 items-center gap-1.5", fieldTextLinkClass)}
              >
                See tour dates
                <FieldArrow size={16} />
              </BookingTextLink>
            </div>
            <div>
              <Plate frameClassName="h-[200px] lg:h-[340px]">
                <StayPhoto
                  photo={{
                    src: "/images/spa/spa-exterior-wide.jpg",
                    alt: "The spa's wide cedar deck and glass wall among the firs",
                    position: "50% 55%",
                  }}
                  sizes="(min-width: 1024px) 48vw, 100vw"
                />
              </Plate>
              <h3 className="field-heading m-0 mt-4 font-display text-[26px] leading-[1.05] text-ink lg:text-[32px]">
                The Nordic spa
              </h3>
              <p className="m-0 mt-1.5 font-sans text-[15px] leading-[1.55] text-ink-body">
                A wood-burning dry sauna, a wet sauna and a cold plunge. 90 minutes, up to 6 guests, ages 16 and up. Robes and
                towels provided.
              </p>
              <div className="mt-3 border-t border-rule">
                <FieldPriceRow size="md" label="Per person" price={`$${SPA_PER_PERSON}`} />
              </div>
              <p className="m-0 mt-2 font-sans text-[13px] text-ink-note">
                Book all six spots for a private session, ${SPA_PRIVATE_SESSION}.
              </p>
              <BookingTextLink
                href={bookingUrl(BOOKING_LINKS.nordicSpa, "stay-add-spa")}
                label="See open sessions"
                title="Nordic spa"
                className={cn("mt-3 inline-flex min-h-11 items-center gap-1.5", fieldTextLinkClass)}
              >
                See open sessions
                <FieldArrow size={16} />
              </BookingTextLink>
            </div>
          </div>
          <p className="m-0 mt-8 max-w-[760px] border-t border-rule pt-4 font-sans text-[14px] leading-[1.6] text-ink-note lg:text-[15px]">
            <StayLaterStayLine />
          </p>
        </div>
      </section>

      <FieldStickyBar
        primary={{
          label: "Check dates and price",
          sublabel: `${capitalize(numberWord(properties.length))} stays, sleeping ${Math.min(...properties.map((p) => p.guests))} to ${Math.max(...properties.map((p) => p.guests))}`,
          href: "#stays",
        }}
        hideWhenVisible="#stays"
      />
      <BookingModalRoot />
    </div>
  );
}
