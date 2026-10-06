import { Suspense } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { FieldArrow, FieldRows, Plate, fieldCtaClass } from "@/components/ui/FieldGuide";
import { BookingButton } from "@/components/shared/BookingButton";
import { NextAvailability } from "@/components/shared/NextAvailability";
import { SPA_CIRCUIT } from "@/data/nordic-spa";

/**
 * /nordic-spa first screen (B-spa board, approved 2026-10-06): plate, the
 * Heat / Steam / Cold / Rest circuit, price line, "See open sessions"
 * through the existing BookingButton (same tracking and modal), and the
 * live next-open date. Desktop follows the Field Guide 7/5 grid.
 */
export function SpaHero({ bookingHref }: { bookingHref: string }) {
  return (
    <section
      aria-labelledby="spa-hero-title"
      className="surface-paper bg-paper pt-[var(--header-h,104px)] text-ink"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col px-5 pb-8 pt-[18px] lg:grid lg:min-h-[clamp(600px,calc(100svh_-_var(--header-h,128px)),900px)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[1fr_repeat(5,auto)_1fr] lg:gap-x-16 lg:px-10 lg:pb-10 lg:pt-11 xl:px-10 min-[90rem]:px-16">
        <Plate
          className="lg:col-start-2 lg:row-start-1 lg:row-end-8"
          frameClassName="h-[200px] lg:h-auto lg:min-h-0 lg:flex-1"
          captionClassName="mt-px lg:mt-0.5"
          caption="The cold plunge, out on the deck."
        >
          <Image
            src="/images/spa/spa-exterior-plunge-moss.jpg"
            alt="The cold plunge on the cedar deck beside a moss-covered tree"
            fill
            priority
            fetchPriority="high"
            sizes="(min-width: 1440px) 520px, (min-width: 1024px) 38vw, calc(100vw - 56px)"
            className="object-cover object-[50%_60%]"
          />
        </Plate>

        <h1
          id="spa-hero-title"
          className="field-heading mt-3.5 text-[34px] leading-[1.02] text-ink lg:col-start-1 lg:row-start-2 lg:mt-0 lg:text-[48px] xl:text-[56px] min-[90rem]:text-[60px]"
        >
          Ninety minutes, hot and cold, in the forest
        </h1>

        <FieldRows
          rows={SPA_CIRCUIT}
          termClassName="w-[58px] text-[21px] lg:w-[96px] lg:text-[24px]"
          rowClassName="min-h-10 gap-2.5"
          className="mt-3.5 lg:col-start-1 lg:row-start-3 lg:mt-7 lg:max-w-[600px]"
        />

        <p className="m-0 mt-3.5 font-sans text-[12px] uppercase tracking-[0.08em] text-ink lg:col-start-1 lg:row-start-4 lg:mt-6 lg:text-[13px]">
          $75 each &middot; Up to 6 guests &middot; Ages 16+
        </p>

        <div data-hero-cta className="mt-3 flex lg:col-start-1 lg:row-start-5 lg:mt-6">
          <BookingButton
            href={bookingHref}
            label="See open sessions"
            title="Book your Nordic Spa session"
            className={cn(
              fieldCtaClass,
              "w-full rounded-none py-0 normal-case shadow-none hover:shadow-none lg:w-auto",
            )}
          >
            See open sessions
            <FieldArrow />
          </BookingButton>
        </div>

        <p className="m-0 mt-2 text-center font-sans text-[12px] text-ink-note lg:col-start-1 lg:row-start-6 lg:mt-3 lg:text-left lg:text-[14px]">
          <Suspense fallback={null}>
            <NextAvailability product="spa" variant="text" label="Next open:" />
          </Suspense>{" "}
          Bring a swimsuit.
        </p>
      </div>
    </section>
  );
}
