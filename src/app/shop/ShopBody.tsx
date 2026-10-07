"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "@/components/shop/icons";
import {
  FieldArrow,
  FieldLeader,
  FieldNo,
  FieldQuoteView,
  type ResolvedFieldQuote,
} from "@/components/ui/FieldGuide";
import { FarmFavorites, PHOTO_CROPS } from "@/components/shop/Favorites";
import { LedgerRow, SoldOutRow } from "@/components/shop/LedgerRow";
import { isSoldOut, pushEvent, toGA4Item, type StockRecord } from "@/components/shop/track";
import { CATEGORIES, PRODUCTS, type Category } from "./data";
import { shelfProducts } from "./shelf";

function metaLine(cat: Category, total: number, open: number): string {
  const noun = total === 1 ? cat.unit.one : cat.unit.many;
  if (open === total) {
    return `${total} ${noun} · ${cat.allInStockNote ?? (total === 2 ? "both in stock" : "all in stock")}`;
  }
  return `${total} ${noun} · ${open} in stock now`;
}

export function ShopBody({
  stock,
  quote,
  tourForTwo,
}: {
  stock: StockRecord;
  /** Farm tour for two, in dollars (TOUR_PARTY_SIZES). */
  tourForTwo: number;
  /** The Mangalitsa shelf quote (SHOP_SHELF_QUOTE), resolved on the server. */
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
          <FarmFavorites products={favorites} stock={stock} className="mx-auto max-w-[1312px]" />
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
                    <LedgerRow key={p.slug} product={p} stock={stock} index={n} objectPosition={PHOTO_CROPS[p.slug]} />
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
