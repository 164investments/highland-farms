/**
 * Page content for /stay and /stay/[slug] that is not a fact about the
 * property itself (those stay in src/data/properties.ts): the one-line
 * "who it suits", spec rows, room-by-room plates and the review quotes.
 *
 * Pure on purpose: only type imports, so scripts/stays-quotes.test.mts can
 * load it with node and prove every quote against the review snapshot.
 *
 * Photo identity follows properties.ts, not filenames: `properties/cottage.jpg`
 * is the LODGE and `properties/lodge.jpg` is the COTTAGE (AGENTS.md).
 */
import type { QuoteSpec } from "@/lib/review-quotes";
import type { Property } from "@/lib/types";
import type { FieldDrawingName } from "@/components/ui/FieldGuide";

export interface StayPhotoSpec {
  src: string;
  alt: string;
  /** CSS object-position, e.g. "50% 62%". */
  position?: string;
}

export interface StayCaptionedPhoto extends StayPhotoSpec {
  caption: string;
}

export interface StayRoom extends StayPhotoSpec {
  name: string;
  detail: string;
}

export interface StayRoomGroup {
  group: string;
  /** Right-hand note on the group head. */
  note: (p: Property) => string;
  items: StayRoom[];
}

export interface StayQuote {
  spec: QuoteSpec;
  /** Visit type in the attribution (CONSISTENCY #2). */
  role?: string;
}

