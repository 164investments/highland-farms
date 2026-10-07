import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { properties } from "@/data/properties";
import { BOOKING_LINKS, bookingUrl } from "@/lib/constants";
import { GOOGLE_REVIEW_LINK, REVIEW_COUNT } from "@/lib/reviews";
import { StructuredData } from "@/components/layout/StructuredData";
import {
  FieldArrow,
  FieldLink,
  FieldQuoteView,
  FieldStars,
  Plate,
  fieldCtaClass,
  fieldEyebrowClass,
  fieldTextLinkClass,
} from "@/components/ui/FieldGuide";
import { FieldReviewTier, resolveFieldQuote } from "@/components/field/Reviews";
import { FieldStickyBar } from "@/components/field/StickyBar";
import { BookingModalRoot, BookingTextLink } from "@/components/shared/BookingButton";
import { BookingCard } from "@/components/stay/BookingCard";
import { RoomPlates } from "@/components/stay/RoomPlates";
import { StayKnowRows, StayLaterStayLine } from "@/components/stay/StayLines";
import { FieldArrowBack, FieldArrowDown, StayPhoto } from "@/components/stay/StayParts";
import { STAY_CONTENT, capitalize, numberWord, roomCount, type StayContent } from "@/components/stay/stay-content";
import {
  SPA_PER_PERSON,
  THANKSGIVING_DATES,
  TOUR_FOR_TWO,
  thanksgivingPackage,
} from "@/components/stay/stay-facts";
import { cn } from "@/lib/utils";
import type { Property } from "@/lib/types";

export function generateStaticParams() {
  return properties.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return params.then(({ slug }) => {
    const property = properties.find((p) => p.slug === slug);
    if (!property) return { title: "Not Found" };

    return {
      title: `${property.name} · Farm Stay`,
      description: property.description,
      alternates: { canonical: `/stay/${slug}` },
      openGraph: {
        title: `${property.name} · Farm Stay at Highland Farms Oregon`,
        description: property.description,
        images: [
          {
            url: property.imageSrc,
            width: 1200,
            height: 630,
            alt: property.name,
          },
        ],
      },
    };
  });
}

const GROUP_HEAD_CLASS = "field-heading m-0 font-display text-[30px] leading-[1.05] text-ink lg:text-[38px]";
const SPLIT_SECTION_CLASS = "mt-12 border-t border-rule pt-8 lg:mt-16 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10 lg:pt-12";

/** A row linking to another stay: small real photo, name, what it sleeps, arrow. */
function StayRow({ property, content, grid }: { property: Property; content: StayContent; grid?: boolean }) {
  return (
    <li className={cn("border-b border-rule", grid && "lg:border-b-0")}>
      <Link
        href={property.bookingUrl}
        className={cn("flex items-center gap-4 py-3", grid && "lg:flex-col lg:items-stretch lg:gap-3 lg:py-0")}
      >
        <span
          className={cn(
            "block h-[78px] w-[104px] shrink-0 border border-frame bg-paper-light p-[4px]",
            grid && "lg:h-[240px] lg:w-full lg:p-2",
          )}
        >
          <span className="relative block h-full w-full overflow-hidden">
            <StayPhoto photo={content.thumb} sizes={grid ? "(min-width: 1024px) 28vw, 104px" : "104px"} />
          </span>
        </span>
        <span className="flex flex-1 items-center gap-3">
          <span className="flex flex-1 flex-col">
            <span className={cn("font-display text-[21px] font-semibold leading-tight text-ink", grid && "lg:text-[26px]")}>
              {property.name}
            </span>
            <span className={cn("font-sans text-[12px] text-ink-note", grid && "lg:text-[14px]")}>
              {content.otherLine(property)}
            </span>
            {content.thumbCaption && (
              <span className="font-sans text-[11px] italic text-ink-meta">{content.thumbCaption}</span>
            )}
          </span>
          <FieldArrow className="text-pine" />
        </span>
      </Link>
    </li>
  );
}

