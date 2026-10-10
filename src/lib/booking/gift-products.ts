import { GIFTS, type GiftFamily } from "@/data/gift-certificates";

/** Existing native aliases stay stable; additional products use their actual Acuity IDs. */
export type GiftProductId = string;
export type GiftProductFamily = GiftFamily | "pack";
export interface GiftProduct {
  id: GiftProductId;
  name: string;
  amountCents: number;
  kind: "value" | "visits";
  /** `combo` accepts tours and spa, including separate appointments. */
  productScope: string;
  units: number;
  blurb: string;
  family?: GiftProductFamily;
  guests?: number;
  acuityId?: string;
  /** Null means no expiry in the verified catalog; packs expire after 180 days. */
  expiryDays: number | null;
}

const NAMES: Record<GiftFamily, string> = { tour: "Farm Tour", spa: "Nordic Spa", day: "Highland Day" };
const SCOPES: Record<GiftFamily, string> = { tour: "farm-tour", spa: "nordic-spa", day: "combo" };

/**
 * The same sixteen offers as the public gift page, verified against Acuity
 * October 9, 2026. Prices come from the approved public catalog once; both
 * browser and server use these products. All new certificates carry their
 * exact face value in cents and stay scoped to the advertised experience.
 */
const EXPERIENCE_GIFT_PRODUCTS: GiftProduct[] = (Object.keys(GIFTS) as GiftFamily[]).flatMap((family) =>
  GIFTS[family].sizes.map((size) => {
    const amountCents = Math.round(size.price * 100);
    const guests = size.guests;
    return {
      id: family === "tour" && guests === 2 ? "tour-for-two"
        : family === "spa" && guests === 2 ? "spa-for-two" : size.acuityId,
      acuityId: size.acuityId,
      name: `${NAMES[family]} for ${guests === 1 ? "One" : guests === 2 ? "Two" : guests}`,
      amountCents, kind: "value" as const, productScope: SCOPES[family], units: amountCents,
      family, guests, expiryDays: null,
      blurb: family === "tour" ? `A private 60-minute Highland Cow tour for ${guests} guests.`
        : family === "spa" ? `A 90-minute Nordic Forest Spa session for ${guests === 1 ? "one guest" : `${guests} guests`}.`
          : `A private farm tour and a Nordic spa spot for each of ${guests} guests.`,
    };
  }),
);

/** Preserve all three currently eligible Acuity visit packs and their seat units. */
const VISIT_PACKS: GiftProduct[] = [
  { id: "spa-3-visit", acuityId: "2189863", name: "Spa 3-Visit Pack", amountCents: 19900, units: 3 },
  { id: "spa-5-visit", acuityId: "2189865", name: "Spa 5-Visit Pack", amountCents: 29900, units: 5 },
  { id: "spa-10-visit", acuityId: "2189866", name: "Spa 10-Visit Pack", amountCents: 54900, units: 10 },
].map((pack) => ({ ...pack, kind: "visits" as const, productScope: "nordic-spa", family: "pack" as const, expiryDays: 180,
  blurb: `${pack.units} single-guest Nordic Forest Spa visits, to use within 180 days of purchase.` }));

export const GIFT_PRODUCTS: GiftProduct[] = [...EXPERIENCE_GIFT_PRODUCTS, ...VISIT_PACKS];

/** Server purchase lookup accepts current products and existing native aliases. */
export function getGiftProduct(id: string): GiftProduct | undefined {
  return GIFT_PRODUCTS.find((product) => product.id === id || product.acuityId === id);
}

export function giftScopeAllows(kind: "value" | "visits", scope: string | null, productSlugs: readonly string[]): boolean {
  if (productSlugs.length === 0) return false;
  if (kind === "visits") return productSlugs.length === 1 && scope !== null && scope !== "combo" && productSlugs[0] === scope;
  if (scope === null) return true;
  if (scope === "combo") return productSlugs.every((slug) => slug === "farm-tour" || slug === "nordic-spa");
  return productSlugs.every((slug) => slug === scope);
}
