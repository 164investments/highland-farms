import type { FAQItem } from "@/lib/types";
import { CONTACT } from "@/lib/constants";

/**
 * Group sizes and totals ($75 a guest, as Acuity prices each "Private Tour
 * for N"). Two is flagged most popular: 85% of tour bookings are parties of
 * two (see BOOKING_LINKS.farmTourForTwo).
 */
export const TOUR_PARTY_SIZES = [
  { guests: 2, total: 150, popular: true },
  { guests: 3, total: 225, popular: false },
  { guests: 4, total: 300, popular: false },
  { guests: 5, total: 375, popular: false },
  { guests: 6, total: 450, popular: false },
] as const;

/**
 * "The typical tour is booked about six weeks ahead" (median lead 40.6 days,
 * tours created 2026-07-08 to 2026-10-05, DATA-BRIEF 3a). A dated figure:
 * refresh monthly from the Acuity script, or set to null to hide the clause.
 */
export const TOUR_LEAD_TIME: string | null = "about six weeks";

/** Tour start times (ops fact 17). */
export const TOUR_TIMES = "10, 12, 2 and 4";

/**
 * Round 3 board: five entries, none repeating a row on the page (children,
 * access, wear, parking, cost, length and animals live in "Know before you
 * book" and the hour). The cancellation answer is one of the six identical
 * copies; keep its exact sentence.
 */
export const farmTourFAQ: FAQItem[] = [
  {
    question: "Can we bring more than six?",
    answer: `Each private tour is for 2 to 6 guests. For a larger group, email ${CONTACT.emailAlt} to arrange it.`,
  },
  {
    question: "Can I add guests after I book?",
    answer: `Yes, by phone: call ${CONTACT.phone}. Guests can't be added online once you've booked.`,
  },
  {
    question: "Staying with us on a date that isn\u2019t open yet?",
    answer: `Overnight guests can book further ahead by phone: call ${CONTACT.phone} and we\u2019ll book it for you.`,
  },
  {
    question: "I can't find my confirmation email.",
    answer: `Call ${CONTACT.phone} rather than waiting for a resend.`,
  },
  {
    question: "What is the cancellation policy?",
    answer:
      "Our cancellation policy is strict. All farm tour bookings are final: no refunds, no reschedules, no credits, and no transfers, including for no-shows. Please confirm your date, time, and guest count before you book. The only exception is if we cancel for severe weather or for the safety of our animals or guests, in which case we will refund or rebook you.",
  },
];
