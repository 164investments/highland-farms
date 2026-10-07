import type { Property } from "@/lib/types";

// ⛔ Capacities below are owner-confirmed. Do not "correct" them by adding up
// the three individual stays — the Whole Farm's 7 bedrooms / 3.5 baths is the
// number the farm gave us, and it is not the sum of the Lodge, Cottage and
// Camp. Guest counts do add up (8 + 8 + 4 = 20).
//
// `description` is each /stay/<slug> page's search and share description: one
// sentence built only from facts on that page (truth audit r2, N6 and N16).
// `layout` and `bestFor` are prose assembled only from the fields in this file,
// the highlights, and the gallery alt text already published on each
// `/stay/<slug>` page. There are no rates, minimum stays, check-in times or
// availability here because the farm has not published any — see
// `src/lib/types.ts` for the rule.

export const properties: Property[] = [
  {
    slug: "whole-farm",
    name: "The Whole Farm",
    tagline: "The full Highland Farms experience",
    description:
      "The Whole Farm sleeps 20: the Lodge, the Cottage and the Camp reserved together for a reunion, a retreat or a big birthday, on five forested acres shared with the Highland cows.",
    guests: 20,
    bedrooms: 7,
    baths: 3.5,
    imageSrc: "/images/properties/whole-farm.jpg",
    bookingUrl: "/stay/whole-farm",
    hospitable_widget_url: "https://booking.hospitable.com/widget/9c273e8f-0df2-4bd3-b639-da59849e328f/1336238",
    layout:
      "All three accommodations reserved together, the Lodge, the Cottage and the Camp, for up to twenty guests across seven bedrooms and three and a half baths. Two cedar hot tubs, one at the Lodge and one at the Cottage.",
    bestFor:
      "Large gatherings of up to twenty guests: all three stays reserved together, with the farm and the forest right outside. Twenty guests is the most the farm sleeps.",
    highlights: [
      "All three stays, reserved together",
      "3 separate accommodations",
      "Perfect for large family & friend gatherings",
      "2 Cedar Hot Tubs",
    ],
  },
  {
    slug: "lodge",
    name: "William Wallace Lodge",
    tagline: "Relax & reminisce",
    description:
      "William Wallace Lodge sleeps 8 in four bedrooms, with a full kitchen, a dining table that seats ten, a wood fireplace, a wrap-around deck and a cedar hot tub, about an hour from Portland.",
    guests: 8,
    bedrooms: 4,
    baths: 2.5,
    imageSrc: "/images/properties/cottage.jpg",
    bookingUrl: "/stay/lodge",
    hospitable_widget_url: "https://booking.hospitable.com/widget/9c273e8f-0df2-4bd3-b639-da59849e328f/1573840",
    layout:
      "Four bedrooms and two and a half baths sleep eight. They range from a king-bedded master under a vaulted cedar ceiling to a twin room, and one bedroom has a ladder up to a hidden loft. The master bath has a soaking tub and a glass shower.",
    bestFor:
      "Groups who want to cook and eat together. The Lodge is the accommodation with the full kitchen, a dining room that seats ten, a wood fireplace, a game room with a full-length shuffleboard table, and the wrap-around deck.",
    highlights: [
      "Cedar Hot Tub",
      "BBQ & Blackstone",
      "Full kitchen",
      "Wood fireplace",
    ],
  },
  {
    slug: "cottage",
    name: "Bonnie Lass Cottage",
    tagline: "Retreat & converse",
    description:
      "Bonnie Lass Cottage sleeps 8 in three bedrooms, beside the cow pasture, with a kitchenette, a patio and a cedar hot tub, about an hour from Portland.",
    guests: 8,
    bedrooms: 3,
    baths: 1,
    imageSrc: "/images/properties/lodge.jpg",
    bookingUrl: "/stay/cottage",
    hospitable_widget_url: "https://booking.hospitable.com/widget/9c273e8f-0df2-4bd3-b639-da59849e328f/1080252",
    layout:
      "Three bedrooms and a single bath sleep eight, with a spiral staircase up to the loft bedroom and its twin beds tucked under the eaves. Cooking here is a kitchenette rather than a full kitchen; the Lodge is the one with the full kitchen.",
    bestFor:
      "Guests who want to be closest to the animals. The Cottage neighbors the barn pasture, and a garage-style door opens the living room straight onto the forest. Outside there is a patio, a BBQ and a cedar hot tub.",
    highlights: [
      "Cedar Hot Tub",
      "BBQ",
      "Kitchenette",
      "Indoor/outdoor living",
    ],
  },
  {
    slug: "camp",
    name: "The Camp",
    tagline: "Recenter & connect",
    description:
      "The Camp sleeps 4 in a restored Airstream and canvas tents under the evergreens, with a galley kitchen, one bath and WiFi, about an hour from Portland.",
    guests: 4,
    bedrooms: 1,
    baths: 1,
    imageSrc: "/images/properties/camp-1.jpg",
    bookingUrl: "/stay/camp",
    hospitable_widget_url: "https://booking.hospitable.com/widget/9c273e8f-0df2-4bd3-b639-da59849e328f/1574832",
    layout:
      "Four guests between a restored Airstream and canvas tents under the evergreens. The Airstream holds the bedroom, a sleeping nook at the rear, plus a galley kitchen, a dining nook and a lounge, and there is one bath.",
    bestFor:
      "Two to four people who want to sleep out among the trees without giving up a kitchen, WiFi or a bathroom. It is the smallest of the three stays and the only one partly under canvas.",
    highlights: [
      "Airstream trailer",
      "Glamping tents",
      "Under the stars",
      "WiFi & kitchen access",
    ],
  },
];
