import type { FAQItem } from "@/lib/types";
import { CONTACT } from "@/lib/constants";

/** Spa price per person (Acuity type 85942611 and BOOKING_PRODUCTS["nordic-spa"]). */
export const SPA_PRICE_PER_PERSON = 75;
export const SPA_MAX_PARTY = 6;
/** All six spots: a private session (ops fact 10; 6 x $75, no discount). */
export const SPA_PRIVATE_PRICE = SPA_PRICE_PER_PERSON * SPA_MAX_PARTY;

/**
 * "Weekend sessions go first." 12-month Acuity check, type 85942611,
 * appointments 2025-10-06 to 2026-10-05: 729 guest bookings, weekend share 48%,
 * weekend slots that filled did so a median 20 d ahead vs 3.1 d Mon-Thu
 * (DATA-BRIEF 3b). Refresh monthly, or set to null to drop the line.
 */
export const SPA_WEEKEND: string | null = "Weekend sessions go first.";

/** Session start times (ops fact 18). */
export const SPA_SESSION_TIMES = "9, 11, 1, 3 and 5";

/**
 * The spot picker shared by the /nordic-spa and /sauna-near-portland booking blocks and hero.
 * Every price is the group's total (RULINGS #12). `quantity` prefills Acuity's Quantity field:
 * the scheduler reads `?quantity=N` into its first state and keeps it for class types, and it
 * disables any session with fewer open spots than N (checked on the live scheduler 2026-10-06).
 * The 3-to-5 row has no fixed count, so the guest sets it on the calendar.
 */
export const SPA_SPOT_ROWS = [
  { key: "1", label: "1 person", price: `$${SPA_PRICE_PER_PERSON}`, quantity: 1 },
  { key: "2", label: "2 people", price: `$${SPA_PRICE_PER_PERSON * 2}`, quantity: 2 },
  { key: "3to5", label: "3 to 5 people", price: `$${SPA_PRICE_PER_PERSON * 3} to $${SPA_PRICE_PER_PERSON * 5}` },
  {
    key: "6",
    label: "All six spots",
    price: `$${SPA_PRIVATE_PRICE}`,
    quantity: SPA_MAX_PARTY,
    tag: "A private session",
    tagExtra: "girls\u2019 day",
  },
] as const;

/** The spa calendar link with Acuity's Quantity field prefilled (see SPA_SPOT_ROWS). */
export function withSpaQuantity(href: string, quantity?: number, range?: string): string {
  if (!quantity && !range) return href;
  const url = new URL(href);
  if (quantity) url.searchParams.set("quantity", String(quantity));
  // A band with no fixed count ("3-5"): Acuity ignores the extra param; the booking wrapper names the band.
  if (range) url.searchParams.set("hf_range", range);
  return url.toString();
}

/**
 * Round 3 board: four entries, none repeating a row on the page. The
 * cancellation answer is one of the six identical copies; keep its exact
 * sentence. (Year-round, ages, bring, access and "with a farm tour" now live
 * in the ritual, "Know before you book" and the Highland Day block.)
 */
export const nordicSpaFAQ: FAQItem[] = [
  {
    question: "Staying with us on a date that isn\u2019t open yet?",
    answer: `Overnight guests can book further ahead by phone: call ${CONTACT.phone} and we\u2019ll book it for you.`,
  },
  {
    question: "Can I give a spa session as a gift?",
    answer: "Yes. Gift certificates for the Nordic spa are on our gift certificates page.",
  },
  {
    question: "I can't find my confirmation email.",
    answer: `Call ${CONTACT.phone} rather than waiting for a resend.`,
  },
  {
    question: "What is the cancellation policy?",
    answer:
      "Our cancellation policy is strict. All spa bookings are final: no refunds, no reschedules, no credits, and no transfers, including for no-shows. Please confirm your date, time, and guest count before you book. The only exception is if we cancel for severe weather or for the safety of our animals or guests, in which case we will refund or rebook you.",
  },
];
