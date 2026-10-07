"use client";

import { useEffect, useRef } from "react";
import {
  FieldNo,
  FieldQuoteView,
  type ResolvedFieldQuote,
} from "@/components/ui/FieldGuide";
import { ChevronDownIcon } from "@/components/shop/icons";
import { PHOTO_CROPS } from "@/components/shop/Favorites";
import { LedgerRow, ShelfSoldOut } from "@/components/shop/LedgerRow";
import { pushEvent, toGA4Item, type StockRecord } from "@/components/shop/track";
import { PRODUCTS, type Category } from "./data";
import { orderedCategories, shelfProducts } from "./shelf";

function metaLine(cat: Category, total: number, open: number): string {
  const noun = total === 1 ? cat.unit.one : cat.unit.many;
  if (open === total) {
    return `${total} ${noun} · ${cat.allInStockNote ?? (total === 2 ? "both in stock" : "all in stock")}`;
  }
  return `${total} ${noun} · ${open} in stock now`;
}

/** Mangalitsa shows this many rows, then "See all N cuts" (every row stays reachable). */
const LEAD_ROWS = 4;

export function ShopBody({
  stock,
  quote,
}: {
  stock: StockRecord;
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

  // Shelf order follows the page's doors: shelves holding the most-ordered (featured) items first.
  const categories = orderedCategories(stock);

  return (
    <>
      {categories.map((cat, i) => {
        const { open, out } = shelfProducts(cat, stock);
        const total = open.length + out.length;
        if (total === 0) return null;
        // "Ordered most" on one row per shelf: the first featured item in stock.
        const topSellerSlug = open.find((p) => p.featured)?.slug;
        const fold = cat.key === "mangalitsa" && open.length > LEAD_ROWS + 1;
        const row = (p: (typeof open)[number], n: number) => (
          <LedgerRow
            key={p.slug}
            product={p}
            stock={stock}
            index={n}
            objectPosition={PHOTO_CROPS[p.slug]}
            showOrderedMost={p.slug === topSellerSlug}
          />
        );
        return (
          <section key={cat.key} id={cat.key} className={`scroll-mt-32 px-5 lg:scroll-mt-40 lg:px-16 lg:pt-24 ${i === 0 ? "pt-3" : "pt-10"}`}>
            <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
              <header className="lg:sticky lg:top-[170px] lg:self-start">
                <FieldNo n={i + 1} />
                <h2 className="field-heading m-0 mt-1 font-display text-[32px] leading-none lg:text-[44px]">{cat.label}</h2>
                <p
                  className={`m-0 mt-2.5 font-display text-[18px] italic leading-[1.35] text-ink-body lg:text-[20px] ${i === 0 ? "max-lg:hidden" : ""}`}
                >
                  {cat.story}
                </p>
                <p className={`m-0 mt-2 text-[12px] text-ink-meta ${i === 0 ? "max-lg:hidden" : ""}`}>
                  {metaLine(cat, total, open.length)}
                </p>
              </header>
              <div className="mt-4 lg:mt-0">
                <ul className="m-0 list-none border-t border-ink p-0">
                  {(fold ? open.slice(0, LEAD_ROWS) : open).map((p, n) => row(p, n))}
                  {fold && (
                    <li>
                      <details className="group border-b border-rule">
                        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 py-1.5 [&::-webkit-details-marker]:hidden">
                          <span className="font-display text-[19px] leading-tight text-ink lg:text-[21px]">
                            See all {total} {cat.unit.many}
                          </span>
                          <ChevronDownIcon size={14} className="shrink-0 text-pine transition-transform group-open:rotate-180" />
                        </summary>
                        <ul className="m-0 list-none border-t border-rule p-0">
                          {open.slice(LEAD_ROWS).map((p, n) => row(p, n + LEAD_ROWS))}
                        </ul>
                      </details>
                    </li>
                  )}
                  <ShelfSoldOut products={out} />
                </ul>
                {cat.key === "mangalitsa" && quote && (
                  <FieldQuoteView {...quote} rule size="sm" className="mt-7" />
                )}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
