"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/shop/cart";
import { formatCents } from "@/lib/shop/money";

export interface VariantView {
  id: string;
  label?: string;
  priceCents: number;
  /** Units left; null means unlimited. */
  stock: number | null;
}

function pushEvent(event: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...payload });
}

/** Nudge only when it's true and useful — not on every product. */
function scarcityLabel(stock: number | null): string | null {
  if (stock === null || stock > 5 || stock <= 0) return null;
  return stock === 1 ? "Only 1 left" : `Only ${stock} left`;
}

export function AddToCart({
  productName,
  slug,
  category,
  optionName,
  variants,
}: {
  productName: string;
  slug: string;
  category: string;
  optionName?: string;
  variants: VariantView[];
}) {
  const { add } = useCart();
  const firstAvailable = variants.find((v) => v.stock !== 0) ?? variants[0];
  const [selectedId, setSelectedId] = useState(firstAvailable.id);
  const [justAdded, setJustAdded] = useState(false);

  const selected = variants.find((v) => v.id === selectedId) ?? firstAvailable;

  // view_item completes the GA4 item funnel. Without it there is no measurable
  // step between the grid and add-to-cart, which is exactly where the sold-out
  // and variant-choice questions get answered.
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
  const soldOut = selected.stock === 0;
  const allSoldOut = variants.every((v) => v.stock === 0);
  const scarcity = scarcityLabel(selected.stock);

  function handleAdd() {
    if (soldOut) return;
    add(selected.id, 1);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2500);
    pushEvent("add_to_cart", {
      ecommerce: {
        currency: "USD",
        value: selected.priceCents / 100,
        items: [
          {
            item_id: slug,
            item_name: productName,
            item_category: category,
            item_variant: selected.label,
            price: selected.priceCents / 100,
            quantity: 1,
          },
        ],
      },
    });
  }

  return (
    <div className="mt-5">
      <p className="text-2xl font-medium text-forest font-sans">
        {formatCents(selected.priceCents)}
      </p>

      {variants.length > 1 && (
        <fieldset className="mt-6">
          <legend className="mb-2.5 text-xs uppercase tracking-[0.12em] text-muted font-sans">
            {optionName ?? "Choose"}
          </legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const out = v.stock === 0;
              const isSelected = v.id === selectedId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  disabled={out}
                  aria-pressed={isSelected}
                  className={`rounded-full border px-4 py-2 text-sm transition-all font-sans ${
                    isSelected
                      ? "border-forest bg-forest text-white shadow-sm"
                      : out
                        ? "cursor-not-allowed border-cream-dark bg-cream text-muted/60 line-through"
                        : "border-cream-dark bg-white text-charcoal hover:border-forest/40 hover:text-forest"
                  }`}
                >
                  {v.label ?? "Standard"}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {scarcity && !soldOut && (
        <p className="mt-4 text-sm font-medium text-forest font-sans">{scarcity}</p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleAdd}
          disabled={soldOut}
          className={`inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-full px-8 text-sm uppercase tracking-[0.12em] transition-all font-sans ${
            soldOut
              ? "cursor-not-allowed bg-cream-dark text-muted"
              : "bg-forest text-white shadow-sm hover:shadow-md"
          }`}
        >
          {justAdded ? (
            <>
              <Check className="h-4 w-4" />
              Added
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" />
              {soldOut ? "Sold out" : "Add to cart"}
            </>
          )}
        </button>

        {justAdded && (
          <Link
            href="/shop/cart"
            className="text-sm text-forest underline underline-offset-4 font-sans"
          >
            View cart
          </Link>
        )}
      </div>

      {allSoldOut && (
        <p className="mt-4 text-sm text-muted font-sans">
          We&apos;re out right now — more comes back as the farm restocks.{" "}
          <Link href="/shop" className="text-forest underline underline-offset-4">
            See what else is in
          </Link>
          .
        </p>
      )}
    </div>
  );
}
