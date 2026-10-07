import { TOUR_PARTY_SIZES } from "@/data/farm-tours";
import { SPA_PRICE_PER_PERSON } from "@/data/nordic-spa";
import { giftPrice, GIFTS, type GiftFamily } from "@/data/gift-certificates";

/**
 * Extra booking_start fields for the party-size and gift rows on the visit
 * pages. Derived from the `utm_content` the row's link was built with (read
 * from the link as written: the stored visitor attribution later overwrites
 * utm_content on the outgoing URL), so a row's tracking cannot drift from its
 * label and no component needs a tracking prop.
 *
 *   farm-tours-(hero|pricing)-N          tour for N guests, $75 each
 *   (nordic-spa|sauna-near-portland)-(hero|pricing)-(1|2|3to5|6)
 *   gifts-(hero-)?(tour|spa|day)(-N)?    a gift, priced from GIFTS
 *
 * Pure: safe in client components.
 */

export interface BookingTrackingExtras {
  /** Price in USD of what the row sells (omitted when the guest count is open). */
  value?: number;
  currency?: "USD";
  /** Guests, or "3-5" for the spa's open-ended row. */
  party_size?: number | string;
  /** farm_tour | nordic_spa | highland_day, for gift rows. */
  gift_product?: string;
}

function content(href: string): string {
  try {
    return new URL(href).searchParams.get("utm_content") ?? "";
  } catch {
    return "";
  }
}

export function bookingTrackingFromUrl(href: string): BookingTrackingExtras {
  const c = content(href);
  if (!c) return {};

  const tour = c.match(/^farm-tours-(?:hero|pricing)-(\d)$/);
  if (tour) {
    const guests = Number(tour[1]);
    const row = TOUR_PARTY_SIZES.find((p) => p.guests === guests);
    return row ? { value: row.total, currency: "USD", party_size: guests } : {};
  }
  // The sticky bar and the Highland Day "pick your tour time" step open the tour for two.
  if (/^farm-tours-sticky-mobile$|-day-tour$/.test(c)) {
    const two = TOUR_PARTY_SIZES[0];
    return { value: two.total, currency: "USD", party_size: two.guests };
  }

  const spa = c.match(/^(?:nordic-spa|sauna-near-portland)-(?:hero|pricing)-(1|2|3to5|6)$/);
  if (spa) {
    if (spa[1] === "3to5") return { party_size: "3-5" };
    const n = Number(spa[1]);
    return { value: SPA_PRICE_PER_PERSON * n, currency: "USD", party_size: n };
  }

  const gift = c.match(/^gifts-(?:hero-)?(tour|spa|day)(?:-(\d))?$/);
  if (gift) {
    const family = gift[1] as GiftFamily;
    // Hero rows: the tour and the Highland Day are priced for two, the spa per person.
    const guests = gift[2] ? Number(gift[2]) : family === "spa" ? 1 : 2;
    const price = giftPrice(family, guests);
    return {
      gift_product: GIFTS[family].product,
      party_size: guests,
      ...(price !== undefined ? { value: price, currency: "USD" as const } : {}),
    };
  }
  return {};
}
