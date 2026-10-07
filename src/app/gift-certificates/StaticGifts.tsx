import Image from "next/image";
import { FieldReview, FieldReviewTier } from "@/components/field/Reviews";
import { FieldStickyBar } from "@/components/field/StickyBar";
import { JsonLd, faqPageJsonLd } from "@/components/field/Faq";
import { FieldPriceRows, type FieldPriceRowData } from "@/components/field/PriceRows";
import { BookingModalRoot } from "@/components/shared/BookingButton";
import { VisitFaq } from "@/components/shared/VisitFaq";
import {
  FieldDrawing,
  FieldNo,
  FieldSection,
  FieldSectionHeader,
  FieldSequence,
  Plate,
  type FieldDrawingName,
} from "@/components/ui/FieldGuide";
import { GIFTS, giftAcuityId, giftCatalogUrl, giftFAQ, giftPrice, type GiftFamily } from "@/data/gift-certificates";
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

function heroRows(): FieldPriceRowData[] {
  const row = (
    family: GiftFamily,
    id: string,
    label: FieldPriceRowData["label"],
    plain: string,
    price: string,
    extra: Partial<FieldPriceRowData> = {},
  ): FieldPriceRowData => ({
    id,
    label,
    price,
    srAction,
    labelClassName: "font-semibold",
    booking: {
      href: giftCatalogUrl(`gifts-hero-${family}`, giftAcuityId(family, family === "spa" ? 1 : 2)),
      label: plain,
      title: `Choose a ${plain} gift certificate`,
    },
    ...extra,
  });
  return [
    row("tour", "tour", "Farm tour", "Farm tour", `$${TOUR_FOR_TWO} for two`),
    row("spa", "spa", "Nordic spa", "Nordic spa", `$${SPA_EACH} per person`),
    row("day", "day", "Highland Day", "Highland Day", `$${DAY_FOR_TWO} for two`, {
      highlight: true,
      tag: "Tour and spa",
      tagBelow: true,
      priceClassName: "font-semibold",
    }),
  ];
}

function ledgerRows(family: GiftFamily): FieldPriceRowData[] {
  return GIFTS[family].sizes.map((s) => {
    const label = family === "spa" ? (s.guests === 1 ? "1 person" : `${s.guests} people`) : `${s.guests} guests`;
    const two = family !== "spa" && s.guests === 2;
    return {
      id: String(s.guests),
      label,
      price: `$${s.price}`,
      highlight: two,
      priceClassName: cn16(two),
      labelClassName: "lg:text-[24px]",
      srAction,
      booking: {
        href: giftCatalogUrl(`gifts-${family}-${s.guests}`, s.acuityId),
        label,
        title: `Choose a ${family === "tour" ? "farm tour" : family === "spa" ? "Nordic spa" : "Highland Day"} gift certificate for ${label}`,
      },
    };
  });
}

/** Phone: two 64px drawings side by side, the second overlapping by 16px (112px in all). */
function cn64(i: number): string {
  return i === 0 ? "h-[64px] w-[64px]" : "-ml-4 h-[64px] w-[64px]";
}

function cn16(bold: boolean): string {
  return bold ? "font-semibold lg:text-[16px]" : "lg:text-[16px]";
}

interface EntryProps {
  n: number;
  title: string;
  line: string;
  body: string;
  family: GiftFamily;
  plates: FieldDrawingName[];
  first?: boolean;
}

