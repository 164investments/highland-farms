import { HospitableWidget } from "./HospitableWidget";
import {
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
 * cannot be restyled (it is Hospitable's page), so the card carries the steps,
 * and the price sentence only. The minimum stay and the cancellation
 * terms appear once, under "Know before you book". `id="book"` is
 * the in-page "Check dates and price" target for the masthead, the hero button
 * and the phone bar.
 */
export function BookingCard({ widgetUrl, propertyName, propertySlug }: BookingCardProps) {
  return (
    <section
      id="book"
      aria-label="Check dates and price"
      className="scroll-mt-[var(--header-h,104px)] pt-5 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:pt-10"
    >
      <div className="border-2 border-pine bg-paper-light lg:sticky lg:top-[var(--header-h,104px)]" data-sticky-stop>
        <div className="bg-pine px-4 py-3.5 text-paper-light lg:px-5">
          <h2 className="field-heading m-0 font-display text-[26px] leading-[1.05] text-paper-light lg:text-[30px]">
            Check dates and price
          </h2>
          <p className="m-0 mt-0.5 font-sans text-[13px] text-paper-light/85">Booking direct with Highland Farms</p>
        </div>
        <ol className="m-0 flex list-none flex-col border-b border-rule p-0 px-4 font-sans text-[14px] leading-snug text-ink lg:px-5">
          <li className="flex items-baseline gap-3 border-b border-rule py-2.5">
            <span aria-hidden="true" className="w-5 shrink-0 font-display text-[19px] italic text-fern">
              I
            </span>
            Pick your dates in the calendar below.
          </li>
          <li className="flex items-baseline gap-3 py-2.5">
            <span aria-hidden="true" className="w-5 shrink-0 font-display text-[19px] italic text-fern">
              II
            </span>
            <span>
              Then tap <strong className="font-semibold">Reserve</strong>. You see the full total before you pay.
            </span>
          </li>
        </ol>
        <div className="px-3 pt-4 pb-3 lg:px-4">
          <HospitableWidget widgetUrl={widgetUrl} propertyName={propertyName} propertySlug={propertySlug} />
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
