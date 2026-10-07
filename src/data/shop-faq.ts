import type { FAQItem } from "@/lib/types";
import { DELIVERY_ZIPS } from "@/lib/shop/fulfillment";
import { CONTACT } from "@/lib/constants";

/**
 * Farm-store fulfillment FAQ, rendered on `/shop` and emitted as `FAQPage`
 * JSON-LD from the same array.
 *
 * ⛔ Every answer below is assembled from something the site already does or
 * already says: the ZIP list comes from `src/lib/shop/fulfillment.ts` (so it
 * can't drift from what checkout actually enforces), and the phone number from
 * `src/lib/constants.ts`. Do not add an answer here that no page, email or
 * module already commits the farm to.
 *
 * Five entries at most, and none repeating a row on the same page
 * (CONSISTENCY #5). /shop's "How your order reaches you" block already answers
 * pickup (steps I to III and the address), payment (step I), the delivery fee
 * and minimum (the Delivery row) and shipping ("We don't ship."), so those
 * questions are not asked again here (round 4). Never write "call or text", or
 * a ready time ("usually the same day"), until Connor confirms them.
 *
 * ⛔ NO RETURNS / REFUNDS ENTRY. `src/app/terms/page.tsx` publishes a
 * cancellation policy for farm tours and spa sessions and separate terms for
 * weddings and events, and nothing at all for shop merchandise. There is no
 * merchandise returns policy to describe, and writing one here would invent a
 * commitment, on perishable food no less. Hayden has to decide and publish an
 * actual policy first; only then can it be answered here.
 */

const zips = Array.from(DELIVERY_ZIPS).join(", ");

export const shopFAQ: FAQItem[] = [
  {
    question: "Which ZIP codes do you deliver to?",
    answer:
      `Local delivery covers the Mt. Hood corridor down through Sandy and Gresham ` +
      `into east Portland: ${zips}. Enter your ZIP at checkout and the site checks ` +
      "it before taking payment.",
  },
  {
    question: "What if my ZIP isn't on the list?",
    answer:
      "Checkout will not let the delivery go through, so choose free farm pickup, or " +
      `call ${CONTACT.phone} and we will work something out. We would rather ` +
      "you called than guessed at a ZIP we cover.",
  },
];