function GiftEntry({ n, title, line, body, family, plates, first }: EntryProps) {
  const single = plates.length === 1;
  return (
    <article
      className={
        first
          ? "mt-8 border-t border-rule pt-6 lg:mt-12 lg:grid lg:grid-cols-12 lg:gap-x-16 lg:pt-10"
          : "mt-12 lg:mt-20 lg:grid lg:grid-cols-12 lg:gap-x-16 lg:pt-10"
      }
    >
      <div className="hidden lg:col-span-3 lg:flex lg:items-center lg:gap-2">
        {plates.map((name) => (
          <FieldDrawing
            key={name}
            name={name}
            className={single ? "lg:h-[260px] lg:w-[260px]" : "lg:h-[128px] lg:w-[128px]"}
            sizes={single ? "260px" : "128px"}
          />
        ))}
      </div>
      <div className="lg:col-span-9">
        <div className={single ? "grid grid-cols-[1fr_88px] items-start gap-3 lg:block" : "grid grid-cols-[1fr_112px] items-start gap-3 lg:block"}>
          <div>
            <FieldNo n={n} />
            <h3 className="field-heading m-0 mt-1 font-display text-[32px] leading-[1.02] text-ink lg:text-[46px]">
              {title}
            </h3>
            <p className="m-0 mt-1 font-display text-[18px] italic text-ink-note lg:text-[21px]">{line}</p>
          </div>
          <div className={single ? "lg:hidden" : "flex w-[112px] items-center lg:hidden"}>
            {plates.map((name, i) => (
              <FieldDrawing
                key={name}
                name={name}
                className={single ? "h-[88px] w-[88px]" : cn64(i)}
                sizes={single ? "88px" : "64px"}
              />
            ))}
          </div>
        </div>
        <p className="m-0 mt-3 max-w-[640px] font-sans text-[15px] leading-[1.6] text-ink-body lg:text-[16px]">
          {body}
        </p>
        <FieldPriceRows rows={ledgerRows(family)} className="mt-4 max-w-[560px]" />
      </div>
    </article>
  );
}

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
            frameClassName="h-[160px] max-[359px]:h-[110px] lg:h-auto lg:min-h-0 lg:flex-1"
            captionClassName="mt-px max-[359px]:hidden lg:mt-0.5"
            caption="Feeding a calf in the hay."
          >
            <Image
              src="/images/farm/agritourism-stay.jpg"
              alt="Two people feeding a shaggy Highland calf in the hay, the herd behind them"
              fill
              priority
              fetchPriority="high"
              sizes="(min-width: 1440px) 520px, (min-width: 1024px) 38vw, calc(100vw - 56px)"
              // Phone: a 2.1:1 band of the square photo; 33% keeps the man's face in frame (desktop is portrait, so only x matters).
              className="object-cover object-[60%_33%]"
            />
          </Plate>

          <p className="m-0 mt-3.5 font-display text-[18px] italic text-fern lg:col-start-1 lg:row-start-2 lg:mt-0 lg:text-[22px]">
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
            {/* "No expiration date" rides in the label, so it is on the first screen at no height cost. */}
            <FieldPriceRows label="Choose a gift · No expiration date" labelId="gift-pick-label" rows={heroRows()} />
            <p className="m-0 mt-2 font-sans text-[12px] leading-[1.5] text-ink-note lg:text-[14px]">
              At checkout, the Highland Day is listed as &ldquo;The Highland Experience.&rdquo; The code arrives by
              email right after, to print or forward.
            </p>
          </div>

          <div className="mt-4 border-t border-rule pt-3.5 lg:col-start-1 lg:row-start-7 lg:mt-6 lg:max-w-[600px] lg:pt-5">
            <FieldReview spec={GIFTS_VALERIE_QUOTE} role="Farm tour" size="sm" metaClassName="mt-1 lg:text-[11px]" />
          </div>
        </div>
      </section>

      <div className="surface-paper bg-paper font-sans text-ink">
        {/* S2 The three gifts (#choose is the masthead action's target) */}
        <FieldSection id="choose" rule="double" eyebrow="Three gifts, every group size" title="Pick their group size">
          <GiftEntry
            first
            n={1}
            family="tour"
            title="The farm tour"
            line="For the one who stops the car for every cow."
            body="A private 60-minute tour for their group: into the pen to feed, brush and pet the Highland cows, then the fern-forest trail to the Icelandic sheep. Kids 4 and under come free."
            plates={["highland-cow"]}
          />
          <GiftEntry
            n={2}
            family="spa"
            title="The Nordic spa"
            line="For the friend who needs ninety quiet minutes."
            body="One 90-minute session per person: the wood-burning cedar sauna, the wet sauna and the cold plunge, robes and towels included. Spa guests must be 16 or older. Give six, and the group can book a whole session to themselves."
            plates={["sauna-cabin"]}
          />
          <GiftEntry
            n={3}
            family="day"
            title="Highland Day"
            line="Meet the herd, then the sauna."
            body="For anyone who wants both: a private farm tour plus a spa spot for each guest, the same price as booking both. They book them as two appointments; on the same day, the tour comes first."
            plates={["highland-cow", "sauna-cabin"]}
          />
        </FieldSection>

        {/* S3 How it works: only what is true */}
        <FieldSection
          id="how"
          tone="light"
          aria-label="How it works"
          innerClassName="lg:grid lg:grid-cols-12 lg:gap-x-16"
        >
          <FieldSectionHeader
            eyebrow="From checkout to their day on the farm"
            title="How it works"
            className="lg:col-span-5"
          />
          <FieldSequence
            className="mt-7 lg:col-span-7 lg:mt-0"
            items={[
              {
                id: "choose",
                title: "Choose the gift and pay",
                body: "Checkout is on our booking site and opens on this page.",
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
                body: "The certificate has no expiration date, so a holiday gift can become a winter or spring visit. Once a date is booked, it's final, like every tour and spa booking.",
              },
            ]}
          />
        </FieldSection>

        {/* S4 Booked as a surprise: verbatim, never claimed to be certificates */}
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
