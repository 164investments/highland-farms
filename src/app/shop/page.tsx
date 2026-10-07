import type { Metadata } from "next";
import Image from "next/image";
import {
  FieldLeader,
  FieldNumeral,
  PendingSlot,
  Plate,
  fieldCtaOutlineClass,
  fieldTextLinkClass,
} from "@/components/ui/FieldGuide";
import { FieldReviewTier, resolveFieldQuote } from "@/components/field/Reviews";
import { FieldFaq } from "@/components/field/Faq";
import { ShelfNav, type Shelf } from "@/components/shop/ShelfNav";
import { ShopStickyCart } from "@/components/shop/StickyCart";
import { GiftLink } from "@/components/shop/GiftLink";
import { ShopBody } from "./ShopBody";
import { doorPhoto, orderedCategories, shelfProducts } from "./shelf";
import { PRODUCTS } from "./data";
import { SHOP_SHELF_QUOTE } from "./quotes";
import { getStockMap, type StockMap } from "@/lib/shop/inventory";
import { buildProductNode } from "@/lib/shop/product-schema";
import { StructuredData as SiteStructuredData } from "@/components/layout/StructuredData";
import { shopFAQ } from "@/data/shop-faq";
import { TOUR_PARTY_SIZES } from "@/data/farm-tours";
import { BOOKING_PRODUCTS } from "@/lib/booking/products";
import { DELIVERY_FEE_CENTS, DELIVERY_MINIMUM_CENTS, PICKUP_LOCATION } from "@/lib/shop/fulfillment";
import { CONTACT } from "@/lib/constants";
import { PAYMENT_METHODS } from "./checkout/wallets";

export const metadata: Metadata = {
  title: "Farm Store: Highland Beef, Pork and Plush",
  description:
    "Mangalitsa pork, Highland beef, eggs, cow plush and apparel from Highland Farms in Brightwood, Oregon. Free farm pickup or local delivery. We don't ship.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Farm Store: Highland Beef, Pork and Plush | Highland Farms Oregon",
    description:
      "Mangalitsa pork, Highland beef, eggs, cow plush and apparel. Free farm pickup or local delivery.",
    images: [
      {
        url: "/images/farm/farm-visit.jpg",
        alt: "A shaggy Highland cow with long pale horns looks into the camera beside a weathered wooden barn",
      },
    ],
  },
};

function ProductListSchema({ stock }: { stock: StockMap }) {
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Highland Farms Farm Store",
    numberOfItems: PRODUCTS.length,
    itemListElement: PRODUCTS.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: buildProductNode(p, stock, `https://highlandfarmsoregon.com/shop/${p.slug}`),
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
    />
  );
}

// Availability comes from Supabase, so the page revalidates rather than
// baking stock in at build time.
export const revalidate = 60;

const STEP =
  "grid grid-cols-[40px_1fr] gap-x-2 border-b border-rule py-3.5 lg:grid-cols-[56px_1fr] lg:py-4";
const STEP_TITLE = "m-0 font-display text-[21px] font-semibold leading-tight text-ink lg:text-[24px]";
const STEP_BODY = "m-0 mt-1 text-[14px] leading-[1.5] text-ink-body lg:text-[15px]";
/** Farm tour, Highland Day and Nordic spa: the three rows of the Gift the farm card. */
const GIFT_OPTIONS = 3;
const TEL = `tel:+1${CONTACT.phone.replace(/\D/g, "")}`;

