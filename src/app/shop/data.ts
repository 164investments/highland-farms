// Highland Farms farm-store catalog.
//
// PROVENANCE: seeded from the Squarespace store that was cancelled in Aug 2026.
// The store went dark ("Website Expired") before it could be exported, so the
// variants, prices and stock below were recovered from the 2026-06-05 Wayback
// snapshots of all 28 product pages. The raw recovery is kept at
// `docs/squarespace-catalog-recovered-2026-06-05.json`.
//
// PRICES: ⛔ SQUARE IS THE SOURCE OF TRUTH (Hayden, 2026-08-26). Where a variant
// is linked to a Square variation, the price here is Square's price, and Square
// wins on any future disagreement. Re-sync with
// `node scripts/sync-square-prices.mjs --apply`.
//
// Variants with no Square counterpart (all apparel, both plush, the bouquets)
// keep their own price because Square has no opinion on them.
//
// STOCK here is only the SEED for the `shop_inventory` table. Live availability
// is read from Supabase at request time (see `src/lib/shop/inventory.ts`), so
// selling out does not require a deploy. The seed counts are from 2026-06-05
// and must be re-counted by the farm before launch.

export type CategoryKey =
  | "plush"
  | "apparel"
  | "mangalitsa"
  | "beef"
  | "pantry";

export interface Category {
  key: CategoryKey;
  label: string;
  shortLabel: string;
  story: string;
}

export const CATEGORIES: Category[] = [
  {
    key: "plush",
    label: "Highland Cow Plush",
    shortLabel: "Plush",
    story:
      "Weighted, microwavable plush of our two most-photographed cows. Heat for a warm, calming hug — the gift our farm-tour guests come back to buy.",
  },
  {
    key: "apparel",
    label: "Apparel",
    shortLabel: "Apparel",
    story:
      "The Dream collection — hoodies, tees, and trucker hats, designed in Brightwood.",
  },
  {
    key: "mangalitsa",
    label: "Mangalitsa Pork",
    shortLabel: "Mangalitsa",
    story:
      "The wagyu of pork. Hungarian heritage breed, marbled and rich, slow-grown on our pastures. Sold in single-cut packs.",
  },
  {
    key: "beef",
    label: "Highland Beef",
    shortLabel: "Highland Beef",
    story:
      "From our herd. Scottish Highland beef, grass-fed at the base of Mt. Hood — lean and deeply flavorful.",
  },
  {
    key: "pantry",
    label: "Farm Pantry",
    shortLabel: "Pantry",
    story:
      "Eggs from our hens, hand-tied bouquets from the farm garden, and firewood for the lodge.",
  },
];

/** One buyable SKU. `stock: null` means unlimited (made to order). */
export interface Variant {
  id: string;
  /** Option value, e.g. "Large" or "2.6 Lb". Absent on single-variant products. */
  label?: string;
  price: number;
  stock: number | null;
}

export interface Product {
  slug: string;
  name: string;
  category: CategoryKey;
  image: string;
  priceNote?: string;
  badges?: string[];
  featured?: boolean;
  /** What the variant options represent, e.g. "Size" | "Weight". */
  optionName?: string;
  variants: Variant[];
}

