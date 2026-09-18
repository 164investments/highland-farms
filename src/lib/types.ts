export interface Property {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  guests: number;
  bedrooms: number;
  baths: number;
  imageSrc: string;
  bookingUrl: string;
  hospitable_widget_url?: string;
  highlights: string[];
  /**
   * "The space" — how the bedrooms, baths and cooking actually lay out, for the
   * `/stay/<slug>` page. Sourced only from `guests`/`bedrooms`/`baths`, the
   * `highlights` above, and the gallery alt text already published on that
   * page. Never state a rate, a minimum stay, a check-in time, or an amenity
   * that isn't already in this file or on the page.
   */
  layout?: string;
  /** Who the accommodation fits, drawn from the same sources as `layout`. */
  bestFor?: string;
}

export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
  children?: NavItem[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  category: string;
  imageSrc: string;
  externalUrl: string;
  soldOut?: boolean;
}

export interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  imageSrc?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}
