import { BookingTextLink } from "@/components/shared/BookingButton";
import { FieldArrow, FieldSection, PendingSlot } from "@/components/ui/FieldGuide";
import { TOUR_PARTY_SIZES } from "@/data/farm-tours";
import { SPA_PRICE_PER_PERSON } from "@/data/nordic-spa";
import { BOOKING_PRODUCTS } from "@/lib/booking/products";
import { BOOKING_LINKS, bookingUrl } from "@/lib/constants";

const TOUR_FOR_TWO = TOUR_PARTY_SIZES[0].total;
const TOUR_MINUTES = BOOKING_PRODUCTS["farm-tour"].durationMin;
const SPA_MINUTES = BOOKING_PRODUCTS["nordic-spa"].durationMin;
/** A tour for two plus two spa spots: arithmetic from the booking prices, no discount. */
const DAY_FOR_TWO = TOUR_FOR_TWO + SPA_PRICE_PER_PERSON * 2;

const stepClass =
  "grid min-h-[64px] w-full grid-cols-[40px_1fr_auto] items-center gap-x-3 border-b border-rule py-2 text-left text-ink transition-colors hover:text-pine";

/**
 * "Plan your Highland Day": one block, one copy, on /farm-tours,
 * /nordic-spa and /sauna-near-portland. Hayden's decision (2026-10-06): the
 * Highland Day is a named planned day of two separate bookings, tour first.
 * No bundle, no discount. Each step is a BookingTextLink, so booking_start
 * and the Acuity modal behave as on every other booking row.
 *
 * `utmPrefix`: "farm-tours-day" | "nordic-spa-day" | "sauna-near-portland-day".
 */
export function HighlandDayBlock({ utmPrefix }: { utmPrefix: string }) {
  return (
    <FieldSection pad="none" innerClassName="py-12 lg:py-20" aria-label="Plan your Highland Day">
      <div className="border border-frame bg-paper-light px-5 py-7 lg:grid lg:grid-cols-12 lg:gap-x-16 lg:px-12 lg:py-12">
        <div className="lg:col-span-5">
          <p className="m-0 font-display text-[20px] italic text-fern lg:text-[24px]">Plan your Highland Day</p>
          <h2 className="field-heading m-0 mt-1 font-display text-[36px] leading-[1.02] text-ink lg:text-[52px]">
            Meet the herd, then the sauna
          </h2>
          <p className="m-0 mt-3 max-w-[520px] font-sans text-[15px] leading-[1.6] text-ink-body lg:text-[16px]">
            Make it a half day: a private farm tour, then the Nordic spa. It&apos;s two bookings on the same day, at
            least an hour apart. Book the tour first, then your spa spots.
          </p>
        </div>
        <div className="mt-6 lg:col-span-7 lg:mt-0">
          <ol className="m-0 list-none border-t border-rule p-0">
            <li>
              <BookingTextLink
                href={bookingUrl(BOOKING_LINKS.farmTourForTwo, `${utmPrefix}-tour`)}
                label="Pick your tour time"
                title="Book a farm tour for your Highland Day"
                className={stepClass}
              >
                <span className="font-display text-[28px] leading-none text-fern" aria-hidden="true">
                  I
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-display text-[22px] font-semibold leading-tight lg:text-[26px]">
                    Pick your tour time
                  </span>
                  <span className="font-sans text-[13px] text-ink-note lg:text-[14px]">
                    ${TOUR_FOR_TWO} for two, {TOUR_MINUTES} minutes
                  </span>
                </span>
                <FieldArrow className="text-pine" />
              </BookingTextLink>
            </li>
            <li>
              <BookingTextLink
                href={bookingUrl(BOOKING_LINKS.nordicSpa, `${utmPrefix}-spa`)}
                label="Add your spa spots"
                title="Book spa spots for your Highland Day"
                className={stepClass}
              >
                <span className="font-display text-[28px] leading-none text-fern" aria-hidden="true">
                  II
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-display text-[22px] font-semibold leading-tight lg:text-[26px]">
                    Add your spa spots
                  </span>
                  <span className="font-sans text-[13px] text-ink-note lg:text-[14px]">
                    ${SPA_PRICE_PER_PERSON} per person, {SPA_MINUTES} minutes
                  </span>
                </span>
                <FieldArrow className="text-pine" />
              </BookingTextLink>
            </li>
          </ol>
          <p className="m-0 mt-3 font-sans text-[13px] leading-[1.55] text-ink-note lg:text-[14px]">
            For two of you: ${DAY_FOR_TWO} in all. Tours are for two to six paying guests; spa guests must be 16 or
            older.
          </p>
          <PendingSlot
            className="mt-3"
            note="PENDING CONNOR (J9): the two time pairs to suggest, for example a 10:00 tour, then the 1:00 spa session"
          />
        </div>
      </div>
    </FieldSection>
  );
}
