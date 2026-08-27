import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidToken, tokenFromRequest } from "@/lib/shop/admin-auth";
import { BOOKING_PRODUCTS, unitsFor } from "@/lib/booking/products";
import { slotCapacity } from "@/lib/booking/engine";
import { slotToUtc } from "@/lib/booking/time";
import {
  claimSlots, confirmBookings, auditBooking, getScheduleData, setBookingNote,
  type ClaimLeg, type ClaimCustomer,
} from "@/lib/booking/store";
import { generateBookingNumber } from "@/lib/booking/booking-number";

/**
 * Manual (phone) booking — Jalene takes a call, this holds the slot and
 * confirms it immediately. No charge here: phone bookings pay on site, so
 * `amount_cents` is recorded from the same server pricing as checkout but
 * Square is never touched. `source: 'admin'` and `referralSource: 'phone'`
 * mark the row so it's distinguishable from a website checkout in reports.
 *
 * Single leg only — no combo support here; a Full Farm Day booked by phone
 * is two calls to this route (or a call to the front desk to just use the
 * website).
 */

export const dynamic = "force-dynamic";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const timeRe = /^\d{2}:\d{2}$/;

const schema = z.object({
  product: z.enum(["farm-tour", "nordic-spa", "wedding-call"]),
  date: z.string().regex(dateRe),
  time: z.string().regex(timeRe),
  partySize: z.number().int().min(1).max(6),
  customer: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().min(7).max(40),
  }),
  note: z.string().trim().max(500).nullable().optional(),
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
  const body = parsed.data;

  const product = BOOKING_PRODUCTS[body.product];
  if (body.partySize < product.minParty || body.partySize > product.maxParty) {
    return bad(`${product.name} is for ${product.minParty}-${product.maxParty} guests.`);
  }

  try {
    const data = await getScheduleData([product.slug], body.date, body.date);
    const now = new Date();
    const capacity = slotCapacity({
      product, dateStr: body.date, time: body.time,
      schedules: data.schedules, exceptions: data.exceptions,
      blackouts: data.blackouts, now,
    });
    if (capacity === null) {
      return bad("That time isn't offered on that date.", 409);
    }

    const leg: ClaimLeg = {
      productSlug: product.slug,
      startsAt: slotToUtc(body.date, body.time).toISOString(),
      durationMin: product.durationMin,
      capacity,
      partySize: body.partySize,
      units: unitsFor(product, body.partySize),
      amountCents: product.pricePerPersonCents * body.partySize,
    };

    const buildCustomer = (num: string): ClaimCustomer => ({
      bookingNumber: num,
      firstName: body.customer.firstName,
      lastName: body.customer.lastName,
      email: body.customer.email,
      phone: body.customer.phone,
      referralSource: "phone",
      policyAgreedAt: null,
      locationChoice: null,
      source: "admin",
    });

    let bookingNumber = generateBookingNumber();
    let claim = await claimSlots([leg], buildCustomer(bookingNumber));
    if (!claim.ok && claim.reason === "number_collision") {
      bookingNumber = generateBookingNumber();
      claim = await claimSlots([leg], buildCustomer(bookingNumber));
    }
    if (!claim.ok) {
      return bad(
        claim.message || "Could not hold that slot.",
        claim.reason === "slot_full" ? 409 : 503,
      );
    }

    // No payment: confirm immediately with no payment id and no gift.
    await confirmBookings(claim.ids, null, null, 0);
    if (body.note) await setBookingNote(claim.ids[0], body.note);

    await auditBooking(
      "manual_booking_created",
      claim.ids[0],
      {
        booking_number: bookingNumber,
        product: product.slug,
        date: body.date,
        time: body.time,
        party_size: body.partySize,
        amount_cents: leg.amountCents,
        note: body.note ?? null,
      },
      "admin",
    );

    return NextResponse.json({ ok: true, bookingNumber, amountCents: leg.amountCents });
  } catch (err) {
    console.error("[booking-admin] manual booking failed:", err);
    return bad("Could not create the booking.", 500);
  }
}
