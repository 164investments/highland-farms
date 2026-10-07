import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  FieldArrow,
  FieldNumeral,
  FieldQuoteView,
  PendingSlot,
  Plate,
  fieldCtaClass,
} from "@/components/ui/FieldGuide";
import { resolveFieldQuote } from "@/components/field/Reviews";
import { BookingModalRoot, BookingTextLink } from "@/components/shared/BookingButton";
import { BOOKING_LINKS, CONTACT, bookingUrl } from "@/lib/constants";
import { TOUR_PARTY_SIZES } from "@/data/farm-tours";
import { BOOKING_PRODUCTS } from "@/lib/booking/products";
import { PICKUP_LOCATION } from "@/lib/shop/fulfillment";
import { SHOP_THANKS_QUOTE } from "../quotes";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

const STEP = "grid grid-cols-[40px_1fr] gap-x-2 border-b border-rule py-3.5 lg:grid-cols-[56px_1fr] lg:py-4";
const STEP_TITLE = "m-0 font-display text-[21px] font-semibold leading-tight text-ink lg:text-[24px]";
const STEP_BODY = "m-0 mt-1 text-[14px] leading-[1.5] text-ink-body lg:text-[15px]";
const DIRECTIONS = `https://maps.google.com/?q=${encodeURIComponent(PICKUP_LOCATION.address).replace(/%20/g, "+")}`;
const TEL = `tel:+1${CONTACT.phone.replace(/\D/g, "")}`;

