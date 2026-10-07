import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  FieldArrow,
  FieldLeader,
  FieldQuoteView,
  PendingSlot,
  Plate,
} from "@/components/ui/FieldGuide";
import { resolveFieldQuote } from "@/components/field/Reviews";
import { QuickAdd } from "@/components/shop/QuickAdd";
import { PRODUCTS, CATEGORIES, getProduct, fromPrice, hasChoices, type Product } from "../data";
import { SHOP_BEEF_QUOTE } from "../quotes";
import { getStockMap, allSoldOut } from "@/lib/shop/inventory";
import { toCents, formatCents, formatCentsShort } from "@/lib/shop/money";
import { DELIVERY_FEE_CENTS, DELIVERY_MINIMUM_CENTS, PICKUP_LOCATION } from "@/lib/shop/fulfillment";
import { buildProductNode } from "@/lib/shop/product-schema";
import { TOUR_PARTY_SIZES } from "@/data/farm-tours";
import { AddToCart } from "./AddToCart";
import { StructuredData } from "@/components/layout/StructuredData";

export const revalidate = 60;

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Not found" };

  const price = formatCents(toCents(fromPrice(product)));
  return {
    title: `${product.title} | Farm Shop`,
    description: `${product.title} from Highland Farms in Brightwood, Oregon, ${price}. Free farm pickup or local delivery.`,
    alternates: { canonical: `https://highlandfarmsoregon.com/shop/${product.slug}` },
    openGraph: {
      title: `${product.title} | Highland Farms`,
      images: [`https://highlandfarmsoregon.com${product.image}`],
    },
  };
}

/** Photo crops and alt text the board chose for the beef page; other products get a plain alt. */
const ALT: Record<string, string> = {
  "ground-beef": "A one pound pack of top sirloin ground beef with a sprig of rosemary on a wooden board",
};

const DT = "font-display text-[19px] font-semibold leading-tight lg:text-[21px]";
const DD = "m-0 text-[14px] leading-[1.5] text-ink-body";

