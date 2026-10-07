"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDownIcon } from "@/components/shop/icons";
import {
  FieldArrow,
  FieldLeader,
  FieldNo,
  FieldQuoteView,
  type ResolvedFieldQuote,
} from "@/components/ui/FieldGuide";
import { LedgerRow, SoldOutRow, priceText } from "@/components/shop/LedgerRow";
import { QuickAdd } from "@/components/shop/QuickAdd";
import { isSoldOut, pushEvent, toGA4Item, type StockRecord } from "@/components/shop/track";
import { CATEGORIES, PRODUCTS, hasChoices, type Category, type Product } from "./data";
import { shelfProducts } from "./shelf";

/** Where a photo crop differs from the centre (the hoodie is shot high). */
const CROPS: Record<string, string> = {
  "highland-farms-the-dream-hoodie": "50% 30%",
  "highland-farm-the-dream-hoodie-olive-green": "35% 35%",
  "highland-farms-the-dream-t-shirt": "50% 35%",
  "highland-farms-the-dream-t-shirt-j7bx6": "50% 35%",
  "highland-farms-the-dream-t-shirt-j7bx6-appl6": "50% 40%",
  "highland-farms-logo-keychain-leather-branded": "50% 60%",
  "firewood": "50% 65%",
};


function metaLine(cat: Category, total: number, open: number): string {
  const noun = total === 1 ? cat.unit.one : cat.unit.many;
  if (open === total) {
    return `${total} ${noun} · ${cat.allInStockNote ?? (total === 2 ? "both in stock" : "all in stock")}`;
  }
  return `${total} ${noun} · ${open} in stock now`;
}

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
              alt={product.title}
              fill
              sizes="(min-width: 1312px) 300px, (min-width: 1024px) 22vw, 46vw"
              className="object-cover"
              style={{ objectPosition: CROPS[product.slug] ?? "50% 50%" }}
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
      <div className="mt-2.5">
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

export function ShopBody({
  stock,
  quote,
  tourForTwo,
}: {
  stock: StockRecord;
  /** Farm tour for two, in dollars (TOUR_PARTY_SIZES). */
  tourForTwo: number;
  /** Brit L.'s sentence, resolved on the server. */
  quote: ResolvedFieldQuote | null;
}) {
  const logged = useRef(false);
  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    pushEvent("view_item_list", {
      ecommerce: { item_list_name: "Farm Store", items: PRODUCTS.map((p, i) => toGA4Item(p, i)) },
    });
  }, []);

  const favorites = PRODUCTS.filter((p) => p.featured && !isSoldOut(stock, p));

  return (
    <>
      {favorites.length > 0 && (
        <section id="favorites" className="scroll-mt-32 px-5 pb-2 pt-6 lg:scroll-mt-40 lg:px-16 lg:pb-4 lg:pt-16">
          <div className="mx-auto max-w-[1312px]">
            <div className="flex items-end justify-between gap-4 border-b border-ink pb-2.5">
              <h2 className="field-heading m-0 font-display text-[30px] leading-none lg:text-[44px]">Farm favorites</h2>
              <p className="m-0 text-right text-[12px] leading-snug text-ink-meta lg:text-[13px]">
                Ordered most
                <br className="lg:hidden" /> since August
              </p>
            </div>
            <ul className="m-0 mt-5 grid list-none grid-cols-2 gap-x-3.5 gap-y-7 p-0 lg:mt-8 lg:grid-cols-4 lg:gap-x-8">
              {favorites.map((p, i) => (
                <Favorite key={p.slug} product={p} stock={stock} index={i} />
              ))}
            </ul>
          </div>
        </section>
      )}

      {CATEGORIES.map((cat, i) => {
        const { open, out } = shelfProducts(cat, stock);
        const total = open.length + out.length;
        if (total === 0) return null;
        const fold = out.length >= 3;
        return (
          <section key={cat.key} id={cat.key} className="scroll-mt-32 px-5 pt-10 lg:scroll-mt-40 lg:px-16 lg:pt-24">
            <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
              <header className="lg:sticky lg:top-[170px] lg:self-start">
                <FieldNo n={i + 1} />
                <h2 className="field-heading m-0 mt-1 font-display text-[32px] leading-none lg:text-[44px]">{cat.label}</h2>
                <p className="m-0 mt-2.5 font-display text-[18px] italic leading-[1.35] text-ink-body lg:text-[20px]">
                  {cat.story}
                </p>
                <p className="m-0 mt-2 text-[12px] text-ink-meta">{metaLine(cat, total, open.length)}</p>
              </header>
              <div className="mt-4 lg:mt-0">
                <ul className="m-0 list-none border-t border-ink p-0">
                  {open.map((p, n) => (
                    <LedgerRow key={p.slug} product={p} stock={stock} index={n} objectPosition={CROPS[p.slug]} />
                  ))}
                  {fold ? (
                    <li>
                      <details className="group border-b border-rule">
                        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 py-1.5 [&::-webkit-details-marker]:hidden">
                          <span className="font-display text-[19px] leading-tight text-ink-note lg:text-[21px]">
                            {out.length} sold out
                          </span>
                          <FieldLeader />
                          <span className="shrink-0 border-b border-pine-line text-[13px] font-medium text-pine">
                            Email me when back
                          </span>
                          <ChevronDownIcon size={14} className="shrink-0 text-pine transition-transform group-open:rotate-180" />
                        </summary>
                        <ul className="m-0 list-none border-t border-rule p-0">
                          {out.map((p) => (
                            <SoldOutRow key={p.slug} product={p} />
                          ))}
                        </ul>
                      </details>
                    </li>
                  ) : (
                    out.map((p) => <SoldOutRow key={p.slug} product={p} />)
                  )}
                </ul>
                {cat.key === "mangalitsa" && quote && (
                  <FieldQuoteView {...quote} rule size="sm" className="mt-7" />
                )}
                {cat.key === "plush" && (
                  <Link
                    href="/farm-tours"
                    className="mt-1 flex min-h-12 items-baseline gap-2.5 py-2"
                  >
                    <span className="font-display text-[19px] font-medium text-ink lg:text-[21px]">Meet the herd on a tour</span>
                    <FieldLeader />
                    <span className="shrink-0 text-[13px] text-ink-note">${tourForTwo} for two</span>
                    <FieldArrow size={15} className="self-center text-pine" />
                  </Link>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
