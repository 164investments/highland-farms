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
 * cancelled via `cancelBookingGroup` (one atomic `UPDATE`, no prior read —
 * see that function's doc for why), refunded as one combined amount,
 * restored as one gift credit, and emailed as one message naming both legs.
 * A single-leg booking is unaffected and keeps the plain `cancelBooking`
 * path.
 *
 * Refund amount is `sum(amount_cents) - sum(gift_amount_cents)` across the
 * FULL combo group (not just the rows this call flipped) — the cash portion
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

    // `flipped` = the rows THIS call actually cancelled (drives audit/email
    // side effects — never claim credit for a row a racing call flipped).
    // `group` = every row sharing the combo (any status), or just the
    // single target row for a non-combo booking — refund/gift math always
    // needs the FULL group's numbers, not just what this call flipped.
    let flipped: AdminBookingRow[];
    let group: AdminBookingRow[];
    if (target.comboGroup) {
      const result = await cancelBookingGroup(target.comboGroup);
      if (!result.ok) {
        return bad("That booking is already cancelled.", 409);
      }
      flipped = result.flipped;
      group = result.group;
    } else {
      const single = await cancelBooking(id);
      if (!single.ok) {
        return bad("Booking not found, or not currently confirmed.", 404);
      }
      flipped = [single.booking];
      group = [single.booking];
    }

    const bookingNumber = flipped.map((b) => b.bookingNumber).join(" / ");
    const totalAmountCents = group.reduce((sum, b) => sum + b.amountCents, 0);
    const totalGiftCents = group.reduce((sum, b) => sum + b.giftAmountCents, 0);
    const paymentId = group.find((b) => b.squarePaymentId)?.squarePaymentId ?? null;
    // Only restore if THIS call flipped the gift-stamped leg — the status
    // transition (confirmed -> cancelled) is atomic per row, so at most one
    // concurrent caller ever sees that leg in its own `flipped` set, which
    // keeps the restore itself at-most-once without needing a lock here.
    const giftLeg = flipped.find((b) => b.giftCertificateCode && b.giftAmountCents > 0) ?? null;

    let refunded = false;
    let refundId: string | undefined;
    let refundError: string | undefined;
    const refundCents = totalAmountCents - totalGiftCents;
    if (refund && paymentId && refundCents > 0) {
      const result = await refundPayment({
        paymentId,
        amountCents: refundCents,
        // Keyed on the group (or the single booking), not on `flipped` —
        // this is what makes computing the refund off the FULL group safe
        // even if two racing cancel calls both reach this branch: Square
        // executes a given idempotency key's refund at most once, so a
        // duplicate call with the same key and amount is a no-op replay,
        // not a second refund.
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
        booking_ids: flipped.map((b) => b.id),
        booking_number: bookingNumber,
        combo_group: target.comboGroup,
        group_booking_ids: group.map((b) => b.id),
        reason,
        refunded,
        refund_id: refundId ?? null,
        refund_error: refundError ?? null,
        gift_restored: giftRestored,
      },
      "admin",
    );

    // Sent whenever this call flipped at least one row. In the extremely
    // unlikely case of two admin cancels landing in the same millisecond on
    // the two different legs of one combo, the guest could get two emails
    // instead of one — acceptable; a duplicate "you're cancelled" email is
    // harmless where a missed one is not.
    try {
      await sendCancelEmail({
        bookingNumber,
        customerName: `${flipped[0].firstName} ${flipped[0].lastName}`,
        customerEmail: flipped[0].email,
        legs: flipped.map((b) => ({ productSlug: b.productSlug, startsAt: b.startsAt })),
        refunded,
        giftRestored,
      });
    } catch (err) {
      console.error("[booking-admin] cancel email failed:", bookingNumber, err);
    }

    return NextResponse.json({
      ok: true,
      cancelledIds: flipped.map((b) => b.id),
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
