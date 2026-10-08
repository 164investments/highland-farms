"use client";

import Image from "next/image";
import Link from "next/link";
import { FieldLeader } from "@/components/ui/FieldGuide";
import { CATEGORIES, hasChoices, type Product } from "@/app/shop/data";
import { priceText } from "./LedgerRow";
import { QuickAdd } from "./QuickAdd";
import { pushEvent, toGA4Item, type StockRecord } from "./track";

/** Where a photo crop differs from the centre (the apparel is shot high). */
export const PHOTO_CROPS: Record<string, string> = {
  "highland-farms-the-dream-hoodie": "50% 30%",
  "highland-farm-the-dream-hoodie-olive-green": "35% 35%",
  "highland-farms-the-dream-t-shirt": "50% 35%",
  "highland-farms-the-dream-t-shirt-j7bx6": "50% 35%",
  "highland-farms-the-dream-t-shirt-j7bx6-appl6": "50% 40%",
  "highland-farms-logo-keychain-leather-branded": "50% 60%",
  "firewood": "50% 65%",
};

function Favorite({ product, stock, index }: { product: Product; stock: StockRecord; index: number }) {
  const card = product.card ?? { title: product.title, note: product.subtitle ?? "" };
  const choices = hasChoices(product);
  return (
    <li className="flex flex-col">
      <Link
        href={`/shop/${product.slug}`}
        onClick={() => pushEvent("select_item", { ecommerce: { items: [toGA4Item(product, index)] } })}
        className="block"
      >
        <div className="border border-frame bg-paper-light p-[7px] lg:p-2.5">
          <div className="relative aspect-square overflow-hidden">
            <Image
              src={product.image}
              alt=""
              fill
              sizes="(min-width: 1312px) 300px, (min-width: 1024px) 22vw, 46vw"
              className="object-cover"
              style={{ objectPosition: PHOTO_CROPS[product.slug] ?? "50% 50%" }}
            />
          </div>
        </div>
        <p className="m-0 mt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-fern lg:text-[11px]">
          {CATEGORIES.find((c) => c.key === product.category)?.shortLabel}
        </p>
        <h3 className="m-0 mt-0.5 font-display text-[20px] font-medium leading-[1.1] text-ink lg:text-[24px]">
          {card.title}
        </h3>
        <p className="m-0 mt-1 flex items-baseline gap-2 text-[13px] lg:text-[14px]">
          <span className="text-ink-note">{card.note}</span>
          <FieldLeader className="min-w-3" />
          <span className="font-semibold">{priceText(product)}</span>
        </p>
      </Link>
      {/* mt-auto: a two-line name ("Top sirloin ground beef") never knocks its row's buttons out of line. */}
      <div className="mt-auto pt-2.5">
        {choices ? (
          <Link
            href={`/shop/${product.slug}`}
            aria-label={`Choose a size of the ${card.note.toLowerCase()} ${card.title}`}
            className="flex h-11 w-full items-center justify-center border border-pine text-[14px] font-semibold text-pine hover:bg-paper-shade"
          >
            Choose a size
          </Link>
        ) : (
          <QuickAdd product={product} stock={stock} display="label" />
        )}
      </div>
    </li>
  );
}

/**
 * "Farm favorites · Ordered most this season": the four most-ordered items
 * with one-tap adds. On /shop under the hero, and on the empty cart so a
 * shopper who opens the cart first can start an order without another page.
 * `products` is already filtered to featured and in stock by the caller.
 */
export function FarmFavorites({
  products,
  stock,
  className,
}: {
  products: Product[];
  stock: StockRecord;
  className?: string;
}) {
  if (products.length === 0) return null;
  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-4 border-b border-ink pb-2.5">
        <h2 className="field-heading m-0 font-display text-[30px] leading-none lg:text-[44px]">Farm favorites</h2>
        <p className="m-0 text-right text-[12px] leading-snug text-ink-meta lg:text-[13px]">
          Ordered most
          <br className="lg:hidden" /> this season
        </p>
      </div>
      <ul className="m-0 mt-5 grid list-none grid-cols-2 gap-x-3.5 gap-y-7 p-0 lg:mt-8 lg:grid-cols-4 lg:gap-x-8">
        {products.map((p, i) => (
          <Favorite key={p.slug} product={p} stock={stock} index={i} />
        ))}
      </ul>
    </div>
  );
}
