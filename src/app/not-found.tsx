import Image from "next/image";
import type { Metadata } from "next";
import { NotFoundDoors } from "@/app/_not-found/NotFoundDoors";
import { FieldReviewTier } from "@/components/field/Reviews";
import { CHECK_DATE_HREF } from "@/components/layout/chrome";
import { FieldLink, Plate } from "@/components/ui/FieldGuide";
import { TOUR_PARTY_SIZES } from "@/data/farm-tours";
import { SPA_PRICE_PER_PERSON } from "@/data/nordic-spa";
import { CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const TOUR_FOR_TWO = TOUR_PARTY_SIZES.find((p) => p.guests === 2)?.total ?? 150;

const moreLink =
  "inline-flex min-h-11 items-center text-[14px] text-ink-body underline decoration-rule underline-offset-4";

export default function NotFound() {
  return (
    <div className="surface-paper bg-paper pt-[var(--header-h)] font-sans text-ink">
      <section aria-labelledby="not-found-title" className="px-5 pb-14 pt-6 lg:px-16 lg:pb-24 lg:pt-16">
        {/* Phones: the four doors first, the photo after them, so every door sits inside 660px (rule 15).
            Desktop keeps the photo on the left. */}
        <div className="mx-auto flex max-w-[1180px] flex-col lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-x-16">
          <Plate
            className="order-last mt-8 lg:order-none lg:mt-0"
            frameClassName="h-[176px] lg:h-[400px]"
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

            <FieldReviewTier
              tier="compact"
              link
              className="mt-1 min-h-11 w-full justify-center text-[13.5px] lg:w-fit lg:justify-start lg:text-[14px]"
            />
            <NotFoundDoors
              weddingsHref={CHECK_DATE_HREF}
              tourHint={`$${TOUR_FOR_TWO} for two`}
              spaHint={`$${SPA_PRICE_PER_PERSON} per person`}
            />
            <nav aria-label="More pages" className="mt-5 border-t border-rule pt-1 lg:mt-6">
              <ul role="list" className="m-0 flex list-none flex-wrap justify-center gap-x-6 p-0 lg:justify-start">
                <li>
                  <FieldLink href="/wedding-portfolio" className={moreLink}>
                    Real weddings
                  </FieldLink>
                </li>
                <li>
                  <FieldLink href="/shop" className={moreLink}>
                    Farm shop
                  </FieldLink>
                </li>
                <li>
                  <FieldLink href="/contact" className={moreLink}>
                    Contact
                  </FieldLink>
                </li>
              </ul>
              <p className="m-0 mt-1 text-[14px] text-ink-note">
                Or call the farm at{" "}
                <span className="inline-flex min-h-11 items-center whitespace-nowrap">
                  <a
                    href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`}
                    className="font-medium text-pine underline decoration-pine-line underline-offset-4"
                  >
                    {CONTACT.phone}
                  </a>
                  .
                </span>
              </p>
            </nav>
          </div>
        </div>
      </section>
    </div>
  );
}
