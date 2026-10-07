import Image from "next/image";
import { cn } from "@/lib/utils";
import { FieldArrow, FieldRows, Plate, fieldCtaClass } from "@/components/ui/FieldGuide";
import { FieldReviewTier } from "@/components/field/Reviews";
import { WeddingCallLink } from "@/components/field/WeddingCallLink";
import { WEDDING_AT_A_GLANCE } from "@/data/weddings";

/**
 * /weddings first screen (round 3 board). Phones: plate, headline, four ruled
 * rows, the hero review tier, CTA and the free-call link, all inside 600px on a
 * 393x660 in-app browser. Desktop follows the homepage grid: text in the 7fr
 * column, the framed plate in the 5fr one. The photo is a real couple beside a
 * Highland cow; its alt and caption name nobody (CONSISTENCY #3).
 */
export function WeddingsHero() {
  return (
    <section
      aria-labelledby="weddings-hero-title"
      className="surface-paper bg-paper pt-[var(--header-h,104px)] text-ink"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col px-5 pb-8 pt-3 lg:grid lg:min-h-[clamp(600px,calc(100svh_-_var(--header-h,128px)),900px)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[1fr_repeat(5,auto)_1fr] lg:gap-x-16 lg:px-16 lg:pb-10 lg:pt-10">
        <Plate
          className="lg:col-start-2 lg:row-start-1 lg:row-end-8"
          frameClassName="h-[182px] p-[6px] max-lg:[@media(max-height:600px)]:h-[116px] lg:h-auto lg:min-h-0 lg:flex-1 lg:p-2.5"
          captionClassName="hidden lg:block lg:text-[17px]"
          caption="A quiet minute at the pasture with one of the coos."
        >
          <Image
            src="/images/weddings/ceremony-1.jpg"
            alt="A couple in wedding clothes holds each other beside a shaggy Highland cow at the pasture"
            fill
            priority
            fetchPriority="high"
            sizes="(min-width: 1440px) 520px, (min-width: 1024px) 38vw, calc(100vw - 56px)"
            className="object-cover object-[50%_30%] max-lg:[@media(max-height:600px)]:object-[50%_12%] lg:object-[58%_50%]"
          />
        </Plate>

        <h1
          id="weddings-hero-title"
          className="field-heading mt-2.5 text-[32px] leading-[1.02] text-ink max-[359px]:text-[27px] lg:col-start-1 lg:row-start-2 lg:mt-0 lg:text-[56px] min-[90rem]:text-[60px]"
        >
          Your wedding weekend in the whimsical forest
        </h1>

        <p className="m-0 mt-2 font-sans text-[14px] font-medium leading-snug text-ink-body lg:col-start-1 lg:row-start-3 lg:mt-5 lg:text-[17px]">
          Two-night weddings from $13,000
        </p>

        <FieldRows
          rows={WEDDING_AT_A_GLANCE}
          rowClassName="min-h-[36px] py-0.5 lg:min-h-[54px] max-lg:[@media(max-height:600px)]:[&:nth-child(n+3)]:hidden"
          termClassName="w-[92px] lg:w-[140px]"
          className="mt-2.5 lg:col-start-1 lg:row-start-4 lg:mt-5 lg:max-w-[600px]"
        />

        <FieldReviewTier
          tier="hero"
          className="mt-2.5 text-[13px] lg:col-start-1 lg:row-start-5 lg:mt-7 lg:text-[15px]"
          starSize={14}
        />

        <div
          data-hero-cta
          className="mt-2.5 flex flex-col lg:col-start-1 lg:row-start-6 lg:mt-8 lg:flex-row lg:items-center lg:gap-7"
        >
          <a href="#contact" className={cn(fieldCtaClass, "w-full lg:w-auto")}>
            Check your date
            <FieldArrow />
          </a>
          <WeddingCallLink
            content="weddings-hero"
            title="Weddings hero: wedding call"
            className="flex min-h-11 items-center justify-center self-center font-sans text-[13.5px] font-medium text-pine transition-colors hover:text-pine-dark lg:min-h-0 lg:border-b lg:border-pine-line lg:pb-0.5 lg:text-[15px] lg:hover:border-pine"
          >
            Or book a free 45-minute call with Connor
          </WeddingCallLink>
        </div>
      </div>
    </section>
  );
}
