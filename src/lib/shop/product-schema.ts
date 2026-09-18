/**
 * Shared JSON-LD building blocks for the farm-store's Product schema.
 *
 * Used by both the `/shop` ItemList (28 inline Products) and each
 * `/shop/<slug>` standalone Product block, so the merchant fields (brand,
 * seller, condition, fulfillment) can't drift between the two pages.
 *
 * Scope note: this only fills in fields that can be sourced honestly from
 * the catalog / fulfillment config. See the field-by-field comments below
 * for what was deliberately left out and why.
 */
import { DELIVERY_FEE_CENTS, DELIVERY_ZIPS } from "./fulfillment";
import { allSoldOut, type StockMap } from "./inventory";
import { fromPrice, toPrice, hasChoices, type Product } from "@/app/shop/data";

const SITE_URL = "https://highlandfarmsoregon.com";

/** References the single LocalBusiness node `StructuredData.tsx` emits site-wide, instead of duplicating it. */
export const SELLER_REF = { "@id": `${SITE_URL}/#business` } as const;

/** Matches the Brand already used on the farm-tour and spa Products. */
export const BRAND = { "@type": "Brand", name: "Highland Farms Oregon" } as const;

/**
 * Real fulfillment terms (verified live on /shop and in `public/llms.txt`,
 * 2026-09-17): free pickup at the farm, or local delivery for $15 inside the
 * Mt. Hood corridor / east Portland metro, sourced from `fulfillment.ts`
 * rather than re-typed here. Highland Farms does not ship — do not widen
 * `shippingDestination` beyond `DELIVERY_ZIPS` or add a nationwide claim.
 *
 * `deliveryTime` (handling/transit days) is intentionally omitted: nothing
 * in the catalog or `fulfillment.ts` records a real value for it, and
 * inventing one would be exactly the kind of fabricated field this pass is
 * trying to remove, not add.
 */
function shopShippingDetails() {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: (DELIVERY_FEE_CENTS / 100).toFixed(2),
      currency: "USD",
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "US",
      postalCode: Array.from(DELIVERY_ZIPS),
    },
  };
}

/**
 * Free farm pickup is the other (primary) fulfillment option. schema.org's
 * `DeliveryMethod` enumeration has a purpose-built value for it, so we use
 * that instead of faking a second $0 "shipping" leg.
 */
const AVAILABLE_DELIVERY_METHODS = ["https://schema.org/OnSitePickup"];

/**
 * Merchant fields shared by every physical-goods offer.
 *
 * `hasMerchantReturnPolicy` is deliberately NOT included: `terms/page.tsx`
 * publishes a return policy for farm-tour and spa bookings ("all bookings
 * final") and a separate one for weddings/events, but nothing at all for
 * shop merchandise. Applying the booking policy to food and apparel would
 * misrepresent it; inventing a merchandise policy that was never published
 * would be worse than omitting the field. This is a business blocker —
 * Hayden needs to decide and publish an actual returns policy for the shop
 * (perishable food and apparel likely warrant different terms) before this
 * field can be added honestly.
 */
function offerCommon() {
  return {
    itemCondition: "https://schema.org/NewCondition",
    seller: SELLER_REF,
    shippingDetails: shopShippingDetails(),
    availableDeliveryMethod: AVAILABLE_DELIVERY_METHODS,
  };
}

/**
 * Availability for a product's offer(s).
 *
 * ⚠️ TODO(availability): this already reads live from Supabase
 * `shop_inventory` via `allSoldOut`/`getStockMap` (see `./inventory.ts`) —
 * it is NOT a hardcoded "InStock" literal. But the counts that table was
 * seeded with are from 2026-06-05 and are, per that file's own provenance
 * comments, roughly three months stale as of this pass; only variants the
 * farm has since recounted through `/shop/admin` → Count are current. So
 * this claim is only as good as the farm's last count, not a known truth.
 * Do not "fix" this by trusting the numbers more without confirming a
 * recount happened — flag it as a business blocker instead.
 */
function offerAvailability(product: Product, stock: StockMap): string {
  const soldOut = allSoldOut(
    stock,
    product.variants.map((v) => v.id),
  );
  return soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";
}

/**
 * Build the `offers` value for a product: a plain `Offer` for single-variant
 * products, or an `AggregateOffer` (low/high price + offerCount) for the
 * ones with real size/weight variants — see `hasChoices`.
 */
export function buildOffers(product: Product, stock: StockMap, url: string) {
  const availability = offerAvailability(product, stock);
  const common = offerCommon();

  if (hasChoices(product)) {
    return {
      "@type": "AggregateOffer",
      lowPrice: fromPrice(product),
      highPrice: toPrice(product),
      priceCurrency: "USD",
      offerCount: product.variants.length,
      availability,
      url,
      ...common,
    };
  }

  return {
    "@type": "Offer",
    price: fromPrice(product),
    priceCurrency: "USD",
    availability,
    url,
    ...common,
  };
}

/**
 * The whole `Product` node, shared by the `/shop` ItemList and the standalone
 * block on `/shop/<slug>` so the two can't describe the same SKU differently.
 * Callers add `@context` when the node is the document root.
 *
 * `description` comes straight from the catalog and is only emitted when the
 * product actually has one. It is not schema-only text: `/shop/<slug>` renders
 * the same string under the price note, so the markup never describes copy a
 * human can't read on the page. If you add a product without a description,
 * the field is omitted rather than filled with the name or a placeholder.
 *
 * `sku` is still omitted: the catalog's `SQ`-prefixed ids are recovered
 * Squarespace identifiers, not Square ones — 0 of 56 match the real Square
 * catalog, so publishing them as `sku` would be worse than having none. See
 * the comments above for the other deliberate omissions (`deliveryTime`,
 * `hasMerchantReturnPolicy`) and why.
 */
export function buildProductNode(product: Product, stock: StockMap, url: string) {
  return {
    "@type": "Product",
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    image: `${SITE_URL}${product.image}`,
    url,
    category: product.category,
    brand: BRAND,
    offers: buildOffers(product, stock, url),
  };
}
