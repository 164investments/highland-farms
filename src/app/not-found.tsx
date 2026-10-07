import Image from "next/image";
import type { Metadata } from "next";
import { NotFoundDoors } from "@/app/_not-found/NotFoundDoors";
import { CHECK_DATE_HREF } from "@/components/layout/chrome";
import { FooterHide } from "@/components/layout/Footer";
import { Plate } from "@/components/ui/FieldGuide";
import { TOUR_PARTY_SIZES } from "@/data/farm-tours";
import { SPA_PRICE_PER_PERSON } from "@/data/nordic-spa";
import { properties } from "@/data/properties";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const TOUR_FOR_TWO = TOUR_PARTY_SIZES.find((p) => p.guests === 2)?.total ?? 150;

const guestCounts = properties.map((p) => p.guests);
const MIN_SLEEPS = Math.min(...guestCounts);
const MAX_SLEEPS = Math.max(...guestCounts);

/** The menu's own wording for the lead door (weddings.ts: "Up to 125"; the coos are in the portraits). */
const WEDDINGS_NOTE = "Up to 125 guests, plus the coos";

export default function NotFound() {
  return (
    <div className="surface-paper bg-paper pt-[var(--header-h)] font-sans text-ink">
      <FooterHide parts={["doors", "proof"]} />
      <section aria-labelledby="not-found-title" className="px-5 pb-14 pt-6 lg:px-16 lg:pb-24 lg:pt-16">
        {/* Phones: a slim real herd photo band above the fold, then the Weddings door and three rows (r1 ruling).
            Desktop keeps the photo on the left. */}
        <div className="mx-auto flex max-w-[1180px] flex-col lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-x-16">
          <Plate
            className="mb-3 lg:order-none lg:mb-0 lg:mt-0"
            frameClassName="h-[84px] lg:h-[400px]"
            captionClassName="hidden lg:block"
            caption="Two of the herd and a farm dog, by the barn."
          >
            <Image
              src="/images/properties/gallery-3.jpg"
              alt="Two shaggy Highland cows behind the pasture fence by the barn, with a cream farm dog lying in the grass"
              fill
              priority
              sizes="(min-width: 1024px) 440px, 100vw"
              className="object-cover object-[55%_72%]"
            />
          </Plate>

          <div className="text-center lg:text-left">
            <p className="m-0 text-[11px] uppercase tracking-[0.16em] text-ink-meta lg:text-[12px]">Page not found</p>
            <h1
              id="not-found-title"
              className="field-heading m-0 mt-2 font-display text-[38px] leading-[1.02] lg:text-[64px]"
            >
              You&rsquo;ve wandered off the trail.
            </h1>
            <p className="m-0 mx-auto mt-3 max-w-[30ch] text-[15px] leading-[1.55] text-ink-body lg:mx-0 lg:max-w-[46ch] lg:text-[18px]">
              The page you wanted isn&rsquo;t here. The herd is, and so is everything below.
            </p>

            <NotFoundDoors
              weddingsHref={CHECK_DATE_HREF}
              weddingsNote={WEDDINGS_NOTE}
              tourHint={`$${TOUR_FOR_TWO} for two`}
              spaHint={`$${SPA_PRICE_PER_PERSON} per person`}
              staysHint={`Sleeps ${MIN_SLEEPS} to ${MAX_SLEEPS}`}
              shopHint="Free pickup"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
