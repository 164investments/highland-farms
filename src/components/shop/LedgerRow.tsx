"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { fieldLeaderClass } from "@/components/ui/FieldGuide";
import { useCart } from "@/lib/shop/cart";
import { fromPrice, hasChoices, type Product } from "@/app/shop/data";
import { formatCentsShort, toCents } from "@/lib/shop/money";
import { WaitlistForm } from "./WaitlistForm";
import { QuickAdd } from "./QuickAdd";
import { firstAvailable, pushEvent, stockWord, toGA4Item, type StockRecord } from "./track";

/** Ledger price: "$36", "from $29". */
export function priceText(p: Product): string {
  return `${hasChoices(p) ? "from " : ""}${formatCentsShort(toCents(fromPrice(p)))}`;
}

/**
 * One in-stock product as a price-list line: thumbnail, name, detail and stock
 * word, price, then the action: add (single variant), choose (has choices).
 */
export function LedgerRow({
  product,
  stock,
  index,
  objectPosition,
}: {
  product: Product;
  stock: StockRecord;
  index: number;
  /** Photo crop, e.g. "50% 30%". */
  objectPosition?: string;
}) {
  const { lines } = useCart();
  const choices = hasChoices(product);
  const variant = firstAvailable(stock, product);
  const inCart = choices ? 0 : (lines.find((l) => l.variantId === variant.id)?.quantity ?? 0);
  const word = stockWord(stock, product);
  const note = inCart > 0 ? `${inCart} in your cart` : word;

  return (
    <li className="flex items-center gap-3 border-b border-rule py-2 lg:gap-4 lg:py-3">
      <Link
        href={`/shop/${product.slug}`}
        onClick={() => pushEvent("select_item", { ecommerce: { items: [toGA4Item(product, index)] } })}
        className="flex min-w-0 flex-1 items-center gap-3 lg:gap-5"
      >
        <span className="relative h-16 w-16 shrink-0 border border-frame bg-paper-light p-[3px] lg:h-24 lg:w-24">
          <span className="relative block h-full w-full overflow-hidden">
            <Image
              src={product.image}
              alt=""
              fill
              sizes="(min-width: 1024px) 96px, 64px"
              className="object-cover"
              style={objectPosition ? { objectPosition } : undefined}
            />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[19px] font-medium leading-[1.15] text-ink lg:text-[23px]">
            {product.title}
          </span>
          <span className="mt-0.5 block text-[12px] leading-[1.4] text-ink-note lg:text-[13px]">
            {product.detail}
            {product.detail && note ? " · " : ""}
            {note && (
              <span className={cn(inCart > 0 && "font-semibold text-pine")}>{note}</span>
            )}
          </span>
        </span>
        <span className="text-[15px] font-semibold text-ink lg:text-[17px]">{priceText(product)}</span>
      </Link>
      {choices ? (
        <Link
          href={`/shop/${product.slug}`}
          aria-label={`Choose ${product.optionName === "Weight" ? "a size" : `a ${(product.optionName ?? "size").toLowerCase()}`} of ${product.title}`}
          className="flex h-11 shrink-0 items-center border border-pine px-3 text-[13px] font-semibold text-pine hover:bg-paper-shade"
        >
          Choose
        </Link>
      ) : (
        <QuickAdd product={product} stock={stock} display="icon" />
      )}
    </li>
  );
}

/**
 * The one sold-out style: dimmed name, leader, "Sold out, $20", and an
 * "Email me" that opens the email field in place.
 */
export function SoldOutRow({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const formId = `soldout-${product.slug}`;
  return (
    <li className="border-b border-rule">
      <div className="flex min-h-12 items-center gap-2 py-1.5">
        <Link
          href={`/shop/${product.slug}`}
          className="font-display text-[19px] leading-tight text-ink-note lg:text-[21px]"
        >
          {product.title}
        </Link>
        <span aria-hidden="true" className={fieldLeaderClass} />
        <span className="shrink-0 text-[13px] text-ink-note">Sold out, {priceText(product)}</span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={formId}
          onClick={() => setOpen((o) => !o)}
          className="ml-1 inline-flex min-h-11 shrink-0 items-center"
        >
          <span className="border-b border-pine-line text-[13px] font-medium text-pine">Email me</span>
          <span className="sr-only"> when {product.title} is back</span>
        </button>
      </div>
      {open && (
        <div id={formId}>
          <WaitlistForm variantIds={product.variants.map((v) => v.id)} name={product.title} />
        </div>
      )}
    </li>
  );
}
