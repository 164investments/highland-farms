import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidToken, tokenFromRequest } from "@/lib/shop/admin-auth";
import {
  cancelBooking, restoreGiftCertificate, lookupGiftCertificate, auditBooking,
} from "@/lib/booking/store";
import { refundPayment } from "@/lib/shop/square";
import { sendCancelEmail } from "@/lib/booking/cancel-email";

/**
 * Farm-initiated cancel — STRICT policy: this route exists for weather,
 * animal/guest safety, and similar farm-side cancellations, never a
 * customer request (the booking policy is final-sale by design; see
 * `confirmation-email.ts`). Only ever cancels a `confirmed` booking.
 *
 * Refund amount is `amount_cents - gift_amount_cents` — the cash portion
 * actually charged to the card, never the pre-gift total (a gift-covered
 * booking has nothing to refund on the card side; that's what restoring the
 * certificate is for).
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

export async function POST(request: Request) {
  if (!isValidToken(tokenFromRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return bad("Invalid payload");
  const { id, refund, reason } = parsed.data;

  try {
    const cancelled = await cancelBooking(id);
    if (!cancelled.ok) {
      return bad("Booking not found, or not currently confirmed.", 404);
    }
    const booking = cancelled.booking;

    let refunded = false;
    let refundId: string | undefined;
    let refundError: string | undefined;
    const refundCents = booking.amountCents - booking.giftAmountCents;
    if (refund && booking.squarePaymentId && refundCents > 0) {
      const result = await refundPayment({
        paymentId: booking.squarePaymentId,
        amountCents: refundCents,
        idempotencyKey: `refund_${booking.id}`,
        reason,
      });
      if (result.ok) {
        refunded = true;
        refundId = result.refundId;
      } else {
        refundError = result.error;
        console.error("[booking-admin] refund failed:", booking.id, result.error);
      }
    }

    let giftRestored = false;
    if (booking.giftCertificateCode && booking.giftAmountCents > 0) {
      const cert = await lookupGiftCertificate(booking.giftCertificateCode);
      if (cert) {
        // Value certs store cents, so `gift_amount_cents` restores directly.
        // Visits certs store a visit count instead, which the booking row
        // doesn't carry separately — a cancelled visits-pack booking is
        // assumed to have consumed exactly `partySize` visits, which holds
        // for every real booking (a partial visits redemption leaves
        // `dueCents` > 0 and the party pays cash for the remainder, so the
        // pack itself was still fully spent on `partySize` seats).
        const units = cert.kind === "visits" ? booking.partySize : booking.giftAmountCents;
        await restoreGiftCertificate(booking.giftCertificateCode, units);
        giftRestored = true;
      } else {
        console.error(
          "[booking-admin] gift cert lookup failed on cancel:",
          booking.giftCertificateCode,
        );
      }
    }

    await auditBooking(
      "booking_cancelled",
      booking.id,
      {
        booking_number: booking.bookingNumber,
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
        bookingNumber: booking.bookingNumber,
        customerName: `${booking.firstName} ${booking.lastName}`,
        customerEmail: booking.email,
        refunded,
        giftRestored,
      });
    } catch (err) {
      console.error("[booking-admin] cancel email failed:", booking.bookingNumber, err);
    }

    return NextResponse.json({
      ok: true, refunded, refundId: refundId ?? null, refundError: refundError ?? null, giftRestored,
    });
  } catch (err) {
    console.error("[booking-admin] cancel failed:", err);
    return bad("Could not cancel the booking.", 500);
  }
}
