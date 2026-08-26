import type { Metadata } from "next";
import { CartBody } from "./CartBody";
import { PRODUCTS, fromPrice } from "../data";
import { getStockMap, allSoldOut } from "@/lib/shop/inventory";
import { toCents } from "@/lib/shop/money";

export const metadata: Metadata = {
  title: "Your Cart | Highland Farms",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const stock = await getStockMap();

  // Cheap, in-stock staples to offer alongside the order. Kept to the low end
  // on purpose: an $8 add-on next to a $55 hoodie reads as trivial, and it is
  // also what closes the gap to the $50 delivery minimum in one tap.
  const addOns = PRODUCTS.filter(
    (p) => !allSoldOut(stock, p.variants.map((v) => v.id)) && fromPrice(p) <= 25,
  )
    .sort((a, b) => fromPrice(a) - fromPrice(b))
    .slice(0, 6)
    .map((p) => {
      const variant =
        p.variants.find((v) => stock.get(v.id) !== 0) ?? p.variants[0];
      return {
        variantId: variant.id,
        slug: p.slug,
        name: p.name,
        image: p.image,
        priceCents: toCents(variant.price),
      };
    });

  return <CartBody addOns={addOns} />;
}
