import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CONTACT } from "@/lib/constants";
import { TOUR_PARTY_SIZES } from "@/data/farm-tours";
import { FieldRows } from "@/components/ui/FieldGuide";

type Product = "tour" | "spa";

export interface KnowRow {
  term: string;
  detail: ReactNode;
}

const TOUR_FOR_TWO = TOUR_PARTY_SIZES[0].total;
const TOUR_EACH_AFTER = TOUR_PARTY_SIZES[1].total - TOUR_PARTY_SIZES[0].total;
const TEL = `tel:+1${CONTACT.phone.replace(/\D/g, "")}`;

/**
 * Tour rows: shared board 4 round 2. Facts from the Hayden-confirmed ops
 * sheet (agent-memory highland-farms support-chat-ops-facts 2026-07-24);
 * prices from TOUR_PARTY_SIZES. Keep in sync with farmTourFAQ.
 */
function tourRows(): KnowRow[] {
  return [
    {
      term: "Ages",
      detail: `$${TOUR_FOR_TWO} for two, $${TOUR_EACH_AFTER} for each guest after that. Kids 4 and under are free and don't count toward your group.`,
    },
    {
      term: "Group",
      detail: (
        <>
          Online booking covers two or more paying guests. Coming as one adult with a little one? Call us at{" "}
          <a href={TEL} className="whitespace-nowrap text-pine underline underline-offset-4">
            {CONTACT.phone}
          </a>{" "}
          and we&apos;ll set it up.
        </>
      ),
    },
    {
      term: "Wear",
      detail:
        "Closed-toe shoes you don't mind getting muddy. October to March, bring rain boots and a rain jacket. Tours run rain or shine.",
    },
    { term: "Access", detail: "The farm paths aren't stroller or wheelchair friendly." },
    {
      term: "Arrival",
      detail:
        "Pull through the gate, park on the right in the gravel, and meet your guide at the carved Highland cow. If you're more than 10 minutes late, your tour may be shortened or cancelled at your expense.",
    },
  ];
}

/** Spa rows. The private-session sentence needs the per-person price from the spa data. */
function spaRows(spaPricePerPerson?: number): KnowRow[] {
  const session = spaPricePerPerson
    ? `90 minutes, up to 6 guests. Want it to yourselves? Book all 6 spots for a private session, $${spaPricePerPerson * 6}.`
    : "90 minutes, up to 6 guests.";
  return [
    { term: "Ages", detail: "Guests 16 and up." },
    { term: "Bring", detail: "A swimsuit. We provide robes and towels, and there are changing areas on site." },
    { term: "Session", detail: session },
    {
      term: "Arrival",
      detail:
        "Park on the right in the gravel after the gate. If you're more than 15 minutes late, your session may be shortened or cancelled at your expense.",
    },
    {
      term: "Access",
      detail: "Rain or shine, your session runs. The spa isn't wheelchair, walker or stroller accessible.",
    },
  ];
}

interface KnowBeforeYouBookProps {
  product?: Product;
  /** Rows from the page's data file; replaces the product defaults. */
  rows?: readonly KnowRow[];
  /** Spa only: adds "Book all 6 spots for a private session, $X." to the Session row. */
  spaPricePerPerson?: number;
  heading?: string;
  /** The paper-light frame (default). Off when the section itself is the frame. */
  framed?: boolean;
  /** The booking action, then <BookingPolicyNote text={cancellationAnswer(faq)} />. */
  children?: ReactNode;
  className?: string;
}

/**
 * "Know before you book": the answers that decide whether a visitor commits
 * to a final-sale booking, in ruled rows directly above the booking button.
 */
export function KnowBeforeYouBook({
  product = "tour",
  rows,
  spaPricePerPerson,
  heading = "Know before you book",
  framed = true,
  children,
  className,
}: KnowBeforeYouBookProps) {
  const list = rows ?? (product === "tour" ? tourRows() : spaRows(spaPricePerPerson));
  return (
    <div className={cn("text-left", framed && "border border-frame bg-paper-light p-5 lg:p-8", className)}>
      <h3 className="m-0 font-display text-[24px] font-semibold leading-tight text-ink lg:text-[28px]">
        {heading}
      </h3>
      <FieldRows rows={list} size="list" className="mt-3" />
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

/**
 * The point-of-sale policy line under a booking button (CONSISTENCY #10).
 * Pass the data file's cancellation answer word for word:
 *   <BookingPolicyNote text={cancellationAnswer(farmTourFAQ)} />
 * Without `text` it falls back to the older summary (kept until every page passes the data).
 */
export function BookingPolicyNote({ text, className = "" }: { text?: string; className?: string }) {
  return (
    <p className={cn("m-0 mt-3 font-sans text-[13px] leading-[1.55] text-ink-note lg:text-[14px]", className)}>
      {text ??
        "Rain or shine, your visit runs. If we cancel for severe weather or for the safety of our animals or guests, we will refund or rebook you. All other bookings are final, so check your date and group size before you pay."}
    </p>
  );
}
