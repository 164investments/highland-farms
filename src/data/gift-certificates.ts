import type { FAQItem } from "@/lib/types";
import { BOOKING_LINKS } from "@/lib/constants";

/**
 * Gift certificates sold through the Acuity catalog (live catalog read
 * 2026-10-06). Prices are Hayden's D2 decision: gifts cost what booking costs
 * ($75 per person for the spa, tour prices for tours, $300 for two for the
 * Highland Day). The native checkout reads its own prices from
 * src/lib/booking/gift.ts.
 *
 * Acuity still charges the old prices until its catalog is updated; the
 * static /gift-certificates page must not go live before that change.
 *
 * `acuityId` is the Acuity product id. `?productId=<id>` on the catalog URL
 * shows that one product (category heading, price, "Add to cart"); verified in
 * a real browser for all 16 ids on 2026-10-06 (the catalog bundle reads
 * `productId` and `clearCart` only, so there is no per-category URL).
 */

export type GiftFamily = "tour" | "spa" | "day";

export interface GiftSize {
  /** Guests (people for the spa). */
  guests: number;
  price: number;
  acuityId: string;
}

export interface GiftDef {
  family: GiftFamily;
  /** Value of the tracked `gift_product` field. */
  product: "farm_tour" | "nordic_spa" | "highland_day";
  sizes: readonly GiftSize[];
}

export const GIFTS: Record<GiftFamily, GiftDef> = {
  tour: {
    family: "tour",
    product: "farm_tour",
    sizes: [
      { guests: 2, price: 150, acuityId: "1701258" },
      { guests: 3, price: 225, acuityId: "2114506" },
      { guests: 4, price: 300, acuityId: "2114508" },
      { guests: 5, price: 375, acuityId: "2114514" },
      { guests: 6, price: 450, acuityId: "2114515" },
    ],
  },
  spa: {
    family: "spa",
    product: "nordic_spa",
    sizes: [
      { guests: 1, price: 75, acuityId: "2114519" },
      { guests: 2, price: 150, acuityId: "2114520" },
      { guests: 3, price: 225, acuityId: "2114522" },
      { guests: 4, price: 300, acuityId: "2114527" },
      { guests: 5, price: 375, acuityId: "2114528" },
      { guests: 6, price: 450, acuityId: "2114529" },
    ],
  },
  // Listed as "The Highland Experience" in Acuity until Hayden renames it.
  day: {
    family: "day",
    product: "highland_day",
    sizes: [
      { guests: 2, price: 300, acuityId: "2116463" },
      { guests: 3, price: 450, acuityId: "2116465" },
      { guests: 4, price: 600, acuityId: "2116466" },
      { guests: 5, price: 750, acuityId: "2116471" },
      { guests: 6, price: 900, acuityId: "2116473" },
    ],
  },
};

/** Price of a gift size, or undefined. */
export function giftPrice(family: GiftFamily, guests: number): number | undefined {
  return GIFTS[family].sizes.find((s) => s.guests === guests)?.price;
}

/** Acuity product id of a gift size, or undefined. */
export function giftAcuityId(family: GiftFamily, guests: number): string | undefined {
  return GIFTS[family].sizes.find((s) => s.guests === guests)?.acuityId;
}

/**
 * The URL a gift row opens in the booking modal: the Acuity gift catalog,
 * tagged with `gifts-<family>-<guests>` so booking_start carries the product.
 * With a product id the catalog shows that gift on its own (a spa buyer no
 * longer lands on the farm tours); without one it is the full catalog.
 */
export function giftCatalogUrl(content: string, productId?: string): string {
  const url = new URL(BOOKING_LINKS.giftCertificates);
  if (productId) url.searchParams.set("productId", productId);
  url.searchParams.set("utm_source", "website");
  url.searchParams.set("utm_medium", "organic");
  url.searchParams.set("utm_content", content);
  return url.toString();
}

/**
 * Two entries (the delivery and expiry facts are answered on the page, so the
 * old entries are gone). The cancellation answer carries the shared exception
 * sentence word for word: the seventh copy of it on the site.
 */
export const giftFAQ: FAQItem[] = [
  {
    question: "Can a tour gift be used for the spa?",
    answer:
      "No. Each certificate covers its own visit: a farm tour gift covers the tour, a spa gift covers spa spots. The Highland Day covers both.",
  },
  {
    question: "What if they can't make the date they booked?",
    answer:
      "Once a date is booked, it's final: no refunds, no reschedules, no credits, and no transfers, including for no-shows. The only exception is if we cancel for severe weather or for the safety of our animals or guests, in which case we will refund or rebook you.",
  },
];
