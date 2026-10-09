import { markCartRecovered } from "@/lib/shop/orders";
import { sendOrderEmails } from "@/lib/shop/order-email";
import { adjustInventory, getInventorySnapshots } from "@/lib/shop/square";
import { syncSquareInventoryCounts } from "@/lib/shop/inventory";
import { sendBookingEmails, type BookingEmailData } from "@/lib/booking/confirmation-email";
import { sendGiftEmails } from "@/lib/booking/gift-email";
import { setBookingCalendarInfo } from "@/lib/booking/store";
import { createWeddingCallEvent, isCalendarConfigured } from "@/lib/booking/google-calendar";
import { BOOKING_PRODUCTS } from "@/lib/booking/products";
import { claimTrackingEvent } from "@/lib/tracking-dedupe";
import { sendBookingPurchase } from "@/lib/ga4";
import { sendMetaPurchase } from "@/lib/meta";
import { freezeEffectsData, markSquareSynced, type StripeAttempt } from "./store";
import type { ShopSnapshot, BookingSnapshot, GiftSnapshot } from "./prepare";

/** Independent effects all run, then the caller can retain the retry marker on failure. */
async function finishAll(work: Promise<unknown>[]): Promise<void> {
  const results = await Promise.allSettled(work);
  const errors = results.filter((r): r is PromiseRejectedResult => r.status === "rejected").map((r) => r.reason);
  if (errors.length) throw new AggregateError(errors, "Paid checkout downstream effects need retrying");
}

async function syncPaidShopInventory(attempt: StripeAttempt, snapshot: ShopSnapshot): Promise<void> {
  let adjustmentTime: number | null = null;
  if (!attempt.square_synced_at) {
    if (snapshot.squareLines.length) {
      // Freeze the first submission time before any outbound request. Dating this
      // at reservation time lets a physical recount during hosted checkout erase
      // the later sale. The canonical payload survives stale/concurrent workers
      // and unknown network outcomes, keeping Square's idempotency key reusable.
      const data = await freezeEffectsData(attempt.id, {
        squareInventoryOccurredAt: new Date(Date.now() - 1000).toISOString(),
      });
      const occurredAt = data.squareInventoryOccurredAt;
      const age = typeof occurredAt === "string" ? Date.now() - Date.parse(occurredAt) : NaN;
      // Square rejects newly submitted adjustments older than 24 hours. Never
      // re-date an unknown outcome with the same key, clear its hold, or invent a
      // count: retain this attempt for explicit inventory reconciliation instead.
      if (!Number.isFinite(age) || age < 0 || age >= 86400000) {
        console.error("[stripe] Square stock needs manual reconciliation; retain reservation and inspect the idempotent adjustment", attempt.id);
        throw new Error("Square inventory adjustment needs manual reconciliation; reservation retained (24-hour timestamp limit)");
      }
      await adjustInventory(snapshot.squareLines, `stripe-${attempt.id}`, {
        strict: true,
        occurredAt: occurredAt as string,
      });
      adjustmentTime = Date.parse(occurredAt as string);
    }
  }
  // Validate all canonical source timestamps before clearing the paid hold.
  // A response predating our adjustment is not proof it reached current stock.
  const counts = await getInventorySnapshots(snapshot.squareLines.map((line) => line.squareVariationId), true);
  if (adjustmentTime !== null && [...counts.values()].some((count) => Date.parse(count.calculatedAt!) < adjustmentTime)) {
    throw new Error("Square inventory has not reflected the paid adjustment; reservation retained");
  }
  if (!attempt.square_synced_at) await markSquareSynced(attempt.id);
  // Same-source-stamp RPCs recompute current holds after clearing this one.
  // A newer concurrent snapshot wins; a later retry safely refreshes again.
  await syncSquareInventoryCounts(counts);
}

