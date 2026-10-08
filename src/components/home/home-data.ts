/**
 * "Visiting for the day?" doors on the homepage first screen. Phones: a row of three names under the
 * hero. Desktop: three doors (photo, name, price) at the foot of the text column. `fact` keys into
 * visitFacts() in HomeVisitIndex, so the prices come from the booking data.
 */
export const VISIT_LINKS = [
  {
    href: "/farm-tours",
    name: "Farm tour",
    phoneName: "Farm tour",
    fact: "tour",
    thumb: { src: "/images/farm/farm-visit.jpg", position: "object-[40%_88%]" },
  },
  {
    href: "/nordic-spa",
    name: "Nordic spa",
    phoneName: "Nordic spa",
    fact: "spa",
    thumb: { src: "/images/spa/spa-exterior-plunge-moss.jpg", position: "object-[50%_50%]" },
  },
  {
    href: "/stay",
    name: "Farm stays",
    phoneName: "Stays",
    fact: "stays",
    thumb: { src: "/images/properties/lodge.jpg", position: "object-[50%_55%]" },
  },
] as const;

/** The form intro the weddings page also uses (one wording on both pages). */
export const WEDDING_FORM_INTRO =
  "Tell us your month and guest count, and we’ll check the farm calendar for you. No commitment.";

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** 4 -> "Four" (falls back to the numeral past ten). */
export function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}
