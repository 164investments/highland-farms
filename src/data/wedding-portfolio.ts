export interface WeddingPhotographer {
  /** Studio/photographer name as credited in the delivered image metadata. */
  name: string;
  /** Photographer's own gallery/portfolio URL, when the image metadata carries one. */
  url?: string;
}

export interface WeddingVendor {
  /** e.g. "Florist", "Caterer", "Coordinator" — left empty until confirmed. */
  role: string;
  name: string;
  url?: string;
}

export interface WeddingCouple {
  slug: string;
  names: string;
  coverImage: string;
  images: { src: string; alt: string }[];
  /**
   * Wedding date (YYYY-MM-DD), read from the embedded XMP capture date on the
   * delivered gallery photos (photoshop:DateCreated / xmp:CreateDate) — not
   * estimated. Only set when that field is present in the files themselves.
   * Undefined means the source files carry no capture date; do NOT guess one.
   */
  date?: string;
  /**
   * Photographer credit, read from embedded XMP copyright/creator/artist
   * fields on the delivered gallery photos. Undefined means no credit is
   * embedded in the files; do NOT invent one.
   */
  photographer?: WeddingPhotographer;
  /**
   * Guest count for the day. No source in this repo (not in image metadata,
   * page copy, or reviews) — intentionally left unset on every couple below.
   * Needs Hayden to supply real numbers.
   */
  guestCount?: number;
  /**
   * Named vendors beyond photography (florist, caterer, coordinator, DJ,
   * etc). No source in this repo for any couple — intentionally left unset.
   * Needs Hayden to supply real vendor names/credits.
   */
  vendors?: WeddingVendor[];
}

