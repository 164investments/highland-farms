import { isSoldOut, type StockRecord } from "@/components/shop/track";
import { CATEGORIES, PRODUCTS, type Category, type CategoryKey, type Product } from "./data";

/**
 * In stock first, catalogue order within each group. Plain module (no "use
 * client") so the server page can count shelves and the client body can list them.
 */
export function shelfProducts(cat: Category, stock: StockRecord): { open: Product[]; out: Product[] } {
  const all = PRODUCTS.filter((p) => p.category === cat.key);
  return {
    open: all.filter((p) => !isSoldOut(stock, p)),
    out: all.filter((p) => isSoldOut(stock, p)),
  };
}

/** Tie-break when two shelves hold the same number of most-ordered items (shop board C, round 1). */
const TIE_ORDER: CategoryKey[] = ["plush", "apparel", "beef", "mangalitsa", "pantry"];

/**
 * Shelf order on /shop: the shelves holding the most in-stock `featured`
 * (most-ordered) items first, then the rest in catalogue order. Reads the
 * existing `featured` flag; no separate ranking.
 */
export function orderedCategories(stock: StockRecord): Category[] {
  const featuredOpen = (c: Category) =>
    PRODUCTS.filter((p) => p.category === c.key && p.featured && !isSoldOut(stock, p)).length;
  const tie = (c: Category) => {
    const i = TIE_ORDER.indexOf(c.key);
    return i === -1 ? TIE_ORDER.length : i;
  };
  return [...CATEGORIES].sort((a, b) => featuredOpen(b) - featuredOpen(a) || tie(a) - tie(b));
}

/** Preferred door photo per shelf (first in-stock slug wins) and its crop. */
const DOOR_PICKS: Record<CategoryKey, { slugs: string[]; position?: string }[]> = {
  plush: [
    { slugs: ["weighted-mircrowavable-highland-cow-plush"], position: "50% 45%" },
    { slugs: ["weighted-microwavable-highland-cow-plush-white"], position: "50% 45%" },
  ],
  apparel: [{ slugs: ["highland-farm-the-dream-hoodie-olive-green"], position: "50% 30%" }],
  beef: [{ slugs: ["ground-beef"] }],
  mangalitsa: [{ slugs: ["mangalitsa-special-blend-sausage"] }],
  pantry: [{ slugs: ["dried-flower-bouquet"] }],
};

/**
 * The shelf door's photo: an in-stock item from live stock (the board's pick
 * when it is in stock, else the shelf's first in-stock item), so a sold-out
 * photo never fronts a shelf. Null when nothing on the shelf is in stock.
 */
export function doorPhoto(cat: Category, stock: StockRecord): { src: string; position?: string } | null {
  const { open } = shelfProducts(cat, stock);
  for (const pick of DOOR_PICKS[cat.key] ?? []) {
    const hit = open.find((p) => pick.slugs.includes(p.slug));
    if (hit) return { src: hit.image, position: pick.position };
  }
  return open[0] ? { src: open[0].image } : null;
}
