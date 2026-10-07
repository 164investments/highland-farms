import { CONTACT, SITE, BOOKING_LINKS } from "@/lib/constants";
import { REVIEW_COUNT, REVIEW_RATING } from "@/lib/reviews";
import { properties } from "@/data/properties";
import { displayName, weddingPortfolio } from "@/data/wedding-portfolio";
import { getProduct } from "@/app/shop/data";

const address = {
  "@type": "PostalAddress",
  streetAddress: CONTACT.address,
  addressLocality: CONTACT.city,
  addressRegion: CONTACT.state,
  postalCode: CONTACT.zip,
  addressCountry: "US",
};

/** Owner-confirmed whole-farm bedroom count (not the sum of the three stays). */
const WHOLE_FARM_BEDROOMS = properties.find((p) => p.slug === "whole-farm")?.bedrooms ?? 7;

const geo = {
  "@type": "GeoCoordinates",
  latitude: CONTACT.coordinates.lat,
  longitude: CONTACT.coordinates.lng,
};

/**
 * Off-site profiles that describe this same business.
 *
 * `sameAs` is the entity-disambiguation signal: it is how Google, and an LLM
 * reading this page, decide the "Highland Farms" here is the same real-world
 * business as the one on Maps, Yelp and the wedding marketplaces. One URL is
 * not enough to resolve an ambiguous name.
 *
 * ⛔ Never add a URL that has not been confirmed to resolve to *this* farm's
 * profile. A wrong `sameAs` merges us with another entity and is worse than
 * having none. Every entry below was fetched and confirmed on 2026-09-17.
 */
const SAME_AS = [
  CONTACT.instagram,
  "https://www.facebook.com/highlandfarmsor/",
  "https://www.yelp.com/biz/highland-farms-brightwood",
  "https://www.theknot.com/marketplace/highland-farms-brightwood-or-2101829",
  "https://www.weddingwire.com/biz/highland-farms/c6c9f587c3825e0e.html",
  "https://traveloregon.com/plan-your-trip/places-to-stay/farm-ranch-stays/highland-farms/",
];

// ─────────────────────────────────────────────────────────────────────────────
// BreadcrumbList
//
// A BreadcrumbList must describe the trail to the page it is emitted on, not
// the site's navigation menu. Until 2026-09-17 this component shipped one
// byte-identical six-item list (Home → Weddings → Farm Tours → Nordic Spa →
// Stay → Contact) on all 24 routes, which is the nav bar, not a breadcrumb.
//
// The trail is derived from `pathname`, which the caller supplies. See the
// note on `StructuredData` below for why it is a prop.
// ─────────────────────────────────────────────────────────────────────────────

/** Labels for the site's fixed (non-parameterised) routes. */
const STATIC_ROUTE_LABELS: Record<string, string> = {
  "/weddings": "Weddings",
  "/farm-tours": "Farm Tours",
  "/nordic-spa": "Nordic Spa",
  "/sauna-near-portland": "Sauna Near Portland",
  "/stay": "Stay",
  "/thanksgiving": "Thanksgiving 2026",
  "/wedding-portfolio": "Real Weddings",
  "/celebrations": "Celebrations",
  "/about": "About",
  "/contact": "Contact",
  "/shop": "Shop",
  "/wedding-call": "Book a Wedding Call",
  "/gift-certificates": "Gift Certificates",
  "/accessibility": "Accessibility",
  "/privacy": "Privacy Policy",
  "/terms": "Terms of Service",
};

/** Last-resort label for a route added after this map was written. */
function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Resolves one path segment to a display name.
 *
 * Dynamic segments read the same data modules the pages themselves render
 * from, so a renamed property, couple or product can't drift out of the
 * breadcrumb.
 */
