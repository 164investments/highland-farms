"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FieldStickyBar } from "@/components/field/StickyBar";
import { useCart } from "@/lib/shop/cart";
import { formatCents } from "@/lib/shop/money";
import { PICKUP_HOURS, PICKUP_READY } from "@/lib/shop/fulfillment";
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

/** The same item in another color: a link to its own page. */
export interface ColorOption {
  slug: string;
  /** "Coyote brown", "Olive". */
  label: string;
  image: string;
  current: boolean;
}

/**
 * Apparel size buttons show the short code, so all six sizes fit one row on a
 * phone (r4). The olive hoodie's catalog labels are long ("XXLarge"); the
 * label itself is untouched (cart line, receipt, analytics). The accessible
 * name starts with the visible text (WCAG 2.5.3): "Small" for S, "2XL" for 2XL.
 */
const SIZE_CODE: Record<string, string> = {
  Small: "S",
  Medium: "M",
  Large: "L",
  XLarge: "XL",
  XXLarge: "2XL",
  XXXLarge: "3XL",
};
function sizeChip(label: string): { text: string; name: string } {
  const text = SIZE_CODE[label] ?? label;
  return { text, name: label.startsWith(text) ? label : text };
}

/**
 * The buy box: price, pack, live stock, color (items that come in more than
 * one), size chips (apparel), quantity and Add to cart, the pickup line, and
 * the one bottom bar on phones. Color comes before size, so the choices run
 * color, size, then the button (r4).
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
  colors = [],
}: {
  productName: string;
  productTitle: string;
  slug: string;
  category: string;
  optionName?: string;
  variants: VariantView[];
  /** "1 lb pack": shown beside the price. */
  pack?: string;
  /** Every color of this item, this page's included; shown when there are two or more. */
  colors?: ColorOption[];
}) {
  const { add, count, ready } = useCart();
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
  // Six sizes: two even rows of three at 320, one row of six from 380.
  const evenGrid = optionName === "Size" && variants.length === 6;
  // "from" only when the options differ in price (sized apparel doesn't).
  const priceVaries = new Set(variants.map((v) => v.priceCents)).size > 1;

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
      ? `Choose a ${(optionName ?? "size").toLowerCase()} · ${total}`
      : `Add to cart · ${total}`;
  const disabled = allOut || selectedOut;
  const cartHasItems = ready && count > 0;
  // At 320 the stepper leaves ~145px for the button: it tightens (14px, 8px padding) and the
  // "Choose a size" label drops "a", so nothing wraps. "Add to cart" is the same words at every width. The accessible name is the visible text at each width.
  const buttonText = allOut || selectedOut ? (
    "Sold out"
  ) : !selected ? (
    <span>
      Choose <span className="max-[379px]:hidden">a </span>
      {(optionName ?? "size").toLowerCase()} · {total}
    </span>
  ) : (
    `Add to cart · ${total}`
  );
  const buttonClass = cn(
    "inline-flex h-[52px] min-w-0 flex-1 items-center justify-center gap-2.5 whitespace-nowrap px-3 text-[15px] max-[379px]:px-2 max-[379px]:text-[14px] min-[380px]:px-5 font-semibold tracking-[0.02em] transition-colors",
    disabled ? "cursor-not-allowed bg-paper-shade text-ink-note" : "bg-pine text-paper-light hover:bg-pine-dark",
  );

  return (
    <>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 lg:mt-4">
        <span className="text-[24px] font-semibold lg:text-[28px]">
          {priceVaries && !selected ? "from " : ""}
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

      {colors.length > 1 && (
        <div className="mt-4 lg:mt-6">
          <p className="m-0 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-meta">Color</p>
          <ul className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0">
            {colors.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/shop/${c.slug}`}
                  aria-current={c.current ? "page" : undefined}
                  className={cn(
                    "flex h-12 items-center gap-2 border bg-paper-light py-1 pl-1 pr-3 text-[14px]",
                    c.current ? "border-pine font-semibold text-ink" : "border-frame text-ink-body hover:border-pine",
                  )}
                >
                  <span className="relative block h-10 w-10 shrink-0 overflow-hidden">
                    <Image src={c.image} alt="" fill sizes="40px" className="object-cover" />
                  </span>
                  <span className="whitespace-nowrap">{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div id="choose-and-add">
      {multi && (
        <fieldset className="m-0 mt-4 border-0 p-0 lg:mt-6">
          <legend className="p-0 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-meta">
            {optionName ?? "Choose"}
          </legend>
          <div className={cn("mt-2 gap-2", evenGrid ? "grid grid-cols-3 min-[380px]:grid-cols-6" : "flex flex-wrap")}>
            {variants.map((v) => {
              const out = v.stock === 0;
              const on = v.id === selectedId;
              const label = v.label ?? "Standard";
              const chip = optionName === "Size" ? sizeChip(label) : { text: label, name: label };
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={on}
                  aria-label={out ? `${chip.name}, sold out` : chip.name}
                  onClick={() => {
                    setSelectedId(v.id);
                    setQty(1);
                  }}
                  className={cn(
                    "flex h-12 min-w-12 items-center justify-center border px-3 text-[15px] font-medium",
                    evenGrid && "min-w-0 px-1",
                    on ? "border-pine bg-pine text-paper-light" : "border-frame bg-paper-light text-ink hover:border-pine",
                    out && !on && "text-ink-note line-through",
                    out && on && "line-through",
                  )}
                >
                  {chip.text}
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
              <span>
                <span className="max-[379px]:hidden">Added · </span>View cart ({count})
              </span>
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
              {buttonText}
            </button>
          )}
        </div>
      )}
      </div>

      {selectedOut && !allOut && selected && (
        <WaitlistForm key={selected.id} variantIds={[selected.id]} name={selected.label ?? productTitle} className="mt-3" />
      )}
      {allOut && (
        <WaitlistForm variantIds={variants.map((v) => v.id)} name={productTitle} className="mt-3" />
      )}

      <p className="m-0 mt-2.5 text-[13px] leading-[1.45] text-ink-note">
        Free pickup at the farm in Brightwood, {PICKUP_HOURS} {PICKUP_READY}. We call you when it&apos;s packed.
      </p>

      {/* The one bottom action on phones: add once the buy button scrolls away, view cart once the cart has items. */}
      <FieldStickyBar
        enabled={!allOut}
        hideWhenVisible="#choose-and-add"
        primary={
          cartHasItems || added
            ? {
                label: `View cart (${count})`,
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
