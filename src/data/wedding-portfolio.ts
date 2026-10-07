export interface WeddingPhotographer {
  /** Studio/photographer name as credited in the delivered image metadata. */
  name: string;
  /** Photographer's own gallery/portfolio URL, when the image metadata carries one. */
  url?: string;
}

export interface WeddingVendor {
  /** e.g. "Florist", "Caterer", "Coordinator", left empty until confirmed. */
  role: string;
  name: string;
  url?: string;
}

/** One photograph with its crop and (for plates) its caption. */
export interface WeddingPhoto {
  src: string;
  /** Alt text. Empty only where the photo sits in a link that already has a name. */
  alt: string;
  /** CSS object-position, e.g. "40% 66%". */
  position?: string;
  /** Italic caption under a plate. */
  caption?: string;
  /** Extra classes on the image (the portfolio lifts two dark frames with brightness-110). */
  className?: string;
}

/**
 * "confirmed": a wedding the farm hosted (names and date known).
 * "styled": photographed at the farm, not confirmed as a real wedding. These
 * pages are titled "Photographed by {photographer}" and never name a couple,
 * a date or a wedding until Connor answers (board question C5).
 */
export type WeddingStatus = "confirmed" | "styled";

export interface WeddingCouple {
  slug: string;
  /**
   * Names on the photographs' own record. For a "styled" set these are kept
   * only to build the old URL; never print them (use displayName()).
   */
  names: string;
  status: WeddingStatus;
  coverImage: string;
  images: { src: string; alt: string }[];
  /**
   * Wedding date (YYYY-MM-DD), read from the embedded XMP capture date on the
   * delivered gallery photos. Undefined means the files carry no capture date;
   * do NOT guess one. Never printed for a "styled" set.
   */
  date?: string;
  /**
   * Photographer credit, read from embedded XMP copyright/creator/artist
   * fields. Undefined means no credit is embedded in the files; do NOT invent
   * one (the pages show a pending slot instead).
   */
  photographer?: WeddingPhotographer;
  /**
   * A set not confirmed as a wedding: its page H1, saying what the photographs
   * show (RULINGS r4 #10). Never a couple's names; the credit sits beneath it.
   */
  headline?: string;
  /** One sentence on the portfolio card (and under the date on the couple page unless pageStory is set). */
  story: string;
  /** Longer lead paragraph for the couple page. */
  pageStory?: string;
  /** Portfolio card: the wide lead photo, then two smaller ones. */
  journal: [WeddingPhoto, WeddingPhoto, WeddingPhoto];
  /** Couple page: the lead plate (a different frame from the portfolio's first screen). */
  lead: WeddingPhoto;
  /** Couple page: the rest of the day, in plates. */
  plates: WeddingPhoto[];
  /** Number the plates I, II, III... (a sequence in time; only where the plates run in day order). */
  numberedPlates?: boolean;
  /**
   * Guest count for the day. No source in this repo, so unset on every couple.
   * Needs a workbook count before it can be shown.
   */
  guestCount?: number;
  /** Named vendors beyond photography. No source in this repo, so unset. */
  vendors?: WeddingVendor[];
}

/**
 * Journal order: Riley & Jordan open (a real couple between two of the herd,
 * CONSISTENCY #3), the other confirmed couples follow, then the two sets that
 * are not confirmed as weddings.
 */
