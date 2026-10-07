import Image from "next/image";
import { FieldReview, FieldReviewTier } from "@/components/field/Reviews";
import { FieldStickyBar } from "@/components/field/StickyBar";
import { JsonLd, faqPageJsonLd } from "@/components/field/Faq";
import { type FieldPriceRowData } from "@/components/field/PriceRows";
import { BookingModalRoot } from "@/components/shared/BookingButton";
import { VisitFaq } from "@/components/shared/VisitFaq";
import { FieldDrawing, FieldSection, FieldSectionHeader, FieldSequence, Plate } from "@/components/ui/FieldGuide";
import { GIFTS, giftCatalogUrl, giftFAQ, giftPrice, type GiftFamily } from "@/data/gift-certificates";
import { GiftChooser, type GiftTileData } from "./GiftChooser";
import { GIFTS_KSCHROE_QUOTE, GIFTS_STEWART_QUOTE, GIFTS_VALERIE_QUOTE } from "./quotes";

/*
 * The static /gift-certificates page (round 3 board), shown while the native
 * calendar flag is off. Every row is a BookingTextLink (through FieldPriceRow)
 * to the Acuity gift catalog, so booking_start fires with booking_type
 * gift_certificate, gift_product, party_size and the price (see
 * src/lib/booking/tracking.ts), and the checkout opens in the page's modal.
 * Prices are Hayden's D2 decision (gift = booking price); Acuity must be
 * updated to match before this page ships (see src/data/gift-certificates.ts).
 */

const TOUR_FOR_TWO = giftPrice("tour", 2);
const SPA_EACH = giftPrice("spa", 1);
const DAY_FOR_TWO = giftPrice("day", 2);
const LOWEST = Math.min(...Object.values(GIFTS).flatMap((g) => g.sizes.map((s) => s.price)));

const srAction = ", choose this gift";

function ledgerRows(family: GiftFamily): FieldPriceRowData[] {
  return GIFTS[family].sizes.map((s) => {
    const label = family === "spa" ? (s.guests === 1 ? "1 person" : `${s.guests} people`) : `${s.guests} guests`;
    return {
      id: String(s.guests),
      label,
      price: `$${s.price}`,
      srAction,
      booking: {
        href: giftCatalogUrl(`gifts-${family}-${s.guests}`, s.acuityId),
        label,
        title: `Choose a ${family === "tour" ? "farm tour" : family === "spa" ? "Nordic spa" : "Highland Day"} gift certificate for ${label}`,
      },
    };
  });
}

/** The tiles' prices are the ladders' first rows; no number is typed twice. */
const TILES: GiftTileData[] = [
  {
    family: "tour",
    name: "Farm tour",
    price: `$${TOUR_FOR_TWO}`,
    unit: "for two",
    drawings: ["highland-cow"],
    line: "For the one who stops the car for every cow.",
    body: "A private 60-minute tour for their group: into the pen to feed, brush and pet the Highland cows, then the fern-forest trail to the Icelandic sheep. Kids 4 and under come free.",
    rows: ledgerRows("tour"),
  },
  {
    family: "spa",
    name: "Nordic spa",
    price: `$${SPA_EACH}`,
    unit: "per person",
    drawings: ["sauna-cabin"],
    line: "For the friend who needs ninety quiet minutes.",
    body: "One 90-minute session per person: the wood-burning cedar sauna, the wet sauna and the cold plunge, robes and towels included. Spa guests must be 16 or older. Give six, and the group can book a whole session to themselves.",
    rows: ledgerRows("spa"),
  },
  {
    family: "day",
    name: "Highland Day",
    price: `$${DAY_FOR_TWO}`,
    unit: "for two",
    drawings: ["highland-cow", "sauna-cabin"],
    panelTag: "Tour and spa",
    line: "Meet the herd, then the sauna.",
    body: "For anyone who wants both: a private farm tour plus a spa spot for each guest, the same price as booking both. They book them as two appointments; on the same day, the tour comes first.",
    rows: ledgerRows("day"),
  },
];

