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
      "From our herd. Scottish Highland beef, pasture-raised at the base of Mt. Hood — lean and deeply flavorful.",
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
  /**
   * Shown on `/shop/<slug>` under the price note, and emitted as
   * `Product.description` in the JSON-LD on both `/shop` (the ItemList) and the
   * product page — see `src/lib/shop/product-schema.ts`. Because it is rendered
   * to humans as well as to crawlers, never put anything here that the page
   * does not display.
   *
   * ⛔ SOURCING RULE (2026-09-17). This is a real business selling real food.
   * Every clause must be derivable from something already published or already
   * in this repo: the product `name` (which states the cut), `priceNote` (real
   * weights), `badges`, the variant options, the category `story` copy above,
   * the fulfillment terms in `src/lib/shop/fulfillment.ts`, or the farm facts
   * already live on `/shop` and in `public/llms.txt` — five acres in Brightwood
   * at the base of Mt. Hood, Scottish Highland cattle and Mangalitsa pigs
   * raised on the property, "Pasture-raised", "Family-run since
   * 2019", and the two named cows the plush are modeled on (Princess Fiona,
   * white; Mr. Finley, red).
   *
   * Forbidden: invented flavor or taste claims, cooking instructions, nutrition
   * or health claims, allergen or food-safety claims of any kind, origin or
   * feed claims beyond "pasture-raised" / "slow-grown on our pastures", any
   * certification (organic, grass-fed, non-GMO, heritage-certified) not already
   * published, invented provenance for the apparel, and any claim about the
   * plush beyond the published category blurb. Prices belong in `variants`, not
   * here — Square is the price source of truth and prose would go stale.
   * Two short true sentences beat a long invented paragraph.
   */
  description?: string;
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
    description:
      "A weighted, microwavable plush modeled on Princess Fiona, the white Highland cow in our Brightwood herd and one of the two most-photographed cows on the farm. Heat her for a warm, calming hug. Our best-selling plush, and the gift farm-tour guests come back to buy.",
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
    description:
      "A weighted, microwavable plush modeled on Mr. Finley, the red Highland cow in our Brightwood herd and the other of our two most-photographed cows. Heat him for a warm, calming hug — the same plush our farm-tour guests come back for.",
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
    description:
      "The Dream Hoodie in coyote brown, from the Dream collection designed here in Brightwood. Stocked in six sizes, Small through 3XL, and our best-selling piece of farm apparel. Collect it free at the farm, or add it to a local delivery.",
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
    description:
      "The Dream Hoodie in olive green — the same hoodie as the coyote brown, in the Dream collection's second colorway, designed here in Brightwood. Stocked in six sizes, Small through XXXLarge.",
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
    description:
      "The Dream T-Shirt in olive green — the tee in the Dream collection, designed here in Brightwood. Stocked in six sizes, Small through 3XL. Same design as the cream Dream tee, in the darker of the two colorways.",
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
    description:
      "The Dream T-Shirt in cream — the same Dream collection tee as the olive green, in the lighter colorway. Designed here in Brightwood and stocked in six sizes, Small through 3XL.",
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
    description:
      "The Farm T-Shirt in cream — our farm tee, a separate design from the Dream collection shirts. Stocked in six sizes, Small through 3XL, for free pickup at the farm in Brightwood or local delivery.",
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
    description:
      "A Highland Farms trucker hat in camo — the hat in the Dream collection, designed here in Brightwood. Stocked in one size, so there is nothing to choose at checkout. Free to collect at the farm with the rest of an order.",
    category: "apparel",
    image: "/images/shop/camo-trucker-hat.jpg",
    variants: [
      { id: "SQ0051228", price: 35, stock: 51 },
    ],
  },
  {
    slug: "highland-farms-logo-keychain-leather-branded",
    name: "Logo Leather Keychain",
    description:
      "A genuine leather keychain branded with the Highland Farms logo. Made to order rather than held against a stock count, so it does not sell out. A small thing to add to a farm pickup or a local delivery.",
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
    description:
      "Thick-cut bacon from our Mangalitsa pigs, seasoned with pepper and sold in a 1 lb pack. Mangalitsa is a Hungarian heritage breed — the wagyu of pork — slow-grown on our pastures here in Brightwood.",
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
    description:
      "Thick-cut Mangalitsa bacon without the pepper — the plain version of our peppered cut, in the same 1 lb pack. From the Hungarian heritage breed we raise on the pastures at our Brightwood farm.",
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
    description:
      "A cured ham from our Mangalitsa pigs, sold whole. Each one runs 2.6 to 3 lbs, so the exact weight varies from ham to ham. Mangalitsa is a Hungarian heritage breed, marbled and slow-grown on our pastures in Brightwood.",
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
    description:
      "A Mangalitsa sirloin roast at a fixed 2.13 lb — one roast, one weight, unlike the shoulder roast, which is sold by size. From the Hungarian heritage-breed pigs we raise on the pastures here in Brightwood.",
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
    description:
      "A Mangalitsa pork shoulder roast sold by weight: choose 2 lb, 2.6 lb or 3 lb at checkout, and the price follows the size. From the Hungarian heritage breed, slow-grown on our pastures in Brightwood.",
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
    description:
      "Baby back ribs from our Mangalitsa pigs — the shorter rack cut from along the loin, sold as one rack in a single size. From the Hungarian heritage breed we raise on the pastures at our Brightwood farm.",
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
    description:
      "Mangalitsa spare ribs — the longer rack from the belly side, and the one cut of ribs we sell in two sizes. Choose Medium or Large at checkout. From the Hungarian heritage-breed pigs slow-grown on our pastures in Brightwood.",
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
    description:
      "A whole Mangalitsa pork tenderloin, one per pack at 0.95 lb. The tenderloin is the long, narrow cut that runs along the backbone. From the Hungarian heritage breed we raise on our Brightwood pastures.",
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
    description:
      "A boneless Mangalitsa pork chop, sold by weight at 1 lb — boneless, so the whole pack weight is meat. The bone-in chop is the same cut with the bone left in. From our heritage-breed pigs in Brightwood.",
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
    description:
      "A bone-in Mangalitsa pork chop, sold by weight at 0.75 lb — part of that weight is bone, which the boneless chop does not carry. From the Hungarian heritage breed raised on our pastures in Brightwood.",
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
    description:
      "Mangalitsa sausage links in a 1 lb pack — links, as opposed to the loose ground of our breakfast sausage. Made from our special blend, using the Hungarian heritage-breed pigs we raise here in Brightwood.",
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
    description:
      "Ground Mangalitsa breakfast sausage, sold loose in a 1 lb pack rather than in links. From the Hungarian heritage breed we raise on the pastures at our five-acre farm in Brightwood.",
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
    description:
      "Ground beef from our own Scottish Highland herd, ground from top sirloin and sold in 1 lb packs. The cattle are raised on our pastures at the base of Mt. Hood — pasture-raised.",
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
    description:
      "A New York steak from our own Scottish Highland herd — the strip cut taken from the short loin. The cattle are pasture-raised on five acres in Brightwood, at the base of Mt. Hood.",
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
    description:
      "A tenderloin steak from our own Scottish Highland herd, cut from the tenderloin that runs along the backbone — a different cut from the New York strip we also sell. Pasture-raised, at the base of Mt. Hood.",
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
    description:
      "A dozen eggs from our own hens on the farm in Brightwood. Sold by the dozen for free pickup at the farm, or added to a local delivery run through the Mt. Hood corridor and east Portland.",
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
    description:
      "A bouquet hand-tied from the farm garden in Brightwood. Fresh flowers, so it goes no further than farm pickup or a local delivery run — Highland Farms does not ship.",
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
    description:
      "A bouquet of dried flowers hand-tied from our farm garden — the dried counterpart to the fresh bouquet. Made to order rather than held against a stock count, for free pickup in Brightwood or local delivery.",
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
    description:
      "Firewood and kindling from the farm, kept for guests staying at the Lodge, Cottage or Camp — and for anyone else collecting an order. Always available rather than limited to a stock count.",
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

/**
 * Highest price across variants. Paired with `fromPrice` for the
 * `AggregateOffer.lowPrice`/`highPrice` schema on multi-variant products —
 * see `src/lib/shop/product-schema.ts`.
 */
export function toPrice(product: Product): number {
  return Math.max(...product.variants.map((v) => v.price));
}

export function hasChoices(product: Product): boolean {
  return product.variants.length > 1;
}
