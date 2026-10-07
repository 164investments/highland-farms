"use client";

import { cn } from "@/lib/utils";
import { useCart } from "@/lib/shop/cart";
import { type Product } from "@/app/shop/data";
import { firstAvailable, pushAddToCart, unitsLeft, type StockRecord } from "./track";
import { PlusIcon } from "./icons";
import { QtyStepper } from "./QtyStepper";

/**
 * One-tap add for a single-variant, in-stock product. After the first tap the
 * button becomes a stepper on the cart's own count (shop rows, favorites,
 * add-ons). Same add_to_cart payload as the product page.
 */
export function QuickAdd({
  product,
  stock,
  display = "icon",
  className,
}: {
  product: Product;
  stock: StockRecord;
  /** "icon" 44px square (ledger rows), "price" "+ $15" (add-ons), "label" "Add to cart · $65" (favorites). */
  display?: "icon" | "price" | "label";
  className?: string;
}) {
  const { lines, add, setQuantity } = useCart();
  const variant = firstAvailable(stock, product);
  const qty = lines.find((l) => l.variantId === variant.id)?.quantity ?? 0;
  const left = unitsLeft(stock, variant.id);
  const max = left === null ? 99 : Math.max(1, left);
  const price = `$${variant.price % 1 === 0 ? variant.price : variant.price.toFixed(2)}`;

  if (qty > 0) {
    return (
      <QtyStepper
        value={qty}
        max={max}
        label={product.title.toLowerCase()}
        variant="pine"
        live
        className={cn(display === "label" ? "w-full justify-between" : "", className)}
        onChange={(n) => setQuantity(variant.id, n)}
      />
    );
  }

  const handle = () => {
    add(variant.id, 1);
    pushAddToCart(product, variant, 1);
  };

  if (display === "icon") {
    return (
      <button
        type="button"
        onClick={handle}
        aria-label={`Add to cart: ${product.title}`}
        className={cn("flex h-11 w-11 shrink-0 items-center justify-center border border-pine text-pine hover:bg-paper-shade", className)}
      >
        <PlusIcon />
      </button>
    );
  }
  if (display === "price") {
    return (
      <button
        type="button"
        onClick={handle}
        aria-label={`Add to cart: ${product.title}, ${price}`}
        className={cn("flex h-11 shrink-0 items-center gap-1.5 border border-pine px-3 text-[13px] font-semibold text-pine hover:bg-paper-shade lg:px-4", className)}
      >
        <PlusIcon size={13} />
        {price}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={handle}
      aria-label={`Add ${product.title} to your cart, ${price}`}
      className={cn("flex h-11 w-full items-center justify-center gap-1.5 border border-pine text-[14px] font-semibold text-pine hover:bg-paper-shade", className)}
    >
      Add to cart · {price}
    </button>
  );
}
