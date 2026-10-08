import { HospitableWidget } from "./HospitableWidget";
import {
  stayMinimumFor,
  STAY_CALENDAR_NOTE,
  STAY_PRICE_CARD,
  STAY_PRICE_CARD_LEAD,
} from "./stay-facts";

interface BookingCardProps {
  widgetUrl: string;
  propertyName: string;
  propertySlug: string;
}

/**
 * Our pine-framed booking card around the Hospitable embed. The iframe itself
 * cannot be restyled (it is Hospitable's page), so the card carries one title line
 * and the price sentence only. The minimum stay and the cancellation
 * terms appear once, under "Know before you book". `id="book"` is
 * the in-page "Check dates and price" target for the masthead, the hero button
 * and the phone bar.
 */
export function BookingCard({ widgetUrl, propertyName, propertySlug }: BookingCardProps) {
  const minimum = stayMinimumFor(propertySlug);
  return (
    <section
      id="book"
      aria-label="Check dates and price"
      className="scroll-mt-[var(--header-h,104px)] pt-5 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:pt-10"
    >
      <div className="border-2 border-pine bg-paper-light lg:sticky lg:top-[var(--header-h,104px)]" data-sticky-stop>
        <div className="border-b border-rule px-4 pb-3 pt-3.5 lg:px-5">
          <h2 className="field-heading m-0 font-display text-[24px] leading-[1.05] text-ink lg:text-[28px]">
            Check dates and price
          </h2>
          <p className="m-0 mt-1 font-sans text-[13px] leading-snug text-ink-note">
            Pick your dates below, then tap <strong className="font-semibold text-ink">Reserve</strong>.
          </p>
        </div>
        <div className="px-3 pt-4 pb-3 lg:px-4">
          {/* The embed documents no theme or colour options and is Hospitable's own page, so it sits in a paper mat
              with a hairline, under the one rule that shapes the dates. */}
          {minimum && <p className="m-0 mb-2 text-center font-sans text-[13px] font-medium leading-snug text-ink">{minimum}</p>}
          <div className="border border-rule bg-paper p-2">
            <HospitableWidget widgetUrl={widgetUrl} propertyName={propertyName} propertySlug={propertySlug} />
          </div>
          <p className="m-0 mt-3 text-center font-sans text-[13px] leading-[1.5] text-ink-note">{STAY_CALENDAR_NOTE}</p>
        </div>
        <div className="border-t border-rule px-4 py-3.5 font-sans text-[13px] leading-[1.5] text-ink-body lg:px-5">
          <p className="m-0">
            <strong className="font-semibold text-ink">{STAY_PRICE_CARD_LEAD}</strong> {STAY_PRICE_CARD}
          </p>
        </div>
      </div>
    </section>
  );
}
