import type { Metadata } from "next";
import { CartBody } from "./CartBody";
import { PRODUCTS, hasChoices } from "../data";
import { getStockMap, allSoldOut } from "@/lib/shop/inventory";
import { isSoldOut } from "@/components/shop/track";
import { toCents } from "@/lib/shop/money";
import { resolveFieldQuote, REVIEW_TIER_COUNTS } from "@/components/field/Reviews";
import { SHOP_CART_QUOTE } from "../quotes";

export const metadata: Metadata = {
  title: "Your Order",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const stock = await getStockMap();
  const record = Object.fromEntries(stock);
  // The empty cart offers the same four Farm favorites as /shop.
  const favorites = PRODUCTS.filter((p) => p.featured && !isSoldOut(record, p));

  // In-stock single-size items, cheapest first. The client picks the ones that
  // close the gap to the delivery minimum for the cart it actually holds.
  // Firewood is left out: it is for farm stays, not a pickup add-on.
  const addOns = PRODUCTS.filter(
    (p) =>
      p.slug !== "firewood" &&
      !hasChoices(p) &&
      !allSoldOut(stock, p.variants.map((v) => v.id)),
  )
    .sort((a, b) => a.variants[0].price - b.variants[0].price)
    .map((p) => {
      const variant = p.variants[0];
      return {
        variantId: variant.id,
        slug: p.slug,
        title: p.title,
        image: p.image,
        priceCents: toCents(variant.price),
        madeToOrder: variant.stock === null && !stock.has(variant.id),
      };
    });

  return (
    <CartBody
      addOns={addOns}
      quote={resolveFieldQuote(SHOP_CART_QUOTE, { role: true })}
      reviewCount={REVIEW_TIER_COUNTS.nearCta}
      favorites={favorites}
      stock={record}
    />
  );
}
