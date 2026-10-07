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
export const STAY_MINIMUM = "Friday to Sunday stays have a two-night minimum.";

export const STAY_PRICE_PLAIN =
  "Rates change with the season, so we don't list a nightly price. Pick your dates on any stay and the calendar shows one total before taxes: the nightly rate for your nights, the cleaning fee and the service fee.";

export const STAY_PRICE_CARD_LEAD = "The full price, before you pay:";
export const STAY_PRICE_CARD =
  "one total before taxes, made of the nightly rate for your nights, the cleaning fee and the service fee. Rates change with the season.";

export const STAY_DIRECT_LINE =
  "Book direct with the farm. You see the full total, cleaning included, before you reserve.";

export const STAY_PETS =
  "No outside pets. Service animals are permitted in accordance with ADA requirements.";

/** The one published stay-cancellation sentence (llms.txt, live site). Pending the exact terms from Jalene. */
export const STAY_CANCELLATION =
  "Cancellation terms vary by property and booking date, and are provided at the time of booking.";

export const STAY_DRIVE = "About an hour from Portland and about 25 minutes from Government Camp";
export const STAY_GETTING_HERE_FARM = `${STAY_DRIVE}, with free parking on the farm.`;
export const STAY_GETTING_HERE_PAGE = `${STAY_DRIVE}, at ${CONTACT.fullAddress}.`;
export const STAY_PARKING = "Free, on the farm.";

export const STAY_LATER_MONTHS_NOTE =
  "Tours and spa are booked separately from your stay, and their calendars open about three to four months ahead.";

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

export const THANKSGIVING_DATES = thanksgiving.dates;
const NIGHTS_WORD = ["zero", "one", "two", "three", "four", "five"][thanksgiving.nights] ?? String(thanksgiving.nights);
/** "Four nights" / "four nights" (4 in thanksgiving.ts: November 24 to 28). */
export const THANKSGIVING_NIGHTS = { cap: `${NIGHTS_WORD[0].toUpperCase()}${NIGHTS_WORD.slice(1)} nights`, lower: `${NIGHTS_WORD} nights` };
