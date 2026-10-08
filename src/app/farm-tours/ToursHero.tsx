import { Suspense } from "react";
import Image from "next/image";
import { Plate } from "@/components/ui/FieldGuide";
import { FieldReviewTier } from "@/components/field/Reviews";
import { NextAvailability } from "@/components/shared/NextAvailability";
import { TourPicker } from "@/components/shared/VisitPickers";
import { nativeCalendarEnabled } from "@/lib/booking/flag";

/**
 * /farm-tours first screen (B-tours board, approved 2026-10-06, plus the
 * hero-tier proof line). The price table is the CTA: each row opens that
 * party size's Acuity calendar through BookingTextLink, so booking_start
 * (with the party size and price), InitiateCheckout, attribution and the
 * modal behave exactly as the old hero button did. Desktop follows the Field
 * Guide grid: text in the 7fr column, the framed plate in the 5fr one.
 */
export function ToursHero() {
  return (
    <section
      aria-labelledby="tours-hero-title"
      className="surface-paper bg-paper pt-[var(--header-h,104px)] text-ink"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col px-5 pb-8 pt-[18px] lg:grid lg:min-h-[clamp(600px,calc(100svh_-_var(--header-h,128px)),900px)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[1fr_repeat(5,auto)_1fr] lg:gap-x-16 lg:px-10 lg:pb-10 lg:pt-11 xl:px-10 min-[90rem]:px-16">
        <Plate
          className="lg:col-start-2 lg:row-start-1 lg:row-end-8"
          frameClassName="h-[150px] max-[399px]:h-[140px] max-[359px]:h-[110px] lg:h-auto lg:min-h-0 lg:flex-1"
          captionClassName="mt-px max-[399px]:hidden lg:mt-0.5"
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
          className="field-heading mt-3 text-[34px] leading-[1.02] text-ink max-[359px]:text-[29px] lg:col-start-1 lg:row-start-2 lg:mt-0 lg:text-[48px] xl:text-[56px] min-[90rem]:text-[60px]"
        >
          An hour in the pen with the herd
        </h1>

        <p className="m-0 mt-2.5 font-sans text-[14px] leading-[1.5] text-ink-body lg:col-start-1 lg:row-start-3 lg:mt-5 lg:max-w-[600px] lg:text-[17px] lg:leading-[1.6]">
          A private tour for your group only. Feed, brush and pet the Highland cows, then walk the
          fern-forest trail to the Icelandic sheep. Rain or shine.
        </p>

        <FieldReviewTier tier="hero" className="mt-2.5 lg:col-start-1 lg:row-start-4 lg:mt-5" />

        <div data-hero-cta className="mt-3 lg:col-start-1 lg:row-start-5 lg:mt-7 lg:max-w-[600px]">
          <TourPicker
            where="hero"
            label="How many are coming? Pick to see dates"
            labelId="tour-size-label"
            native={nativeCalendarEnabled()}
          />
        </div>

        <p className="m-0 mt-2.5 font-sans text-[12px] leading-[1.5] text-ink-note lg:col-start-1 lg:row-start-6 lg:mt-4 lg:text-[14px]">
          Kids 4 and under come free and don&apos;t count.{" "}
          <Suspense fallback={null}>
            <NextAvailability variant="text" label="Next open tour:" />
          </Suspense>
        </p>
      </div>
    </section>
  );
}
