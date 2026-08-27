import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidToken, tokenFromRequest } from "@/lib/shop/admin-auth";
import {
  getBookingById, cancelBooking, cancelBookingGroup, restoreGiftCertificate,
  lookupGiftCertificate, auditBooking, type AdminBookingRow,
} from "@/lib/booking/store";
import { refundPayment } from "@/lib/shop/square";
import { sendCancelEmail } from "@/lib/booking/cancel-email";

/**
 * Farm-initiated cancel — STRICT policy: this route exists for weather,
 * animal/guest safety, and similar farm-side cancellations, never a
 * customer request (the booking policy is final-sale by design; see
 * `confirmation-email.ts`). Only ever cancels a `confirmed` booking.
 *
 * A combo (Full Farm Day) is two rows sharing `combo_group`, one shared
 * payment, and the gift stamp on the first leg only — cancelling one leg in
 * isolation would compute a refund against the OTHER leg's still-active
 * amount. So: if the target row has a `comboGroup`, the WHOLE group is
 * cancelled atomically as one operation (`cancelBookingGroup`), refunded as
 * one combined amount, restored as one gift credit, and emailed as one
 * message naming both legs. A single-leg booking is unaffected.
 *
 * Refund amount is `sum(amount_cents) - sum(gift_amount_cents)` across
 * whatever was actually cancelled — the cash portion actually charged to
 * the card, never the pre-gift total (a gift-covered booking has nothing to
 * refund on the card side; that's what restoring the certificate is for).
 */

export const dynamic = "force-dynamic";

const schema = z.object({
  id: z.string().uuid(),
  refund: z.boolean(),
  reason: z.string().trim().min(1).max(500),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Units to hand `restoreGiftCertificate`. Value certs store cents, so
 * `gift_amount_cents` restores directly. Visits certs store a visit count
 * instead — `redeem_gift_certificate` applies `least(remaining, requested)`,
 * so a near-empty pack can be PARTIALLY consumed, and restoring the leg's
 * full `partySize` would over-credit it. The units actually consumed are
 * derivable without a schema change: at redemption, `gift_amount_cents` was
 * stamped as `applied * (amount_cents / party_size)` on that same leg (see
 * the checkout route's `giftApplied` calculation), so dividing back out and
 * rounding recovers `applied`.
 */
function giftUnitsToRestore(kind: "value" | "visits", leg: AdminBookingRow): number {
  if (kind === "value") return leg.giftAmountCents;
  const perSeatCents = leg.amountCents / leg.partySize;
  return Math.round(leg.giftAmountCents / perSeatCents);
}

export async function POST(request: Request) {
  if (!isValidToken(tokenFromRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return bad("Invalid payload");
  const { id, refund, reason } = parsed.data;

  try {
    const target = await getBookingById(id);
    if (!target || target.status !== "confirmed") {
      return bad("Booking not found, or not currently confirmed.", 404);
    }

    let cancelled: AdminBookingRow[];
    if (target.comboGroup) {
      const group = await cancelBookingGroup(target.comboGroup);
      if (!group.ok) {
        return bad(
          "That booking's combo pair is already partly cancelled — check the calendar.",
          409,
        );
      }
      cancelled = group.bookings;
    } else {
      const single = await cancelBooking(id);
      if (!single.ok) {
        return bad("Booking not found, or not currently confirmed.", 404);
      }
      cancelled = [single.booking];
    }

    const bookingNumber = cancelled.map((b) => b.bookingNumber).join(" / ");
    const totalAmountCents = cancelled.reduce((sum, b) => sum + b.amountCents, 0);
    const totalGiftCents = cancelled.reduce((sum, b) => sum + b.giftAmountCents, 0);
    const paymentId = cancelled.find((b) => b.squarePaymentId)?.squarePaymentId ?? null;
    const giftLeg = cancelled.find((b) => b.giftCertificateCode && b.giftAmountCents > 0) ?? null;

    let refunded = false;
    let refundId: string | undefined;
    let refundError: string | undefined;
    const refundCents = totalAmountCents - totalGiftCents;
    if (refund && paymentId && refundCents > 0) {
      const result = await refundPayment({
        paymentId,
        amountCents: refundCents,
        idempotencyKey: `refund_${target.comboGroup ?? target.id}`,
        reason,
      });
      if (result.ok) {
        refunded = true;
        refundId = result.refundId;
      } else {
        refundError = result.error;
        console.error("[booking-admin] refund failed:", target.id, result.error);
      }
    }

    let giftRestored = false;
    if (giftLeg?.giftCertificateCode) {
      const cert = await lookupGiftCertificate(giftLeg.giftCertificateCode);
      if (cert) {
        const units = giftUnitsToRestore(cert.kind, giftLeg);
        giftRestored = await restoreGiftCertificate(giftLeg.giftCertificateCode, units);
      } else {
        console.error(
          "[booking-admin] gift cert lookup failed on cancel:",
          giftLeg.giftCertificateCode,
        );
      }
    }

    await auditBooking(
      "booking_cancelled",
      target.id,
      {
        booking_ids: cancelled.map((b) => b.id),
        booking_number: bookingNumber,
        combo_group: target.comboGroup,
        reason,
        refunded,
        refund_id: refundId ?? null,
        refund_error: refundError ?? null,
        gift_restored: giftRestored,
      },
      "admin",
    );

    try {
      await sendCancelEmail({
        bookingNumber,
        customerName: `${cancelled[0].firstName} ${cancelled[0].lastName}`,
        customerEmail: cancelled[0].email,
        legs: cancelled.map((b) => ({ productSlug: b.productSlug, startsAt: b.startsAt })),
        refunded,
        giftRestored,
      });
    } catch (err) {
      console.error("[booking-admin] cancel email failed:", bookingNumber, err);
    }

    return NextResponse.json({
      ok: true,
      cancelledIds: cancelled.map((b) => b.id),
      refunded,
      refundId: refundId ?? null,
      refundError: refundError ?? null,
      giftRestored,
    });
  } catch (err) {
    console.error("[booking-admin] cancel failed:", err);
    return bad("Could not cancel the booking.", 500);
  }
}