export const weddingPortfolio: WeddingCouple[] = [
  {
    slug: "hannah-max",
    names: "Hannah & Max",
    coverImage: "/images/weddings/hannah-max/01.jpg",
    // Embedded XMP copyright credits "HAZEL EYE PHOTOGRAPHY" on 01.jpg/02.jpg.
    // No capture date is embedded in any of these six files (only a
    // Lightroom export/MetadataDate, which is not a reliable proxy for the
    // wedding date — see MetadataDate note in [slug]/page.tsx).
    photographer: { name: "Hazel Eye Photography" },
    images: [
      { src: "/images/weddings/hannah-max/01.jpg", alt: "Hannah & Max — ceremony in the forest" },
      { src: "/images/weddings/hannah-max/02.jpg", alt: "Hannah & Max — first look" },
      { src: "/images/weddings/hannah-max/03.jpg", alt: "Hannah & Max — bride portrait" },
      { src: "/images/weddings/hannah-max/04.jpg", alt: "Hannah & Max — couple portrait" },
      { src: "/images/weddings/hannah-max/05.jpg", alt: "Hannah & Max — ceremony details" },
      { src: "/images/weddings/hannah-max/06.jpg", alt: "Hannah & Max — wedding party" },
    ],
  },
  {
    slug: "jen-ryan",
    names: "Jen & Ryan",
    coverImage: "/images/weddings/jen-ryan/01.jpg",
    // Embedded XMP photoshop:DateCreated is 2025-05-19 across all six files.
    // Credited to Taylor Denton Photography (rdf:li creator + pic-time URL).
    date: "2025-05-19",
    photographer: {
      name: "Taylor Denton Photography",
      url: "http://taylordentonphotography.pic-time.com/www",
    },
    images: [
      { src: "/images/weddings/jen-ryan/01.jpg", alt: "Jen & Ryan — couple portrait" },
      { src: "/images/weddings/jen-ryan/02.jpg", alt: "Jen & Ryan — reception" },
      { src: "/images/weddings/jen-ryan/03.jpg", alt: "Jen & Ryan — ceremony" },
      { src: "/images/weddings/jen-ryan/04.jpg", alt: "Jen & Ryan — Highland Cow photo op" },
      { src: "/images/weddings/jen-ryan/05.jpg", alt: "Jen & Ryan — forest portraits" },
      { src: "/images/weddings/jen-ryan/06.jpg", alt: "Jen & Ryan — celebration" },
    ],
  },
  {
    slug: "sydney-casey",
    names: "Sydney & Casey",
    coverImage: "/images/weddings/sydney-casey/01.jpg",
    // Embedded XMP photoshop:DateCreated is 2025-04-25 across all six files.
    // No photographer credit is embedded (Lightroom develop-preset data only).
    date: "2025-04-25",
    images: [
      { src: "/images/weddings/sydney-casey/01.jpg", alt: "Sydney & Casey — ceremony" },
      { src: "/images/weddings/sydney-casey/02.jpg", alt: "Sydney & Casey — first dance" },
      { src: "/images/weddings/sydney-casey/03.jpg", alt: "Sydney & Casey — reception" },
      { src: "/images/weddings/sydney-casey/04.jpg", alt: "Sydney & Casey — couple portrait" },
      { src: "/images/weddings/sydney-casey/05.jpg", alt: "Sydney & Casey — forest setting" },
      { src: "/images/weddings/sydney-casey/06.jpg", alt: "Sydney & Casey — celebration" },
    ],
  },
  {
    slug: "riley-jordan",
    names: "Riley & Jordan",
    coverImage: "/images/weddings/riley-jordan/01.jpg",
    // Embedded XMP photoshop:DateCreated is 2025-06-28 across all six files.
    // No photographer credit is embedded (Lightroom develop-preset data only).
    date: "2025-06-28",
    images: [
      { src: "/images/weddings/riley-jordan/01.jpg", alt: "Riley & Jordan — ceremony" },
      { src: "/images/weddings/riley-jordan/02.jpg", alt: "Riley & Jordan — couple portrait" },
      { src: "/images/weddings/riley-jordan/03.jpg", alt: "Riley & Jordan — bridal party" },
      { src: "/images/weddings/riley-jordan/04.jpg", alt: "Riley & Jordan — reception" },
      { src: "/images/weddings/riley-jordan/05.jpg", alt: "Riley & Jordan — forest ceremony" },
      { src: "/images/weddings/riley-jordan/06.jpg", alt: "Riley & Jordan — celebration" },
    ],
  },
  {
    slug: "maya-justin",
    names: "Maya & Justin",
    coverImage: "/images/weddings/maya-justin/01.jpg",
    // Embedded XMP photoshop:DateCreated is 2025-09-06 across all six files.
    // Credited to Kate Holt Photography (rdf:li creator + pic-time URL).
    date: "2025-09-06",
    photographer: {
      name: "Kate Holt Photography",
      url: "http://kateholtphotography.pic-time.com/www",
    },
    images: [
      { src: "/images/weddings/maya-justin/01.jpg", alt: "Maya & Justin — ceremony" },
      { src: "/images/weddings/maya-justin/02.jpg", alt: "Maya & Justin — couple portrait" },
      { src: "/images/weddings/maya-justin/03.jpg", alt: "Maya & Justin — first look" },
      { src: "/images/weddings/maya-justin/04.jpg", alt: "Maya & Justin — forest portraits" },
      { src: "/images/weddings/maya-justin/05.jpg", alt: "Maya & Justin — details" },
      { src: "/images/weddings/maya-justin/06.jpg", alt: "Maya & Justin — reception" },
    ],
  },
  {
    slug: "olivia-connor",
    names: "Olivia & Connor",
    coverImage: "/images/weddings/olivia-connor/06.jpg",
    // Embedded XMP DateCreated is 2025-07-26 across the five files that carry
    // it (02.jpg has none). Credited to Mercedes Lou Photography (rdf:li
    // creator + pic-time URL).
    date: "2025-07-26",
    photographer: {
      name: "Mercedes Lou Photography",
      url: "http://mercedeslouphotography.pic-time.com/www",
    },
    images: [
      { src: "/images/weddings/olivia-connor/01.jpg", alt: "Olivia & Connor — couple portrait" },
      { src: "/images/weddings/olivia-connor/02.jpg", alt: "Olivia & Connor — ceremony" },
      { src: "/images/weddings/olivia-connor/03.jpg", alt: "Olivia & Connor — first dance" },
      { src: "/images/weddings/olivia-connor/04.jpg", alt: "Olivia & Connor — forest setting" },
      { src: "/images/weddings/olivia-connor/05.jpg", alt: "Olivia & Connor — celebration" },
      { src: "/images/weddings/olivia-connor/06.jpg", alt: "Olivia & Connor — details" },
    ],
  },
];

/** Derives a season label from a verified `date` — never a guess. */
export function seasonFromDate(date?: string): string | undefined {
  if (!date) return undefined;
  const month = Number(date.slice(5, 7));
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}
