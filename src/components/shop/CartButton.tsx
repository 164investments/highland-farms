"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/shop/cart";

/**
 * Floating cart button.
 *
 * Only appears on shop routes and only once there's something in the cart, so
 * the wedding-venue side of the site is untouched by commerce chrome. Hidden on
 * checkout, where a link back out of the form is a leak, not a convenience.
 */
export function CartButton() {
  const pathname = usePathname();
  const { count, ready } = useCart();

  const onShop = pathname === "/shop" || pathname.startsWith("/shop/");
  const onCheckout = pathname.startsWith("/shop/checkout") || pathname.startsWith("/shop/cart");

  if (!ready || count === 0 || !onShop || onCheckout) return null;

  return (
    <Link
      href="/shop/cart"
      aria-label={`View cart — ${count} item${count === 1 ? "" : "s"}`}
      className="fixed bottom-5 right-5 z-40 flex min-h-[56px] items-center gap-2.5 rounded-full bg-forest px-5 text-sm uppercase tracking-[0.12em] text-white shadow-lg transition-transform hover:scale-[1.02] font-sans"
    >
      <ShoppingBag className="h-4 w-4" />
      Cart
      <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-white/20 px-1.5 text-xs">
        {count}
      </span>
    </Link>
  );
}
