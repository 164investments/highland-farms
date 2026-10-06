export const SITE = {
  name: "Highland Farms",
  tagline: "Oregon's Premier Farm & Forest Wedding Venue",
  description:
    "All-inclusive farm and forest weddings at the base of Mt. Hood. Scottish Highland Cow farm tours, Nordic spa, and luxury farm stays in Brightwood, Oregon.",
  url: "https://highlandfarmsoregon.com",
} as const;

export const CONTACT = {
  phone: "(831) 214-2053",
  phoneAlt: "(971) 236-2551",
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
