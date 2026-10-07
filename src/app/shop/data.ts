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
  /** Shelf heading ("Mangalitsa pork"). */
  label: string;
  /** Shelf button and tab label ("Cow plush"). */
  shortLabel: string;
  /** The italic line under the shelf heading. */
  story: string;
  /** Count noun for the shelf meta line: "12 cuts", "2 plush". */
  unit: { one: string; many: string };
  /** Shown instead of "all in stock" when every item is in stock ("pickup or local delivery"). */
  allInStockNote?: string;
  /** Product pages on this shelf list the sibling cuts under the buy box. */
  cutList?: string;
}

/**
 * Shelf order is the order on /shop (No. 1 to No. 5): the shelf with the most
 * in stock first (shop board round 2). Copy follows finish/boards/shop/NOTES.md.
 */
export const CATEGORIES: Category[] = [
  {
    key: "mangalitsa",
    label: "Mangalitsa pork",
    shortLabel: "Mangalitsa pork",
    story: "A Hungarian heritage breed, marbled and rich. Sold in single-cut packs.",
    unit: { one: "cut", many: "cuts" },
  },
  {
    key: "beef",
    label: "Highland beef",
    shortLabel: "Highland beef",
    story: "From our own herd of Scottish Highland cattle, pasture-raised on the farm.",
    unit: { one: "cut", many: "cuts" },
    cutList: "Highland beef cuts",
  },
  {
    key: "pantry",
    label: "Eggs & pantry",
    shortLabel: "Eggs & pantry",
    story: "Eggs from our hens, garden bouquets, firewood.",
    unit: { one: "thing", many: "things" },
  },
  {
    key: "plush",
    label: "Highland cow plush",
    shortLabel: "Cow plush",
    story: "Weighted and microwavable. A red cow and a white cow.",
    unit: { one: "plush", many: "plush" },
  },
  {
    key: "apparel",
    label: "Apparel",
    shortLabel: "Apparel",
    story: "The Dream collection, designed in Brightwood.",
    unit: { one: "piece", many: "pieces" },
    allInStockNote: "pickup or local delivery",
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
  /**
   * Full catalog name. Used in GA4, Square order lines, receipts and Product
   * JSON-LD (and Google may print it in results), so no em dash: a variant
   * follows a comma ("Pork Chop, Boneless"). Emails take the part before the
   * comma as the short name.
   */
  name: string;
  /** Sentence-case display name for ledger rows, cart lines and the page heading. */
  title: string;
  /** The variant of the item, usually the part after the comma in `name` ("Red cow plush", "Coyote brown"); the colour picker shows it ("Olive"). */
  subtitle?: string;
  /** Ledger note under the title ("1 lb pack", "Sizes S to 3XL"). The stock word is added at render. */
  detail?: string;
  /** Products that are the same item in another colour share a group; the product page links them. */
  colorGroup?: string;
  /** /shop "Farm favorites" card text, for products flagged `featured`. */
  card?: { title: string; note: string };
  /**
   * Shown on `/shop/<slug>` (the About section for beef, under the buy box for
   * everything else), and emitted as
   * `Product.description` in the JSON-LD on both `/shop` (the ItemList) and the
   * product page, see `src/lib/shop/product-schema.ts`. Because it is rendered
   * to humans as well as to crawlers, never put anything here that the page
   * does not display.
   *
   * ⛔ SOURCING RULE (2026-09-17, tightened 2026-10-06). This is a real business
   * selling real food. Every clause must be derivable from something already
   * published or already in this repo: the product `name` (which states the cut),
   * `priceNote` (real weights), the variant options, the category `story` copy
   * above, the fulfillment terms in `src/lib/shop/fulfillment.ts`, or the farm
   * facts already live on the site: Scottish Highland cattle, "Pasture-raised on
   * the farm in Brightwood" (beef), eggs from our hens, the Dream collection
   * designed in Brightwood.
   *
   * Forbidden: invented flavor or taste claims, cooking instructions, nutrition
   * or health claims, allergen or food-safety claims of any kind, any claim
   * about where the Mangalitsa pigs are raised (PENDING CONNOR, Q13), any
   * mention of Mt. Hood in beef copy, "most-photographed", "modeled on" or any
   * claim that the plush are real cows in the herd, any static "Best Seller" or
   * "Laid This Week" badge, any certification (organic, grass-fed, non-GMO,
   * heritage-certified) not already published, invented provenance for the
   * apparel, and any claim about the plush beyond the published category blurb.
   * No em dashes. Prices belong in `variants`, not here: Square is the price
   * source of truth and prose would go stale. Two short true sentences beat a
   * long invented paragraph.
   */
  description?: string;
  category: CategoryKey;
  image: string;
  priceNote?: string;
  badges?: string[];
  /**
   * One of the four most ordered since the store opened (shop_order_items,
   * 24 orders to 2026-10-06: Dream hoodie coyote, ground beef, Mr. Finley,
   * Princess Fiona). Re-check monthly; there is no static "Best Seller" badge.
   */
  featured?: boolean;
  /** What the variant options represent, e.g. "Size" | "Weight". */
  optionName?: string;
  variants: Variant[];
}

export const PRODUCTS: Product[] = [
  {
    slug: "weighted-microwavable-highland-cow-plush-white",
    name: "Princess Fiona, White Highland Cow Plush",
    title: "Princess Fiona",
    subtitle: "White cow plush",
    detail: "White cow plush",
    card: { title: "Princess Fiona", note: "White cow plush" },
    description:
      "A weighted, microwavable plush of a white Highland cow. Heat her for a warm, calming hug.",
    category: "plush",
    image: "/images/shop/princess-fiona-plush.jpg",
    badges: ["Microwavable"],
    featured: true,
    variants: [
      { id: "SQ2659367", price: 65, stock: 10 },
    ],
  },
  {
    slug: "weighted-mircrowavable-highland-cow-plush",
    name: "Mr. Finley, Red Highland Cow Plush",
    title: "Mr. Finley",
    subtitle: "Red cow plush",
    detail: "Red cow plush",
    card: { title: "Mr. Finley", note: "Red cow plush" },
    description:
      "A weighted, microwavable plush of a red Highland cow. Heat him for a warm, calming hug.",
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
    name: "The Dream Hoodie, Coyote Brown",
    title: "Dream hoodie, coyote brown",
    subtitle: "Coyote brown",
    detail: "Sizes S to 3XL",
    colorGroup: "dream-hoodie",
    card: { title: "Dream hoodie", note: "Coyote brown" },
    description: "The Dream hoodie in coyote brown, from the Dream collection designed in Brightwood.",
    category: "apparel",
    image: "/images/shop/dream-hoodie.png",
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
    name: "The Dream Hoodie, Olive Green",
    title: "Dream hoodie, olive",
    subtitle: "Olive",
    detail: "Sizes S to 3XL",
    colorGroup: "dream-hoodie",
    description:
      "The Dream hoodie in olive, the second colorway of the Dream collection designed in Brightwood.",
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
    name: "The Dream T-Shirt, Olive Green",
    title: "Dream tee, olive",
    subtitle: "Olive",
    detail: "Sizes S to 3XL",
    colorGroup: "dream-tee",
    description:
      "The Dream tee in olive, from the Dream collection designed in Brightwood.",
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
    name: "The Dream T-Shirt, Cream",
    title: "Dream tee, cream",
    subtitle: "Cream",
    detail: "Sizes S to 3XL",
    colorGroup: "dream-tee",
    description:
      "The Dream tee in cream, from the Dream collection designed in Brightwood.",
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
    name: "The Farm T-Shirt, Cream",
    title: "Farm tee, cream",
    subtitle: "Cream",
    detail: "Sizes S to 3XL",
    description:
      "The Farm T-Shirt in cream, a separate design from the Dream collection shirts. Sizes Small through 3XL, for free pickup at the farm in Brightwood or local delivery.",
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
    title: "Camo trucker hat",
    subtitle: "Camo",
    detail: "One size",
    description:
      "A Highland Farms trucker hat in camo, from the Dream collection designed in Brightwood. One size, so there is nothing to choose at checkout.",
    category: "apparel",
    image: "/images/shop/camo-trucker-hat.jpg",
    variants: [
      { id: "SQ0051228", price: 35, stock: 51 },
    ],
  },
  {
    slug: "highland-farms-logo-keychain-leather-branded",
    name: "Logo Leather Keychain",
    title: "Leather keychain",
    subtitle: "Genuine leather",
    detail: "Genuine leather · Made to order",
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
    title: "Thick cut peppered bacon",
    detail: "1 lb pack",
    description:
      "Thick-cut Mangalitsa bacon seasoned with pepper, sold in a 1 lb pack. Mangalitsa is a Hungarian heritage breed, marbled and rich.",
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
    title: "Thick cut bacon",
    detail: "1 lb pack",
    description:
      "Thick-cut Mangalitsa bacon without the pepper, the plain version of our peppered cut, in the same 1 lb pack.",
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
    title: "Cured ham",
    detail: "Whole, 2.6 to 3 lb",
    description:
      "A cured Mangalitsa ham, sold whole. Each one runs 2.6 to 3 lbs, so the exact weight varies from ham to ham.",
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
    title: "Sirloin roast",
    detail: "2.13 lb",
    description:
      "A Mangalitsa sirloin roast at a fixed 2.13 lb: one roast, one weight, unlike the shoulder roast, which is sold by size.",
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
    title: "Shoulder roast",
    detail: "Three sizes",
    description:
      "A Mangalitsa pork shoulder roast sold by weight: choose 2 lb, 2.6 lb or 3 lb, and the price follows the size.",
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
    title: "Baby back ribs",
    detail: "One rack",
    description:
      "Mangalitsa baby back ribs, the shorter rack cut from along the loin, sold as one rack in a single size.",
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
    title: "Spare ribs",
    detail: "Two sizes",
    description:
      "Mangalitsa spare ribs, the longer rack from the belly side, and the one cut of ribs we sell in two sizes. Choose Medium or Large.",
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
    title: "Pork tenderloin",
    detail: "0.95 lb",
    description:
      "A whole Mangalitsa pork tenderloin, one per pack at 0.95 lb. The tenderloin is the long, narrow cut that runs along the backbone.",
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
    name: "Pork Chop, Boneless",
    title: "Pork chop, boneless",
    detail: "1 lb",
    description:
      "A boneless Mangalitsa pork chop, sold by weight at 1 lb. Boneless, so the whole pack weight is meat. The bone-in chop is the same cut with the bone left in.",
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
    name: "Pork Chop, Bone-In",
    title: "Pork chop, bone-in",
    detail: "0.75 lb",
    description:
      "A bone-in Mangalitsa pork chop, sold by weight at 0.75 lb. Part of that weight is bone, which the boneless chop does not carry.",
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
    title: "Sausage links",
    detail: "1 lb pack",
    description:
      "Mangalitsa sausage links in a 1 lb pack: links, as opposed to the loose ground of our breakfast sausage. Made from our special blend.",
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
    name: "Breakfast Sausage, Ground",
    title: "Breakfast sausage",
    detail: "1 lb pack, loose",
    description:
      "Ground Mangalitsa breakfast sausage, sold loose in a 1 lb pack rather than in links.",
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
    title: "Top sirloin ground beef",
    detail: "1 lb pack",
    card: { title: "Top sirloin ground beef", note: "1 lb pack" },
    description:
      "Ground beef from our own Scottish Highland herd, ground from top sirloin and sold in 1 lb packs. Pasture-raised on the farm in Brightwood.",
    category: "beef",
    image: "/images/shop/ground-beef.jpg",
    priceNote: "1 lb",
    badges: ["From Our Herd"],
    featured: true,
    variants: [
      { id: "SQ6898162", price: 9, stock: 77 },
    ],
  },
  {
    slug: "highland-beef-new-york-steak",
    name: "New York Steak",
    title: "New York steak",
    description:
      "A New York steak from our own Scottish Highland herd, the strip cut taken from the short loin. Pasture-raised on the farm in Brightwood.",
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
    title: "Tenderloin steak",
    description:
      "A tenderloin steak from our own Scottish Highland herd, cut from the tenderloin that runs along the backbone. A different cut from the New York strip we also sell. Pasture-raised on the farm in Brightwood.",
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
    title: "Farm fresh eggs",
    detail: "One dozen",
    description:
      "A dozen eggs from our own hens on the farm in Brightwood. Sold by the dozen for free pickup at the farm, or added to a local delivery run through the Mt. Hood corridor and east Portland.",
    category: "pantry",
    image: "/images/shop/eggs.jpg",
    priceNote: "dozen",
    variants: [
      { id: "SQ9271455", price: 8, stock: 9 },
    ],
  },
  {
    slug: "fresh-flower-bouquet",
    name: "Fresh Flower Bouquet",
    title: "Fresh flower bouquet",
    detail: "Hand-tied, farm garden",
    description:
      "A bouquet hand-tied from the farm garden in Brightwood. Fresh flowers, so it goes no further than farm pickup or a local delivery run. Highland Farms does not ship.",
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
    title: "Dried flower bouquet",
    detail: "Hand-tied, farm garden · Made to order",
    description:
      "A bouquet of dried flowers hand-tied from our farm garden, the dried counterpart to the fresh bouquet. Made to order rather than held against a stock count, for free pickup in Brightwood or local delivery.",
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
    title: "Firewood & kindling",
    detail: "For farm stays, or anyone collecting",
    description:
      "Firewood and kindling from the farm, kept for guests staying at the Lodge, Cottage or Camp, and for anyone else collecting an order. Always available rather than limited to a stock count.",
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