function segmentLabel(fullPath: string, parentPath: string, slug: string): string {
  const fixed = STATIC_ROUTE_LABELS[fullPath];
  if (fixed) return fixed;

  if (parentPath === "/stay") {
    const property = properties.find((item) => item.slug === slug);
    if (property) return property.name;
  }

  if (parentPath === "/wedding-portfolio") {
    const couple = weddingPortfolio.find((item) => item.slug === slug);
    // A styled set never prints its names, here as on its page (Google shows breadcrumb names).
    if (couple) return displayName(couple);
  }

  if (parentPath === "/shop") {
    const product = getProduct(slug);
    if (product) return product.name;
  }

  return titleCaseSlug(slug);
}

/** Strips query/hash and trailing slashes. Returns "" for the homepage. */
function normalizePath(pathname: string): string {
  const withoutQuery = pathname.split("?")[0].split("#")[0];
  const trimmed = withoutQuery.replace(/\/+$/, "");
  return trimmed.startsWith("/") || trimmed === "" ? trimmed : `/${trimmed}`;
}

/**
 * Builds the BreadcrumbList node for `pathname`, or `null` on the homepage —
 * a page whose only crumb is itself has no trail to describe, and Google's
 * own guidance is that a homepage does not need breadcrumb markup.
 */
function buildBreadcrumb(pathname: string) {
  const path = normalizePath(pathname);
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const trail: { name: string; item: string }[] = [
    { name: "Home", item: SITE.url },
  ];
  let parentPath = "/";
  for (const slug of segments) {
    const fullPath = parentPath === "/" ? `/${slug}` : `${parentPath}/${slug}`;
    trail.push({
      name: segmentLabel(fullPath, parentPath, slug),
      item: `${SITE.url}${fullPath}`,
    });
    parentPath = fullPath;
  }

  return {
    "@type": "BreadcrumbList",
    // Page-scoped, because the list itself is now page-scoped. A single
    // site-wide `/#breadcrumb` id would have 24 pages claiming one node.
    "@id": `${SITE.url}${path}#breadcrumb`,
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };
}

/**
 * Site-wide JSON-LD entity graph.
 *
 * `pathname` is a prop, deliberately. This component is mounted from the root
 * layout's `<head>`, and a root-layout Server Component has no way to read the
 * current path: `usePathname` is a client hook, and `headers()` both forces
 * every one of the 24 statically-prerendered routes into dynamic rendering and
 * still needs a `middleware.ts` to put the path in a request header (Next 16
 * exposes no pathname header of its own). A prop keeps the whole graph
 * server-rendered into the static HTML, which is the only version a non-JS AI
 * crawler ever sees.
 *
 * Callers that know their route pass it (`<StructuredData pathname="/stay/lodge" />`).
 * The default is the homepage, which emits no BreadcrumbList at all — correct
 * for `/`, and never a false trail on a route that forgot to pass one.
 */