const HERE_LINK_CLASS =
  "flex min-h-11 items-center text-left font-sans text-[14px] leading-snug text-ink-note underline decoration-rule decoration-1 underline-offset-4 transition-colors hover:text-pine hover:decoration-pine";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const index = properties.findIndex((p) => p.slug === slug);
  if (index < 0) notFound();

  const property = properties[index];
  const content = STAY_CONTENT[property.slug];
  const { page } = content;
  const others = properties.filter((p) => p.slug !== property.slug);
  const included = properties.filter((p) => p.slug !== "whole-farm");
  const photos = roomCount(content);
  const quote = resolveFieldQuote(page.quote.spec, { role: page.quote.role });
  const tg = page.thanksgiving ? thanksgivingPackage(page.thanksgiving) : null;
  const factNumeric = /^\d+$/.test(page.fourth.value);

  const facts: { label: string; value: string; big: boolean }[] = [
    { label: property.guests === 1 ? "Guest" : "Guests", value: String(property.guests), big: true },
    // The whole farm's counts are the two houses' (the farm's own 7 and 3.5); the caption under the strip says the Camp is extra.
    {
      label: property.bedrooms === 1 ? "Bedroom" : "Bedrooms",
      value: String(property.bedrooms),
      big: true,
    },
    {
      label: property.baths === 1 ? "Bath" : "Baths",
      value: String(property.baths),
      big: true,
    },
    { label: page.fourth.label, value: page.fourth.value, big: factNumeric },
  ];

  // A guest's own words, straight after the paragraph and before the photographs; the Whole Farm's wedding review
  // moves below "Know before you book" so the booking path is not interrupted.
  const quoteSection = quote && (
              <section
                id="reviews"
                aria-label="What a guest said"
                className="mt-10 scroll-mt-[var(--header-h,104px)] bg-paper-shade px-5 py-7 max-lg:-mx-5 lg:mt-12 lg:px-10 lg:py-10"
              >
                <p className={cn("m-0 text-[17px] lg:text-[20px]", fieldEyebrowClass)}>{page.quoteEyebrow}</p>
                <div className="mt-3 border-t border-rule pt-4">
                  <FieldQuoteView {...quote} size="md" />
                </div>
                <FieldLink
                  href={GOOGLE_REVIEW_LINK}
                  external
                  className="mt-2 flex min-h-11 w-fit items-center gap-2 font-sans text-[13px] text-ink-body transition-colors hover:text-ink lg:text-[14px]"
                >
                  <FieldStars size={13} />
                  <span>Read all {REVIEW_COUNT} reviews on Google</span>
                </FieldLink>
                {page.quoteLink && (
                  <Link
                    href={page.quoteLink.href}
                    className={cn("flex min-h-11 w-fit items-center gap-1.5 text-[14px]", fieldTextLinkClass)}
                  >
                    {page.quoteLink.label}
                    <FieldArrow size={16} />
                  </Link>
                )}
              </section>
  );

  return (
    <div className="surface-paper bg-paper pt-[var(--header-h,104px)] font-sans text-ink">
      <StructuredData pathname={`/stay/${property.slug}`} />

      <nav aria-label="Breadcrumb" className="px-5 lg:px-16">
        <div className="mx-auto flex max-w-[1312px] items-center justify-between border-b border-rule">
          <Link
            href="/stay"
            className="flex min-h-11 items-center gap-1.5 font-sans text-[13px] font-medium text-pine lg:text-[14px]"
          >
            <FieldArrowBack />
            All {numberWord(properties.length)} stays
          </Link>
          <p className="m-0 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink-meta">
            No. {index + 1} of {properties.length}
          </p>
        </div>
      </nav>

      <div className="px-5 lg:px-16">
        <div className="mx-auto grid max-w-[1312px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-x-16">
          {/* Name, what the count counts, the one-line promise: above the photo on phones. */}
          <header className="pt-4 lg:col-start-1 lg:row-start-1 lg:pt-10">
            <p className={cn("m-0 text-[17px] lg:text-[22px]", fieldEyebrowClass)}>
              Sleeps {property.guests} &middot; About an hour from Portland
            </p>
            <h1 className="field-heading m-0 mt-0.5 font-display text-[36px] leading-[1.02] text-ink max-[359px]:text-[32px] lg:mt-2 lg:text-[60px]">
              {property.name}
            </h1>
            <p className="m-0 mt-2 font-sans text-[15px] leading-[1.55] text-ink-body lg:mt-3 lg:max-w-[600px] lg:text-[18px]">
              {page.promise}
            </p>
            <FieldReviewTier tier="hero" link subject="Highland Farms" />
            <a
              href="#book"
              data-hero-cta
              className={cn(fieldCtaClass, "mt-1 w-full lg:hidden")}
            >
              Check dates and price
              <FieldArrowDown />
            </a>
          </header>

          {/* Lead plate: no carousel, so no empty band under it. */}
          <div className="mt-4 lg:col-start-1 lg:row-start-3 lg:mt-8">
            <Plate
              frameClassName="h-[188px] min-[380px]:h-[210px] lg:h-[560px]"
              captionClassName="flex items-baseline justify-between gap-3"
              caption={
                <>
                  <span>{page.lead.caption}</span>
                  <a
                    href={page.rooms === "stays" ? "#three-stays" : "#rooms"}
                    className="flex min-h-11 shrink-0 items-center gap-1 font-sans text-[13px] font-medium not-italic text-pine"
                  >
                    {page.rooms === "stays" ? `The ${numberWord(included.length)} stays` : `All ${photos} photos`}
                    <FieldArrowDown size={14} />
                  </a>
                </>
              }
            >
              <StayPhoto photo={page.lead} sizes="(min-width: 1024px) 62vw, 100vw" priority />
            </Plate>
          </div>

          {/* Key facts. */}
          <div className="lg:col-start-1 lg:row-start-2">
            <dl className="m-0 mt-2 grid grid-cols-4 border-y border-rule lg:mt-6 lg:max-w-[640px]">
              {facts.map((f, i) => (
                <div
                  key={f.label}
                  className={cn(
                    "flex flex-col justify-center py-2.5 lg:py-3.5",
                    i > 0 && "border-l border-rule pl-3 max-[359px]:pl-2 lg:pl-5",
                  )}
                >
                  <dt className="order-2 font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-ink-meta max-[359px]:text-[9px] max-[359px]:tracking-[0.04em] lg:text-[11px]">
                    {f.label}
                  </dt>
                  <dd
                    className={cn(
                      "order-1 m-0 font-display font-medium leading-none [font-variant-numeric:lining-nums]",
                      f.big ? "text-[28px] lg:text-[36px]" : "text-[22px] lg:text-[30px]",
                    )}
                  >
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
            {property.slug === "whole-farm" && (
              <p className="m-0 mt-2 font-sans text-[12px] leading-[1.4] text-ink-note lg:text-[13px]">
                Bedrooms and baths are the Lodge&apos;s and the Cottage&apos;s, plus the Camp.
              </p>
            )}
          </div>

          <BookingCard
            widgetUrl={property.hospitable_widget_url || ""}
            propertyName={property.name}
            propertySlug={property.slug}
          />

          <div className="lg:col-start-1 lg:row-start-4">
            {/* The stay in a paragraph, under its own name ("The house", "The camp", "The farm"). */}
            <section
              aria-labelledby="about-title"
              className="mt-10 border-t border-rule pt-8 lg:mt-14 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10 lg:pt-12"
            >
              <h2 id="about-title" className={GROUP_HEAD_CLASS}>
                {page.aboutTitle}
              </h2>
              <p className="m-0 mt-3 font-sans text-[16px] leading-[1.65] text-ink-body lg:mt-1 lg:text-[17px]">
                {page.about(property)}
              </p>
            </section>

            {!page.quoteLink && quoteSection}

            {/* Room by room: the gallery as numbered plates (or, for the whole farm, its three stays with their photos). */}
            {page.rooms === "rooms" ? (
              <section
                id="rooms"
                aria-labelledby="rooms-title"
                className="mt-10 scroll-mt-[var(--header-h,104px)] border-t-[3px] border-double border-frame pt-8 lg:mt-16 lg:pt-12"
              >
                <p className={cn("m-0 text-[17px] lg:text-[20px]", fieldEyebrowClass)}>
                  {page.stickyName} in {numberWord(photos)} photographs
                </p>
                <h2
                  id="rooms-title"
                  className="field-heading m-0 mt-1 font-display text-[30px] leading-[1.05] text-ink lg:text-[44px]"
                >
                  Room by room
                </h2>
                <RoomPlates groups={page.groups} property={property} lead={4} />
              </section>
            ) : (
              <section
                id="three-stays"
                aria-labelledby="three-stays-title"
                className="mt-10 scroll-mt-[var(--header-h,104px)] border-t-[3px] border-double border-frame pt-8 lg:mt-16 lg:pt-12"
              >
                <p className={cn("m-0 text-[17px] lg:text-[20px]", fieldEyebrowClass)}>Included in one booking</p>
                <h2
                  id="three-stays-title"
                  className="field-heading m-0 mt-1 font-display text-[30px] leading-[1.05] text-ink lg:text-[44px]"
                >
                  {capitalize(numberWord(included.length))} stays
                </h2>
                <ul className="m-0 mt-5 flex list-none flex-col border-t border-rule p-0 lg:mt-8 lg:grid lg:grid-cols-3 lg:gap-10 lg:border-t-0">
                  {included.map((h) => (
                    <StayRow key={h.slug} property={h} content={STAY_CONTENT[h.slug]} grid />
                  ))}
                </ul>
              </section>
            )}

            {/* Know before you book: the parent page's name and order (the minimum stay is here once; the booking card
                keeps only its price sentence). */}
            <section aria-labelledby="know-title" className={SPLIT_SECTION_CLASS}>
              <h2 id="know-title" className={GROUP_HEAD_CLASS}>
                Know before you book
              </h2>
              <StayKnowRows
                variant="slug"
                slug={property.slug}
                className="mt-4 lg:mt-1"
                pendingNote={`PENDING JALENE: ${property.name}'s exact cancellation terms, to state here and in the booking card`}
              />
            </section>
            {page.quoteLink && quoteSection}
            {/* While you're here: one quiet line of links, below the terms (Thanksgiving until 2026-11-28, tour, spa). */}
            <section aria-labelledby="here-title" className={SPLIT_SECTION_CLASS}>
              <h2 id="here-title" className={GROUP_HEAD_CLASS}>
                While you&apos;re here
              </h2>
              <div className="mt-3 lg:mt-1">
                <div className="flex flex-wrap gap-x-5">
                  {tg && (
                    <Link href="/thanksgiving" data-season-only="thanksgiving-links" className={HERE_LINK_CLASS}>
                      {tg.name}, {THANKSGIVING_DATES}: {tg.priceLabel}
                    </Link>
                  )}
                  <BookingTextLink
                    href={bookingUrl(BOOKING_LINKS.farmTourForTwo, `stay-${property.slug}-tour`)}
                    label="See tour dates"
                    title="Private farm tour"
                    className={HERE_LINK_CLASS}
                  >
                    A private farm tour, ${TOUR_FOR_TWO} for two
                  </BookingTextLink>
                  <BookingTextLink
                    href={bookingUrl(BOOKING_LINKS.nordicSpa, `stay-${property.slug}-spa`)}
                    label="See open sessions"
                    title="Nordic spa"
                    className={HERE_LINK_CLASS}
                  >
                    The Nordic spa, ${SPA_PER_PERSON} a person
                  </BookingTextLink>
                </div>
                <p className="m-0 mt-1 font-sans text-[13px] leading-[1.55] text-ink-note lg:text-[14px]">
                  <StayLaterStayLine />
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* The other stays (the whole farm already shows its three stays above). */}
      {page.rooms === "rooms" && (
        <section
          aria-labelledby="other-title"
          className="mt-12 border-t-[3px] border-double border-frame px-5 py-9 lg:mt-20 lg:px-16 lg:py-16"
        >
          <div className="mx-auto max-w-[1312px]">
            <h2 id="other-title" className="field-heading m-0 font-display text-[30px] leading-[1.05] text-ink lg:text-[44px]">
              The other stays
            </h2>
            <ul className="m-0 mt-5 flex list-none flex-col border-t border-rule p-0 lg:mt-8 lg:grid lg:grid-cols-3 lg:gap-10 lg:border-t-0">
              {others.map((p) => (
                <StayRow key={p.slug} property={p} content={STAY_CONTENT[p.slug]} grid />
              ))}
            </ul>
          </div>
        </section>
      )}

      <FieldStickyBar
        primary={{
          label: "Check dates and price",
          sublabel: `${page.stickyName} · sleeps ${property.guests} · book direct`,
          href: "#book",
        }}
        hideWhenVisible="#book"
      />
      <BookingModalRoot />
    </div>
  );
}
