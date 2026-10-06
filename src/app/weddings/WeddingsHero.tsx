import Image from "next/image";
import { cn } from "@/lib/utils";
import { FieldArrow, FieldRows, Plate, fieldCtaClass } from "@/components/ui/FieldGuide";
import { FieldQuote } from "@/components/shared/FieldQuote";
import { WEDDING_QUOTE } from "@/lib/review-quotes";
import { WEDDING_AT_A_GLANCE } from "@/data/weddings";

/**
 * /weddings first screen (W-weddings board, approved 2026-10-06). Phones:
 * plate, headline, three ruled rows, Olivia B.'s quote, CTA. Desktop follows
 * the homepage grid: text in the 7fr column, the framed plate in the 5fr one.
 */
export function WeddingsHero() {
  return (
    <section
      aria-labelledby="weddings-hero-title"
      className="surface-paper bg-paper pt-[var(--header-h,104px)] text-ink"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col px-5 pb-8 pt-4 lg:grid lg:min-h-[clamp(600px,calc(100svh_-_var(--header-h,128px)),900px)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[1fr_repeat(4,auto)_1fr] lg:gap-x-16 lg:px-10 lg:pb-10 lg:pt-10 xl:px-10 min-[90rem]:px-16">
        <Plate
          className="lg:col-start-2 lg:row-start-1 lg:row-end-7"
          frameClassName="h-[196px] lg:h-auto lg:min-h-0 lg:flex-1"
          caption="A ceremony in the forest at Highland Farms."
        >
          <Image
            src="/images/weddings/forest-ceremony.jpg"
            alt="Guests seated in the forest watch a couple exchange vows at Highland Farms"
            fill
            priority
            fetchPriority="high"
            sizes="(min-width: 1440px) 520px, (min-width: 1024px) 38vw, calc(100vw - 56px)"
            className="object-cover object-[60%_55%]"
          />
        </Plate>

        <h1
          id="weddings-hero-title"
          className="field-heading mt-3 text-[32px] leading-[1.02] text-ink lg:col-start-1 lg:row-start-2 lg:mt-0 lg:text-[48px] xl:text-[56px] min-[90rem]:text-[60px]"
        >
          Your wedding weekend in the whimsical forest
        </h1>

        <FieldRows
          rows={WEDDING_AT_A_GLANCE}
          termClassName="w-[92px] lg:w-[140px]"
          className="mt-3 lg:col-start-1 lg:row-start-3 lg:mt-7 lg:max-w-[600px]"
        />

        <FieldQuote
          spec={WEDDING_QUOTE}
          className="mt-3 lg:col-start-1 lg:row-start-4 lg:mt-7 lg:max-w-[600px]"
          quoteClassName="text-[18px] lg:text-[22px]"
          metaClassName="mt-[3px] text-[11px] lg:mt-1.5 lg:text-[12px]"
        />

        <div
          data-hero-cta
          className="mt-[14px] flex flex-col lg:col-start-1 lg:row-start-5 lg:mt-8 lg:flex-row lg:items-center lg:gap-7"
        >
          <a href="#contact" className={cn(fieldCtaClass, "w-full lg:w-auto")}>
            Check your date
            <FieldArrow />
          </a>
          <a
            href="/wedding-call"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 flex min-h-11 items-center justify-center self-center font-sans text-[13.5px] font-medium text-pine transition-colors hover:text-pine-dark lg:mt-0 lg:min-h-0 lg:border-b lg:border-pine-line lg:pb-0.5 lg:text-[15px] lg:hover:border-pine"
          >
            Or book a free 45-minute call with Connor
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </section>
  );
}