export default async function ShopPage() {
  const stock = await getStockMap();
  const record = Object.fromEntries(stock);
  const quote = resolveFieldQuote(SHOP_SHELF_QUOTE, { role: true });

  // Shelf doors: most-ordered shelves first, each fronted by an in-stock item from live stock.
  const ordered = orderedCategories(record).filter((c) => shelfProducts(c, record).open.length + shelfProducts(c, record).out.length > 0);
  const shelves: Shelf[] = ordered.flatMap((c) => {
    const image = doorPhoto(c, record);
    return image ? [{ key: c.key, label: c.shortLabel, count: shelfProducts(c, record).open.length, image }] : [];
  });
  // Gifts: the herd photo already used in the gift section below, so no new crop of a new file.
  // The count is the three gift options listed in the Gift the farm card below.
  const giftsDoor: Shelf = {
    key: "gifts",
    label: "Gifts",
    count: GIFT_OPTIONS,
    countNote: "gift options",
    image: { src: "/images/farm/cows.jpg", position: "30% 62%" },
  };
  const doors: Shelf[] = [...shelves, giftsDoor];
  const tabs: Shelf[] = [
    ...ordered.map((c) => ({ key: c.key, label: c.shortLabel, count: shelfProducts(c, record).open.length })),
    { key: "gifts", label: "Gifts", count: GIFT_OPTIONS },
  ];

  const tourForTwo = TOUR_PARTY_SIZES[0].total;
  const extraGuest = TOUR_PARTY_SIZES[1].total - TOUR_PARTY_SIZES[0].total;
  const spa = BOOKING_PRODUCTS["nordic-spa"].pricePerPersonCents / 100;
  const highlandDay = tourForTwo + spa * 2;
  const plush = PRODUCTS.find((p) => p.category === "plush")?.variants[0].price ?? 65;
  const fee = `$${DELIVERY_FEE_CENTS / 100}`;
  const minimum = `$${DELIVERY_MINIMUM_CENTS / 100}`;

  return (
    <div className="surface-paper bg-paper pt-[var(--header-h,104px)] font-sans text-ink">
      <ProductListSchema stock={stock} />
      <SiteStructuredData pathname="/shop" />

      {/* 1. Hero: the promise, the stars, then the picture-shelf doors (shop board C, round 1) */}
      <section aria-labelledby="shop-title" className="px-5 pb-2 pt-3 lg:px-16 lg:pb-10 lg:pt-12">
        <div className="mx-auto max-w-[1312px]">
          <p className="m-0 font-display text-[17px] italic text-fern max-[374px]:text-[15.5px] lg:text-[22px]">
            The Highland Farms store
          </p>
          <h1
            id="shop-title"
            className="field-heading m-0 mt-1 font-display text-[32px] leading-[1.04] max-[374px]:text-[27px] lg:mt-3 lg:text-[60px] lg:leading-[1.02]"
          >
            Order from the farm.
            <br />
            Pick it up free.
          </h1>
          <FieldReviewTier tier="hero" className="mt-3 max-[374px]:mt-2.5 lg:mt-5" />
          <ShelfNav shelves={doors} tabs={tabs} />
        </div>
      </section>

      <ShopBody stock={record} quote={quote} />

      {/* 6. How it reaches you, and the store questions */}
      <section className="mt-10 bg-paper-light px-5 pb-10 pt-10 lg:mt-24 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start lg:gap-20">
          <div>
            <p className="m-0 font-display text-[17px] italic text-fern lg:text-[22px]">How your order reaches you</p>
            <h2 className="field-heading m-0 mt-1 font-display text-[30px] leading-[1.06] lg:text-[44px]">
              Collected at the farm, or driven over by us.
            </h2>
            <ol className="m-0 mt-6 list-none border-t border-rule p-0">
              <li className={STEP}>
                <FieldNumeral n={1} className="text-[26px] lg:text-[32px]" />
                <div>
                  <p className={STEP_TITLE}>Order and pay here</p>
                  <p className={STEP_BODY}>{PAYMENT_METHODS}. The receipt comes by email.</p>
                </div>
              </li>
              <li className={STEP}>
                <FieldNumeral n={2} className="text-[26px] lg:text-[32px]" />
                <div>
                  <p className={STEP_TITLE}>We pack it and call you</p>
                  <PendingSlot
                    className="mt-1.5"
                    note="PENDING CONNOR: time to ready. Add a sentence only once he confirms it (never 'usually the same day' unconfirmed)."
                  />
                </div>
              </li>
              <li className={STEP}>
                <FieldNumeral n={3} className="text-[26px] lg:text-[32px]" />
                <div>
                  <p className={STEP_TITLE}>Collect it free</p>
                  <p className={STEP_BODY}>{PICKUP_LOCATION.address.replace(", OR 97011", "")}, about an hour from Portland.</p>
                  <PendingSlot className="mt-1.5" note="PENDING CONNOR: pickup hours (D22)." />
                  <Plate
                    className="mt-3 lg:hidden"
                    frameClassName="aspect-[3/2]"
                    caption="The carved Highland cow and the Highland Farms sign."
                  >
                    <Image
                      src="/images/farm/hero.jpg"
                      alt="The carved wooden Highland cow on the Highland Farms sign, with the Lodge behind it in the trees"
                      fill
                      sizes="calc(100vw - 54px)"
                      className="object-cover object-[35%_45%]"
                    />
                  </Plate>
                </div>
              </li>
            </ol>
            <dl className="m-0 mt-5 grid gap-3 text-[14px] leading-[1.5] lg:mt-6 lg:text-[15px]">
              <div className="flex gap-3">
                <dt className="w-[86px] shrink-0 font-semibold text-ink lg:w-[110px]">Delivery</dt>
                <dd className="m-0 text-ink-body">
                  {fee} on orders of {minimum} or more, Mt. Hood corridor to east Portland. We check your ZIP at
                  checkout and call to set a time.
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-[86px] shrink-0 font-semibold text-ink lg:w-[110px]">Shipping</dt>
                <dd className="m-0 text-ink-body">We don&apos;t ship.</dd>
              </div>
            </dl>
          </div>
          <Plate
            className="hidden lg:flex"
            frameClassName="aspect-[4/3]"
            caption="The carved Highland cow and the Highland Farms sign."
          >
            <Image
              src="/images/farm/hero.jpg"
              alt="The carved wooden Highland cow on the Highland Farms sign, with the Lodge behind it in the trees"
              fill
              sizes="520px"
              className="object-cover object-[35%_45%]"
            />
          </Plate>
        </div>

        <div className="mx-auto mt-8 max-w-[1312px] lg:mt-16">
          <div className="flex items-end justify-between gap-4 border-b border-ink pb-2">
            <h3 className="field-heading m-0 font-display text-[24px] leading-none lg:text-[30px]">Store questions</h3>
            <a href={TEL} className="flex min-h-11 items-end text-[13px] text-ink-note">
              Or call <span className="ml-1 whitespace-nowrap font-medium text-pine">{CONTACT.phone}</span>
            </a>
          </div>
          <FieldFaq items={shopFAQ} size="sm" jsonLd className="border-t-0 lg:grid lg:grid-cols-2 lg:gap-x-16" />
        </div>
      </section>

      {/* 7. Gift the farm */}
      <section id="gifts" aria-labelledby="gifts-title" className="scroll-mt-32 px-5 pb-12 pt-12 lg:scroll-mt-40 lg:px-16 lg:pb-24 lg:pt-28">
        <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-16">
          <Plate
            frameClassName="aspect-[4/3] lg:aspect-[4/5]"
            caption="A calf and two of the herd, by the barn."
          >
            <Image
              src="/images/farm/cows.jpg"
              alt="A Highland calf and two cows walking past the barn"
              fill
              sizes="(min-width: 1024px) 460px, calc(100vw - 54px)"
              className="object-cover object-[50%_62%]"
            />
          </Plate>
          <div className="mt-5 border-[3px] border-double border-frame bg-paper-light px-5 pb-6 pt-6 lg:mt-0 lg:px-12 lg:pb-10 lg:pt-10">
            <p className="m-0 font-display text-[17px] italic text-fern lg:text-[22px]">Gift the farm</p>
            <h2 id="gifts-title" className="field-heading m-0 mt-1 font-display text-[30px] leading-[1.05] lg:text-[44px]">
              Give an hour with the herd.
            </h2>
            <p className="m-0 mt-3 text-[14px] leading-[1.55] text-ink-body lg:text-[16px]">
              A private farm tour, the Nordic spa, or both, for someone who loves the Highland cows as much as you do.
            </p>
            <ul className="m-0 mt-5 list-none border-t border-rule p-0 text-[14px] lg:text-[16px]">
              <li className="border-b border-rule py-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[19px] font-semibold lg:text-[22px]">Farm tour for two</span>
                  <FieldLeader />
                  <span className="font-semibold">${tourForTwo}</span>
                </div>
                <p className="m-0 text-[12px] text-ink-meta">${extraGuest} each extra guest, up to six</p>
              </li>
              <li className="border-b border-rule py-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[19px] font-semibold lg:text-[22px]">Highland Day for two</span>
                  <FieldLeader />
                  <span className="font-semibold">${highlandDay}</span>
                </div>
                <p className="m-0 text-[12px] text-ink-meta">Farm tour and Nordic spa</p>
              </li>
              <li className="flex items-baseline gap-2 border-b border-rule py-3">
                <span className="font-display text-[19px] font-semibold lg:text-[22px]">Nordic spa</span>
                <FieldLeader />
                <span className="font-semibold">${spa} per person</span>
              </li>
            </ul>
            <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-7">
              <GiftLink className={fieldCtaOutlineClass} />
              {/* 44px tap target; the underline stays on the words. */}
              <a href="#plush" className="inline-flex min-h-11 items-center self-start lg:self-auto">
                <span className={fieldTextLinkClass}>Or give a cow plush, ${plush}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <ShopStickyCart />
    </div>
  );
}
