import { Suspense } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { FieldArrow, Plate } from "@/components/ui/FieldGuide";
import { BookingTextLink } from "@/components/shared/BookingButton";
import { NextAvailability } from "@/components/shared/NextAvailability";
import { TOUR_PARTY_SIZES } from "@/data/farm-tours";
import { FARM_TOUR_PARTY_LINKS, bookingUrl } from "@/lib/constants";

/**
 * /farm-tours first screen (B-tours board, approved 2026-10-06). The price
 * table is the CTA: each row opens that party size's Acuity calendar through
 * BookingTextLink, so booking_start, InitiateCheckout, attribution and the
 * modal behave exactly as the old hero button did. Desktop follows the Field
 * Guide grid: text in the 7fr column, the framed plate in the 5fr one.
 */
export function ToursHero() {
  return (
    <section
      aria-labelledby="tours-hero-title"
      className="surface-paper bg-paper pt-[var(--header-h,104px)] text-ink"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col px-5 pb-8 pt-[18px] lg:grid lg:min-h-[clamp(600px,calc(100svh_-_var(--header-h,128px)),900px)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[1fr_repeat(4,auto)_1fr] lg:gap-x-16 lg:px-10 lg:pb-10 lg:pt-11 xl:px-10 min-[90rem]:px-16">
        <Plate
          className="lg:col-start-2 lg:row-start-1 lg:row-end-7"
          frameClassName="h-[200px] lg:h-auto lg:min-h-0 lg:flex-1"
          captionClassName="mt-px lg:mt-0.5"
          caption="A guide with one of the herd."
        >
          <Image
            src="/images/farm/farmer-with-highland-cow.jpg"
            alt="A farm guide kneeling beside a resting Highland cow"
            fill
            priority
            fetchPriority="high"
            sizes="(min-width: 1440px) 520px, (min-width: 1024px) 38vw, calc(100vw - 56px)"
            className="object-cover object-[40%_55%]"
          />
        </Plate>

        <h1
          id="tours-hero-title"
          className="field-heading mt-3.5 text-[34px] leading-[1.02] text-ink lg:col-start-1 lg:row-start-2 lg:mt-0 lg:text-[48px] xl:text-[56px] min-[90rem]:text-[60px]"
        >
          An hour in the pen with the herd
        </h1>

        <p className="m-0 mt-2.5 font-sans text-[14px] leading-[1.5] text-ink-body lg:col-start-1 lg:row-start-3 lg:mt-5 lg:max-w-[600px] lg:text-[17px] lg:leading-[1.6]">
          A private tour for your group only. Feed, brush and pet the Highland cows, then walk the
          fern-forest trail to the Icelandic sheep. Rain or shine.
        </p>

        <div data-hero-cta className="lg:col-start-1 lg:row-start-4 lg:max-w-[600px]">
          <p
            id="tour-size-label"
            className="m-0 mb-1.5 mt-4 font-sans text-[11px] uppercase tracking-[0.16em] text-ink-meta lg:mb-2 lg:mt-8 lg:text-[12px]"
          >
            How many are coming? Pick to see dates
          </p>
          <ul aria-labelledby="tour-size-label" className="m-0 list-none border-t border-rule p-0">
            {TOUR_PARTY_SIZES.map(({ guests, total, popular }) => (
              <li key={guests}>
                <BookingTextLink
                  href={bookingUrl(FARM_TOUR_PARTY_LINKS[guests], `farm-tours-hero-${guests}`)}
                  label={`${guests} guests`}
                  title={`Book a farm tour for ${guests}`}
                  className={cn(
                    "flex min-h-[46px] w-full items-center gap-2.5 border-b border-rule text-left text-ink transition-colors hover:bg-paper-shade/60 lg:min-h-14 lg:gap-3",
                    popular && "-mx-2.5 w-[calc(100%+20px)] bg-paper-shade px-2.5 hover:bg-paper-shade",
                  )}
                >
                  <span
                    className={cn(
                      "font-display text-[22px] leading-none lg:text-[26px]",
                      popular ? "font-semibold" : "font-medium",
                    )}
                  >
                    {guests} guests
                  </span>
                  {popular && (
                    <span className="font-sans text-[11px] uppercase tracking-[0.1em] text-pine lg:text-[12px]">
                      Most popular
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className="min-w-4 flex-1 translate-y-1 border-b-[1.5px] border-dotted border-leader"
                  />
                  <span
                    className={cn(
                      "font-sans text-[15px] lg:text-[17px]",
                      popular && "font-semibold",
                    )}
                  >
                    ${total}
                  </span>
                  <span className="sr-only">, see open dates</span>
                  <FieldArrow size={16} strokeWidth={1.8} className="text-pine lg:size-[18px]" />
                </BookingTextLink>
              </li>
            ))}
          </ul>
        </div>

        <p className="m-0 mt-2.5 font-sans text-[12px] leading-[1.5] text-ink-note lg:col-start-1 lg:row-start-5 lg:mt-4 lg:text-[14px]">
          Kids 4 and under come free and don&apos;t count.{" "}
          <Suspense fallback={null}>
            <NextAvailability variant="text" label="Next open tour:" />
          </Suspense>
        </p>
      </div>
    </section>
  );
}
