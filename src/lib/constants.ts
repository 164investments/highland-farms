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

export const BOOKING_LINKS = {
  farmTour: "https://highlandfarms.as.me/schedule/e759f21b",
  nordicSpa: "https://highlandfarms.as.me/schedule/e759f21b/appointment/85942611/calendar/13047082",
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