async function bookingEmailData(attempt: StripeAttempt, snapshot: BookingSnapshot): Promise<BookingEmailData> {
  const existing = snapshot.effectsData;
  if (existing) return existing as BookingEmailData;
  const emailData: BookingEmailData = {
    ...snapshot.emailData,
    giftAppliedCents: attempt.gift_applied_cents,
    paidCents: attempt.due_cents,
  };
  if (snapshot.product === "wedding-call" && isCalendarConfigured()) {
    try {
      const firstLeg = snapshot.legs[0];
      const event = await createWeddingCallEvent({
        startIso: firstLeg.starts_at,
        durationMin: firstLeg.duration_min,
        guestEmail: snapshot.customer.email,
        guestName: emailData.customerName,
        locationChoice: snapshot.customer.location_choice ?? "in_person",
        bookingNumber: attempt.reference,
      });
      if (event) {
        await setBookingCalendarInfo(attempt.booking_ids[0], event.eventId, event.meetLink);
        emailData.meetLink = event.meetLink;
      }
    } catch (err) {
      // Preserve the existing best-effort calendar behavior and email follow-up flag.
      console.error("[stripe] wedding-call calendar step failed", attempt.reference, err);
    }
  }
  // Freeze before sends: later availability of a Meet link must not change the
  // payload associated with an email idempotency key after a partial delivery.
  return await freezeEffectsData(attempt.id, { ...emailData }) as unknown as BookingEmailData;
}

async function trackBooking(attempt: StripeAttempt, snapshot: BookingSnapshot): Promise<void> {
  const isConsult = snapshot.product === "wedding-call";
  if (attempt.due_cents === 0 && !isConsult) return;
  const fresh = await claimTrackingEvent(`native_${attempt.reference}`, "purchase", "native-booking");
  if (!fresh) return;
  const tracking = snapshot.tracking;
  // Cash collected only: gift revenue is counted when sold, never again at redemption.
  await sendBookingPurchase({
    transaction_id: attempt.reference,
    value: attempt.due_cents / 100,
    booking_type: snapshot.product.replace(/-/g, "_"),
    items: snapshot.legs.map((leg) => ({
      item_id: leg.product_slug,
      item_name: BOOKING_PRODUCTS[leg.product_slug].name,
      price: leg.amount_cents / 100,
      quantity: 1,
    })),
    referral_source: tracking.referralSource,
    attribution: tracking.attribution,
    client_id: tracking.clientId,
  });
  if (attempt.due_cents > 0) {
    await sendMetaPurchase({
      transaction_id: `native_${attempt.reference}`,
      value: attempt.due_cents / 100,
      content_name: snapshot.legs.map((leg) => leg.product_slug).join("+"),
      content_category: "booking",
      email: snapshot.customer.email,
      phone: snapshot.customer.phone,
      fbc: tracking.fbc,
      fbp: tracking.fbp,
      referral_source: tracking.referralSource,
    });
  }
}

/** Call only after the paid transaction has atomically finalized all domain records. */
export async function sendCheckoutEffects(attempt: StripeAttempt): Promise<void> {
  if (attempt.status !== "paid") throw new Error("Checkout effects require a finalized paid attempt");
  if (attempt.notified_at) return;
  const options = { strict: true, idempotencyKey: `stripe-${attempt.id}` };
  if (attempt.kind === "shop") {
    const snapshot = attempt.snapshot as ShopSnapshot;
    await finishAll([
      markCartRecovered(snapshot.emailData.customerEmail, true),
      syncPaidShopInventory(attempt, snapshot),
      sendOrderEmails(snapshot.emailData, options),
    ]);
  } else if (attempt.kind === "booking") {
    const snapshot = attempt.snapshot as BookingSnapshot;
    const emailData = await bookingEmailData(attempt, snapshot);
    await finishAll([
      sendBookingEmails(emailData, { ...options, timestamp: attempt.created_at }),
      trackBooking(attempt, snapshot),
    ]);
  } else {
    const snapshot = attempt.snapshot as GiftSnapshot;
    await sendGiftEmails({
      code: snapshot.code,
      product: snapshot.product,
      purchaserName: snapshot.purchaserName,
      purchaserEmail: snapshot.purchaserEmail,
      recipientEmail: snapshot.recipientEmail,
      message: snapshot.message,
      expiresAt: typeof attempt.result?.expiresAt === "string" ? attempt.result.expiresAt : null,
    }, options);
  }
}
