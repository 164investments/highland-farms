/*
 * The guest quotes on /about, one per section (CONSISTENCY #2: a quote
 * appears on one page only). Pure: no imports besides the type, so a test can
 * load it directly. `role` is the visit type the review itself states.
 */
import type { QuoteSpec } from "../../lib/review-quotes";

export const ABOUT_HERO_QUOTE: QuoteSpec = {
  author: "A H",
  date: "2026-09-11",
  sentenceStartsWith: "Connor and his team were as good as it gets",
  topic: "Wedding",
};

export const ABOUT_ORIGIN_QUOTE: QuoteSpec = {
  author: "Johnna Wheeler",
  date: "2024-03-25",
  sentenceStartsWith: "Learning that the property",
  topic: "Stay",
};

/**
 * The herd row's quote: names no animal. The site never names individual animals (Jalene and AJ,
 * 2026-10-07): Highland Farms is a working farm moving toward farm-to-table, not a sanctuary.
 */
export const ABOUT_HERD_QUOTE: QuoteSpec = {
  author: "Amber Hall",
  date: "2026-03-29",
  sentenceStartsWith: "Getting to pet, brush, and spend time",
  topic: "Farm tour",
};

export const ABOUT_TEAM_QUOTE: QuoteSpec = {
  author: "Linda Ventura",
  date: "2026-02-16",
  sentenceStartsWith: "Ellery, AJ and Jace were",
  topic: "Farm tour",
};

export const ABOUT_QUOTES: readonly QuoteSpec[] = [
  ABOUT_HERO_QUOTE,
  ABOUT_ORIGIN_QUOTE,
  ABOUT_HERD_QUOTE,
  ABOUT_TEAM_QUOTE,
];