/** Preferred add-ons by shelf: cuts a meat buyer adds, then pantry. */
const PREFERRED: Record<Product["category"], string[]> = {
  beef: ["mangalitsa-special-blend-sausage", "mangalitsa-baby-back-ribs", "mangalitsa-cured-hams"],
  mangalitsa: ["ground-beef", "a-dozen-eggs", "dried-flower-bouquet"],
  pantry: ["ground-beef", "mangalitsa-special-blend-sausage", "mangalitsa-baby-back-ribs"],
  plush: ["highland-farms-camo-trucker-hat", "highland-farms-logo-keychain-leather-branded", "a-dozen-eggs"],
  apparel: ["weighted-mircrowavable-highland-cow-plush", "highland-farms-logo-keychain-leather-branded", "a-dozen-eggs"],
};

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const stock = await getStockMap();
  const record = Object.fromEntries(stock);
  const variants = product.variants.map((v) => ({
    id: v.id,
    label: v.label,
    priceCents: toCents(v.price),
    stock: stock.has(v.id) ? stock.get(v.id)! : null,
  }));
  const soldOut = variants.every((v) => v.stock === 0);
  const productUrl = `https://highlandfarmsoregon.com/shop/${product.slug}`;
  const cat = CATEGORIES.find((c) => c.key === product.category)!;
  const isBeef = product.category === "beef";
  const isApparel = product.optionName === "Size";
  const quote = isBeef ? resolveFieldQuote(SHOP_BEEF_QUOTE, { role: true }) : null;
  const siblings = PRODUCTS.filter((p) => p.category === product.category);
  const colors = product.colorGroup ? PRODUCTS.filter((p) => p.colorGroup === product.colorGroup) : [];
  const pack =
    product.priceNote && !/choose size/i.test(product.priceNote)
      ? product.priceNote
      : product.detail && /lb|dozen/i.test(product.detail)
        ? product.detail
        : undefined;

  // Same helper as the /shop ItemList so the two cannot drift. `description` is
  // shown on this page (About section), so the markup never describes hidden copy.
  const productSchema = {
    "@context": "https://schema.org",
    ...buildProductNode(product, stock, productUrl),
  };

  const deliveryNote = `${formatCentsShort(DELIVERY_FEE_CENTS)} on orders of ${formatCentsShort(DELIVERY_MINIMUM_CENTS)} or more, Mt. Hood corridor to east Portland. Pickup stays free at any total.`;
  const extra = (() => {
    const bySlug = new Map(PRODUCTS.map((p) => [p.slug, p] as const));
    const ok = (p: Product | undefined): p is Product =>
      Boolean(p) &&
      p!.slug !== product.slug &&
      !hasChoices(p!) &&
      !allSoldOut(stock, p!.variants.map((v) => v.id));
    const picks = PREFERRED[product.category].map((s) => bySlug.get(s)).filter(ok);
    return picks.slice(0, 3);
  })();

  return (
    <div className="surface-paper bg-paper pt-[var(--header-h,104px)] font-sans text-ink">
      <StructuredData pathname={`/shop/${product.slug}`} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema).replace(/</g, "\\u003c") }}
      />

      {/* 1. The buy box */}
      <section className="px-5 pb-10 pt-2 lg:px-16 lg:pb-20 lg:pt-8">
        <div className="mx-auto max-w-[1312px]">
          <nav aria-label="Breadcrumb" className="text-[13px] text-ink-note">
            <Link href="/shop" className="inline-flex min-h-11 items-center hover:text-pine">Farm shop</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <Link href={`/shop#${product.category}`} className="inline-flex min-h-11 items-center hover:text-pine">
              {cat.label}
            </Link>
          </nav>
          <div className="mt-1 lg:mt-4 lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
            <div className="border border-frame bg-paper-light p-[7px] lg:self-start lg:p-2.5">
              <div className="relative h-[176px] overflow-hidden max-[359px]:h-[128px] lg:aspect-square lg:h-auto">
                <Image
                  src={product.image}
                  alt={ALT[product.slug] ?? product.title}
                  fill
                  priority
                  sizes="(min-width: 1024px) 640px, calc(100vw - 54px)"
                  className={`object-cover ${isApparel ? "object-[50%_30%]" : "object-[50%_48%]"} ${soldOut ? "opacity-60" : ""}`}
                />
              </div>
            </div>

            <div className="mt-4 lg:mt-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-fern">
                {cat.label}
                {isBeef ? " · From our herd" : ""}
              </p>
              <h1 className="field-heading m-0 mt-1 font-display text-[32px] leading-[1.05] lg:mt-2 lg:text-[52px]">
                {product.title}
              </h1>

              <AddToCart
                productName={product.name}
                productTitle={product.title}
                slug={product.slug}
                category={product.category}
                optionName={product.optionName}
                variants={variants}
                pack={pack}
              />

              {quote && <FieldQuoteView {...quote} rule size="sm" className="mt-5" />}

              {colors.length > 1 && (
                <div className="mt-6">
                  <p className="m-0 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-meta">Colour</p>
                  <ul className="m-0 mt-2 flex list-none gap-3 p-0">
                    {colors.map((c) => {
                      const here = c.slug === product.slug;
                      return (
                        <li key={c.slug}>
                          <Link
                            href={`/shop/${c.slug}`}
                            aria-current={here ? "page" : undefined}
                            className={`flex w-[84px] flex-col gap-1 border bg-paper-light p-1 text-[12px] ${here ? "border-pine" : "border-frame"}`}
                          >
                            <span className="relative block aspect-square overflow-hidden">
                              <Image src={c.image} alt="" fill sizes="84px" className="object-cover" />
                            </span>
                            <span className={here ? "font-semibold text-ink" : "text-ink-body"}>{c.subtitle}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {isApparel && (
                <PendingSlot className="mt-4" note="NEW Q: garment measurements. Link a size guide here once Connor has them." />
              )}

              {cat.cutList && siblings.length > 1 && (
                <div className="mt-6 lg:mt-9">
                  <p className="m-0 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-meta">{cat.cutList}</p>
                  <ul className="m-0 mt-1.5 list-none border-t border-rule p-0">
                    {siblings.map((p) => {
                      const out = allSoldOut(stock, p.variants.map((v) => v.id));
                      const here = p.slug === product.slug;
                      const price = formatCentsShort(toCents(fromPrice(p)));
                      if (here) {
                        return (
                          <li key={p.slug} className="flex min-h-12 items-center gap-2 border-b border-l-2 border-rule border-l-pine pl-3">
                            <span className="font-display text-[19px] font-semibold lg:text-[21px]">{p.card?.title ?? p.title}</span>
                            {p.priceNote && <span className="text-[13px] text-ink-note">{p.priceNote}</span>}
                            <span className="text-[11px] uppercase tracking-[0.12em] text-pine">This one</span>
                            <FieldLeader />
                            <span className="text-[15px] font-semibold">{price}</span>
                          </li>
                        );
                      }
                      return (
                        <li key={p.slug}>
                          <Link href={`/shop/${p.slug}`} className="flex min-h-12 items-center gap-2 border-b border-rule">
                            <span className={`font-display text-[19px] lg:text-[21px] ${out ? "text-ink-note" : ""}`}>{p.title}</span>
                            <FieldLeader />
                            {out ? (
                              <>
                                <span className="text-[13px] text-ink-note">Sold out, {price}</span>
                                <span className="ml-1 border-b border-pine-line text-[13px] font-medium text-pine">Email me</span>
                              </>
                            ) : (
                              <span className="text-[15px] font-semibold">{price}</span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* How you'll get it: true fees from fulfillment.ts */}
              <dl className="m-0 mt-7 border-t border-ink lg:mt-10">
                <div className="grid grid-cols-[84px_1fr] gap-x-3 border-b border-rule py-3 lg:grid-cols-[104px_1fr]">
                  <dt className={DT}>Pickup</dt>
                  <dd className={DD}>{PICKUP_LOCATION.address.replace(", OR 97011", "")}.</dd>
                </div>
                <PendingSlot className="my-2" note="PENDING CONNOR: pickup hours (D22)." />
                <div className="grid grid-cols-[84px_1fr] gap-x-3 border-b border-rule py-3 lg:grid-cols-[104px_1fr]">
                  <dt className={DT}>Delivery</dt>
                  <dd className={DD}>{deliveryNote}</dd>
                </div>
                <div className="grid grid-cols-[84px_1fr] gap-x-3 border-b border-rule py-3 lg:grid-cols-[104px_1fr]">
                  <dt className={DT}>Shipping</dt>
                  <dd className={DD}>We don&apos;t ship{isApparel ? ", apparel included" : ""}.</dd>
                </div>
                {isBeef && (
                  <PendingSlot
                    className="my-2"
                    note={'PENDING CONNOR: sold frozen or fresh? If frozen, add a "Bring" row: "Packed frozen. Bring a cooler for the drive home."'}
                  />
                )}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* 2. About: the description is the one the Product JSON-LD carries */}
      <section className="bg-paper-light px-5 py-12 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
          <div>
            <p className="m-0 font-display text-[17px] italic text-fern lg:text-[22px]">
              {isBeef ? "About this beef" : "About this item"}
            </p>
            <h2 className="field-heading m-0 mt-1 font-display text-[30px] leading-[1.06] lg:text-[44px]">
              {isBeef ? "From the herd you can visit." : product.title}
            </h2>
            {product.description && (
              <p className="m-0 mt-4 max-w-prose text-[15px] leading-[1.6] text-ink-body">{product.description}</p>
            )}
            {isBeef && (
              <>
                <dl className="m-0 mt-6 border-t border-rule">
                  <div className="flex min-h-[44px] items-center gap-3 border-b border-rule py-1.5 lg:min-h-[52px]">
                    <dt className="w-[96px] shrink-0 font-display text-[19px] font-semibold leading-tight lg:w-[120px] lg:text-[22px]">Breed</dt>
                    <dd className="m-0 text-[14px] text-ink-body lg:text-[15px]">Scottish Highland</dd>
                  </div>
                  <div className="flex min-h-[44px] items-center gap-3 border-b border-rule py-1.5 lg:min-h-[52px]">
                    <dt className="w-[96px] shrink-0 font-display text-[19px] font-semibold leading-tight lg:w-[120px] lg:text-[22px]">Raised</dt>
                    <dd className="m-0 text-[14px] text-ink-body lg:text-[15px]">On our farm in Brightwood, pasture-raised</dd>
                  </div>
                </dl>
                <PendingSlot className="mt-2" note='PENDING CONNOR Q13: a "Hormones" row. Drop it if unanswered.' />
              </>
            )}
          </div>
          {isBeef && (
            <div className="mt-8 lg:mt-0">
              <Plate
                frameClassName="h-[240px] lg:h-[520px]"
                caption="Part of the herd, in the woods on the farm."
              >
                <Image
                  src="/images/properties/gallery-5.jpg"
                  alt="A shaggy ginger Highland cow standing among ferns and trees, with a white cow and a calf nearby"
                  fill
                  sizes="(min-width: 1024px) 560px, calc(100vw - 54px)"
                  className="object-cover object-[42%_55%]"
                />
              </Plate>
              <Link
                href="/farm-tours"
                className="mt-5 flex min-h-12 items-baseline gap-2.5 border-y border-rule py-2.5"
              >
                <span className="font-display text-[20px] font-medium lg:text-[22px]">Meet them on a farm tour</span>
                <FieldLeader />
                <span className="text-[13px] text-ink-note">${TOUR_PARTY_SIZES[0].total} for two</span>
                <FieldArrow size={15} className="self-center text-pine" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 3. Add to the same order */}
      {extra.length > 0 && (
        <section className="px-5 py-12 lg:px-16 lg:py-20">
          <div className="mx-auto max-w-[1312px]">
            <h2 className="field-heading m-0 border-b border-ink pb-2 font-display text-[26px] leading-none lg:text-[36px]">
              Add to the same order
            </h2>
            <ul className="m-0 mt-5 grid list-none grid-cols-3 gap-3 p-0 lg:mt-7 lg:gap-8">
              {extra.map((p) => (
                <li key={p.slug}>
                  <Link href={`/shop/${p.slug}`} className="block">
                    <div className="border border-frame bg-paper-light p-1 lg:p-2.5">
                      <div className="relative aspect-square overflow-hidden">
                        <Image src={p.image} alt={p.title} fill sizes="(min-width: 1024px) 380px, 30vw" className="object-cover" />
                      </div>
                    </div>
                    <p className="m-0 mt-2 font-display text-[16px] font-medium leading-[1.15] lg:text-[22px]">{p.title}</p>
                  </Link>
                  <QuickAdd product={p} stock={record} display="price" className="mt-1.5 w-full justify-center lg:w-auto" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

