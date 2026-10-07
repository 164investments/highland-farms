import { fromPrice, type Product, type Variant } from "@/app/shop/data";

/** variant id -> units left; null means unlimited. Serialised from the server. */
export type StockRecord = Record<string, number | null>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * The one dataLayer push for the shop, checkout included.
 *
 * GTM merges pushed objects into one model, and arrays merge index by index:
 * after the 29-item `view_item_list`, a one-item `add_to_cart` would still
 * carry 28 stale list items. So every ecommerce push is preceded by
 * `{ ecommerce: null }` (Google's documented reset). It has no `event` key, so
 * it fires no trigger.
 */
export function pushEvent(event: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if ("ecommerce" in payload) window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({ event, ...payload });
}

/** Units left for a variant. Unknown variants read as unlimited, like getStockMap. */
export function unitsLeft(stock: StockRecord, variantId: string): number | null {
  return variantId in stock ? stock[variantId] : null;
}

export function isSoldOut(stock: StockRecord, product: Product): boolean {
  return product.variants.every((v) => unitsLeft(stock, v.id) === 0);
}

/** The variant a one-tap add uses: the first one still in stock. */
export function firstAvailable(stock: StockRecord, product: Product): Variant {
  return product.variants.find((v) => unitsLeft(stock, v.id) !== 0) ?? product.variants[0];
}

/** GA4 list item, the same shape the grid has always pushed. */
export function toGA4Item(p: Product, index: number) {
  return {
    item_id: p.slug,
    item_name: p.name,
    item_category: p.category,
    price: fromPrice(p),
    index,
  };
}

/** add_to_cart with the same payload as the product page's button. */
export function pushAddToCart(p: Product, v: Variant, quantity = 1) {
  pushEvent("add_to_cart", {
    ecommerce: {
      currency: "USD",
      value: (v.price * quantity),
      items: [
        {
          item_id: p.slug,
          item_name: p.name,
          item_category: p.category,
          item_variant: v.label,
          price: v.price,
          quantity,
        },
      ],
    },
  });
}

/** "Only 3 left" for 1 to 5 in stock; otherwise null. */
export function scarcityLabel(stock: number | null): string | null {
  if (stock === null || stock > 5 || stock <= 0) return null;
  return stock === 1 ? "Only 1 left" : `Only ${stock} left`;
}

/**
 * The stock word in a ledger row: "Only 3 left", "In stock", or nothing for
 * made-to-order and sized apparel (their detail line says it).
 */
export function stockWord(stock: StockRecord, p: Product): string | null {
  if (p.variants.length > 1) {
    if (p.category === "apparel") return null;
    return "In stock";
  }
  const left = unitsLeft(stock, p.variants[0].id);
  if (left === null) return null;
  return scarcityLabel(left) ?? "In stock";
}
