export const SITE = {
  name: "Highland Farms",
  tagline: "Whimsical forest weddings with the Highland coos as honorary guests",
  description:
    "Private forest farm weddings in Brightwood, Oregon, about an hour from Portland. Scottish Highland Cow farm tours, Nordic spa, and farm stays.",
  url: "https://highlandfarmsoregon.com",
} as const;

export const CONTACT = {
  /** The farm's sales line (Hayden, 2026-09-14). (831) 214-2053 is Connor's personal cell: never publish it. */
  phone: "(971) 236-2551",
  email: "events@highlandfarms-oregon.com",
  emailAlt: "info@highlandfarms-oregon.com",
  address: "21261 East Little River Road",
  city: "Brightwood",
  state: "OR",
  zip: "97011",
  fullAddress: "21261 East Little River Road, Brightwood, OR 97011",
  coordinates: { lat: 45.3689662, lng: -122.0277751 },
  instagram: "https://www.instagram.com/highlandfarmsor",
  instagramHandle: "@highlandfarmsor",
} as const;

/** Instagram follower figure shown on the site (profile og:description, 2026-10-06). Update here only. */
export const INSTAGRAM_FOLLOWERS = "29K";

export const BOOKING_LINKS = {
  /** Acuity generic tour menu (all group sizes). */
  farmTourAllSizes: "https://highlandfarms.as.me/schedule/e759f21b",
  /** "Private Tour for Two" calendar: 85% of tour bookings are parties of two. */
  farmTourForTwo:
    "https://highlandfarms.as.me/schedule/e759f21b/appointment/48403186/calendar/7539520",
  nordicSpa: "https://highlandfarms.as.me/schedule/e759f21b/appointment/85942611/calendar/13047082",
  /** Live Acuity "Highland Farms Wedding Call" (type 78277096, calendar 12109481). */
  weddingCall:
    "https://highlandfarms.as.me/schedule/e759f21b/appointment/78277096/calendar/12109481",
  giftCertificates: "https://highlandfarms.as.me/catalog/e759f21b",
} as const;

/**
 * Acuity "Private Tour for N" calendar per party size (calendar 7539520),
 * opened by the group-size rows on /farm-tours. Type ids match
 * FARM_TOUR_TYPE_IDS in src/lib/acuity.ts. Checked 2026-10-06: every URL
 * returns 200, and each id is an active type in the scheduler's own data
 * under that name and price ($150 / $225 / $300 / $375 / $450). The page
 * returns 200 for any id, so re-check the name, not just the status.
 */
export const FARM_TOUR_PARTY_LINKS = {
  2: BOOKING_LINKS.farmTourForTwo,
  3: "https://highlandfarms.as.me/schedule/e759f21b/appointment/48403269/calendar/7539520",
  4: "https://highlandfarms.as.me/schedule/e759f21b/appointment/48403283/calendar/7539520",
  5: "https://highlandfarms.as.me/schedule/e759f21b/appointment/48403306/calendar/7539520",
  6: "https://highlandfarms.as.me/schedule/e759f21b/appointment/64217701/calendar/7539520",
} as const;

export function bookingUrl(
  base: string,
  content: string,
  source = "website",
  medium = "organic",
): string {
  const url = new URL(base);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_content", content);
  return url.toString();
}
