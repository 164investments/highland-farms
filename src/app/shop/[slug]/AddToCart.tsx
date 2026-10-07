"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FieldStickyBar } from "@/components/field/StickyBar";
import { useCart } from "@/lib/shop/cart";
import { formatCents } from "@/lib/shop/money";
import { QtyStepper } from "@/components/shop/QtyStepper";
import { WaitlistForm } from "@/components/shop/WaitlistForm";
import { pushEvent, scarcityLabel } from "@/components/shop/track";

export interface VariantView {
  id: string;
  label?: string;
  priceCents: number;
  /** Units left; null means unlimited. */
  stock: number | null;
}

/**
 * The buy box: price, pack, live stock, size chips (apparel), quantity and
 * Add to cart, the pickup line, and the one bottom bar on phones.
 *
 * Apparel (`optionName === "Size"`) has no default size: the button reads
 * "Choose a size" until one is picked. A sold-out size stays selectable so the
 * shopper can ask to be emailed when it is back.
 */
export function AddToCart({
  productName,
  productTitle,
  slug,
  category,
  optionName,
  variants,
  pack,
}: {
  productName: string;
  productTitle: string;
  slug: string;
  category: string;
  optionName?: string;
  variants: VariantView[];
  /** "1 lb pack": shown beside the price. */
  pack?: string;
}) {
  const { add, count, subtotalCents, ready } = useCart();
  const needsPick = optionName === "Size" && variants.length > 1;
  const firstAvailable = variants.find((v) => v.stock !== 0) ?? variants[0];
  const [selectedId, setSelectedId] = useState<string | null>(needsPick ? null : firstAvailable.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const selected = variants.find((v) => v.id === selectedId) ?? null;
  const priced = selected ?? firstAvailable;
  const allOut = variants.every((v) => v.stock === 0);
  const selectedOut = selected ? selected.stock === 0 : false;
  const max = selected?.stock && selected.stock > 0 ? Math.min(99, selected.stock) : 99;
  const scarcity = selected ? scarcityLabel(selected.stock) : null;
  const multi = variants.length > 1;

  // view_item completes the GA4 item funnel (grid, then item, then add).
  const viewLogged = useRef(false);
  useEffect(() => {
    if (viewLogged.current) return;
    viewLogged.current = true;
    pushEvent("view_item", {
      ecommerce: {
        currency: "USD",
        value: firstAvailable.priceCents / 100,
        items: [
          {
            item_id: slug,
            item_name: productName,
            item_category: category,
            price: firstAvailable.priceCents / 100,
            quantity: 1,
          },
        ],
      },
    });
  }, [slug, productName, category, firstAvailable.priceCents]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function handleAdd() {
    if (!selected || selectedOut) return;
    add(selected.id, qty);
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 3000);
    pushEvent("add_to_cart", {
      ecommerce: {
        currency: "USD",
        value: (selected.priceCents * qty) / 100,
        items: [
          {
            item_id: slug,
            item_name: productName,
            item_category: category,
            item_variant: selected.label,
            price: selected.priceCents / 100,
            quantity: qty,
          },
        ],
      },
    });
  }

  const total = formatCents(priced.priceCents * qty).replace(/\.00$/, "");
  const addLabel = allOut || selectedOut
    ? "Sold out"
    : !selected
      ? `Choose a ${(optionName ?? "size").toLowerCase()}`
      : `Add to cart · ${total}`;
  const disabled = allOut || selectedOut;
  const cartHasItems = ready && count > 0;
  const buttonClass = cn(
    "inline-flex h-[52px] flex-1 items-center justify-center gap-2.5 px-5 text-[15px] font-semibold tracking-[0.02em] transition-colors",
    disabled ? "cursor-not-allowed bg-paper-shade text-ink-note" : "bg-pine text-paper-light hover:bg-pine-dark",
  );

  return (
    <>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 lg:mt-4">
        <span className="text-[24px] font-semibold lg:text-[28px]">
          {multi && !selected ? "from " : ""}
          {formatCents(priced.priceCents).replace(/\.00$/, "")}
        </span>
        {pack && <span className="text-[14px] text-ink-note">{pack}</span>}
        <span className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-fern" aria-live="polite">
          {allOut ? (
            <span className="text-ink-note">Sold out</span>
          ) : (
            <>
              <span className="h-2 w-2 bg-fern" aria-hidden="true" />
              {scarcity ?? (selectedOut ? "Sold out" : "In stock")}
            </>
          )}
        </span>
      </div>

      {multi && (
        <fieldset className="m-0 mt-4 border-0 p-0 lg:mt-6">
          <legend className="p-0 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-meta">
            {optionName ?? "Choose"}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {variants.map((v) => {
              const out = v.stock === 0;
              const on = v.id === selectedId;
              const name = v.label ?? "Standard";
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={on}
                  aria-label={out ? `${name}, sold out` : name}
                  onClick={() => {
                    setSelectedId(v.id);
                    setQty(1);
                  }}
                  className={cn(
                    "flex h-12 min-w-12 items-center justify-center border px-3 text-[15px] font-medium",
                    on ? "border-pine bg-pine text-paper-light" : "border-frame bg-paper-light text-ink hover:border-pine",
                    out && !on && "text-ink-note line-through",
                    out && on && "line-through",
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {!allOut && (
        <div className="mt-4 flex gap-2.5 lg:mt-7">
          <QtyStepper value={qty} min={1} max={max} size="pdp" label={productTitle.toLowerCase()} onChange={(n) => setQty(Math.max(1, n))} />
          {added ? (
            <Link
              href="/shop/cart"
              data-hero-cta=""
              className={buttonClass}
              aria-live="polite"
            >
              Added · View cart ({count})
            </Link>
          ) : (
            <button
              id="buy"
              type="button"
              data-hero-cta=""
              onClick={handleAdd}
              disabled={disabled}
              className={buttonClass}
            >
              {addLabel}
            </button>
          )}
        </div>
      )}

      {selectedOut && !allOut && selected && (
        <WaitlistForm key={selected.id} variantIds={[selected.id]} name={selected.label ?? productTitle} className="mt-3" />
      )}
      {allOut && (
        <WaitlistForm variantIds={variants.map((v) => v.id)} name={productTitle} className="mt-3" />
      )}

      <p className="m-0 mt-2.5 text-[13px] leading-[1.45] text-ink-note">
        Free pickup at the farm in Brightwood. We call you when it&apos;s packed.
      </p>

      {/* The one bottom action on phones: add once the buy button scrolls away, view cart once the cart has items. */}
      <FieldStickyBar
        enabled={!allOut}
        primary={
          cartHasItems
            ? {
                label: `View cart · ${count} ${count === 1 ? "item" : "items"} · ${formatCents(subtotalCents)}`,
                href: "/shop/cart",
              }
            : !selected || disabled
              ? { label: addLabel, href: "#buy" }
              : { label: addLabel, onClick: handleAdd }
        }
      />
    </>
  );
}
