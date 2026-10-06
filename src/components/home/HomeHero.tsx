import Link from "next/link";
import { getImageProps } from "next/image";
import { cn } from "@/lib/utils";
import {
  FieldArrow,
  FieldStars,
  Plate,
  fieldCtaClass,
  fieldEyebrowClass,
} from "@/components/ui/FieldGuide";
import { FieldQuote } from "@/components/shared/FieldQuote";
import { CHECK_DATE_HREF } from "@/components/layout/Masthead";
import { REVIEW_COUNT } from "@/lib/reviews";
import { WEDDING_QUOTE } from "@/lib/review-quotes";
import { VISIT_LINKS } from "@/data/home";

const PLATE_ALT = "A bride and groom kiss in the forest with a Highland calf beside them";
// Desktop plate is the 5fr column (about 500px at 1440); phone plate is the
// screen less 20px gutters and the 8px frame on each side.
const PLATE_SIZES = "(min-width: 1440px) 520px, (min-width: 1024px) 38vw, calc(100vw - 56px)";

/**
 * Art-directed LCP image: the portrait boardwalk kiss on desktop, the
 * landscape forest kiss on phones, as on the approved boards. One <img> with
 * a <source>, so the browser fetches only the one it shows, at high priority.
 */
function HomePlateImage() {
  const common = { alt: PLATE_ALT, fill: true, sizes: PLATE_SIZES } as const;
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, src: "/images/weddings/ceremony-3.jpg" });
  const { props: phone } = getImageProps({
    ...common,
    src: "/images/weddings/hannah-max/01.jpg",
    loading: "eager",
    fetchPriority: "high",
  });

  return (
    <picture>
      <source media="(min-width: 1024px)" srcSet={desktopSrcSet} sizes={PLATE_SIZES} />
      <img
        {...phone}
        alt={PLATE_ALT}
        className="object-cover object-[22%_62%] lg:object-[50%_58%]"
      />
    </picture>
  );
}

/**
 * Homepage first screen (W-home boards, approved 2026-10-06): weddings lead,
 * day visits sit in the row underneath. Desktop is a 7/5 grid that fills the
 * viewport under the masthead; phones stack eyebrow, headline, plate, CTA.
 */
export function HomeHero() {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="surface-paper bg-paper pt-[var(--header-h,104px)] text-ink"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col px-5 pb-8 pt-[18px] lg:grid lg:min-h-[clamp(640px,calc(100svh_-_var(--header-h,128px)),960px)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[1fr_repeat(6,auto)_1fr_auto] lg:gap-x-16 lg:px-10 lg:pb-0 lg:pt-10 xl:px-10 min-[90rem]:px-16">
        <p
          className={cn(
            fieldEyebrowClass,
            "m-0 text-[17px] lg:col-start-1 lg:row-start-2 lg:text-[22px]",
          )}
        >
          A private forest farm in Brightwood, Oregon
        </p>

        <h1
          id="home-hero-title"
          className="field-heading mt-1 text-[33px] leading-[1.02] text-ink lg:col-start-1 lg:row-start-3 lg:mt-[18px] lg:text-[48px] xl:text-[56px] min-[90rem]:text-[60px]"
        >
          Whimsical forest weddings, with the Highland coos as honorary guests.
        </h1>

        <Plate
          className="mt-[14px] lg:col-start-2 lg:row-start-1 lg:row-end-9 lg:mt-0 lg:pb-[18px]"
          frameClassName="h-[262px] lg:h-auto lg:min-h-0 lg:flex-1"
          captionClassName="flex items-baseline justify-between gap-2.5"
          caption={
            <>
              <span className="lg:hidden">Up to 125 guests, 20 can stay over.</span>
              <span className="hidden lg:inline">An honorary guest, on the forest boardwalk.</span>
              <span className="flex shrink-0 items-center gap-[5px] font-sans text-[12px] not-italic text-charcoal lg:hidden">
                <FieldStars size={11} className="gap-px" />
                <span>
                  <span className="sr-only">Loved by </span>
                  {REVIEW_COUNT}
                  <span className="sr-only"> guests</span> on Google
                </span>
              </span>
            </>
          }
        >
          <HomePlateImage />
        </Plate>

        <p className="m-0 hidden max-w-[560px] font-sans text-[17px] leading-[1.6] text-ink-body lg:col-start-1 lg:row-start-4 lg:mt-[18px] lg:block">
          Your wedding weekend on five private acres at the base of Mt. Hood. Up to 125 guests,
          and up to 20 of your people can stay on the farm.
        </p>

        <p className="m-0 hidden items-center gap-2.5 font-sans text-[14px] text-charcoal lg:col-start-1 lg:row-start-5 lg:mt-[18px] lg:flex">
          <FieldStars />
          Loved by {REVIEW_COUNT} guests on Google
        </p>

        <div
          data-hero-cta
          className="mt-4 flex flex-col lg:col-start-1 lg:row-start-6 lg:mt-[22px] lg:flex-row lg:items-center lg:gap-7"
        >
          <Link href={CHECK_DATE_HREF} className={cn(fieldCtaClass, "w-full lg:w-auto")}>
            Check your date
            <FieldArrow />
          </Link>
          <a
            href="/lookbook.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex min-h-11 items-center justify-center self-center font-sans text-[14px] font-medium text-pine transition-colors hover:text-pine-dark lg:mt-0 lg:min-h-0 lg:border-b lg:border-pine-line lg:pb-0.5 lg:text-[15px] lg:hover:border-pine"
          >
            See the 2027 look book
            <span className="sr-only"> (PDF, opens in a new tab)</span>
          </a>
        </div>

        <FieldQuote
          spec={WEDDING_QUOTE}
          withTopic
          className="order-last mt-5 border-t border-rule pt-4 lg:order-none lg:col-start-1 lg:row-start-7 lg:mt-7 lg:max-w-[560px]"
          quoteClassName="text-[18px] lg:text-[22px]"
          metaClassName="mt-1 text-[11px] lg:mt-1.5 lg:text-[12px]"
        />

        <nav
          aria-label="Visit the farm"
          className="mt-1 grid grid-cols-3 border-t border-rule lg:col-span-2 lg:col-start-1 lg:row-start-9 lg:mt-0 lg:h-[74px] lg:grid-cols-[auto_repeat(3,minmax(0,1fr))] lg:items-center lg:gap-8"
        >
          <p className="m-0 hidden font-display text-[19px] italic text-fern lg:block">
            Visiting for the day?
          </p>
          {VISIT_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex min-h-[54px] flex-col justify-center gap-px text-ink lg:min-h-11 lg:flex-row lg:items-baseline lg:justify-start lg:gap-2.5 lg:border-l-0 lg:pl-0",
                i > 0 && "border-l border-rule pl-3",
              )}
            >
              <span className="font-display text-[19px] font-medium leading-tight lg:text-[22px]">
                <span className="lg:hidden">{link.phoneName}</span>
                <span className="hidden lg:inline">{link.name}</span>
              </span>
              <span className="font-sans text-[11px] text-ink-note lg:text-[13px]">{link.note}</span>
              <FieldArrow size={15} strokeWidth={1.8} className="hidden text-pine lg:block" />
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
