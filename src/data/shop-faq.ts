import type { FAQItem } from "@/lib/types";
import {
  DELIVERY_FEE_CENTS,
  DELIVERY_MINIMUM_CENTS,
  DELIVERY_ZIPS,
  PICKUP_LOCATION,
} from "@/lib/shop/fulfillment";
import { CONTACT } from "@/lib/constants";

/**
 * Farm-store fulfillment FAQ, rendered on `/shop` and emitted as `FAQPage`
 * JSON-LD from the same array.
 *
 * ⛔ Every answer below is assembled from something the site already does or
 * already says — the fee, ZIP list and delivery minimum come from
 * `src/lib/shop/fulfillment.ts` (so they can't drift from what checkout
 * actually enforces), the pickup mechanics from the copy already shown at
 * checkout and on the order-confirmation page, and the phone number from
 * `src/lib/constants.ts`. Do not add an answer here that no page, email or
 * module already commits the farm to.
 *
 * Five entries at most (CONSISTENCY #5). "How do I get my order?" and "Does
 * Highland Farms ship?" are answered by the "How your order reaches you" block
 * above this list on /shop ("We don't ship."), so they are not repeated here.
 * Never write "call or text", or a ready time ("usually the same day"), until
 * Connor confirms them.
 *
 * ⛔ NO RETURNS / REFUNDS ENTRY. `src/app/terms/page.tsx` publishes a
 * cancellation policy for farm tours and spa sessions and separate terms for
 * weddings and events, and nothing at all for shop merchandise. There is no
 * merchandise returns policy to describe, and writing one here would invent a
 * commitment — on perishable food, no less. Hayden has to decide and publish an
 * actual policy first; only then can it be answered here.
 */

const fee = `$${(DELIVERY_FEE_CENTS / 100).toFixed(0)}`;
const minimum = `$${(DELIVERY_MINIMUM_CENTS / 100).toFixed(0)}`;
const zips = Array.from(DELIVERY_ZIPS).join(", ");

export const shopFAQ: FAQItem[] = [
  {
    question: "Where and how does farm pickup work?",
    answer:
      `Pickup is free, at ${PICKUP_LOCATION.address}. Order and pay on this site, ` +
      "and we call you when your order is packed. A receipt is emailed to you at " +
      `checkout. Questions about a pickup: call ${CONTACT.phone}.`,
  },
  {
    question: "Which ZIP codes do you deliver to?",
    answer:
      `Local delivery covers the Mt. Hood corridor down through Sandy and Gresham ` +
      `into east Portland: ${zips}. Enter your ZIP at checkout and the site checks ` +
      "it before taking payment.",
  },
  {
    question: "How much is delivery, and is there a minimum?",
    answer:
      `Local delivery is a flat ${fee}, and the order subtotal has to reach ${minimum} ` +
      "before we can deliver it. Below that, pick the order up at the farm instead. " +
      "Pickup is free and has no minimum.",
  },
  {
    question: "What if my ZIP isn't on the list?",
    answer:
      "Checkout will not let the delivery go through, so choose free farm pickup, or " +
      `call ${CONTACT.phone} and we will work something out. We would rather ` +
      "you called than guessed at a ZIP we cover.",
  },
  {
    question: "How do I pay?",
    answer:
      "Orders are placed and paid for here on the site, at checkout, before you " +
      "pick the order up or we deliver it. The farm store is separate from farm " +
      "tour, Nordic spa and gift certificate bookings, which are booked and paid " +
      "for through their own booking pages.",
  },
];
