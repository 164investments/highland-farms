/*
 * Site chrome configuration: which page type a route is, what the masthead's
 * right-hand action does there, which announcement bar it gets and in which
 * season, and the door rows the menu and footer share. Pure data and
 * functions, safe in server and client components.
 *
 * Source: finish/boards/_shared/masthead.html and shared/NOTES.md, round 2
 * (CONSISTENCY #5, #8, #9).
 */
import { BOOKING_LINKS, bookingUrl } from "@/lib/constants";
import { TOUR_PARTY_SIZES } from "@/data/farm-tours";
import { properties } from "@/data/properties";
import { BOOKING_PRODUCTS } from "@/lib/booking/products";
import { giftCertificatesHref, nativeCalendarEnabled } from "@/lib/booking/flag";

/** Where every wedding "Check your date" in the chrome goes. */
export const CHECK_DATE_HREF = "/weddings#contact";

export const LOOKBOOK_HREF = "/lookbook.pdf";

export type PageType =
  | "home"
  | "weddings"
  | "portfolio"
  | "about"
  | "contact"
  | "call"
  | "celebrations"
  | "tours"
  | "spa"
  | "sauna"
  | "stays"
  | "stay"
  | "thanksgiving"
  | "gifts"
  | "shop"
  | "cart"
  | "checkout"
  | "order"
  | "other";