function SignPlate({ className, frameClassName }: { className?: string; frameClassName: string }) {
  return (
    <Plate
      className={className}
      frameClassName={frameClassName}
      caption="The carved Highland cow and the Highland Farms sign."
    >
      <Image
        src="/images/farm/hero.jpg"
        alt="The carved wooden Highland cow on the Highland Farms sign, with the Lodge behind it in the trees"
        fill
        sizes="(min-width: 1024px) 460px, calc(100vw - 54px)"
        className="object-cover object-[35%_45%]"
      />
    </Plate>
  );
}

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; f?: string }>;
}) {
  const { order, f } = await searchParams;
  // Display only: never treated as proof of an order.
  const orderNumber = (order ?? "").slice(0, 32);
  const delivery = f === "delivery";
  const quote = resolveFieldQuote(SHOP_THANKS_QUOTE, { role: true });
  const tour = TOUR_PARTY_SIZES[0].total;
  const spa = BOOKING_PRODUCTS["nordic-spa"].pricePerPersonCents / 100;

  return (
    <div className="surface-paper bg-paper pt-[var(--header-h,104px)] font-sans text-ink">
      {/* 1. The receipt moment */}
      <section className="px-5 pb-12 pt-8 lg:px-16 lg:pb-20 lg:pt-16">
        <div className="mx-auto max-w-[1180px] lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start lg:gap-16">
          <div>
            <p className="m-0 font-display text-[17px] italic text-fern lg:text-[22px]">Paid, and passed to the farm</p>
            <h1 className="field-heading m-0 mt-1 font-display text-[38px] leading-[1.02] lg:text-[60px]">
              Thank you.
              <br />
              Your order is in.
            </h1>
            {orderNumber && (
              <p className="m-0 mt-4 inline-flex items-center gap-2 border border-frame bg-paper-light px-3 py-1.5 text-[13px] text-ink-body">
                Order <span className="font-semibold tracking-[0.04em] text-ink">{orderNumber}</span>
              </p>
            )}
            <ol className="m-0 mt-7 list-none border-t border-ink p-0">
              <li className={STEP}>
                <FieldNumeral n={1} className="text-[26px] lg:text-[32px]" />
                <div>
                  <p className={STEP_TITLE}>Your receipt is on its way</p>
                  <p className={STEP_BODY}>By email, with everything you ordered and the total you paid.</p>
                </div>
              </li>
              <li className={STEP}>
                <FieldNumeral n={2} className="text-[26px] lg:text-[32px]" />
                <div>
                  <p className={STEP_TITLE}>We pack it and call you</p>
                  <p className={STEP_BODY}>We call you when your order is packed.</p>
                  <PendingSlot className="mt-1.5" note="PENDING CONNOR: time to ready. Never 'usually the same day' until he confirms." />
                </div>
              </li>
              <li className={STEP}>
                <FieldNumeral n={3} className="text-[26px] lg:text-[32px]" />
                {delivery ? (
                  <div>
                    <p className={STEP_TITLE}>We bring it to you</p>
                    <p className={STEP_BODY}>We drive it to you. We call to set a time.</p>
                  </div>
                ) : (
                  <div>
                    <p className={STEP_TITLE}>Collect it at the farm</p>
                    <p className={STEP_BODY}>{PICKUP_LOCATION.address}. About an hour from Portland.</p>
                    <PendingSlot className="mt-1.5" note="PENDING CONNOR: pickup hours (D22)." />
                    <SignPlate className="mt-3 lg:hidden" frameClassName="aspect-[3/2]" />
                    <a href={DIRECTIONS} className="mt-1 inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-pine">
                      <span className="border-b border-pine-line pb-0.5">Get directions</span>
                      <FieldArrow size={16} />
                    </a>
                  </div>
                )}
              </li>
            </ol>
            <p className="m-0 mt-4 text-[14px] text-ink-body">
              Need to change something? Call{" "}
              <a href={TEL} className="font-medium text-pine underline decoration-pine-line underline-offset-4">
                <span className="whitespace-nowrap">{CONTACT.phone}</span>
              </a>{" "}
              with your order number.
            </p>
          </div>
          {!delivery && <SignPlate className="hidden lg:flex" frameClassName="aspect-[4/3]" />}
        </div>
      </section>

      {/* 2. The second door: this buyer is driving to the farm anyway */}
      <section className="bg-paper-light px-5 py-12 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-[1180px] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-16">
          <Plate
            frameClassName="aspect-[4/3] lg:aspect-[4/5]"
            caption="A guide, two guests and a calf, in the barn."
          >
            <Image
              src="/images/farm/cow-2.jpg"
              alt="A farm guide and two guests petting a Highland calf in the barn"
              fill
              sizes="(min-width: 1024px) 460px, calc(100vw - 54px)"
              className="object-cover object-[50%_55%]"
            />
          </Plate>
          <div className="mt-6 lg:mt-0">
            <p className="m-0 font-display text-[17px] italic text-fern lg:text-[22px]">
              {delivery ? "Want to meet the herd?" : "Coming to collect?"}
            </p>
            <h2 className="field-heading m-0 mt-1 font-display text-[30px] leading-[1.06] lg:text-[44px]">
              {delivery ? "Come and see them." : "Make the drive a visit."}
            </h2>
            <p className="m-0 mt-3 text-[15px] leading-[1.55] text-ink-body lg:text-[16px]">
              A private hour with the Highland cows, ${tour} for two, or 90 minutes in the Nordic spa, ${spa} per
              person. {delivery ? "Book one for any day you like." : "Book one for the day you collect."}
            </p>
            {quote && <FieldQuoteView {...quote} rule size="sm" className="mt-5" />}
            <div className="mt-6 flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-7">
              <BookingTextLink
                href={bookingUrl(BOOKING_LINKS.farmTourForTwo, "shop-thank-you")}
                label="See tour dates"
                title="Book your farm tour"
                className={fieldCtaClass}
              >
                See tour dates
                <FieldArrow />
              </BookingTextLink>
              <BookingTextLink
                href={bookingUrl(BOOKING_LINKS.nordicSpa, "shop-thank-you-spa")}
                label="See open spa sessions"
                title="Book the Nordic spa"
                className="inline-flex min-h-11 items-center gap-2 self-start text-[15px] font-medium text-pine lg:self-auto"
              >
                <span className="border-b border-pine-line pb-0.5">Or see open spa sessions</span>
                <FieldArrow size={16} />
              </BookingTextLink>
            </div>
            <p className="m-0 mt-6 flex flex-wrap gap-x-6 border-t border-rule pt-3 text-[14px]">
              <Link href="/shop" className="inline-flex min-h-11 items-center text-ink-note">
                <span className="border-b border-rule">Keep shopping</span>
              </Link>
            </p>
          </div>
        </div>
      </section>
      <BookingModalRoot />
    </div>
  );
}
