import { Suspense } from "react";
import Image from "next/image";
import { Plate } from "@/components/ui/FieldGuide";
import { FieldReviewTier } from "@/components/field/Reviews";
import { NextAvailability } from "@/components/shared/NextAvailability";
import { SpaPicker } from "@/components/shared/VisitPickers";
import { nativeCalendarEnabled } from "@/lib/booking/flag";

/**
 * /nordic-spa first screen (round 3 board): ad-hook H1, the hero-tier proof
 * line, and the spot picker as the CTA. Every row opens the spa calendar
 * (Acuity type 85942611) through BookingTextLink, with its own utm_content,
 * a party size on booking_start and, for 1, 2 and 6, Quantity prefilled.
 * Desktop follows the Field Guide 7/5 grid. Round 4: the phone plate is 140px
 * and the body two lines, so all four rows, "All six spots" included, sit
 * above 660px (measured 596 to 652 at 393x660).
 */
export function SpaHero() {
  return (
    <section
      aria-labelledby="spa-hero-title"
      className="surface-paper bg-paper pt-[var(--header-h,104px)] text-ink"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col px-5 pb-8 pt-[18px] lg:grid lg:min-h-[clamp(600px,calc(100svh_-_var(--header-h,128px)),900px)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[1fr_repeat(5,auto)_1fr] lg:gap-x-16 lg:px-10 lg:pb-10 lg:pt-11 xl:px-10 min-[90rem]:px-16">
        <Plate
          className="lg:col-start-2 lg:row-start-1 lg:row-end-8"
          frameClassName="h-[140px] max-[359px]:h-[100px] sm:h-[190px] lg:h-auto lg:min-h-0 lg:flex-1"
          captionClassName="mt-px max-[359px]:hidden lg:mt-0.5"
          caption="Two guests in the cedar sauna."
        >
          <Image
            src="/images/spa/spa-robes.jpg"
            alt="Two guests in white robes, laughing together on the cedar benches of the sauna"
            fill
            priority
            fetchPriority="high"
            // The phone frame is about 334 CSS px wide. Reporting 250px makes a 3x phone
            // take the 750w rendition instead of 1080w (196 KB); 2x phones take 750w
            // either way. Tablets keep the full frame width. Same photo, same crop.
            sizes="(min-width: 1440px) 520px, (min-width: 1024px) 38vw, (min-width: 640px) calc(100vw - 80px), 250px"
            className="object-cover object-[50%_22%]"
          />
        </Plate>

        <h1
          id="spa-hero-title"
          className="field-heading mt-3.5 text-[34px] leading-[1.02] text-ink max-[359px]:text-[29px] lg:col-start-1 lg:row-start-2 lg:mt-0 lg:text-[48px] xl:text-[56px] min-[90rem]:text-[60px]"
        >
          Six people. Ninety minutes. Rain or shine.
        </h1>

        <p className="m-0 mt-2.5 font-sans text-[14px] leading-[1.5] text-ink-body lg:col-start-1 lg:row-start-3 lg:mt-5 lg:max-w-[600px] lg:text-[17px] lg:leading-[1.6]">
          A wood-burning cedar sauna, a wet sauna and a cold plunge. Ages 16 and up; robes and towels are on us.
        </p>

        <FieldReviewTier tier="hero" className="mt-2.5 lg:col-start-1 lg:row-start-4 lg:mt-5" />

        <div data-hero-cta className="mt-3.5 lg:col-start-1 lg:row-start-5 lg:mt-7 lg:max-w-[600px]">
          <SpaPicker
            where="hero"
            prefix="nordic-spa"
            label="How many are coming? Pick to see sessions"
            labelId="spa-size-label"
            native={nativeCalendarEnabled()}
          />
        </div>

        <p className="m-0 mt-2.5 font-sans text-[12px] leading-[1.5] text-ink-note lg:col-start-1 lg:row-start-6 lg:mt-4 lg:text-[14px]">
          <Suspense fallback={null}>
            <NextAvailability product="spa" variant="text" label="Next open:" />
          </Suspense>{" "}
          Bring a swimsuit.
        </p>
      </div>
    </section>
  );
}