export const weddingPortfolio: WeddingCouple[] = [
  {
    slug: "riley-jordan",
    names: "Riley & Jordan",
    status: "confirmed",
    coverImage: "/images/weddings/riley-jordan/01.jpg",
    // Embedded XMP photoshop:DateCreated is 2025-06-28 across all six files.
    // No photographer credit is embedded (Lightroom develop-preset data only).
    date: "2025-06-28",
    story: "Cowboy hats, two of the herd at the pasture fence, and vows under the timber arch.",
    journal: [
      // The portfolio's first screen: 2:1 on phones, anchored low so the couple and both cows sit high in the frame.
      { src: "/images/weddings/riley-jordan/01.jpg", alt: "", position: "50% 100%" },
      { src: "/images/weddings/riley-jordan/05.jpg", alt: "", position: "50% 55%", className: "brightness-110" },
      { src: "/images/weddings/riley-jordan/06.jpg", alt: "", position: "50% 45%", className: "brightness-110" },
    ],
    lead: {
      src: "/images/weddings/riley-jordan/04.jpg",
      alt: "Riley and Jordan at the pasture fence between a black Highland cow and a white Highland cow",
      position: "52% 60%",
      caption: "Riley & Jordan with two of the herd, June 2025.",
    },
    plates: [
      {
        src: "/images/weddings/riley-jordan/01.jpg",
        alt: "Riley and Jordan kiss at the pasture fence between a black Highland cow and a white one",
        position: "50% 70%",
        // The same caption on /weddings No. 1 (one caption per photo).
        caption: "Riley & Jordan's kiss at the pasture fence, June 2025.",
      },
      {
        src: "/images/weddings/riley-jordan/02.jpg",
        alt: "A groom in a black cowboy hat waits beside a timber arch draped in cream fabric",
        position: "50% 40%",
        caption: "The groom, at the timber arch.",
      },
      {
        src: "/images/weddings/riley-jordan/03.jpg",
        alt: "Guests seated on a flagstone patio as a man in a grey suit walks the aisle",
        position: "50% 50%",
        caption: "The aisle, on the flagstone patio.",
      },
      {
        src: "/images/weddings/riley-jordan/05.jpg",
        alt: "A bride and groom exchange vows under the timber arch in the forest",
        position: "50% 55%",
        caption: "Vows under the timber arch.",
        className: "brightness-110",
      },
      {
        src: "/images/weddings/riley-jordan/06.jpg",
        alt: "Two hands with wedding rings rest on white lace",
        position: "50% 45%",
        caption: "The rings.",
        className: "brightness-110",
      },
    ],
    images: [
      { src: "/images/weddings/riley-jordan/01.jpg", alt: "Riley and Jordan at the pasture fence with two Highland cows" },
      { src: "/images/weddings/riley-jordan/02.jpg", alt: "A groom in a cowboy hat beside the timber arch" },
      { src: "/images/weddings/riley-jordan/03.jpg", alt: "Guests on the flagstone patio" },
      { src: "/images/weddings/riley-jordan/04.jpg", alt: "Riley and Jordan between a black and a white Highland cow" },
      { src: "/images/weddings/riley-jordan/05.jpg", alt: "Vows under the timber arch" },
      { src: "/images/weddings/riley-jordan/06.jpg", alt: "Hands with wedding rings" },
    ],
  },
  {
    slug: "maya-justin",
    names: "Maya & Justin",
    status: "confirmed",
    coverImage: "/images/weddings/maya-justin/01.jpg",
    // Embedded XMP photoshop:DateCreated is 2025-09-06 across all six files.
    // Credited to Kate Holt Photography (rdf:li creator + pic-time URL).
    date: "2025-09-06",
    photographer: {
      name: "Kate Holt Photography",
      url: "http://kateholtphotography.pic-time.com/www",
    },
    story:
      "A Highland cow on the invitation, getting ready in a cedar-walled room, portraits among the trees, and their guests out on the patio.",
    pageStory:
      "Their invitation set the tone: a Highland cow in a crown of wildflowers, and the words “reception to follow.” The day began in a cedar-walled room, gathered their guests on the patio, and moved out among the trees for portraits.",
    journal: [
      { src: "/images/weddings/maya-justin/01.jpg", alt: "", position: "38% 62%" },
      { src: "/images/weddings/maya-justin/02.jpg", alt: "", position: "50% 32%" },
      { src: "/images/weddings/maya-justin/05.jpg", alt: "", position: "30% 40%" },
    ],
    lead: {
      src: "/images/weddings/maya-justin/01.jpg",
      alt: "Maya and Justin hold each other among tall mossy trees and ferns as her veil lifts in the air",
      position: "40% 66%",
      caption: "Maya & Justin in the forest, September 2025.",
    },
    numberedPlates: true,
    plates: [
      {
        src: "/images/weddings/maya-justin/02.jpg",
        alt: "Their wedding invitation, with a painted Highland cow in a flower crown, among pearl-studded shoes, a bolo tie and sage ribbon",
        position: "50% 40%",
        caption: "The invitation, with one of the coos on it.",
      },
      {
        src: "/images/weddings/maya-justin/04.jpg",
        alt: "A man in a grey suit with a rose boutonniere stands arm in arm with a woman in a sage dress on a wooden footbridge",
        position: "62% 35%",
        caption: "In grey, with a rose boutonniere.",
      },
      {
        src: "/images/weddings/maya-justin/05.jpg",
        alt: "Two women in sage dresses fasten the bride's gown in a warm cedar-walled room",
        position: "45% 40%",
        caption: "Getting ready in a cedar-walled room.",
      },
      {
        src: "/images/weddings/maya-justin/06.jpg",
        alt: "Guests gather on the patio in front of a dark-timbered building among tall trees",
        position: "50% 88%",
        caption: "Their guests out on the patio.",
      },
    ],
    images: [
      { src: "/images/weddings/maya-justin/01.jpg", alt: "Maya and Justin among tall trees and ferns" },
      { src: "/images/weddings/maya-justin/02.jpg", alt: "The wedding invitation with a Highland cow in a flower crown" },
      { src: "/images/weddings/maya-justin/03.jpg", alt: "Pearl-studded shoes and a bolo tie" },
      { src: "/images/weddings/maya-justin/04.jpg", alt: "A couple on a wooden footbridge" },
      { src: "/images/weddings/maya-justin/05.jpg", alt: "Getting ready in a cedar-walled room" },
      { src: "/images/weddings/maya-justin/06.jpg", alt: "Guests on the patio" },
    ],
  },
  {
    slug: "olivia-connor",
    names: "Olivia & Connor",
    status: "confirmed",
    coverImage: "/images/weddings/olivia-connor/06.jpg",
    // Embedded XMP DateCreated is 2025-07-26 across the five files that carry
    // it (02.jpg has none). Credited to Mercedes Lou Photography (rdf:li
    // creator + pic-time URL).
    date: "2025-07-26",
    photographer: {
      name: "Mercedes Lou Photography",
      url: "http://mercedeslouphotography.pic-time.com/www",
    },
    story: "Getting ready by a curtained window, a kiss in the forest, then one long table and every glass raised.",
    journal: [
      { src: "/images/weddings/olivia-connor/01.jpg", alt: "", position: "55% 50%" },
      { src: "/images/weddings/olivia-connor/04.jpg", alt: "", position: "50% 30%" },
      { src: "/images/weddings/olivia-connor/02.jpg", alt: "", position: "50% 40%" },
    ],
    lead: {
      src: "/images/weddings/olivia-connor/06.jpg",
      alt: "Olivia and Connor kiss on the flagstone after their ceremony",
      position: "50% 40%",
      caption: "A kiss on the flagstone, after the ceremony.",
    },
    plates: [
      {
        src: "/images/weddings/olivia-connor/04.jpg",
        alt: "A bride in a slip dress reaches up to her gown hanging by a curtained window",
        position: "50% 30%",
        caption: "Getting ready by a curtained window.",
      },
      {
        src: "/images/weddings/olivia-connor/02.jpg",
        alt: "A bride and a groom in a pale blue suit kiss among tall trees",
        position: "50% 40%",
        caption: "A kiss in the forest.",
      },
      {
        src: "/images/weddings/olivia-connor/03.jpg",
        alt: "A long table set with sage linens, pink menu cards and wildflowers",
        position: "50% 50%",
        caption: "The table, set for dinner.",
      },
      {
        src: "/images/weddings/olivia-connor/01.jpg",
        alt: "Guests raise their glasses along one long table under the trees",
        position: "55% 50%",
        caption: "One long table, every glass raised.",
      },
      {
        src: "/images/weddings/olivia-connor/05.jpg",
        alt: "Hands lift glasses in a toast across a candlelit table",
        position: "50% 50%",
        caption: "A toast under the string lights.",
      },
    ],
    images: [
      { src: "/images/weddings/olivia-connor/01.jpg", alt: "Guests raise their glasses along one long table" },
      { src: "/images/weddings/olivia-connor/02.jpg", alt: "A kiss in the forest" },
      { src: "/images/weddings/olivia-connor/03.jpg", alt: "A table set for dinner" },
      { src: "/images/weddings/olivia-connor/04.jpg", alt: "Getting ready by a curtained window" },
      { src: "/images/weddings/olivia-connor/05.jpg", alt: "A toast at the long table" },
      { src: "/images/weddings/olivia-connor/06.jpg", alt: "Olivia and Connor kiss on the flagstone" },
    ],
  },
  {
    slug: "sydney-casey",
    names: "Sydney & Casey",
    status: "confirmed",
    coverImage: "/images/weddings/sydney-casey/01.jpg",
    // Embedded XMP photoshop:DateCreated is 2025-04-25 across all six files.
    // No photographer credit is embedded (Lightroom develop-preset data only).
    date: "2025-04-25",
    story:
      "Vows inside a ring of flower petals, bridesmaids in every shade of pink, and everyone together in one photograph.",
    journal: [
      { src: "/images/weddings/sydney-casey/03.jpg", alt: "", position: "50% 60%" },
      { src: "/images/weddings/sydney-casey/06.jpg", alt: "", position: "45% 50%" },
      { src: "/images/weddings/sydney-casey/01.jpg", alt: "", position: "50% 50%" },
    ],
    lead: {
      src: "/images/weddings/sydney-casey/03.jpg",
      alt: "Sydney and Casey with their whole wedding party, arms raised, in front of a dark-timbered building",
      position: "52% 55%",
      caption: "Everyone together, in front of the Lodge.",
    },
    plates: [
      {
        src: "/images/weddings/sydney-casey/04.jpg",
        alt: "Bridesmaids in pink and cream embrace the bride in a warm cedar-walled room",
        position: "50% 40%",
        caption: "Getting ready.",
      },
      {
        src: "/images/weddings/sydney-casey/05.jpg",
        alt: "The bride, in a white shawl, laughs with a bridesmaid in pink on a wooden deck",
        position: "50% 30%",
        caption: "On the deck, before the ceremony.",
      },
      {
        src: "/images/weddings/sydney-casey/06.jpg",
        alt: "A couple exchange vows inside a ring of flower petals on the lawn",
        position: "45% 50%",
        caption: "Vows inside a ring of flower petals.",
      },
      {
        src: "/images/weddings/sydney-casey/02.jpg",
        alt: "Bridesmaids in every shade of pink stand together on the lawn",
        position: "50% 50%",
        caption: "Bridesmaids in every shade of pink.",
      },
      {
        src: "/images/weddings/sydney-casey/01.jpg",
        alt: "A couple at a long table set with candles and glasses, one arm raised",
        position: "50% 50%",
        caption: "Toasting at their table.",
      },
    ],
    images: [
      { src: "/images/weddings/sydney-casey/01.jpg", alt: "A couple at their table with candles and glasses" },
      { src: "/images/weddings/sydney-casey/02.jpg", alt: "Bridesmaids in pink on the lawn" },
      { src: "/images/weddings/sydney-casey/03.jpg", alt: "The whole wedding party with arms raised" },
      { src: "/images/weddings/sydney-casey/04.jpg", alt: "Getting ready in a cedar-walled room" },
      { src: "/images/weddings/sydney-casey/05.jpg", alt: "The bride and a bridesmaid on a deck" },
      { src: "/images/weddings/sydney-casey/06.jpg", alt: "Vows inside a ring of flower petals" },
    ],
  },
  {
    slug: "jen-ryan",
    names: "Jen & Ryan",
    status: "styled",
    coverImage: "/images/weddings/jen-ryan/01.jpg",
    // Embedded XMP photoshop:DateCreated is 2025-05-19 across all six files,
    // but the set is not confirmed as a real wedding, so the date is not shown.
    // Credited to Taylor Denton Photography (rdf:li creator + pic-time URL).
    date: "2025-05-19",
    photographer: {
      name: "Taylor Denton Photography",
      url: "http://taylordentonphotography.pic-time.com/www",
    },
    headline: "A coo in a flower crown, a table set in the ferns.",
    story: "A coo in a flower crown, a table set in the ferns, a kiss in the trees.",
    journal: [
      { src: "/images/weddings/jen-ryan/01.jpg", alt: "Two people in wedding clothes hold hands in front of a Highland cow wearing a crown of flowers", position: "45% 40%" },
      { src: "/images/weddings/jen-ryan/04.jpg", alt: "", position: "50% 50%" },
      { src: "/images/weddings/jen-ryan/03.jpg", alt: "", position: "50% 50%" },
    ],
    lead: {
      src: "/images/weddings/jen-ryan/01.jpg",
      alt: "Two people in wedding clothes hold hands in front of a Highland cow wearing a crown of flowers",
      position: "45% 50%",
      caption: "Hand in hand, beside one of the coos.",
    },
    plates: [
      {
        src: "/images/weddings/jen-ryan/02.jpg",
        alt: "Two people in wedding clothes cut a cake at a long wooden table among the trees",
        position: "50% 50%",
        caption: "The cake, on a long wooden table.",
      },
      {
        src: "/images/weddings/jen-ryan/03.jpg",
        alt: "Two people in wedding clothes kiss over a table set with moss and flowers",
        position: "50% 50%",
        caption: "A kiss at the table.",
      },
      {
        src: "/images/weddings/jen-ryan/04.jpg",
        alt: "A long wooden table set among ferns under string lights",
        position: "50% 50%",
        caption: "A table set in the ferns.",
      },
      {
        src: "/images/weddings/jen-ryan/05.jpg",
        alt: "Two people in wedding clothes stand small among tall mossy trees",
        position: "50% 55%",
        caption: "Among the tall trees.",
      },
      {
        src: "/images/weddings/jen-ryan/06.jpg",
        alt: "Two people in wedding clothes embrace on the lawn",
        position: "50% 40%",
        caption: "An embrace on the lawn.",
      },
    ],
    images: [
      { src: "/images/weddings/jen-ryan/01.jpg", alt: "Two people in wedding clothes hold hands in front of a Highland cow wearing a crown of flowers" },
      { src: "/images/weddings/jen-ryan/02.jpg", alt: "Cutting a cake at a long wooden table" },
      { src: "/images/weddings/jen-ryan/03.jpg", alt: "A kiss over a table set with moss and flowers" },
      { src: "/images/weddings/jen-ryan/04.jpg", alt: "A table set among ferns" },
      { src: "/images/weddings/jen-ryan/05.jpg", alt: "Two people among tall mossy trees" },
      { src: "/images/weddings/jen-ryan/06.jpg", alt: "An embrace on the lawn" },
    ],
  },
  {
    slug: "hannah-max",
    names: "Hannah & Max",
    status: "styled",
    coverImage: "/images/weddings/hannah-max/01.jpg",
    // Embedded XMP copyright credits "HAZEL EYE PHOTOGRAPHY" on 01.jpg/02.jpg.
    // No capture date is embedded. The invitation suite in 03/04 carries other
    // names, which is why this set is not shown as a named couple's wedding.
    photographer: { name: "Hazel Eye Photography" },
    headline: "A calf on a halter, a picnic under the trees.",
    story: "A calf on a halter, a picnic under the trees, and a walk among the big trees.",
    journal: [
      { src: "/images/weddings/hannah-max/01.jpg", alt: "A couple kisses in the forest beside a Highland calf on a halter", position: "42% 45%" },
      { src: "/images/weddings/hannah-max/05.jpg", alt: "", position: "50% 50%" },
      { src: "/images/weddings/hannah-max/03.jpg", alt: "", position: "50% 50%" },
    ],
    // 01 is the homepage hero, so this page leads with 02, the set's other calf frame (RULINGS r4 #10).
    // Its caption is the one /contact already gives this photo (one caption per photo).
    lead: {
      src: "/images/weddings/hannah-max/02.jpg",
      alt: "Two people in wedding clothes kiss at the foot of a mossy tree, a Highland calf on a halter in the ferns in front of them",
      position: "50% 98%",
      caption: "A couple and a calf among the mossy trees.",
    },
    plates: [
      {
        src: "/images/weddings/hannah-max/01.jpg",
        alt: "A couple kisses in the forest beside a Highland calf on a halter",
        position: "42% 45%",
        // The homepage caption for this photo (one caption per photo).
        caption: "An honorary guest, in the forest.",
      },
      {
        src: "/images/weddings/hannah-max/05.jpg",
        alt: "Two people in wedding clothes picnic on a blanket under the trees beside a bouquet",
        position: "35% 50%",
        caption: "A picnic under the trees.",
      },
      // 03 (the strawberry on the stationery card) and 04 (the invitation suite) are left out: faint names on the cards,
      // and a styled set never names a couple (RULINGS r4 #10, r2).
      {
        src: "/images/weddings/hannah-max/06.jpg",
        alt: "Two people in wedding clothes hold hands among enormous mossy tree trunks",
        position: "50% 66%",
        caption: "Hand in hand, under the big trees.",
      },
    ],
    images: [
      { src: "/images/weddings/hannah-max/01.jpg", alt: "A couple kisses beside a Highland calf on a halter" },
      { src: "/images/weddings/hannah-max/02.jpg", alt: "Two people kiss at the foot of a mossy tree, a Highland calf in front of them" },
      { src: "/images/weddings/hannah-max/03.jpg", alt: "A strawberry on a gilt frame" },
      { src: "/images/weddings/hannah-max/05.jpg", alt: "A picnic under the trees" },
      { src: "/images/weddings/hannah-max/06.jpg", alt: "Two people hold hands among enormous mossy tree trunks" },
    ],
  },
];

/** The offer line before "Check your date" on the portfolio and couple pages. */
export const PLANNING_OFFER =
  "Up to 125 guests, up to 20 of your people staying on the farm, and the coos for your portraits.";

/** What the page may print for a set: names only for confirmed weddings (CONSISTENCY, truth). */
export function isConfirmed(couple: WeddingCouple): boolean {
  return couple.status === "confirmed";
}

/** "Riley & Jordan", or "Photographed by Taylor Denton Photography" for a set not confirmed as a wedding. */
export function displayName(couple: WeddingCouple): string {
  if (isConfirmed(couple)) return couple.names;
  return couple.photographer ? `Photographed by ${couple.photographer.name}` : "Photographed at the farm";
}

/** The confirmed couples, in journal order. */
export const confirmedCouples: WeddingCouple[] = weddingPortfolio.filter(isConfirmed);

/** "June 28, 2025" from a verified YYYY-MM-DD date. */
export function formatWeddingDate(date: string, weekday = false): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    ...(weekday ? { weekday: "long" } : {}),
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Derives a season label from a verified `date`, never a guess. */
export function seasonFromDate(date?: string): string | undefined {
  if (!date) return undefined;
  const month = Number(date.slice(5, 7));
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}
