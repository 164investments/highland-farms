import Link from "next/link";
import { getImageProps } from "next/image";
import { cn } from "@/lib/utils";
import {
  FieldArrow,
  Plate,
  fieldCtaClass,
} from "@/components/ui/FieldGuide";
import { FieldReviewTier } from "@/components/field/Reviews";
import { VISIT_LINKS } from "./home-data";

const PLATE_ALT = "A couple in wedding clothes kiss in the forest beside a Highland calf";
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
        className="object-cover object-[30%_64%] lg:object-[50%_58%]"
      />
    </picture>
  );
}

/**
 * Homepage first screen (board home r3, approved 2026-10-06): the masthead
 * names the farm; the H1 and deck promise the wedding and name the place; one
 * CTA anchors to the form on this page; day visits sit in the strip below.
 * Desktop is a 7/5 grid that fills the viewport under the masthead; phones
 * stack headline, deck, plate, proof, CTA, strip.
 */
export function HomeHero() {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="surface-paper bg-paper pt-[var(--header-h,104px)] text-ink"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col px-5 pb-8 pt-[18px] lg:grid lg:min-h-[clamp(640px,calc(100svh_-_var(--header-h,128px)),960px)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[1fr_repeat(4,auto)_1fr_auto] lg:gap-x-16 lg:px-10 lg:pb-0 lg:pt-10 xl:px-10 min-[90rem]:px-16">
        <h1
          id="home-hero-title"
          className="field-heading text-[33px] leading-[1.02] text-ink max-[359px]:text-[29px] lg:col-start-1 lg:row-start-2 lg:text-[48px] xl:text-[56px] min-[90rem]:text-[60px]"
        >
          Whimsical forest weddings, with the Highland coos as honorary guests.
        </h1>
        <p className="m-0 mt-2.5 font-sans text-[15px] leading-[1.5] text-ink-body lg:col-start-1 lg:row-start-3 lg:mt-[18px] lg:max-w-[580px] lg:text-[17px] lg:leading-[1.6]">
          Your wedding weekend at Highland Farms, a private forest farm about an hour from Portland.
          <span className="hidden lg:inline"> Up to 125 guests, and up to 20 of your people can stay.</span>
        </p>

        <Plate
          className="mt-[14px] lg:col-start-2 lg:row-start-1 lg:row-end-7 lg:mt-0 lg:pb-[18px]"
          frameClassName="h-[240px] max-lg:[@media(max-height:600px)]:h-[150px] lg:h-auto lg:min-h-0 lg:flex-1"
          caption={
            <>
              <span className="lg:hidden">An honorary guest, in the forest.</span>
              <span className="hidden lg:inline">An honorary guest, on the forest boardwalk.</span>
            </>
          }
        >
          <HomePlateImage />
        </Plate>

        {/* Hero proof tier (REVIEW_COUNT): the only review number on this screen. */}
        <FieldReviewTier
          tier="hero"
          className="mt-2 text-charcoal lg:col-start-1 lg:row-start-4 lg:mt-[18px] lg:gap-2.5"
        />

        <div
          data-hero-cta
          className="mt-3.5 flex flex-col lg:col-start-1 lg:row-start-5 lg:mt-[22px] lg:flex-row lg:items-center lg:gap-7"
        >
          <a href="#check-your-date" className={cn(fieldCtaClass, "w-full lg:w-auto")}>
            Check your date
            <FieldArrow />
          </a>
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

        <nav
          aria-label="Farm experiences"
          className="mt-1 grid grid-cols-3 border-t border-rule max-[359px]:grid-cols-1 lg:col-span-2 lg:col-start-1 lg:row-start-7 lg:mt-0 lg:h-[74px] lg:grid-cols-[auto_repeat(3,minmax(0,1fr))] lg:items-center lg:gap-8"
        >
          <p className="m-0 hidden font-display text-[19px] italic text-fern lg:block">
            Visiting for the day?
          </p>
          {VISIT_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex min-h-[56px] flex-col justify-center gap-px text-ink max-[359px]:min-h-[48px] max-[359px]:flex-row max-[359px]:items-center max-[359px]:justify-between max-[359px]:border-b max-[359px]:border-rule lg:min-h-11 lg:flex-row lg:items-baseline lg:justify-start lg:gap-2.5",
                i > 0 &&
                  "border-l border-rule pl-3 max-[359px]:border-l-0 max-[359px]:pl-0 lg:border-l-0 lg:pl-0",
              )}
            >
              <span className="flex items-center gap-1 font-display text-[19px] font-medium leading-tight lg:text-[22px]">
                <span className="lg:hidden">{link.phoneName}</span>
                <span className="hidden lg:inline">{link.name}</span>
                <FieldArrow size={14} strokeWidth={1.8} className="shrink-0 text-pine lg:hidden" />
              </span>
              <span className="font-sans text-[11px] text-ink-note lg:text-[13px]">{link.note}</span>
              <FieldArrow size={15} strokeWidth={1.8} className="hidden shrink-0 self-center text-pine lg:block" />
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
