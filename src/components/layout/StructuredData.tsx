import { CONTACT, SITE, BOOKING_LINKS } from "@/lib/constants";

const address = {
  "@type": "PostalAddress",
  streetAddress: CONTACT.address,
  addressLocality: CONTACT.city,
  addressRegion: CONTACT.state,
  postalCode: CONTACT.zip,
  addressCountry: "US",
};

const geo = {
  "@type": "GeoCoordinates",
  latitude: CONTACT.coordinates.lat,
  longitude: CONTACT.coordinates.lng,
};

export function StructuredData() {
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
        sameAs: [CONTACT.instagram],
        image: [
          `${SITE.url}/images/hero/home.jpg`,
          `${SITE.url}/images/weddings/couple.jpg`,
          `${SITE.url}/images/farm/highland-cows-hero.jpg`,
        ],
        logo: `${SITE.url}/images/logo/HF-Lettermark.png`,
        priceRange: "$$$$",
        currenciesAccepted: "USD",
        paymentAccepted: "Cash, Credit Card",
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
        numberOfRooms: 8,
        petsAllowed: false,
        checkinTime: "15:00",
        checkoutTime: "11:00",
        amenityFeature: [
          { "@type": "LocationFeatureSpecification", name: "Free WiFi", value: true },
          { "@type": "LocationFeatureSpecification", name: "Free Parking", value: true },
          { "@type": "LocationFeatureSpecification", name: "Full Kitchen", value: true },
          { "@type": "LocationFeatureSpecification", name: "Highland Cow Farm Tours", value: true },
          { "@type": "LocationFeatureSpecification", name: "Nordic Spa (Dry Sauna, Wet Sauna, Cold Plunge)", value: true },
          { "@type": "LocationFeatureSpecification", name: "Forest Setting", value: true },
          { "@type": "LocationFeatureSpecification", name: "On-Site Lodging", value: true },
          { "@type": "LocationFeatureSpecification", name: "Event Coordination", value: true },
        ],
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          reviewCount: "146",
          bestRating: "5",
        },
        maximumAttendeeCapacity: 16,
        containsPlace: [
          {
            "@type": "Accommodation",
            name: "William Wallace Lodge",
            description:
              "Cedar mill lodge sleeping 8 guests across 4 bedrooms with wrap-around deck, full kitchen, wood fireplace, and cedar hot tub.",
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
        ],
      },

      // ── EventVenue (wedding-specific) ──
      {
        "@type": "EventVenue",
        "@id": `${SITE.url}/#venue`,
        name: "Highland Farms Wedding Venue",
        description:
          "All-inclusive farm and forest wedding venue at the base of Mt. Hood. Five acres of old-growth forest, Scottish Highland Cows, on-site lodging for 16 guests, and dedicated event coordination.",
        url: `${SITE.url}/weddings`,
        address,
        geo,
        maximumAttendeeCapacity: 16,
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
          "Private 60-minute farm tours for up to 6 guests. Meet Scottish Highland Cows, Icelandic Sheep, White Peacocks, guardian dogs, chickens, and Guinea Fowl at the base of Mt. Hood.",
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
          "Private 60-minute Highland Cow farm tour for up to 6 guests at $75 per person. Meet Scottish Highland Cows, Icelandic Sheep, White Peacocks, guardian dogs, chickens, and Guinea Fowl.",
        url: `${SITE.url}/farm-tours`,
        brand: {
          "@type": "Brand",
          name: "Highland Farms Oregon",
        },
        offers: {
          "@type": "Offer",
          url: BOOKING_LINKS.farmTour,
          price: "75",
          availability: "https://schema.org/InStock",
          priceCurrency: "USD",
        },
      },

      // ── Product (Nordic spa offering) ──
      {
        "@type": "Product",
        "@id": `${SITE.url}/#spa-product`,
        name: "Nordic Forest Spa Session",
        description:
          "60-minute Nordic spa session with wood burning dry sauna, wet sauna, and cold plunge for up to 6 guests in a forest setting.",
        url: `${SITE.url}/nordic-spa`,
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
        },
      },

      // ── HealthAndBeautyBusiness (Nordic spa) ──
      {
        "@type": ["HealthAndBeautyBusiness", "LocalBusiness"],
        "@id": `${SITE.url}/#spa`,
        name: "Highland Farms Nordic Spa",
        description:
          "Private outdoor wood-burning sauna, wet sauna & cold plunge 50 minutes from Portland, Oregon. 60-minute sessions for up to 6 guests in an old-growth Mt. Hood forest.",
        url: `${SITE.url}/nordic-spa`,
        telephone: CONTACT.phone,
        address,
        geo,
        image: `${SITE.url}/images/spa/spa-1.jpg`,
        priceRange: "$$",
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
          opens: "09:00",
          closes: "20:00",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          reviewCount: "146",
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
                name: "Nordic Spa Session — Sauna & Cold Plunge",
                description: "60-minute private session with wood-burning dry sauna, wet sauna, and cold plunge for up to 6 guests.",
              },
              price: "75",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              url: BOOKING_LINKS.nordicSpa,
            },
          ],
        },
      },

      // ── WebSite (for sitelinks search box) ──
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        url: SITE.url,
        name: "Highland Farms Oregon",
        description: SITE.description,
        publisher: { "@id": `${SITE.url}/#business` },
        inLanguage: "en-US",
      },

      // ── BreadcrumbList (site structure) ──
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE.url}/#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE.url,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Weddings",
            item: `${SITE.url}/weddings`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Farm Tours",
            item: `${SITE.url}/farm-tours`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: "Nordic Spa",
            item: `${SITE.url}/nordic-spa`,
          },
          {
            "@type": "ListItem",
            position: 5,
            name: "Stay",
            item: `${SITE.url}/stay`,
          },
          {
            "@type": "ListItem",
            position: 6,
            name: "Contact",
            item: `${SITE.url}/contact`,
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