function under(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function pageTypeFor(pathname: string): PageType {
  if (pathname === "/") return "home";
  if (under(pathname, "/weddings")) return "weddings";
  if (under(pathname, "/wedding-portfolio")) return "portfolio";
  if (under(pathname, "/wedding-call")) return "call";
  if (under(pathname, "/about")) return "about";
  if (under(pathname, "/contact")) return "contact";
  if (under(pathname, "/celebrations")) return "celebrations";
  if (under(pathname, "/farm-tours")) return "tours";
  if (under(pathname, "/nordic-spa")) return "spa";
  if (under(pathname, "/sauna-near-portland")) return "sauna";
  if (pathname === "/stay") return "stays";
  if (pathname.startsWith("/stay/")) return "stay";
  if (under(pathname, "/thanksgiving")) return "thanksgiving";
  if (under(pathname, "/gift-certificates")) return "gifts";
  if (under(pathname, "/shop/checkout")) return "checkout";
  if (under(pathname, "/shop/cart")) return "cart";
  if (
    under(pathname, "/shop/thank-you") ||
    under(pathname, "/shop/admin") ||
    under(pathname, "/shop/unsubscribe")
  )
    return "order";
  if (under(pathname, "/shop")) return "shop";
  return "other";
}

/* ------------------------------------------------------------------ */
/* The masthead's right-hand action                                     */
/* ------------------------------------------------------------------ */

export interface PageAction {
  /** Phone label, Inter caps: "Check date". */
  phone: string;
  /** Desktop button and the menu's pinned button: "Check your date". */
  label: string;
  href: string;
}

const WEDDING_ACTION: PageAction = { phone: "Check date", label: "Check your date", href: CHECK_DATE_HREF };

/** Labels: CONSISTENCY #5 (phone short labels fixed 2026-10-06). Anchors: shared NOTES round 2. */
const ACTIONS: Record<PageType, PageAction | "cart" | null> = {
  // Home has its own inline form, so its date check stays on the page.
  home: { ...WEDDING_ACTION, href: "#check-your-date" },
  weddings: WEDDING_ACTION,
  portfolio: WEDDING_ACTION,
  about: WEDDING_ACTION,
  // /contact has its own form at #inquiry.
  contact: { ...WEDDING_ACTION, href: "#inquiry" },
  call: WEDDING_ACTION,
  other: WEDDING_ACTION,
  celebrations: { phone: "Check date", label: "Check your date", href: "#contact" },
  tours: { phone: "See dates", label: "See tour dates", href: "#choose" },
  spa: { phone: "See sessions", label: "See open sessions", href: "#availability" },
  sauna: { phone: "See sessions", label: "See open sessions", href: "#book" },
  stays: { phone: "Check dates", label: "Check dates and price", href: "#stays" },
  stay: { phone: "Check dates", label: "Check dates and price", href: "#book" },
  thanksgiving: { phone: "Packages", label: "See the packages", href: "#packages" },
  gifts: { phone: "Gifts", label: "Choose a gift", href: "#choose" },
  shop: "cart",
  cart: null,
  checkout: null,
  order: null,
};

export function pageActionFor(type: PageType): PageAction | "cart" | null {
  return ACTIONS[type];
}

/** The quiet link under the menu's pinned button. */
export function menuSecondaryFor(type: PageType): { label: string; href: string; external: boolean } | null {
  // Round 2b removed the wedding sheet's look-book link: the menu has its own look book row.
  if (type === "celebrations") return null;
  if (type === "tours" || type === "spa" || type === "sauna") {
    const href = giftCertificatesHref();
    return { label: "or give one as a gift", href, external: !href.startsWith("/") };
  }
  return null;
}

/** Pages whose chrome is the name only: no nav, no menu action, no bar. */
export function isQuietChrome(type: PageType): boolean {
  return type === "cart" || type === "checkout" || type === "order";
}

/* ------------------------------------------------------------------ */
/* Seasons (Pacific dates)                                              */
/* ------------------------------------------------------------------ */

export type SeasonId = "gift" | "thanksgiving-bar" | "thanksgiving-links";

/** Gift season: November 1 to December 24, every year. */
const GIFT_FROM = "11-01";
const GIFT_UNTIL = "12-24";
/** Thanksgiving 2026 (src/data/thanksgiving.ts: November 24 to 28, 2026). */
const THANKSGIVING_BAR_UNTIL = "2026-11-23";
const THANKSGIVING_LINKS_UNTIL = "2026-11-28";

/** Today in Portland as YYYY-MM-DD. */
export function pacificToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function activeSeasons(today: string): SeasonId[] {
  const md = today.slice(5);
  const out: SeasonId[] = [];
  if (md >= GIFT_FROM && md <= GIFT_UNTIL) out.push("gift");
  if (today <= THANKSGIVING_BAR_UNTIL) out.push("thanksgiving-bar");
  if (today <= THANKSGIVING_LINKS_UNTIL) out.push("thanksgiving-links");
  return out;
}

/**
 * Inline script for the first paint: sets <html data-season="..."> from the
 * visitor's clock (Pacific), so seasonal chrome is right on a page that was
 * prerendered weeks earlier. Same rules as activeSeasons().
 */
export const SEASON_SCRIPT = `(function(){try{var d=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Los_Angeles",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()),m=d.slice(5),s=[];if(m>="${GIFT_FROM}"&&m<="${GIFT_UNTIL}")s.push("gift");if(d<="${THANKSGIVING_BAR_UNTIL}")s.push("thanksgiving-bar");if(d<="${THANKSGIVING_LINKS_UNTIL}")s.push("thanksgiving-links");document.documentElement.setAttribute("data-season",s.join(" "))}catch(e){}})();`;

/* ------------------------------------------------------------------ */
/* Announcement bars (CONSISTENCY #8)                                   */
/* ------------------------------------------------------------------ */

export type BarId = "call" | "gift" | "stays" | "shop";

const BARS: Partial<Record<PageType, { id: BarId; season?: SeasonId }>> = {
  about: { id: "call" },
  shop: { id: "shop" },
  stays: { id: "stays", season: "thanksgiving-bar" },
  stay: { id: "stays", season: "thanksgiving-bar" },
  tours: { id: "gift", season: "gift" },
  spa: { id: "gift", season: "gift" },
  sauna: { id: "gift", season: "gift" },
};

/** The bar a page type may show (subject to its season), or null for none. */
export function barFor(type: PageType): { id: BarId; season?: SeasonId } | null {
  return BARS[type] ?? null;
}

/* ------------------------------------------------------------------ */
/* Doors shared by the menu and the footer                              */
/* ------------------------------------------------------------------ */

export interface ChromeDoor {
  title: string;
  /** The hint on the right; the menu and footer use the same words (Round 2b). */
  note: string;
  href: string;
  external?: boolean;
  /** Rendered with WeddingCallLink (booking_start, booking_type wedding_call). */
  weddingCall?: boolean;
  /** Paths that count as "You are here". */
  current?: (pathname: string) => boolean;
}

const tourForTwo = TOUR_PARTY_SIZES[0].total;
const spa = BOOKING_PRODUCTS["nordic-spa"];
const call = BOOKING_PRODUCTS["wedding-call"];
const sleeps = properties.map((p) => p.guests);

/** Up to 125 guests: the wedding capacity stated in src/data/weddings.ts. */
const WEDDING_GUESTS = 125;

export function weddingDoors(): ChromeDoor[] {
  return [
    {
      title: "Weddings",
      note: `Up to ${WEDDING_GUESTS}, plus the coos`,
      href: "/weddings",
      current: (p) => under(p, "/weddings"),
    },
    {
      title: "Real weddings",
      note: "Four couples, 2025",
      href: "/wedding-portfolio",
      current: (p) => under(p, "/wedding-portfolio"),
    },
    {
      title: "Call with Connor",
      note: `Free, ${call.durationMin} minutes`,
      href: nativeCalendarEnabled() ? "/wedding-call" : BOOKING_LINKS.weddingCall,
      weddingCall: true,
      current: (p) => under(p, "/wedding-call"),
    },
  ];
}

/** The look book row, third in the Weddings group of the menu and footer. */
export const LOOKBOOK_DOOR: ChromeDoor = {
  title: "2027 look book",
  note: "20 pages, PDF",
  href: LOOKBOOK_HREF,
  external: true,
};

export function visitDoors(): ChromeDoor[] {
  const gifts = giftCertificatesHref();
  return [
    {
      title: "Farm tours",
      note: `Private, $${tourForTwo} for two`,
      href: "/farm-tours",
      current: (p) => under(p, "/farm-tours"),
    },
    {
      title: "Nordic spa",
      note: `$${spa.pricePerPersonCents / 100} per person, ${spa.durationMin} min`,
      href: "/nordic-spa",
      current: (p) => under(p, "/nordic-spa") || under(p, "/sauna-near-portland"),
    },
    {
      title: "Stays",
      note: `Sleeps ${Math.min(...sleeps)} to ${Math.max(...sleeps)}`,
      href: "/stay",
      current: (p) => under(p, "/stay"),
    },
    {
      title: "Gift certificates",
      note: "Tours and spa sessions",
      href: gifts,
      external: !gifts.startsWith("/"),
      current: (p) => under(p, "/gift-certificates"),
    },
    {
      title: "Farm shop",
      note: "Pickup or local delivery",
      href: "/shop",
      current: (p) => under(p, "/shop"),
    },
  ];
}

export interface ChromeLink {
  label: string;
  href: string;
  season?: SeasonId;
}

/** The short text links under the doors, in the footer's two-by-two order (no orphan on a line). */
export const MORE_LINKS: ChromeLink[] = [
  { label: "Celebrations", href: "/celebrations" },
  { label: "Thanksgiving 2026", href: "/thanksgiving", season: "thanksgiving-links" },
  { label: "About the farm", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/** Listings the footer links to (the same profiles as the Organization sameAs in StructuredData.tsx). */
export const ELSEWHERE = [
  {
    label: "Travel Oregon",
    href: "https://traveloregon.com/plan-your-trip/places-to-stay/farm-ranch-stays/highland-farms/",
  },
  { label: "The Knot", href: "https://www.theknot.com/marketplace/highland-farms-brightwood-or-2101829" },
  { label: "WeddingWire", href: "https://www.weddingwire.com/biz/highland-farms/c6c9f587c3825e0e.html" },
  { label: "Facebook", href: "https://www.facebook.com/highlandfarmsor/", desktopOnly: true },
] as const;

/** Tracked wedding-call URL for a placement (utm_content). Acuity until the native flag flips. */
export function weddingCallUrl(content: string): string {
  return nativeCalendarEnabled() ? "/wedding-call" : bookingUrl(BOOKING_LINKS.weddingCall, content);
}
