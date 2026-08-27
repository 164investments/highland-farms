/**
 * The bookable products. Static and in git, like the shop catalog: the server
 * re-prices every checkout from THIS file — the browser never sends prices.
 * Availability lives in Supabase; definitions live here.
 */

export type BookingKind = "private_slot" | "class" | "consult";
export type BookingSlug = "farm-tour" | "nordic-spa" | "wedding-call";

export interface BookingProduct {
  slug: BookingSlug;
  name: string;
  kind: BookingKind;
  pricePerPersonCents: number;
  durationMin: number;
  minParty: number;
  maxParty: number;
  /** Can't book closer to the start than this. */
  leadTimeMin: number;
  /** How far ahead the calendar opens. */
  horizonDays: number;
}

export const BOOKING_PRODUCTS: Record<BookingSlug, BookingProduct> = {
  "farm-tour": {
    slug: "farm-tour",
    name: "Private Farm Tour",
    kind: "private_slot",
    pricePerPersonCents: 7500,
    durationMin: 60,
    minParty: 2,
    maxParty: 6,
    leadTimeMin: 120,
    horizonDays: 180,
  },
  "nordic-spa": {
    slug: "nordic-spa",
    name: "Nordic Forest Spa",
    kind: "class",
    pricePerPersonCents: 7500,
    durationMin: 90,
    minParty: 1,
    maxParty: 6,
    leadTimeMin: 120,
    horizonDays: 180,
  },
  "wedding-call": {
    slug: "wedding-call",
    name: "Wedding Call",
    kind: "consult",
    pricePerPersonCents: 0,
    durationMin: 45,
    minParty: 1,
    maxParty: 2,
    leadTimeMin: 720, // 12h — the team preps for these
    horizonDays: 90,
  },
};

export function getBookingProduct(slug: string): BookingProduct | undefined {
  return (BOOKING_PRODUCTS as Record<string, BookingProduct>)[slug];
}

/** Capacity units a booking consumes: whole slot for a private tour/consult, a seat per person for the spa. */
export function unitsFor(product: BookingProduct, party: number): number {
  return product.kind === "class" ? party : 1;
}

/** Full Farm Day: a tour and a spa session on the same day, ≥30 min apart, one charge. */
export const COMBO = { bufferMin: 30, legs: ["farm-tour", "nordic-spa"] } as const;
