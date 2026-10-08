import Link from "next/link";
import { BOOKING_LINKS, CONTACT, bookingUrl } from "@/lib/constants";
import { FieldArrow, FieldRows } from "@/components/ui/FieldGuide";
import { BookingTextLink } from "@/components/shared/BookingButton";
import { cn } from "@/lib/utils";
import { StayPhoto } from "./StayParts";
import {
  PHONE_TEL,
  stayMinimumFor,
  STAY_CANCELLATION,
  STAY_GETTING_HERE,
  STAY_LATER_MONTHS_NOTE,
  STAY_LATER_STAY_LEAD,
  STAY_LATER_STAY_TAIL,
  STAY_MINIMUM,
  STAY_PETS,
  STAY_PRICE_PLAIN,
  STAY_QUESTIONS_LEAD,
  SPA_PER_PERSON,
  TOUR_FOR_TWO,
} from "./stay-facts";

/*
 * The sentences that repeat across /stay and the four /stay/[slug] pages, set
 * once so each fact has one wording everywhere (CONSISTENCY #2 and #10).
 */

/** The farm's one public line, as a tap-to-call link. */
export function StayPhoneLink() {
  return (
    <a href={PHONE_TEL} className="whitespace-nowrap font-medium text-pine underline underline-offset-4">
      {CONTACT.phone}
    </a>
  );
}

/** "All stay bookings are final, with no refunds. Questions before you book? Call (971) 236-2551." */
export function StayCancellationLine() {
  return (
    <>
      {STAY_CANCELLATION} {STAY_QUESTIONS_LEAD} <StayPhoneLink />.
    </>
  );
}

/** "Tours and spa are booked separately ... Staying with us on a later date? Call (971) 236-2551 and we'll book them for you." */
export function StayLaterStayLine() {
  return (
    <>
      {STAY_LATER_MONTHS_NOTE} {STAY_LATER_STAY_LEAD} <StayPhoneLink /> {STAY_LATER_STAY_TAIL}
    </>
  );
}

const KNOW_LAYOUT = {
  index: {
    row: "gap-4 py-3.5 lg:gap-6 lg:py-5",
    term: "w-[104px] lg:w-[200px] lg:text-[23px]",
    detail: "min-w-0 text-[14px] leading-[1.55] lg:text-[16px]",
  },
  slug: {
    row: "gap-4 py-3.5 lg:gap-6 lg:py-3",
    term: "w-[104px] lg:w-[150px] lg:text-[21px]",
    detail: "min-w-0 text-[14px] leading-[1.55] lg:text-[15px]",
  },
} as const;

/**
 * "Know before you book" as a two-column list on every screen size. /stay
 * shows all five rows; a stay page shows its own minimum (once) and leaves
 * out the price, which its booking card states.
 */
export function StayKnowRows({
  variant,
  slug,
  className,
}: {
  variant: "index" | "slug";
  /** The stay whose minimum a slug page states (the Camp has none). */
  slug?: string;
  className?: string;
}) {
  const layout = KNOW_LAYOUT[variant];
  const cancellation = {
    term: "Cancellation",
    detail: <StayCancellationLine />,
  };
  const rows = [
    ...(variant === "index"
      ? [
          { term: "Minimum", detail: STAY_MINIMUM },
          { term: "Price", detail: STAY_PRICE_PLAIN },
        ]
      : slug && stayMinimumFor(slug)
        ? [{ term: "Minimum", detail: stayMinimumFor(slug) }]
        : []),
    cancellation,
    { term: "Pets", detail: STAY_PETS },
    { term: "Getting here", detail: STAY_GETTING_HERE },
  ];
  return (
    <FieldRows
      size="list"
      className={cn(className)}
      rowClassName={layout.row}
      termClassName={layout.term}
      detailClassName={layout.detail}
      rows={rows}
    />
  );
}

const HERE_ROW_CLASS =
  "flex min-h-[64px] w-full items-center gap-3 border-b border-rule py-2 text-left";

/** One "While you're here" row: small real photo, title, one true note, arrow. */
function HereRowBody({ src, position, title, note }: { src: string; position?: string; title: string; note: string }) {
  return (
    <>
      <span className="block h-[58px] w-[76px] shrink-0 border border-frame bg-paper-light p-[3px]">
        <span className="relative block h-full w-full overflow-hidden">
          <StayPhoto photo={{ src, alt: "", position }} sizes="76px" />
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="font-display text-[19px] font-semibold leading-[1.1] text-ink">{title}</span>
        <span className="font-sans text-[13px] leading-[1.35] text-ink-note">{note}</span>
      </span>
      <span className="shrink-0 text-pine">
        <FieldArrow />
      </span>
    </>
  );
}

/**
 * "While you're here" on /stay and every stay page: the Thanksgiving row (season-gated, passed in), then the farm tour
 * and the Nordic spa as the same small photo rows. The tour and spa rows open the booking modal (booking_start).
 */
export function StayHereRows({
  slugKey,
  thanksgiving,
  className,
}: {
  /** Tracking suffix: "add" on /stay ("stay-add-tour"), else the stay slug ("stay-lodge-tour"). */
  slugKey: string;
  thanksgiving?: { src: string; position?: string; title: string; note: string };
  className?: string;
}) {
  const track = (what: string) => (slugKey === "add" ? `stay-add-${what}` : `stay-${slugKey}-${what}`);
  return (
    <div className={cn("flex flex-col border-t border-rule lg:max-w-[760px]", className)}>
      {thanksgiving && (
        <Link href="/thanksgiving" data-season-only="thanksgiving-links" className={HERE_ROW_CLASS}>
          <HereRowBody {...thanksgiving} />
        </Link>
      )}
      <BookingTextLink
        href={bookingUrl(BOOKING_LINKS.farmTourForTwo, track("tour"))}
        label="See tour dates"
        title="Private farm tour"
        className={HERE_ROW_CLASS}
      >
        <HereRowBody
          src="/images/farm/cow-calf.jpg"
          title="A private farm tour"
          note={`Meet the Highland cows. $${TOUR_FOR_TWO} for two.`}
        />
      </BookingTextLink>
      <BookingTextLink
        href={bookingUrl(BOOKING_LINKS.nordicSpa, track("spa"))}
        label="See open sessions"
        title="Nordic spa"
        className={HERE_ROW_CLASS}
      >
        <HereRowBody
          src="/images/spa/spa-exterior-plunge-moss.jpg"
          title="The Nordic spa"
          note={`Sauna and cold plunge in the forest. $${SPA_PER_PERSON} a person.`}
        />
      </BookingTextLink>
    </div>
  );
}