export interface StayContent {
  slug: string;
  /** Field-guide drawing for the picker and the comparison table (the whole farm draws its three stays). */
  drawings: FieldDrawingName[];
  compareName: string;
  compareBedrooms: (p: Property) => string;
  compareHotTub: string;
  picker: (p: Property) => string;
  /** Row under "The other stays". */
  otherLine: (p: Property) => string;
  /** Small real photo for those rows (decorative). */
  thumb: StayPhotoSpec;
  sheet: {
    photo: StayCaptionedPhoto;
    who: string;
    rows: (p: Property) => { term: string; detail: string }[];
    sentence: string;
    quote: StayQuote;
  };
  page: {
    promise: string;
    lead: StayCaptionedPhoto;
    /** The fourth key fact: Cedar hot tub, 2 hot tubs, Galley kitchen. */
    fourth: { label: string; value: string };
    /** The section label over `about`: each stay names itself (Lodge "The house", Camp "The camp"). */
    aboutTitle: string;
    about: (p: Property) => string;
    quoteEyebrow: string;
    quote: StayQuote;
    /** A quiet text link under the quote, where the quote raises the next question. */
    quoteLink?: { label: string; href: string };
    /** "Room by room" groups, or, for the whole farm, its three stays with their photos. */
    rooms: "rooms" | "stays";
    groups: StayRoomGroup[];
    /** Short name in the phone sticky bar. */
    stickyName: string;
    /** Which Thanksgiving package this page offers, if any. */
    thanksgiving?: "lodge" | "whole-farm";
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/** 12 -> "twelve" (falls back to the digits past twelve). */
export function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}

export function capitalize(word: string): string {
  return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
}

export function bathsLabel(baths: number): string {
  return `${baths} ${baths === 1 ? "bath" : "baths"}`;
}

export function bedroomsLabel(bedrooms: number): string {
  return `${bedrooms} ${bedrooms === 1 ? "bedroom" : "bedrooms"}`;
}

export function roomCount(content: StayContent): number {
  return content.page.groups.reduce((sum, g) => sum + g.items.length, 0);
}

/* ------------------------------------------------------------------ */
/* Review quotes (author + date, so the test proves each one)           */
/* ------------------------------------------------------------------ */

/** /stay hero. */
export const STAY_HERO_QUOTE: StayQuote = {
  spec: {
    author: "Kirk Fairbanks",
    date: "2025-04-27",
    sentenceStartsWith: "We have loved our stay",
    topic: "Farm stay",
  },
  role: "Stay",
};

const q = (
  author: string,
  date: string,
  sentenceStartsWith: string,
  role?: string,
): StayQuote => ({ spec: { author, date, sentenceStartsWith, topic: "Farm stay" }, role });

/**
 * One review on one page (CONSISTENCY #2): the sheet quotes are on /stay, the
 * page quotes on each /stay/[slug]. No review appears in both lists, and none
 * is on another page (home keeps Emily Enns, Maya C.; celebrations its own).
 */
export const STAY_SHEET_QUOTES: Record<string, StayQuote> = {
  "whole-farm": q("Leanna Little", "2026-01-01", "As soon as you arrive", "Wedding"),
  lodge: q("Kamakila Waiwaiole", "2025-06-23", "Truly one of the most serene", "Stay"),
  cottage: q("Lauren Case", "2025-11-25", "Our 2 yr old", "Stay"),
  camp: q("Amy Bains", "2025-08-16", "We stayed at The Camp", "Stay"),
};

export const STAY_PAGE_QUOTES: Record<string, StayQuote> = {
  "whole-farm": q("Mellani Calvin", "2025-09-08", "We rented the whole darn farm", "Wedding"),
  lodge: q("Emily Hirsh", "2025-08-16", "We stayed in the lodge", "Stay"),
  cottage: q("Lindsay Hodge", "2026-07-09", "We stayed in The Cottage", "Stay"),
  camp: q("Debbie Brunhoff", "2025-09-19", "Slept in the airstream", "Stay"),
};

/** /celebrations: occasion, then the review that names it. */
export const CELEBRATION_QUOTES: { occasion: string; quote: StayQuote }[] = [
  {
    occasion: "A 70th birthday",
    quote: q("Jennifer Hildebrand", "2026-04-14", "My sisters and I rented", "Stay"),
  },
  {
    occasion: "A yoga retreat",
    quote: q("Genevieve Schweitzer", "2025-09-14", "Highland Farms was the dream"),
  },
  {
    occasion: "An anniversary",
    quote: q("Kelly Monreal", "2025-05-24", "Our anniversary getaway", "Stay"),
  },
];

/** The review directly above the /celebrations form (a birthday, matched to the ask). */
export const CELEBRATION_FORM_QUOTE: StayQuote = q(
  "Ronniesha F",
  "2026-01-22",
  "We're new to the area",
  "Stay",
);

export const ALL_STAY_QUOTES: QuoteSpec[] = [
  STAY_HERO_QUOTE.spec,
  ...Object.values(STAY_SHEET_QUOTES).map((x) => x.spec),
  ...Object.values(STAY_PAGE_QUOTES).map((x) => x.spec),
  ...CELEBRATION_QUOTES.map((x) => x.quote.spec),
  CELEBRATION_FORM_QUOTE.spec,
];

/* ------------------------------------------------------------------ */
/* Per-stay content                                                      */
/* ------------------------------------------------------------------ */

const PHOTO = (src: string, alt: string, name: string, detail: string, position = "50% 50%"): StayRoom => ({
  src: `/images/properties/${src}.jpg`,
  alt,
  name,
  detail,
  position,
});

const LODGE: StayContent = {
  slug: "lodge",
  drawings: ["lodge"],
  compareName: "Lodge",
  compareBedrooms: (p) => String(p.bedrooms),
  compareHotTub: "Cedar",
  picker: (p) => `${bedroomsLabel(p.bedrooms)} · ${bathsLabel(p.baths)} · full kitchen · hot tub`,
  otherLine: (p) => `Sleeps ${p.guests} · ${bedroomsLabel(p.bedrooms)} · ${bathsLabel(p.baths)}`,
  thumb: { src: "/images/properties/cottage.jpg", alt: "", position: "50% 45%" },
  sheet: {
    photo: {
      src: "/images/properties/cottage.jpg",
      alt: "William Wallace Lodge, a two-storey cedar lodge with a wrap-around deck among ferns and firs",
      position: "50% 45%",
      caption: "William Wallace Lodge and its wrap-around deck.",
    },
    who: "The cedar lodge with the big table and the full kitchen.",
    rows: (p) => [
      { term: "Rooms", detail: `${bedroomsLabel(p.bedrooms)} and ${bathsLabel(p.baths)}` },
      { term: "Kitchen", detail: "Full kitchen, a dining room that seats ten, BBQ and Blackstone" },
      { term: "Evenings", detail: "Cedar hot tub, wood fireplace, shuffleboard in the game room" },
    ],
    sentence: "For groups who want to cook and eat together, then spill out onto the wrap-around deck.",
    quote: STAY_SHEET_QUOTES.lodge,
  },
  page: {
    promise:
      "The cedar lodge with the big table and the full kitchen, on five forested acres shared with the Highland cows.",
    lead: {
      src: "/images/properties/cottage.jpg",
      alt: "William Wallace Lodge, a two-storey cedar lodge with a wrap-around deck among ferns and firs",
      position: "50% 42%",
      caption: "William Wallace Lodge and its wrap-around deck.",
    },
    fourth: { label: "Hot tub", value: "Cedar" },
    aboutTitle: "The house",
    about: () =>
      "A warm cedar lodge built for gathering. Cook in the full kitchen, eat at a dining table that seats ten, settle in by the wood fireplace, then take the evening out to the wrap-around deck and the cedar hot tub. There is a BBQ and a Blackstone for the cook, a game room with a full-length shuffleboard table, and the farm and the forest are right outside.",
    quoteEyebrow: "A guest who stayed at the Lodge",
    quote: STAY_PAGE_QUOTES.lodge,
    rooms: "rooms",
    stickyName: "The Lodge",
    thanksgiving: "lodge",
    groups: [
      {
        group: "Sleeping",
        note: (p) => `${bedroomsLabel(p.bedrooms)}, sleeps ${p.guests}`,
        items: [
          PHOTO("lodge-master-bedroom-pro", "Master bedroom with vaulted cedar ceiling, king bed and a forest-view sitting area", "Master", "King bed under a vaulted cedar ceiling"),
          PHOTO("lodge-bedroom-cedar", "Bedroom with cedar herringbone wood paneling and a queen bed with plaid bedding", "Cedar room", "Queen bed, cedar herringbone walls"),
          PHOTO("lodge-bedroom-ladder", "Bedroom with a vaulted ceiling and a black ladder up to a hidden loft", "Ladder room", "A ladder up to a hidden loft", "30% 50%"),
          PHOTO("lodge-twin-bedroom-pro", "Twin bedroom with lumberjack plaid bedding under a vaulted wood ceiling", "Twin room", "Two twins in lumberjack plaid"),
        ],
      },
      {
        group: "Bathing",
        note: () => "2 full baths, 1 half bath",
        items: [
          PHOTO("lodge-master-bath-pro", "Master bathroom with a vaulted wood ceiling, soaking tub and glass shower", "Master bath", "Soaking tub and a glass shower"),
          PHOTO("lodge-bath-vaulted", "Guest bath with a vaulted wood-beam ceiling and glass shower stall", "Guest bath", "Glass shower, vaulted beams"),
        ],
      },
      {
        group: "Gathering",
        note: () => "Living, dining, kitchen, games",
        items: [
          PHOTO("lodge-living-pro", "Living room with Chesterfield sofas, a curved iron-truss ceiling and a stone fireplace", "Living room", "Chesterfields by the stone fireplace"),
          PHOTO("lodge-dining-pro", "Formal dining room with a stone fireplace and seating for ten", "Dining room", "A table that seats ten"),
          PHOTO("lodge-kitchen-pro", "Full kitchen with oak cabinets, a granite island and French doors to the deck", "Kitchen", "Full kitchen, granite island"),
          PHOTO("lodge-shuffleboard", "Game room with a full-length shuffleboard table and floor-to-ceiling forest windows", "Game room", "Full-length shuffleboard"),
        ],
      },
      {
        group: "Outside",
        note: () => "Deck and cedar hot tub",
        items: [
          PHOTO("lodge-deck", "The Lodge's wrap-around deck with lounge chairs", "The deck", "Wraps around the house"),
          PHOTO("lodge-winter", "The Lodge seen across the partly frozen pond after a snowfall", "In winter", "From the pond, after snow", "50% 40%"),
        ],
      },
    ],
  },
};

const COTTAGE: StayContent = {
  slug: "cottage",
  drawings: ["cottage"],
  compareName: "Cottage",
  compareBedrooms: (p) => String(p.bedrooms),
  compareHotTub: "Cedar",
  picker: (p) => `${bedroomsLabel(p.bedrooms)} · ${bathsLabel(p.baths)} · by the pasture · hot tub`,
  otherLine: (p) => `Sleeps ${p.guests} · ${bedroomsLabel(p.bedrooms)} · ${bathsLabel(p.baths)}`,
  thumb: { src: "/images/properties/lodge.jpg", alt: "", position: "50% 62%" },
  sheet: {
    photo: {
      src: "/images/properties/cottage-living-garage.jpg",
      alt: "The Cottage living room with its glass garage door rolled up to the forest, a leather sofa and a tree-trunk side table",
      position: "50% 55%",
      caption: "The Cottage living room, its garage door open to the forest.",
    },
    who: "The closest bed to the Highland cows.",
    rows: (p) => [
      { term: "Rooms", detail: `${bedroomsLabel(p.bedrooms)} and ${bathsLabel(p.baths)}, with a spiral stair to the loft` },
      { term: "Kitchen", detail: "Kitchenette, plus a BBQ on the patio" },
      { term: "Evenings", detail: "Cedar hot tub" },
    ],
    sentence:
      "For guests who want the animals at the door. The Cottage sits beside the barn pasture, and the living room opens straight onto the forest.",
    quote: STAY_SHEET_QUOTES.cottage,
  },
  page: {
    promise:
      "The closest bed to the Highland cows, on five forested acres shared with the herd.",
    lead: {
      src: "/images/properties/lodge.jpg",
      alt: "Guests relaxing on the patio of Bonnie Lass Cottage, a cedar cabin with a barn-style roof among tall firs",
      position: "50% 62%",
      caption: "Bonnie Lass Cottage, beside the cow pasture.",
    },
    fourth: { label: "Hot tub", value: "Cedar" },
    aboutTitle: "The cottage",
    about: () =>
      "The Cottage neighbors the barn pasture, where the Highland cows greet you in the morning, and a garage-style door opens the living room straight onto the forest. Outside there is a patio, a BBQ and a cedar hot tub. A spiral staircase climbs to the loft bedroom and its twin beds under the eaves. Cooking here is a kitchenette rather than a full kitchen; the Lodge is the one with the full kitchen.",
    quoteEyebrow: "A guest who stayed at the Cottage",
    quote: STAY_PAGE_QUOTES.cottage,
    rooms: "rooms",
    stickyName: "The Cottage",
    groups: [
      {
        group: "Sleeping",
        note: (p) => `${bedroomsLabel(p.bedrooms)}, sleeps ${p.guests}`,
        items: [
          PHOTO("cottage-master-bedroom-pro", "Cottage master bedroom with cedar-plank walls, king bed, and feather wall hanging", "Master", "King bed in a cedar-plank room"),
          PHOTO("cottage-bedroom-cedar", "The cottage master bedroom from the bed: cedar walls, an antique dresser and the sliding door to the forest", "Master, other side", "Cedar walls and a forest view"),
          PHOTO("cottage-loft-bedroom-pro", "Loft bedroom with sloped white ceiling and green-curtained dormer window", "Loft bedroom", "Sloped ceiling and a dormer window"),
          PHOTO("cottage-loft-twins", "Loft sleeping platform with twin beds tucked under the eaves", "Loft twins", "Twin beds under the eaves"),
        ],
      },
      {
        group: "Bathing",
        note: (p) => bathsLabel(p.baths),
        items: [
          PHOTO("cottage-bathroom-pro", "Cottage bathroom with green tile shower, brass fixtures, and pine walls", "Bathroom", "Green tile shower, brass fixtures"),
        ],
      },
      {
        group: "Gathering",
        note: () => "Living room and kitchenette",
        items: [
          PHOTO("cottage-living-spiral", "Cottage living room with spiral staircase, retro red fridge, and cedar-plank ceiling", "Living room", "Spiral stair to the loft"),
          PHOTO("cottage-living-garage", "Living room with garage door open to forest, leather sofa, and tree-trunk side table", "Garage door", "Opens the living room to the forest"),
          PHOTO("cottage-kitchen-pro", "Cottage kitchen with spiral staircase to the loft, white cabinets, and pine ceiling", "Kitchenette", "White cabinets, pine ceiling"),
        ],
      },
      {
        group: "Outside",
        note: () => "Patio, BBQ and cedar hot tub",
        items: [
          PHOTO("cottage-exterior-2", "Cottage exterior with gambrel roof", "Exterior", "Under a gambrel roof"),
        ],
      },
    ],
  },
};

const CAMP: StayContent = {
  slug: "camp",
  drawings: ["airstream-camp"],
  compareName: "Camp",
  compareBedrooms: (p) => `${p.bedrooms}, plus tents`,
  compareHotTub: "None",
  picker: (p) => `Airstream and tents · ${bathsLabel(p.baths)} · WiFi`,
  otherLine: (p) => `Sleeps ${p.guests} · Airstream and tents · ${bathsLabel(p.baths)}`,
  thumb: { src: "/images/properties/camp-1.jpg", alt: "", position: "50% 62%" },
  sheet: {
    photo: {
      src: "/images/properties/camp-4.jpg",
      alt: "The silver Airstream at the end of a forest path lined with autumn vine maple leaves",
      position: "50% 60%",
      caption: "The Camp's Airstream, down the path in autumn.",
    },
    who: "A restored Airstream and canvas tents under the evergreens.",
    rows: (p) => [
      { term: "Sleeping", detail: `The Airstream and canvas tents, with ${bathsLabel(p.baths)}` },
      { term: "Inside", detail: "Galley kitchen, dining nook, lounge and WiFi" },
    ],
    sentence:
      "For two to four people who want to sleep among the trees without giving up a kitchen, WiFi or a bathroom.",
    quote: STAY_SHEET_QUOTES.camp,
  },
  page: {
    promise:
      "A restored Airstream and canvas tents under the evergreens, on five forested acres shared with the Highland cows.",
    lead: {
      src: "/images/properties/camp-4.jpg",
      alt: "The silver Airstream at the end of a forest path lined with autumn vine maple leaves",
      position: "50% 60%",
      caption: "The Camp's Airstream, down the path in autumn.",
    },
    fourth: { label: "Kitchen", value: "Galley" },
    aboutTitle: "The camp",
    about: (p) =>
      `The Airstream holds the bedroom, a sleeping nook at the rear, plus a galley kitchen, a dining nook and a lounge. The Camp has ${numberWord(p.baths)} ${p.baths === 1 ? "bath" : "baths"} and WiFi. It is the smallest of the stays and the only one partly under canvas.`,
    quoteEyebrow: "A guest who stayed at the Camp",
    quote: STAY_PAGE_QUOTES.camp,
    rooms: "rooms",
    stickyName: "The Camp",
    groups: [
      {
        group: "Inside",
        note: () => "Bedroom nook, galley, dining nook, lounge",
        items: [
          PHOTO("camp-interior-bedroom", "Airstream rear sleeping nook with forest view", "Sleeping nook", "At the rear, with a forest view"),
          PHOTO("camp-interior-galley", "Airstream galley kitchen looking back toward the bedroom", "Galley", "Kitchen, looking back to the bed"),
          PHOTO("camp-interior-kitchen-dining", "Airstream interior with full kitchen and rear dining nook", "Dining nook", "Kitchen and a rear dining nook"),
          PHOTO("camp-interior-lounge", "Airstream lounge with TV and view through to the bedroom", "Lounge", "A TV and a view through to the bed"),
        ],
      },
      {
        group: "Outside",
        note: () => "Under the evergreens",
        items: [
          PHOTO("camp-1", "Airstream trailer under the evergreens", "The Airstream", "Under the evergreens"),
          PHOTO("camp-6", "Airstream campsite in the forest", "The campsite", "In the forest"),
        ],
      },
    ],
  },
};

const WHOLE_FARM: StayContent = {
  slug: "whole-farm",
  drawings: ["lodge", "cottage", "airstream-camp"],
  compareName: "Whole farm",
  // The farm counts the Lodge and the Cottage (4 + 3, 2.5 + 1 baths); the Camp is extra.
  compareBedrooms: (p) => `${p.bedrooms}, plus the Camp`,
  compareHotTub: "Two cedar",
  picker: (p) => `${bedroomsLabel(p.bedrooms)} · ${bathsLabel(p.baths)} · two cedar hot tubs`,
  otherLine: (p) => `Sleeps ${p.guests} · ${bedroomsLabel(p.bedrooms)} · ${bathsLabel(p.baths)}`,
  thumb: { src: "/images/properties/gallery-7.jpg", alt: "", position: "50% 50%" },
  sheet: {
    photo: {
      src: "/images/properties/gallery-7.jpg",
      alt: "Aerial view of Highland Farms in autumn: the Lodge, the Cottage and the gravel drive loop among the firs",
      position: "50% 50%",
      caption: "The Lodge, the Cottage and the drive, from above.",
    },
    who: "All three stays, reserved together for your group.",
    rows: (p) => [
      { term: "Rooms", detail: `${bedroomsLabel(p.bedrooms)} and ${p.baths} baths` },
      { term: "Includes", detail: "William Wallace Lodge, Bonnie Lass Cottage and the Camp" },
      { term: "Hot tubs", detail: "Two cedar hot tubs, one at the Lodge and one at the Cottage" },
    ],
    sentence:
      "For reunions, retreats and big birthdays: up to 20 of you under three roofs, with two hot tubs and the Lodge's table for ten to gather around.",
    quote: STAY_SHEET_QUOTES["whole-farm"],
  },
  page: {
    promise:
      "All three stays, reserved together for your group, on five forested acres shared with the Highland cows.",
    lead: {
      src: "/images/properties/gallery-7.jpg",
      alt: "Aerial view of Highland Farms in autumn: the Lodge, the Cottage and the gravel drive loop among the firs",
      position: "50% 50%",
      caption: "The Lodge, the Cottage and the drive, from above.",
    },
    fourth: { label: "Hot tubs", value: "2" },
    aboutTitle: "The farm",
    about: () =>
      "For reunions, retreats and big birthdays. The Lodge, the Cottage and the Camp are reserved together, with two cedar hot tubs, one at the Lodge and one at the Cottage, and the Lodge's dining table that seats ten.",
    quoteEyebrow: "A guest who rented the whole farm",
    quote: STAY_PAGE_QUOTES["whole-farm"],
    // Mellani rented the farm around her daughter's wedding; weddings are their own offer, so point there.
    quoteLink: { label: "Planning a wedding? See weddings", href: "/weddings" },
    rooms: "stays",
    stickyName: "The Whole Farm",
    thanksgiving: "whole-farm",
    groups: [],
  },
};

/** Keyed by slug; order comes from properties.ts, never from here. */
export const STAY_CONTENT: Record<string, StayContent> = {
  "whole-farm": WHOLE_FARM,
  lodge: LODGE,
  cottage: COTTAGE,
  camp: CAMP,
};
