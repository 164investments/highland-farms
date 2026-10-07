import { CONTACT } from "@/lib/constants";
import { FieldRows, PendingSlot } from "@/components/ui/FieldGuide";
import { cn } from "@/lib/utils";
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

/** "Cancellation terms are provided at the time of booking. Questions before you book? Call (971) 236-2551." */
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
  pendingNote,
  className,
}: {
  variant: "index" | "slug";
  /** The stay whose minimum a slug page states (the Camp has none). */
  slug?: string;
  /** Whole-element slot for the exact terms (PendingSlot renders nothing in production). */
  pendingNote: string;
  className?: string;
}) {
  const layout = KNOW_LAYOUT[variant];
  const cancellation = {
    term: "Cancellation",
    detail: (
      <>
        <StayCancellationLine />
        <PendingSlot className="mt-2" note={pendingNote} />
      </>
    ),
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
