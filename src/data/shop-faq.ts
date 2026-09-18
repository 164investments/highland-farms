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
    question: "How do I get my farm store order?",
    answer:
      `Two ways: free pickup at the farm in Brightwood, or local delivery for ${fee}. ` +
      "You choose which at checkout. Highland Farms does not ship — there is no " +
      "mail or courier option at any price.",
  },
  {
    question: "Does Highland Farms ship?",
    answer:
      "No. The farm store does not ship anywhere, including elsewhere in Oregon. " +
      "Orders are either picked up at the farm or delivered locally by us, so " +
      "everything we sell stays within the Mt. Hood corridor and the east " +
      "Portland metro.",
  },
  {
    question: "Where and how does farm pickup work?",
    answer:
      `Pickup is free, at ${PICKUP_LOCATION.address}. Order and pay on this site, ` +
      "and we will call you when your order is packed and ready — usually the same " +
      `day. A receipt is emailed to you at checkout. Questions about a pickup: call ` +
      `or text ${CONTACT.phone}.`,
  },
  {
    question: "Which ZIP codes do you deliver to?",
    answer:
      `Local delivery covers the Mt. Hood corridor down through Sandy and Gresham ` +
      `into east Portland: ${zips}. Enter your ZIP at checkout and the site checks ` +
      "it before taking payment.",
  },
  {
    question: "How much is local delivery, and is there a minimum?",
    answer:
      `Local delivery is a flat ${fee}, and the order subtotal has to reach ${minimum} ` +
      "before we can deliver it. Below that, pick the order up at the farm instead — " +
      "pickup is free and has no minimum.",
  },
  {
    question: "What if my ZIP code isn't on the delivery list?",
    answer:
      "Checkout will not let the delivery go through, so choose free farm pickup, or " +
      `call us at ${CONTACT.phone} and we will work something out. We would rather ` +
      "you called than guessed at a ZIP we cover.",
  },
  {
    question: "How do I pay for a farm store order?",
    answer:
      "Orders are placed and paid for here on the site, at checkout, before you " +
      "pick the order up or we deliver it. The farm store is separate from farm " +
      "tour, Nordic spa and gift certificate bookings, which are booked and paid " +
      "for through their own booking pages.",
  },
];
