import type { FAQItem } from "@/lib/types";

/*
 * The /weddings FAQ (round 3 board): five entries, none repeating a hero row.
 * The page renders rain with its quote (the one row open by default); FAQPage
 * JSON-LD is built from `weddingFAQ`, whose answers are the same words as plain text.
 * "For the wedding itself there is a three-stall restroom trailer." is held
 * back in the page (PendingSlot, C2) and so is left out of the JSON-LD too.
 */

export const RAIN_LEAD =
  "When it rained on one couple's wedding day, the team moved the reception into the barn. A guest wrote:";
export const RAIN_CLOSE =
  "Your rain plan depends on your guest count, so Connor walks through it with you on your call.";
export const COST_ANSWER =
  "Two-night weddings from $13,000. 12-hour weekday weddings from $6,500. The total depends on your date, your guest count and how many nights you stay. Connor goes through it on your free call.";
export const VENDORS_ANSWER =
  "Yes. Couples here bring their own caterer and photographer. Connor works with your vendors on setup.";
export const RESTROOMS_ANSWER =
  "Your overnight guests have the bathrooms in the Lodge, the Cottage and the Camp. For the full guest list, Connor goes through it on your call.";
export const GETTING_HERE_ANSWER =
  "Highland Farms is in Brightwood, Oregon, about 25 minutes from Government Camp. Parking is on gravel, the farm is forest with some uneven ground, and there is a fair bit of walking. If someone in your group has trouble walking, ask Connor about it on your call before you book.";

export const weddingFAQ: FAQItem[] = [
  { question: "What if it rains?", answer: `${RAIN_LEAD.replace(/ A guest wrote:$/, "")} ${RAIN_CLOSE}` },
  { question: "What does a wedding cost?", answer: COST_ANSWER },
  { question: "Can we bring our own vendors?", answer: VENDORS_ANSWER },
  { question: "What about restrooms?", answer: RESTROOMS_ANSWER },
  { question: "Getting here, and getting around", answer: GETTING_HERE_ANSWER },
];