export const PRODUCTS: Product[] = [
  {
    slug: "weighted-microwavable-highland-cow-plush-white",
    name: "Princess Fiona — White Highland Cow Plush",
    category: "plush",
    image: "/images/shop/princess-fiona-plush.jpg",
    badges: ["Best Seller", "Microwavable"],
    featured: true,
    variants: [
      { id: "SQ2659367", price: 65, stock: 10 },
    ],
  },
  {
    slug: "weighted-mircrowavable-highland-cow-plush",
    name: "Mr. Finley — Red Highland Cow Plush",
    category: "plush",
    image: "/images/shop/mr-finley-plush.jpg",
    badges: ["Microwavable"],
    featured: true,
    variants: [
      { id: "SQ3765891", price: 65, stock: 21 },
    ],
  },
  {
    slug: "highland-farms-the-dream-hoodie",
    name: "The Dream Hoodie — Coyote Brown",
    category: "apparel",
    image: "/images/shop/dream-hoodie.png",
    badges: ["Best Seller"],
    featured: true,
    optionName: "Size",
    variants: [
      { id: "SQ1839677", label: "Small", price: 55, stock: 0 },
      { id: "SQ2746339", label: "Medium", price: 55, stock: 7 },
      { id: "SQ5331094", label: "Large", price: 55, stock: 10 },
      { id: "SQ1674460", label: "XL", price: 55, stock: 10 },
      { id: "SQ7658000", label: "2XL", price: 55, stock: 1 },
      { id: "SQ9792468", label: "3XL", price: 55, stock: 0 },
    ],
  },
  {
    slug: "highland-farm-the-dream-hoodie-olive-green",
    name: "The Dream Hoodie — Olive Green",
    category: "apparel",
    image: "/images/shop/dream-hoodie-olive.jpg",
    optionName: "Size",
    variants: [
      { id: "SQ8737508", label: "Small", price: 55, stock: 2 },
      { id: "SQ0894230", label: "Medium", price: 55, stock: 5 },
      { id: "SQ8434806", label: "Large", price: 55, stock: 5 },
      { id: "SQ5091399", label: "XLarge", price: 55, stock: 7 },
      { id: "SQ2417859", label: "XXLarge", price: 55, stock: 1 },
      { id: "SQ7574307", label: "XXXLarge", price: 55, stock: 2 },
    ],
  },
  {
    slug: "highland-farms-the-dream-t-shirt",
    name: "The Dream T-Shirt — Olive Green",
    category: "apparel",
    image: "/images/shop/dream-tshirt.png",
    optionName: "Size",
    variants: [
      { id: "SQ7516247", label: "Small", price: 32, stock: 4 },
      { id: "SQ7590925", label: "Medium", price: 32, stock: 6 },
      { id: "SQ7458216", label: "Large", price: 32, stock: 2 },
      { id: "SQ8962675", label: "XL", price: 32, stock: 1 },
      { id: "SQ1487794", label: "2XL", price: 32, stock: 2 },
      { id: "SQ8073997", label: "3XL", price: 32, stock: 1 },
    ],
  },
  {
    slug: "highland-farms-the-dream-t-shirt-j7bx6",
    name: "The Dream T-Shirt — Cream",
    category: "apparel",
    image: "/images/shop/dream-tshirt-cream.jpg",
    optionName: "Size",
    variants: [
      { id: "SQ7470781", label: "Small", price: 32, stock: 1 },
      { id: "SQ0726058", label: "Medium", price: 32, stock: 4 },
      { id: "SQ7081230", label: "Large", price: 32, stock: 2 },
      { id: "SQ3701583", label: "XL", price: 32, stock: 5 },
      { id: "SQ1820831", label: "2XL", price: 32, stock: 5 },
      { id: "SQ1235533", label: "3XL", price: 32, stock: 2 },
    ],
  },
  {
    slug: "highland-farms-the-dream-t-shirt-j7bx6-appl6",
    name: "The Farm T-Shirt — Cream",
    category: "apparel",
    image: "/images/shop/farm-tshirt-cream.jpg",
    optionName: "Size",
    variants: [
      { id: "SQ4164705", label: "Small", price: 32, stock: 1 },
      { id: "SQ6383282", label: "Medium", price: 32, stock: 4 },
      { id: "SQ6055414", label: "Large", price: 32, stock: 0 },
      { id: "SQ0233177", label: "XL", price: 32, stock: 3 },
      { id: "SQ4181656", label: "2XL", price: 32, stock: 3 },
      { id: "SQ8240622", label: "3XL", price: 32, stock: 0 },
    ],
  },
  {
    slug: "highland-farms-camo-trucker-hat",
    name: "Highland Farms Camo Trucker Hat",
    category: "apparel",
    image: "/images/shop/camo-trucker-hat.jpg",
    variants: [
      { id: "SQ0051228", price: 35, stock: 51 },
    ],
  },
  {
    slug: "highland-farms-logo-keychain-leather-branded",
    name: "Logo Leather Keychain",
    category: "apparel",
    image: "/images/shop/keychain.jpg",
    badges: ["Genuine Leather"],
    variants: [
      { id: "SQ7366113", price: 10, stock: null },
    ],
  },
  {
    slug: "mangalitsa-thick-cut-peppered-bacon",
    name: "Thick Cut Peppered Bacon",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-peppered-bacon.jpg",
    priceNote: "1 lb pack",
    badges: ["Heritage Breed"],
    variants: [
      { id: "SQ7558508", price: 16, stock: 0 },
    ],
  },
  {
    slug: "mangalitsa-thick-cut-bacon",
    name: "Thick Cut Bacon",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-thick-cut-bacon.jpg",
    priceNote: "1 lb pack",
    badges: ["Heritage Breed"],
    variants: [
      { id: "SQ4635265", price: 16, stock: 0 },
    ],
  },
  {
    slug: "mangalitsa-cured-hams",
    name: "Cured Ham",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-cured-ham.png",
    priceNote: "2.6 – 3 lbs",
    badges: ["Heritage Breed"],
    variants: [
      { id: "SQ3229689", price: 36, stock: 7 },
    ],
  },
  {
    slug: "mangalitsa-sirloin-roast-213-lb",
    name: "Sirloin Roast",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-sirloin-roast.jpg",
    priceNote: "2.13 lb",
    badges: ["Heritage Breed"],
    variants: [
      { id: "SQ3031508", price: 31, stock: 3 },
    ],
  },
  {
    slug: "mangalitsa-pork-roast",
    name: "Pork Shoulder Roast",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-shoulder-roast.png",
    priceNote: "from · choose size",
    badges: ["Heritage Breed"],
    optionName: "Weight",
    variants: [
      { id: "SQ5617290", label: "2 LB", price: 29, stock: 5 },
      { id: "SQ1821898", label: "2.6 Lb", price: 38, stock: 5 },
      { id: "SQ5153405", label: "3LB", price: 43, stock: 2 },
    ],
  },
  {
    slug: "mangalitsa-baby-back-ribs",
    name: "Baby Back Ribs",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-baby-back-ribs.jpg",
    badges: ["Heritage Breed"],
    variants: [
      { id: "SQ1200159", price: 19, stock: 3 },
    ],
  },
  {
    slug: "mangalitsa-spare-ribs",
    name: "Spare Ribs",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-spare-ribs.jpg",
    priceNote: "from · choose size",
    badges: ["Heritage Breed"],
    optionName: "Weight",
    variants: [
      { id: "SQ0060631", label: "Large", price: 32, stock: 0 },
      { id: "SQ3961613", label: "Medium", price: 30, stock: 0 },
    ],
  },
  {
    slug: "mangalitsa-pork-tenderloin",
    name: "Pork Tenderloin",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-tenderloin.jpg",
    priceNote: "0.95 lb",
    badges: ["Heritage Breed"],
    variants: [
      { id: "SQ5330366", price: 17, stock: 0 },
    ],
  },
  {
    slug: "mangalitsa-pork-chop-boneless",
    name: "Pork Chop — Boneless",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-chop-boneless.jpg",
    badges: ["Heritage Breed"],
    optionName: "Weight",
    variants: [
      { id: "SQ6702037", label: "1 lb", price: 9, stock: 4 },
    ],
  },
  {
    slug: "mangalitsa-pork-chop-bone-in",
    name: "Pork Chop — Bone-In",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-chop-bone-in.jpg",
    badges: ["Heritage Breed"],
    optionName: "Weight",
    variants: [
      { id: "SQ5409224", label: ".75", price: 9, stock: 5 },
    ],
  },
  {
    slug: "mangalitsa-special-blend-sausage",
    name: "Sausage Links",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-sausage-links.png",
    priceNote: "1 lb pack",
    badges: ["Heritage Breed"],
    variants: [
      { id: "SQ7586746", price: 9, stock: 47 },
    ],
  },
  {
    slug: "mangalitsa-breakfast-sausage",
    name: "Breakfast Sausage — Ground",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-breakfast-sausage.jpg",
    priceNote: "1 lb pack",
    badges: ["Heritage Breed"],
    variants: [
      { id: "SQ7630475", price: 9, stock: 43 },
    ],
  },
  {
    slug: "ground-beef",
    name: "Top Sirloin Ground Beef",
    category: "beef",
    image: "/images/shop/ground-beef.jpg",
    priceNote: "1 lb",
    badges: ["From Our Herd"],
    variants: [
      { id: "SQ6898162", price: 9, stock: 77 },
    ],
  },
  {
    slug: "highland-beef-new-york-steak",
    name: "New York Steak",
    category: "beef",
    image: "/images/shop/ny-steak.jpg",
    badges: ["From Our Herd"],
    variants: [
      { id: "SQ3825234", price: 20, stock: 0 },
    ],
  },
  {
    slug: "highland-beef-tenderloin-steak",
    name: "Tenderloin Steak",
    category: "beef",
    image: "/images/shop/tenderloin-steak.jpg",
    badges: ["From Our Herd"],
    variants: [
      { id: "SQ4270922", price: 22, stock: 0 },
    ],
  },
  {
    slug: "a-dozen-eggs",
    name: "Farm Fresh Eggs",
    category: "pantry",
    image: "/images/shop/eggs.jpg",
    priceNote: "dozen",
    badges: ["Laid This Week"],
    featured: true,
    variants: [
      { id: "SQ9271455", price: 8, stock: 9 },
    ],
  },
  {
    slug: "fresh-flower-bouquet",
    name: "Fresh Flower Bouquet",
    category: "pantry",
    image: "/images/shop/fresh-flower-bouquet.jpg",
    badges: ["Farm Garden"],
    variants: [
      { id: "SQ9810417", price: 25, stock: 0 },
    ],
  },
  {
    slug: "dried-flower-bouquet",
    name: "Dried Flower Bouquet",
    category: "pantry",
    image: "/images/shop/dried-flower-bouquet.jpg",
    badges: ["Farm Garden"],
    variants: [
      { id: "SQ1943823", price: 15, stock: null },
    ],
  },
  {
    slug: "firewood",
    name: "Firewood & Kindling",
    category: "pantry",
    image: "/images/shop/firewood.jpg",
    badges: ["For Farm Stays"],
    variants: [
      { id: "SQ0100237", price: 9, stock: null },
    ],
  },
];

const BY_SLUG = new Map(PRODUCTS.map((p) => [p.slug, p]));
const BY_VARIANT = new Map(
  PRODUCTS.flatMap((p) => p.variants.map((v) => [v.id, { product: p, variant: v }] as const)),
);

export function getProduct(slug: string): Product | undefined {
  return BY_SLUG.get(slug);
}

/**
 * Resolve a variant id to its product + variant. This is the server's price
 * authority: checkout recomputes every line from here and never trusts a
 * price sent by the browser.
 */
export function getVariant(
  variantId: string,
): { product: Product; variant: Variant } | undefined {
  return BY_VARIANT.get(variantId);
}

/** Lowest price across variants — what the collection card shows. */
export function fromPrice(product: Product): number {
  return Math.min(...product.variants.map((v) => v.price));
}

export function hasChoices(product: Product): boolean {
  return product.variants.length > 1;
}
