import { after, NextResponse } from "next/server";
import { sendBookingPurchase } from "@/lib/ga4";
import { sendMetaPurchase } from "@/lib/meta";
import { getAppointment, type AcuityAppointment } from "@/lib/acuity";
import { claimTrackingEvent } from "@/lib/tracking-dedupe";
import { type AttributionData } from "@/lib/attribution";
import { ensureAcuityTypeMap, upsertAcuityBooking } from "@/lib/booking/acuity-import";

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

/**
 * Pulls first-party attribution out of the Acuity appointment's intake answers.
 *
 *  - `referralSource`: the existing "How did you hear about us?" multi-select —
 *    available on every booking today, attached to GA4 + Meta as a source signal.
 *  - `attribution` / `clientId` / `fbc`: recovered from an optional hidden intake
 *    field carrying the JSON attribution captured at booking-CTA click. Inert
 *    until that field is added in Acuity (see README "Acuity booking attribution"),
 *    then it stitches the purchase back to the originating session/ad click.
 *
 * Fully guarded — any malformed/absent field is ignored so booking tracking
 * never breaks.
 */
function extractBookingTracking(appt: AcuityAppointment): {
  referralSource?: string;
  attribution?: AttributionData;
  clientId?: string;
  fbc?: string;
} {
  const result: {
    referralSource?: string;
    attribution?: AttributionData;
    clientId?: string;
    fbc?: string;
  } = {};

  try {
    const values = (appt.forms ?? []).flatMap((f) => f.values ?? []);

    const heard = values
      .filter((v) => /hear about/i.test(v.name) && v.value?.trim())
      .map((v) => v.value.trim());
    if (heard.length) result.referralSource = heard.join(", ");

    const trackingRaw = values.find((v) => /tracking|attribution/i.test(v.name))?.value?.trim();
    if (trackingRaw) {
      const parsed = JSON.parse(trackingRaw) as AttributionData & { client_id?: string };
      result.attribution = parsed;
      if (parsed.client_id) result.clientId = parsed.client_id;
      if (parsed.fbclid) {
        const ts = Date.parse(appt.datetimeCreated) || Date.now();
        result.fbc = `fb.1.${ts}.${parsed.fbclid}`;
      }
    }
  } catch (err) {
    console.error("Acuity attribution parse error:", err);
  }

  return result;
}

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

  // Only track first-time scheduled appointments. Reschedules retain the same
  // appointment ID and would otherwise duplicate purchase conversions. Both
  // actions still reach the native-calendar mirror upsert below.
  const action = String(body.action ?? "");
  const isScheduled = action === "scheduled" || action === "appointment.scheduled";
  const isRescheduled = action === "rescheduled" || action === "appointment.rescheduled";
  if (!isScheduled && !isRescheduled) {
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

    // Best-effort mirror into the native `bookings` table (source =
    // "acuity_import"). Runs for BOTH scheduled and rescheduled, regardless
    // of the native-calendar flag, so the mirror stays current until
    // cancellation. Never allowed to fail the webhook response to Acuity.
    try {
      await ensureAcuityTypeMap();
      await upsertAcuityBooking(appt);
    } catch (err) {
      console.error("[booking] acuity mirror upsert failed", appt.id, err);
    }

    if (!isScheduled) {
      return NextResponse.json({ ok: true });
    }

    const calendarID = appt.calendarID;
    const bookingType = CALENDAR_TYPE[calendarID] ?? "other";
    const category = CALENDAR_CATEGORY[calendarID] ?? "Other";
    const itemName = appt.type ?? category;
    const transactionId = `acuity_${appt.id}`;
    const claimed = await claimTrackingEvent(transactionId, "purchase", "acuity");
    if (!claimed) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    // amountPaid is the actual collected amount; fall back through priceSold → price
    const value =
      parseFloat(appt.amountPaid) ||
      parseFloat(appt.priceSold) ||
      parseFloat(appt.price) ||
      0;

    const tracking = extractBookingTracking(appt);

    after(async () => {
      await Promise.all([
        sendBookingPurchase({
          transaction_id: transactionId,
          value,
          currency: "USD",
          booking_type: bookingType,
          appointment_type: appt.type,
          referral_source: tracking.referralSource,
          attribution: tracking.attribution,
          client_id: tracking.clientId,
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
          fbc: tracking.fbc,
          referral_source: tracking.referralSource,
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