export function StructuredData({ pathname = "/" }: { pathname?: string }) {
  const breadcrumb = buildBreadcrumb(pathname);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      // ── Primary LocalBusiness (enhanced for local SEO) ──
      {
        "@type": ["LocalBusiness", "LodgingBusiness", "EventVenue"],
        "@id": `${SITE.url}/#business`,
        name: "Highland Farms Oregon",
        alternateName: "Highland Farms",
        description: SITE.description,
        url: SITE.url,
        telephone: CONTACT.phone,
        email: CONTACT.email,
        address,
        geo,
        hasMap: `https://www.google.com/maps?q=${CONTACT.coordinates.lat},${CONTACT.coordinates.lng}`,
        sameAs: SAME_AS,
        founder: { "@id": `${SITE.url}/#connor` },
        image: [
          `${SITE.url}/images/hero/farm-aerial.jpg`,
          `${SITE.url}/images/weddings/couple.jpg`,
          `${SITE.url}/images/farm/highland-cows-hero.jpg`,
        ],
        logo: `${SITE.url}/images/logo/HF-Lettermark.png`,
        currenciesAccepted: "USD",
        paymentAccepted: "Credit Card",
        areaServed: [
          {
            "@type": "City",
            name: "Portland",
            "@id": "https://en.wikipedia.org/wiki/Portland,_Oregon",
          },
          {
            "@type": "City",
            name: "Brightwood",
          },
          {
            "@type": "City",
            name: "Sandy",
          },
          {
            "@type": "City",
            name: "Gresham",
          },
          {
            "@type": "City",
            name: "Welches",
          },
          {
            "@type": "City",
            name: "Hood River",
          },
          {
            "@type": "City",
            name: "Beaverton",
          },
          {
            "@type": "State",
            name: "Oregon",
            "@id": "https://en.wikipedia.org/wiki/Oregon",
          },
          {
            "@type": "GeoCircle",
            geoMidpoint: geo,
            geoRadius: "100000",
          },
        ],
        knowsAbout: [
          "Farm weddings",
          "Forest weddings",
          "Highland Cow farm tours",
          "Nordic spa experiences",
          "Outdoor sauna",
          "Cold plunge therapy",
          "Sauna near Portland",
          "Mt Hood activities",
          "Farm stays",
          "Intimate weddings",
          "Destination weddings",
          "Event venue",
        ],
        keywords:
          "Oregon wedding venue, farm wedding venue Oregon, outdoor wedding venue Oregon, Mt Hood wedding venue, Highland Cow farm tour, Nordic spa Oregon, sauna near Portland, sauna Mt Hood, cold plunge Portland, outdoor sauna Oregon, sauna day trip Portland, farm stay Oregon, Brightwood Oregon, Portland wedding venue, forest wedding, intimate wedding venue, destination wedding Oregon",
        slogan: SITE.tagline,
        // Owner-confirmed whole-farm bedrooms (properties.ts). No check-in or
        // check-out times: the farm publishes none.
        numberOfRooms: WHOLE_FARM_BEDROOMS,
        petsAllowed: false,
        amenityFeature: [
          { "@type": "LocationFeatureSpecification", name: "Free WiFi", value: true },
          { "@type": "LocationFeatureSpecification", name: "Free Parking", value: true },
          { "@type": "LocationFeatureSpecification", name: "Full Kitchen", value: true },
          { "@type": "LocationFeatureSpecification", name: "Highland Cow Farm Tours", value: true },
          { "@type": "LocationFeatureSpecification", name: "Nordic Spa (Dry Sauna, Wet Sauna, Cold Plunge)", value: true },
          { "@type": "LocationFeatureSpecification", name: "Forest Setting", value: true },
          { "@type": "LocationFeatureSpecification", name: "On-Site Lodging", value: true },
        ],
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: String(REVIEW_RATING),
          reviewCount: String(REVIEW_COUNT),
          bestRating: "5",
        },
        // Owner-confirmed 2026-09-17: this is the maximum *event* headcount,
        // not beds. Independently corroborated by WeddingWire ("Up to 125")
        // and The Knot ("101 to 150"). Overnight capacity is 20 and is
        // expressed per-Accommodation in `containsPlace` below.
        maximumAttendeeCapacity: 125,
        containsPlace: [
          {
            "@type": "Accommodation",
            name: "William Wallace Lodge",
            description:
              "Cedar lodge sleeping 8 guests across 4 bedrooms with wrap-around deck, full kitchen, wood fireplace, and cedar hot tub.",
            url: `${SITE.url}/stay/lodge`,
            occupancy: {
              "@type": "QuantitativeValue",
              maxValue: 8,
            },
            numberOfBedrooms: 4,
            numberOfBathroomsTotal: 2.5,
          },
          {
            "@type": "Accommodation",
            name: "Bonnie Lass Cottage",
            description:
              "Cozy retreat near William Wallace Lodge with 3 bedrooms, kitchenette, cedar hot tub, and barn pasture views. Sleeps 8 guests.",
            url: `${SITE.url}/stay/cottage`,
            occupancy: {
              "@type": "QuantitativeValue",
              maxValue: 8,
            },
            numberOfBedrooms: 3,
            numberOfBathroomsTotal: 1,
          },
          {
            "@type": "Accommodation",
            name: "The Camp",
            description:
              "A unique glamping experience featuring a restored Airstream trailer and canvas tent camping under the towering evergreens. Sleeps 4 guests, with WiFi and kitchen access.",
            url: `${SITE.url}/stay/camp`,
            occupancy: {
              "@type": "QuantitativeValue",
              maxValue: 4,
            },
            numberOfBedrooms: 1,
            numberOfBathroomsTotal: 1,
          },
          {
            // The whole-property booking: all three stays together. Listed
            // because /stay/whole-farm is a live, indexed page.
            "@type": "Accommodation",
            name: "The Whole Farm",
            description:
              "William Wallace Lodge, Bonnie Lass Cottage and The Camp reserved together, sleeping 20 across 7 bedrooms and 3.5 baths, with two cedar hot tubs.",
            url: `${SITE.url}/stay/whole-farm`,
            // Owner-confirmed 2026-09-17: 20 overnight guests, which includes
            // The Camp (Lodge 8 + Cottage 8 + Camp 4).
            occupancy: { "@type": "QuantitativeValue", maxValue: 20 },
            numberOfBedrooms: 7,
            numberOfBathroomsTotal: 3.5,
          },
        ],
      },

      // ── Person (founder) ──
      // Only what /about already states publicly: the name, and "farm
      // proprietor". No bio, photo, birth date or social profile is invented.
      {
        "@type": "Person",
        "@id": `${SITE.url}/#connor`,
        name: "Connor McWilliams",
        jobTitle: "Owner & Proprietor",
        worksFor: { "@id": `${SITE.url}/#business` },
        url: `${SITE.url}/about`,
      },

      // ── EventVenue (wedding-specific) ──
      {
        "@type": "EventVenue",
        "@id": `${SITE.url}/#venue`,
        name: "Highland Farms Wedding Venue",
        description:
          "Private forest farm wedding venue in Brightwood, Oregon, about an hour from Portland. Five acres of forest, the Scottish Highland Cows as honorary guests, up to 125 guests, and up to 20 can stay on the farm.",
        url: `${SITE.url}/weddings`,
        address,
        geo,
        // Owner-confirmed 2026-09-17: maximum event headcount, not beds.
        maximumAttendeeCapacity: 125,
        // No priceRange: wedding marketing carries no price or price anchor
        // (Connor's rule), and "$$$$" is one.
        isAccessibleForFree: false,
        publicAccess: false,
        image: `${SITE.url}/images/weddings/couple.jpg`,
      },

      // ── TouristAttraction (farm tours) ──
      {
        "@type": "TouristAttraction",
        "@id": `${SITE.url}/#attraction`,
        name: "Highland Farms Highland Cow Farm Tours",
        description:
          "Private 60-minute farm tours for 2 to 6 guests. Meet Scottish Highland Cows, Icelandic Sheep, White Peacocks, guardian dogs, chickens, and Guinea Fowl in Brightwood, Oregon, about an hour from Portland.",
        url: `${SITE.url}/farm-tours`,
        address,
        geo,
        isAccessibleForFree: false,
        publicAccess: true,
        touristType: ["Families", "Animal lovers", "Nature enthusiasts"],
        image: `${SITE.url}/images/farm/highland-cows-hero.jpg`,
      },

      // ── Product (farm tour offering) ──
      {
        "@type": "Product",
        "@id": `${SITE.url}/#farm-tour-product`,
        name: "Highland Cow Farm Tour",
        description:
          "Private 60-minute Highland Cow farm tour for 2 to 6 guests: $150 for two, $75 each additional guest. Meet Scottish Highland Cows, Icelandic Sheep, White Peacocks, guardian dogs, chickens, and Guinea Fowl.",
        url: `${SITE.url}/farm-tours`,
        image: `${SITE.url}/images/farm/highland-cows-hero.jpg`,
        brand: {
          "@type": "Brand",
          name: "Highland Farms Oregon",
        },
        offers: {
          "@type": "AggregateOffer",
          url: BOOKING_LINKS.farmTourAllSizes,
          lowPrice: "150",
          highPrice: "450",
          offerCount: 5,
          availability: "https://schema.org/InStock",
          priceCurrency: "USD",
          // No `shippingDetails`: a farm tour is a booked on-site service.
          // There is nothing to ship, so 0-day handling / 0-day transit /
          // US-wide destination described a fulfilment that does not exist.
          // The physical goods that DO ship-or-pick-up carry their real
          // terms in `src/lib/shop/product-schema.ts`.
          //
          // `hasMerchantReturnPolicy` stays: it is the machine-readable form
          // of the strict no-refund cancellation policy, and is accurate.
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "US",
            returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
          },
        },
      },

      // ── Product (Nordic spa offering) ──
      {
        "@type": "Product",
        "@id": `${SITE.url}/#spa-product`,
        name: "Nordic Forest Spa Session",
        description:
          "90-minute Nordic spa session with wood burning dry sauna, wet sauna, and cold plunge for up to 6 guests in a forest setting.",
        url: `${SITE.url}/nordic-spa`,
        image: `${SITE.url}/images/spa/spa-1.jpg`,
        brand: {
          "@type": "Brand",
          name: "Highland Farms Oregon",
        },
        offers: {
          "@type": "Offer",
          url: BOOKING_LINKS.nordicSpa,
          price: "75",
          availability: "https://schema.org/InStock",
          priceCurrency: "USD",
          // No `shippingDetails` — see the farm-tour Offer above.
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "US",
            returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
          },
        },
      },

      // ── HealthAndBeautyBusiness (Nordic spa) ──
      {
        "@type": ["HealthAndBeautyBusiness", "LocalBusiness"],
        "@id": `${SITE.url}/#spa`,
        name: "Highland Farms Nordic Spa",
        description:
          "Public outdoor wood-burning sauna, wet sauna & cold plunge about an hour from Portland, Oregon. 90-minute sessions for up to 6 guests in a forest setting in Brightwood.",
        url: `${SITE.url}/nordic-spa`,
        telephone: CONTACT.phone,
        address,
        geo,
        image: `${SITE.url}/images/spa/spa-1.jpg`,
        priceRange: "$$",
        // `openingHoursSpecification` deliberately omitted. Owner-confirmed
        // 2026-09-17: spa availability is not a fixed weekly schedule — it is
        // set by the wedding and events calendar, which blocks the spa
        // calendar (Acuity calendar 13047082). Forward availability over the
        // next three months runs Mon 3 / Tue 8 / Wed 7 / Thu 0 / Fri 5 /
        // Sat 2 / Sun 3, with Saturday suppressed by weddings. Any fixed
        // day-and-hour claim here would be wrong in one direction or the
        // other, so the offer's booking URL is the authoritative source of
        // live availability. If this is ever reinstated it should be
        // generated from Acuity, not hand-written.
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: String(REVIEW_RATING),
          reviewCount: String(REVIEW_COUNT),
          bestRating: "5",
        },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Nordic Spa Sessions",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Nordic Spa Session: Sauna & Cold Plunge",
                description: "90-minute public session with wood-burning dry sauna, wet sauna, and cold plunge for up to 6 guests.",
              },
              price: "75",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              url: BOOKING_LINKS.nordicSpa,
            },
          ],
        },
      },

      // ── WebSite ──
      // No `potentialAction`/SearchAction: the site has no search endpoint
      // (no /search route, no search API, nothing in the sitemap), and a
      // SearchAction pointing at a URL that 404s is a broken promise to the
      // crawler. Add one only if site search actually ships.
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        url: SITE.url,
        name: "Highland Farms Oregon",
        description: SITE.description,
        publisher: { "@id": `${SITE.url}/#business` },
        inLanguage: "en-US",
      },

      // ── BreadcrumbList (trail to the current page; absent on the homepage) ──
      ...(breadcrumb ? [breadcrumb] : []),
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
