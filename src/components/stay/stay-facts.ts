import { CONTACT } from "@/lib/constants";
import { TOUR_PARTY_SIZES } from "@/data/farm-tours";
import { thanksgiving } from "@/data/thanksgiving";

/**
 * Facts that are true of every stay, kept in one place so /stay and the four
 * /stay/[slug] pages cannot drift.
 *
 * Sourcing: the two-night minimum is Hayden's ops fact (2026-07-24 #27); the
 * pet line is the terms page wording; drive times and acreage are the ones
 * already in public/llms.txt; the address is CONTACT.fullAddress. There is no
 * nightly rate here: rates change with the season (ops #26, D17) and the
 * Hospitable calendar shows the total, cleaning included, before Reserve.
 */
export const STAY_MINIMUM =
  "The Lodge, the Cottage and the Whole Farm have a two-night minimum on Friday to Sunday stays.";

/**
 * The same rule in one stay's booking card. The Camp's live calendar takes
 * one-night stays on any day (r5 truth check), so the Camp shows no minimum.
 */
export function stayMinimumFor(slug: string): string | null {
  return slug === "camp" ? null : "Friday to Sunday stays have a two-night minimum.";
}

export const STAY_PRICE_PLAIN =
  "Rates change with the season, so we don't list a nightly price. Pick your dates on any stay and the calendar shows one total before taxes: the nightly rate for your nights, the cleaning fee and the service fee.";

export const STAY_PRICE_CARD_LEAD = "The full price, before you pay:";
export const STAY_PRICE_CARD =
  "one total before taxes, made of the nightly rate for your nights, the cleaning fee and the service fee. Rates change with the season.";

export const STAY_DIRECT_LINE =
  "Book direct with the farm. You see the full total, cleaning included, before you reserve.";

export const STAY_PETS =
  "No outside pets. Service animals are permitted in accordance with ADA requirements.";

/**
 * The interim stay-cancellation sentence, pending the exact terms from Jalene.
 * The Terms page says terms "vary by property and booking date"; ops fact #30
 * says stays are final sale. This is the part true under both (truth r3).
 */
export const STAY_CANCELLATION = "Cancellation terms are provided at the time of booking.";

/** Said beside the cancellation line, so an anxious booker has a person to ask. */
export const STAY_QUESTIONS_LEAD = "Questions before you book? Call";

/**
 * Under every booking calendar; the arrow is the Hospitable widget's month
 * control. No booking-window promise: the live calendars open later months in
 * their own time (r5: nothing open after April 2027, the Camp after November 2026).
 */
export const STAY_CALENDAR_NOTE = "Tap the arrow for later months. If your date isn't open yet, call and ask.";

export const STAY_DRIVE = "About an hour from Portland and about 25 minutes from Government Camp";
/** "Getting here", identical on /stay and every /stay/[slug] (CONSISTENCY #2). */
export const STAY_GETTING_HERE = `${STAY_DRIVE}, at ${CONTACT.fullAddress}, with free parking on the farm.`;

export const STAY_LATER_MONTHS_NOTE =
  "Tours and spa are booked separately from your stay, and their calendars open about three to four months ahead.";
/** Said after STAY_LATER_MONTHS_NOTE, around the phone link: "... Call (971) 236-2551 and we'll book them for you." */
export const STAY_LATER_STAY_LEAD = "Staying with us on a later date? Call";
export const STAY_LATER_STAY_TAIL = "and we'll book them for you.";

/** Tour: $150 for two, $75 for each additional guest (from TOUR_PARTY_SIZES). */
export const TOUR_FOR_TWO = TOUR_PARTY_SIZES[0].total;
export const TOUR_EACH_ADDITIONAL = TOUR_PARTY_SIZES[1].total - TOUR_PARTY_SIZES[0].total;
/** Spa: $75 per person; all six spots as a private session (Hayden's D2). */
export const SPA_PER_PERSON = 75;
export const SPA_PRIVATE_SESSION = SPA_PER_PERSON * 6;

export const PHONE_TEL = `tel:+1${CONTACT.phone.replace(/\D/g, "")}`;

/** The two Thanksgiving packages as the stay pages show them (data-bound to thanksgiving.ts). */
export function thanksgivingPackage(id: "lodge" | "whole-farm") {
  const pkg = thanksgiving.packages.find((p) => p.id === id)!;
  return {
    name: pkg.name,
    guests: pkg.guests,
    price: pkg.price,
    priceLabel: `$${pkg.price.toLocaleString("en-US")}`,
  };
}

/** "November 24 to 28, 2026": the site's phrasing (CONSISTENCY #2), not the data file's en dash. */
export const THANKSGIVING_DATES = thanksgiving.dates.replace(/(\d+)\s*[–-]\s*(\d+)/, "$1 to $2");
const NIGHTS_WORD = ["zero", "one", "two", "three", "four", "five"][thanksgiving.nights] ?? String(thanksgiving.nights);
/** "Four nights" / "four nights" (4 in thanksgiving.ts: November 24 to 28). */
export const THANKSGIVING_NIGHTS = { cap: `${NIGHTS_WORD[0].toUpperCase()}${NIGHTS_WORD.slice(1)} nights`, lower: `${NIGHTS_WORD} nights` };
