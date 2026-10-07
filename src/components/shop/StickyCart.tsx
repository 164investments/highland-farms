"use client";

import { FieldStickyBar } from "@/components/field/StickyBar";
import { useCart } from "@/lib/shop/cart";
import { formatCents } from "@/lib/shop/money";

/** "View cart (2) · $18.00": the shop's one bottom action once the cart has items (CONSISTENCY #13). */
export function ShopStickyCart() {
  const { count, subtotalCents, ready } = useCart();
  return (
    <FieldStickyBar
      enabled={ready && count > 0}
      primary={{
        label: `View cart (${count}) · ${formatCents(subtotalCents)}`,
        href: "/shop/cart",
      }}
    />
  );
}
