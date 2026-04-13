import { after, NextResponse } from "next/server";
import { sendBookingPurchase } from "@/lib/ga4";
import { sendMetaPurchase } from "@/lib/meta";
import { getAppointment } from "@/lib/acuity";

/**
 * Acuity Scheduling webhook handler.
 *
 * Acuity POSTs application/x-www-form-urlencoded bodies containing only
 *   { action, id, calendarID }
 * on appointment.scheduled / appointment.rescheduled events. To get email,
 * phone, and amount for GA4 + Meta CAPI, we fetch the full appointment from
 * the Acuity API using the id.
 *
 * Security: Acuity POSTs to the URL with a `secret` query parameter
 * that only we know. Register the full URL (with secret) in Acuity.
 *
 * Calendar ID → booking type mapping (from Acuity calendars):
 *   7539520  → Farm Tours
 *   13047082 → Nordic Spa
 *   12109481 → Wedding Call (free — skipped by Meta CAPI)
 */

const CALENDAR_TYPE: Record<number, string> = {
  7539520: "farm_tour",
  13047082: "nordic_spa",
  12109481: "wedding_call",
};

const CALENDAR_CATEGORY: Record<number, string> = {
  7539520: "Farm Tour",
  13047082: "Nordic Spa",
  12109481: "Wedding Call",
};

export async function POST(request: Request) {
  // Validate secret token — only accept requests from Acuity
  const { searchParams } = new URL(request.url);
  if (searchParams.get("secret") !== process.env.ACUITY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Acuity sends application/x-www-form-urlencoded; also accept JSON for
  // test payloads and backfill replays.
  let body: Record<string, string>;
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = (await request.json()) as Record<string, string>;
    } else {
      const text = await request.text();
      body = Object.fromEntries(new URLSearchParams(text));
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Only track scheduled / rescheduled — ignore cancellations and changes
  const action = String(body.action ?? "");
  if (!action.includes("scheduled")) {
    return NextResponse.json({ ok: true });
  }

  const idRaw = body.id;
  if (!idRaw) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const appointmentId = parseInt(String(idRaw), 10);
  if (!Number.isFinite(appointmentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    // Fetch full appointment details from Acuity API
    const appt = await getAppointment(appointmentId);

    if (appt.canceled) {
      return NextResponse.json({ ok: true });
    }

    const calendarID = appt.calendarID;
    const bookingType = CALENDAR_TYPE[calendarID] ?? "other";
    const category = CALENDAR_CATEGORY[calendarID] ?? "Other";
    const itemName = appt.type ?? category;
    const transactionId = `acuity_${appt.id}`;

    // amountPaid is the actual collected amount; fall back through priceSold → price
    const value =
      parseFloat(appt.amountPaid) ||
      parseFloat(appt.priceSold) ||
      parseFloat(appt.price) ||
      0;

    after(async () => {
      await Promise.all([
        sendBookingPurchase({
          transaction_id: transactionId,
          value,
          currency: "USD",
          booking_type: bookingType,
          appointment_type: appt.type,
          items: [
            {
              item_id: String(appt.appointmentTypeID),
              item_name: itemName,
              price: value,
              quantity: 1,
              item_category: category,
            },
          ],
        }).catch((err) => console.error("GA4 booking error:", err)),

        // Wedding calls are free ($0) so sendMetaPurchase skips them automatically
        sendMetaPurchase({
          transaction_id: transactionId,
          value,
          currency: "USD",
          content_name: itemName,
          content_category: category,
          email: appt.email,
          phone: appt.phone,
        }).catch((err) => console.error("Meta CAPI error:", err)),
      ]);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Acuity webhook processing error:", err);
    // Return 200 to prevent Acuity from retrying on internal errors
    return NextResponse.json({ ok: true });
  }
}