export function StaticGifts() {
  return (
    <>
      <JsonLd data={faqPageJsonLd(giftFAQ)} />

      {/* S1 First screen: the three gifts are the CTA */}
      <section
        aria-labelledby="gift-hero-title"
        className="surface-paper bg-paper pt-[var(--header-h,104px)] text-ink"
      >
        <div className="mx-auto flex max-w-[1440px] flex-col px-5 pb-8 pt-[18px] lg:grid lg:min-h-[clamp(600px,calc(100svh_-_var(--header-h,128px)),900px)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[1fr_repeat(7,auto)_1fr] lg:gap-x-16 lg:px-10 lg:pb-10 lg:pt-11 xl:px-10 min-[90rem]:px-16">
          <Plate
            className="lg:col-start-2 lg:row-start-1 lg:row-end-10"
            frameClassName="h-[100px] max-[399px]:h-[84px] lg:h-auto lg:min-h-0 lg:flex-1"
            captionClassName="mt-px max-sm:hidden lg:mt-0.5"
            caption="A guide with one of the herd."
          >
            <Image
              src="/images/farm/farmer-with-highland-cow.jpg"
              alt="A farm guide kneeling beside a resting Highland cow"
              fill
              priority
              fetchPriority="high"
              sizes="(min-width: 1440px) 520px, (min-width: 1024px) 38vw, calc(100vw - 56px)"
              // Phone: a short 3.3:1 band of the 3:2 photo (so the three tiles clear the fold); 48% keeps the guide's face and the cow's head in frame (desktop is portrait, so only x matters).
              className="object-cover object-[40%_48%]"
            />
          </Plate>

          <p className="m-0 mt-3.5 font-display text-[18px] italic text-fern lg:col-start-1 lg:row-start-2 lg:mt-0 lg:text-[22px] max-sm:mt-2.5">
            Gift certificates<span data-season-only="gift">, for the holidays</span>
          </p>
          <h1
            id="gift-hero-title"
            className="field-heading mt-0.5 text-[34px] leading-[1.02] text-ink max-[359px]:text-[29px] lg:col-start-1 lg:row-start-3 lg:mt-1 lg:text-[48px] xl:text-[56px]"
          >
            Give a day at the farm
          </h1>
          <p className="m-0 mt-2.5 font-sans text-[14px] leading-[1.5] text-ink-body lg:col-start-1 lg:row-start-4 lg:mt-5 lg:max-w-[580px] lg:text-[17px] lg:leading-[1.6]">
            A private tour with the Highland cows, a Nordic spa session, or both. You pay what it costs to book;
            they choose the date.
          </p>

          <FieldReviewTier tier="hero" className="mt-2.5 lg:col-start-1 lg:row-start-5 lg:mt-5" />

          <div data-hero-cta className="mt-3.5 lg:col-start-1 lg:row-start-6 lg:mt-7 lg:max-w-[600px]">
            <GiftChooser tiles={TILES} proof={<FieldReview spec={GIFTS_VALERIE_QUOTE} role="Farm tour" size="sm" metaClassName="mt-1 lg:text-[11px]" />} />
          </div>
        </div>
      </section>

      <div className="surface-paper bg-paper font-sans text-ink">
        {/* How it works: only what is true */}
        <FieldSection
          id="how"
          tone="light"
          aria-label="How it works"
          innerClassName="lg:grid lg:grid-cols-12 lg:gap-x-16"
        >
          <div className="lg:col-span-5">
            <FieldSectionHeader eyebrow="From checkout to their day on the farm" title="How it works" />
            <FieldDrawing name="gift-card" className="mt-5 h-auto w-[132px] lg:mt-8 lg:w-[220px]" sizes="(min-width: 1024px) 220px, 132px" />
          </div>
          <FieldSequence
            className="mt-7 lg:col-span-7 lg:mt-0"
            items={[
              {
                id: "choose",
                title: "Choose the gift and pay",
                body: "In the gift store, choose The Highland Experience for a Highland Day.",
              },
              {
                id: "email",
                title: "The code arrives by email",
                body: "Right after checkout, you get an email with the certificate code. Print it for a card, or forward it.",
              },
              {
                id: "book",
                title: "They book their date",
                body: "Online, entering the code at checkout. If it covers the booking, there's nothing more to pay.",
              },
              {
                id: "dates",
                title: "Dates open about three to four months out",
                body: "Once a date is booked, it's final, like every tour and spa booking.",
              },
            ]}
          />
        </FieldSection>

        {/* Booked as a surprise: verbatim, never claimed to be certificates */}
        <FieldSection id="surprise" eyebrow="In their words" title="Booked as a surprise">
          <ul
            role="list"
            className="m-0 mt-7 list-none border-t border-rule p-0 lg:mt-10 lg:grid lg:grid-cols-2 lg:gap-x-16 lg:border-t-0"
          >
            <li className="border-b border-rule py-6 lg:border-b-0 lg:border-t lg:py-8">
              <FieldReview spec={GIFTS_KSCHROE_QUOTE} role="Farm tour" size="lg" />
            </li>
            <li className="border-b border-rule py-6 lg:border-b-0 lg:border-t lg:py-8">
              <FieldReview spec={GIFTS_STEWART_QUOTE} size="lg" />
            </li>
          </ul>
        </FieldSection>

        <VisitFaq eyebrow="Before you give it" title="Gift questions" items={giftFAQ} />
      </div>

      <FieldStickyBar
        primary={{
          label: "Choose a gift",
          sublabel: `From $${LOWEST}. They pick the date.`,
          booking: { title: "Choose a gift certificate" },
          href: giftCatalogUrl("gifts-sticky-mobile"),
        }}
        hideWhenVisible="#choose"
      />

      {/* Modal mount: every gift row opens the Acuity catalog here */}
      <BookingModalRoot />
    </>
  );
}
