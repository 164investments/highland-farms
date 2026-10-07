/** "Visiting for the day?" strip under the homepage first screen. */
export const VISIT_LINKS = [
  { href: "/farm-tours", name: "Farm tour", phoneName: "Farm tour", note: "Hug the cows" },
  { href: "/nordic-spa", name: "Nordic spa", phoneName: "Nordic spa", note: "Rain or shine" },
  { href: "/stay", name: "Farm stays", phoneName: "Stays", note: "Sleeps 4 to 20" },
] as const;

/** The form intro the weddings page also uses (one wording on both pages). */
export const WEDDING_FORM_INTRO =
  "Tell us your month and guest count, and we’ll check the farm calendar for you. No commitment.";

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** 4 -> "Four" (falls back to the numeral past ten). */
export function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}
