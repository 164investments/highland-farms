import type { Metadata } from "next";
import Link from "next/link";
import { properties } from "@/data/properties";
import { BOOKING_LINKS, bookingUrl } from "@/lib/constants";
import { StructuredData } from "@/components/layout/StructuredData";
import {
  FieldArrow,
  FieldSectionHeader,
  Plate,
  fieldCtaClass,
  fieldEyebrowClass,
  fieldLabelClass,
} from "@/components/ui/FieldGuide";
import { FieldReview, FieldReviewTier } from "@/components/field/Reviews";
import { FieldStickyBar } from "@/components/field/StickyBar";
import { BookingModalRoot, BookingTextLink } from "@/components/shared/BookingButton";
import { StayKnowRows, StayLaterStayLine } from "@/components/stay/StayLines";
import { StayDrawing, StayPhoto } from "@/components/stay/StayParts";
import {
  STAY_CONTENT,
  STAY_SHEET_QUOTES,
  capitalize,
  numberWord,
} from "@/components/stay/stay-content";
import {
  SPA_PER_PERSON,
  STAY_DIRECT_LINE,
  THANKSGIVING_DATES,
  THANKSGIVING_NIGHTS,
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

const ROW_LINE: Record<string, string> = {
  "whole-farm": "all three stays",
  lodge: "full kitchen",
  cottage: "by the cow pasture",
  camp: "Airstream and tents",
};

const HERE_LINK_CLASS =
  "flex min-h-11 items-center text-left font-sans text-[14px] leading-snug text-ink-note underline decoration-rule decoration-1 underline-offset-4 transition-colors hover:text-pine hover:decoration-pine";

/** "November 24 to 28, 2026" -> "Nov 24 to 28". */
const THANKSGIVING_SHORT = THANKSGIVING_DATES.replace(/^November/, "Nov").replace(/,\s*\d{4}$/, "");
const THANKSGIVING_FROM = `$${Math.min(LODGE_PKG.price, FARM_PKG.price).toLocaleString("en-US")}`;

const SECTION_LABEL_CLASS = cn(fieldLabelClass, "font-medium");

export default function StayPage() {
  const lodge = bySlug("lodge");
  const cottage = bySlug("cottage");
  const camp = bySlug("camp");
  const farm = bySlug("whole-farm");

  return (
    <div className="surface-paper bg-paper pt-[var(--header-h,104px)] font-sans text-ink">
      <StructuredData pathname="/stay" />

      {/* 1. First screen. Phones: promise, proof, then the four stays as photo rows (each a link to its own page).
          Desktop: copy and one CTA to the rows, with the Cottage plate beside them. */}
      <section className="px-5 pt-4 pb-8 lg:px-16 lg:pt-14 lg:pb-16">
        <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-16">
          <div className="lg:col-start-1 lg:row-start-1">
            <p className={cn("m-0 text-[17px] lg:text-[22px]", fieldEyebrowClass)}>
              <span className="lg:hidden">Farm stays, about an hour from Portland</span>
              <span className="hidden lg:inline">Farm stays in Brightwood, Oregon</span>
            </p>
            <h1 className="field-heading m-0 mt-1 font-display text-[28px] leading-[1.04] text-ink min-[380px]:text-[35px] min-[380px]:leading-[1.02] lg:mt-3 lg:text-[62px]">
              Stay the night on a Highland cow farm.
            </h1>
            <p className="m-0 mt-5 hidden font-sans text-[18px] leading-[1.6] text-ink-body lg:block lg:max-w-[500px]">
              Four ways to stay on five forested acres, about an hour from Portland: a cedar lodge for {lodge.property.guests}, a
              cottage by the cows for {cottage.property.guests}, an Airstream camp for {camp.property.guests}, or the whole farm for{" "}
              {farm.property.guests}.
            </p>
            <FieldReviewTier tier="hero" link className="mt-1" />
            <a href="#pick" className={cn(fieldCtaClass, "mt-6 hidden lg:inline-flex")}>
              Check dates and price
              <FieldArrow />
            </a>
          </div>

          <div className="hidden lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block">
            <Plate caption="Bonnie Lass Cottage, beside the cow pasture." frameClassName="lg:h-[600px]">
              <StayPhoto photo={HERO_PHOTO} sizes="(min-width: 1024px) 58vw, 100vw" priority />
            </Plate>
          </div>

          <div className="lg:col-start-1 lg:row-start-2 lg:mt-8 lg:self-start">
            <nav
              id="pick"
              aria-label="Choose a stay by group size"
              data-hero-cta
              className="scroll-mt-[var(--header-h,104px)]"
            >
              <p className={cn("m-0 mt-2", SECTION_LABEL_CLASS)}>How many are coming?</p>
              <ul id="stays" className="m-0 mt-1.5 flex list-none flex-col border-t border-ink/70 p-0">
                {stays.map(({ property: p, content: c }) => (
                  <li key={p.slug} className="border-b border-rule">
                    <Link
                      href={p.bookingUrl}
                      aria-label={`${p.name}, sleeps ${p.guests}. Check dates and price`}
                      className="flex min-h-[64px] items-center gap-3 py-[5px] min-[380px]:gap-3.5 min-[380px]:py-[7px]"
                    >
                      <span className="block h-[58px] w-[76px] shrink-0 border border-frame bg-paper-light p-[3px] min-[380px]:h-[74px] min-[380px]:w-[98px] min-[380px]:p-1">
                        <span className="relative block h-full w-full overflow-hidden">
                          <StayPhoto
                            photo={{ ...c.thumb, alt: p.slug === "whole-farm" ? "Styled aerial view of Highland Farms at dusk" : "" }}
                            sizes="98px"
                          />
                        </span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                        <span className="font-display text-[19.5px] font-semibold leading-[1.08] text-ink min-[380px]:text-[22px]">
                          {p.name}
                        </span>
                        <span className="font-sans text-[12px] leading-[1.3] text-ink-note min-[380px]:text-[13px]">
                          Sleeps {p.guests} &middot; {ROW_LINE[p.slug]}
                        </span>
                        {c.thumbCaption && (
                          <span className="font-sans text-[11px] italic leading-[1.3] text-ink-meta">{c.thumbCaption}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-pine">
                        <FieldArrow />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <p className="m-0 mt-3 font-sans text-[13px] leading-[1.5] text-ink-note lg:mt-5 lg:max-w-[460px] lg:text-[14px]">
              {STAY_DIRECT_LINE}
            </p>
          </div>
        </div>
      </section>

      {/* 1b. Screen 2: the herd, with the hub's one quote. */}
      <section aria-label="The Highland cows" className="border-t-[3px] border-double border-frame px-5 pt-6 pb-10 lg:px-16 lg:pt-12 lg:pb-16">
        <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-16">
          <Plate caption="One of the Highland cows, among the trees." frameClassName="h-[196px] min-[380px]:h-[232px] lg:h-[440px]">
            <StayPhoto
              photo={{
                src: "/images/properties/gallery-5.jpg",
                alt: "A Highland cow in sunlit woods",
                position: "50% 45%",
              }}
              sizes="(min-width: 1024px) 58vw, 100vw"
            />
          </Plate>
          <div className="mt-5 lg:mt-0">
            <FieldReview
              spec={STAY_SHEET_QUOTES.cottage.spec}
              role={STAY_SHEET_QUOTES.cottage.role}
              size="sm"
              rule
              quoteClassName="text-[18px] lg:text-[22px]"
            />
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
                    <Link
                      href={p.bookingUrl}
                      className="flex flex-col justify-end gap-3 font-display text-[26px] font-semibold leading-[1.05] text-ink"
                    >
                      <StayDrawing
                        drawings={c.drawings}
                        className={c.drawings.length > 1 ? "h-[120px] w-[150px] max-w-full" : "h-[120px] w-auto max-w-full object-left"}
                        sizes={c.drawings.length > 1 ? "80px" : "220px"}
                      />
                      {c.compareName}
                    </Link>
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
                    <Link
                      href={p.bookingUrl}
                      className="flex min-h-11 items-center gap-1 font-sans text-[15px] font-medium text-pine"
                    >
                      Check dates and price
                      <FieldArrow size={14} />
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Know before you book. */}
      <section aria-labelledby="know-title" className="bg-paper-shade px-5 py-10 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <FieldSectionHeader id="know-title" size="md" eyebrow="Every stay" title="Know before you book" />
          <StayKnowRows
            variant="index"
            className="mt-5 lg:mt-0"
          />
        </div>
      </section>

      {/* 5. While you're here: one quiet line of links (BookingTextLink keeps booking_start), after "Know before you book". */}
      <section aria-labelledby="here-title" className="px-5 py-9 lg:px-16 lg:py-14">
        <div className="mx-auto max-w-[1312px]">
          <h2 id="here-title" className={cn("m-0", SECTION_LABEL_CLASS)}>
            While you&apos;re here
          </h2>
          {/* Thanksgiving leads (season-gated as one block); tours and spa are one muted line. */}
          <Link
            href="/thanksgiving"
            data-season-only="thanksgiving-links"
            className="mt-2 flex min-h-[64px] items-center gap-3 border-y border-rule py-2 lg:max-w-[760px]"
          >
            <span className="block h-[58px] w-[76px] shrink-0 border border-frame bg-paper-light p-[3px]">
              <span className="relative block h-full w-full overflow-hidden">
                <StayPhoto
                  photo={{ src: "/images/properties/cottage.jpg", alt: "", position: "50% 45%" }}
                  sizes="76px"
                />
              </span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <span className="font-display text-[19px] font-semibold leading-[1.1] text-ink">
                Thanksgiving, {THANKSGIVING_SHORT}
              </span>
              <span className="font-sans text-[13px] leading-[1.35] text-ink-note">
                {THANKSGIVING_NIGHTS.cap}, dinner cooked for you. From {THANKSGIVING_FROM}.
              </span>
            </span>
            <span className="shrink-0 text-pine">
              <FieldArrow />
            </span>
          </Link>
          <div className="mt-1 flex flex-wrap gap-x-5">
            <BookingTextLink
              href={bookingUrl(BOOKING_LINKS.farmTourForTwo, "stay-add-tour")}
              label="See tour dates"
              title="Private farm tour"
              className={HERE_LINK_CLASS}
            >
              A private farm tour, ${TOUR_FOR_TWO} for two
            </BookingTextLink>
            <BookingTextLink
              href={bookingUrl(BOOKING_LINKS.nordicSpa, "stay-add-spa")}
              label="See open sessions"
              title="Nordic spa"
              className={HERE_LINK_CLASS}
            >
              The Nordic spa, ${SPA_PER_PERSON} a person
            </BookingTextLink>
          </div>
          <p className="m-0 mt-1 max-w-[760px] font-sans text-[13px] leading-[1.55] text-ink-note lg:text-[14px]">
            <StayLaterStayLine />
          </p>
        </div>
      </section>

      <FieldStickyBar
        primary={{
          label: "Choose your stay",
          sublabel: `${capitalize(numberWord(properties.length))} stays, sleeping ${Math.min(...properties.map((p) => p.guests))} to ${Math.max(...properties.map((p) => p.guests))}`,
          href: "#pick",
        }}
        hideWhenVisible="#pick"
      />
      <BookingModalRoot />
    </div>
  );
}
