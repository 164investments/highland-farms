import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  FieldArrow,
  FieldStars,
  Plate,
  fieldCtaClass,
  fieldEyebrowClass,
  fieldTextLinkClass,
} from "@/components/ui/FieldGuide";
import { REVIEW_COUNT } from "@/lib/reviews";
import { thanksgiving, thanksgivingInquiryHref } from "@/data/thanksgiving";

const fromPrice = Math.min(...thanksgiving.packages.map((p) => p.price)).toLocaleString("en-US");

/**
 * /thanksgiving first screen (Field Guide). Desktop follows the 7fr/5fr grid
 * of ToursHero. On phones the text comes first and the plate last: the
 * subhead is long, and plate-first would push the CTA under the chat bubble
 * and past the iPhone SE fold. The hero review count is plain text so a paid
 * visitor is not sent off the page from the first screen.
 */
export function ThanksgivingHero() {
  return (
    <section aria-labelledby="tg-hero-title" className="pt-[var(--header-h,60px)]">
      <div className="mx-auto flex max-w-[1440px] flex-col px-5 pb-8 pt-4 lg:grid lg:min-h-[clamp(600px,calc(100svh_-_var(--header-h,84px)),900px)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[1fr_repeat(7,auto)_1fr] lg:gap-x-16 lg:px-10 lg:pb-10 lg:pt-11 min-[90rem]:px-16">
        <p className={cn(fieldEyebrowClass, "m-0 text-[17px] leading-[1.3] lg:col-start-1 lg:row-start-2 lg:text-[22px]")}>
          Four nights &middot; {thanksgiving.dates}
        </p>

        <h1
          id="tg-hero-title"
          className="field-heading m-0 mt-1 text-[34px] leading-[1.02] text-ink max-[359px]:text-[30px] lg:col-start-1 lg:row-start-3 lg:mt-4 lg:text-[48px] xl:text-[56px] min-[90rem]:text-[60px]"
        >
          {thanksgiving.title}
        </h1>

        <p className="m-0 mt-2.5 font-sans text-[14px] leading-[1.5] text-ink-body lg:col-start-1 lg:row-start-4 lg:mt-5 lg:max-w-[600px] lg:text-[17px] lg:leading-[1.6]">
          This year, the host is a guest too. Our in-house chef cooks your family&apos;s Thanksgiving
          dinner, and nobody is stuck with the dishes.
        </p>

        <p className="m-0 mt-3 font-sans text-[12px] text-ink-note lg:col-start-1 lg:row-start-5 lg:mt-3 lg:text-[13px] lg:uppercase lg:tracking-[0.1em] max-lg:order-last">
          Brightwood, Oregon, about an hour from Portland, near Mt. Hood
        </p>

        <p className="m-0 mt-3.5 font-sans text-[15px] leading-[1.45] lg:col-start-1 lg:row-start-6 lg:mt-6 lg:text-[17px]">
          <span className="font-semibold text-ink">From ${fromPrice} for four nights, plus taxes.</span>{" "}
          <span className="text-ink-body">
            Includes a chef-cooked Thanksgiving dinner, a farm tour, spa time, 35 family photos and your
            itinerary.
          </span>
        </p>

        <p className="m-0 mt-2 flex items-center gap-2 font-sans text-[13px] text-ink-body lg:col-start-1 lg:row-start-7 lg:mt-3 lg:text-[14px]">
          <FieldStars size={13} />
          {REVIEW_COUNT} Google reviews
        </p>

        <div
          data-hero-cta
          className="mt-4 lg:col-start-1 lg:row-start-8 lg:mt-7 lg:flex lg:flex-wrap lg:items-center lg:gap-x-7 lg:gap-y-2"
        >
          <a href={thanksgivingInquiryHref()} data-cta="tg-hero" className={cn(fieldCtaClass, "w-full lg:w-auto")}>
            Check Thanksgiving dates
            <FieldArrow />
          </a>
          <a href="#included" className="hidden min-h-11 items-center lg:inline-flex">
            <span className={fieldTextLinkClass}>See what&apos;s included</span>
          </a>
          <p className="m-0 mt-2 font-sans text-[12px] leading-[1.5] text-ink-note lg:mt-0 lg:basis-full lg:text-[13px]">
            Opens an email to our team. It doesn&apos;t reserve anything. Or call{" "}
            <a href={`tel:${thanksgiving.phone.replace(/\D/g, "")}`} data-cta="tg-hero-call" className="whitespace-nowrap py-3 text-ink-body underline underline-offset-2">
              {thanksgiving.phone}
            </a>
            .
          </p>
        </div>

        <Plate
          className="mt-5 lg:col-start-2 lg:row-start-1 lg:row-end-10 lg:mt-0 lg:self-center"
          frameClassName="h-[140px] max-[359px]:h-[112px] sm:h-[260px] lg:aspect-[4/3] lg:h-auto"
          captionClassName="mt-px text-[14px] lg:mt-0.5 lg:text-[17px]"
          caption="The Lodge dining room, with Thanksgiving styling added digitally."
        >
          <Image
            src="/images/thanksgiving/highland-farms-lodge-thanksgiving-dining.jpg"
            alt="William Wallace Lodge dining room with a Thanksgiving feast, autumn flowers and candlelight added digitally"
            fill
            priority
            fetchPriority="high"
            sizes="(min-width: 1440px) 520px, (min-width: 1024px) 38vw, calc(100vw - 56px)"
            className="object-cover object-[50%_70%] lg:object-[46%_60%]"
          />
        </Plate>
      </div>
    </section>
  );
}
