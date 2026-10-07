"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FieldLeader } from "@/components/ui/FieldGuide";
import { ChevronDownIcon, PlusIcon } from "./icons";
import { useCart } from "@/lib/shop/cart";
import { fromPrice, hasChoices, toPrice, type Product } from "@/app/shop/data";
import { formatCentsShort, toCents } from "@/lib/shop/money";
import { WaitlistForm } from "./WaitlistForm";
import { QuickAdd } from "./QuickAdd";
import { firstAvailable, pushEvent, stockWord, toGA4Item, type StockRecord } from "./track";

/**
 * Ledger price: "$36", or "from $29" when the options really differ in price.
 * Sized apparel costs the same in every size, so it reads "$55", not "from $55".
 */
export function priceText(p: Product): string {
  return `${fromPrice(p) !== toPrice(p) ? "from " : ""}${formatCentsShort(toCents(fromPrice(p)))}`;
}

/**
 * One in-stock product as a price-list line: thumbnail, name, detail and stock
 * word, then the one buy button with the price inside it. A single-variant
 * product adds in place; a product with choices opens its page. Products
 * flagged `featured` carry the "Ordered most" tag.
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
  const price = priceText(product);

  return (
    <li className="flex items-center gap-3 border-b border-rule py-2 max-[374px]:gap-2.5 lg:gap-4 lg:py-3">
      <Link
        href={`/shop/${product.slug}`}
        onClick={() => pushEvent("select_item", { ecommerce: { items: [toGA4Item(product, index)] } })}
        className="flex min-w-0 flex-1 items-center gap-3 max-[374px]:gap-2.5 lg:gap-5"
      >
        <span className="relative h-16 w-16 shrink-0 border border-frame bg-paper-light p-[3px] max-[374px]:h-[58px] max-[374px]:w-[58px] lg:h-24 lg:w-24">
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
          {product.featured && (
            <span className="mb-1 block text-[9.5px] font-semibold uppercase leading-none tracking-[0.14em] text-fern">
              Ordered most
            </span>
          )}
          <span className="block font-display text-[19px] font-medium leading-[1.12] text-ink max-[374px]:text-[17.5px] lg:text-[23px]">
            {product.title}
          </span>
          <span className="mt-0.5 block text-[12px] leading-[1.35] text-ink-note max-[374px]:text-[11.5px] lg:text-[13px]">
            {product.detail}
            {product.detail && note ? " · " : ""}
            {note && (
              <span className={cn(inCart > 0 && "font-semibold text-pine")}>{note}</span>
            )}
          </span>
        </span>
      </Link>
      {choices ? (
        <Link
          href={`/shop/${product.slug}`}
          aria-label={`Choose ${product.optionName === "Weight" ? "a size" : `a ${(product.optionName ?? "size").toLowerCase()}`} of ${product.title}, ${price}`}
          className={BUY_BUTTON}
        >
          <PlusIcon size={13} />
          <span className="whitespace-nowrap">{price}</span>
        </Link>
      ) : (
        <QuickAdd product={product} stock={stock} display="price" />
      )}
    </li>
  );
}

/** Same box as QuickAdd's "price" button, so every product has one buy style. */
const BUY_BUTTON =
  "flex h-11 shrink-0 items-center gap-1.5 border border-pine px-3 text-[13px] font-semibold text-pine hover:bg-paper-shade max-[374px]:px-2.5 lg:px-4";

/**
 * The one sold-out line for a shelf: "N sold out ... Email me when back".
 * Opened, every sold-out item is a ticked choice above one shared email
 * field; the email is saved for each ticked item through the waitlist API.
 */
export function ShelfSoldOut({ products }: { products: Product[] }) {
  const [off, setOff] = useState<Set<string>>(() => new Set());
  if (products.length === 0) return null;
  const chosen = products.filter((p) => !off.has(p.slug));
  const toggle = (slug: string) =>
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  return (
    <li>
      <details className="group border-b border-rule">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 py-1.5 [&::-webkit-details-marker]:hidden">
          <span className="whitespace-nowrap font-display text-[19px] leading-tight text-ink-note lg:text-[21px]">
            {products.length} sold out
          </span>
          <FieldLeader />
          <span className="shrink-0 border-b border-pine-line text-[13px] font-medium text-pine">
            Email me when back
          </span>
          <ChevronDownIcon size={14} className="shrink-0 text-pine transition-transform group-open:rotate-180" />
        </summary>
        <div className="pb-3.5">
          <p className="m-0 text-[13px] leading-[1.55] text-ink-note">Untick any you don&apos;t want.</p>
          <ul className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0">
            {products.map((p) => {
              const on = !off.has(p.slug);
              return (
                <li key={p.slug}>
                  <label
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-[7px] border border-frame bg-paper-light py-0 pl-2 pr-[11px] text-[13px] leading-tight max-[374px]:text-[12px]",
                      on ? "text-ink-body" : "text-ink-meta",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(p.slug)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center text-[11px] leading-none peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pine",
                        on ? "bg-pine text-paper-light" : "border border-frame text-transparent",
                      )}
                    >
                      ✓
                    </span>
                    {p.title}
                  </label>
                </li>
              );
            })}
          </ul>
          {chosen.length > 0 ? (
            <WaitlistForm
              variantIds={chosen.flatMap((p) => p.variants.map((v) => v.id))}
              name=""
              label="Your email"
            />
          ) : (
            <p className="m-0 mt-3 text-[13px] text-ink-note">Tick at least one to get an email.</p>
          )}
        </div>
      </details>
    </li>
  );
}
