/**
 * How farm-store orders reach the customer.
 *
 * Two options only: pickup at the farm, or local delivery inside the Mt. Hood
 * corridor / east Portland metro. The store does NOT ship — the Squarespace
 * store never had shipping weights on its variants, and shipping perishables
 * needs a cold chain the farm doesn't run.
 *
 * ⚠️ HAYDEN TO CONFIRM: the fee and the ZIP list below are a starting point,
 * not a rule the farm gave us. Both are meant to be edited here.
 */

/** Flat local-delivery fee, in cents. */
export const DELIVERY_FEE_CENTS = 1500;

/** Orders below this subtotal can't be delivered — too small to drive. In cents. */
export const DELIVERY_MINIMUM_CENTS = 5000;

export const PICKUP_LOCATION = {
  name: "Highland Farms",
  address: "21261 East Little River Road, Brightwood, OR 97011",
};

/**
 * ZIPs the farm will drive to: the Mt. Hood corridor down through Sandy and
 * Gresham into east Portland.
 */
export const DELIVERY_ZIPS: ReadonlySet<string> = new Set([
  // Mt. Hood corridor
  "97011", // Brightwood
  "97049", // Rhododendron
  "97067", // Welches
  "97028", // Government Camp
  "97055", // Sandy
  "97009", // Boring
  "97023", // Estacada
  // East Portland metro
  "97030", // Gresham
  "97080", // Gresham
  "97060", // Troutdale / Fairview
  "97024", // Fairview
  "97236", // Portland — Powellhurst
  "97233", // Portland — Hazelwood
  "97216", // Portland — Mill Park
  "97220", // Portland — Parkrose
  "97230", // Portland — Argay
]);

export function isDeliverable(zip: string): boolean {
  return DELIVERY_ZIPS.has(zip.trim().slice(0, 5));
}

export type Fulfillment = "pickup" | "delivery";

/** Delivery fee for an order, in cents. Pickup is always free. */
export function deliveryFeeCents(fulfillment: Fulfillment): number {
  return fulfillment === "delivery" ? DELIVERY_FEE_CENTS : 0;
}

/**
 * Why a delivery order can't be accepted, or null if it can.
 * Shared by the checkout form and the API so the two can't drift apart.
 */
export function deliveryProblem(
  fulfillment: Fulfillment,
  zip: string,
  subtotalCents: number,
): string | null {
  if (fulfillment !== "delivery") return null;
  if (!isDeliverable(zip)) {
    return "We don't deliver to that ZIP code yet — choose farm pickup, or call us and we'll work something out.";
  }
  if (subtotalCents < DELIVERY_MINIMUM_CENTS) {
    return `Local delivery starts at $${(DELIVERY_MINIMUM_CENTS / 100).toFixed(0)}. Add a little more, or switch to farm pickup.`;
  }
  return null;
}
