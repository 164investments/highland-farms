/**
 * GA4 Measurement Protocol — server-side event tracking.
 *
 * Sends events directly to GA4 from the Next.js API route, bypassing ad
 * blockers and client-side consent gates. Stitches to the browser session
 * by reading the _ga / _ga_XXXX cookies forwarded with the request.
 *
 * Deduplication: pass event_id matching the value pushed to window.dataLayer
 * so a single form submission doesn't count twice when both paths fire.
 *
 * Product-specific events:
 *   Form submissions → "generate_lead" (all) + "generate_lead_wedding" (weddings)
 *   Acuity bookings → "purchase" (all) + "book_farm_tour" | "book_nordic_spa" | "book_wedding_call"
 *
 * This lets each ad campaign (wedding, spa, farm tour) use its own conversion
 * action for smart bidding rather than sharing a single blended signal.
 *
 * Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */

const MP_ENDPOINT = "https://www.google-analytics.com/mp/collect";

// Parse _ga cookie → client_id (format: GA1.1.<client_id_a>.<client_id_b>)
function getClientId(cookieHeader: string | null): string {
  if (cookieHeader) {
    const m = cookieHeader.match(/_ga=GA[\d.]+\.(\d+\.\d+)/);
    if (m) return m[1];
  }
  // Ephemeral fallback — won't stitch to browser session but still counts
  return `${Date.now()}.${Math.floor(Math.random() * 1e9)}`;
}

// Parse _ga_<KEY> session cookie → session_id
function getSessionId(cookieHeader: string | null, measurementId: string): string | undefined {
  if (!cookieHeader) return undefined;
  const key = measurementId.replace(/^G-/, "");
  const m = cookieHeader.match(new RegExp(`_ga_${key}=GS[\\d.]+\\.(\\d+)`));
  return m ? m[1] : undefined;
}

export interface GA4LeadEventParams {
  event_type: string;
  form_name: string;
  /** Matches the event_id pushed to window.dataLayer — prevents double-counting */
  event_id?: string;
  /**
   * Override the GA4 event name (default: "generate_lead").
   * Used to fire product-specific lead events like "generate_lead_wedding"
   * so each ad campaign can optimize independently.
   */
  event_name?: string;
}

export interface GA4BookingItem {
  item_id?: string;
  item_name: string;
  price: number;
  quantity?: number;
  item_category?: string;
}

export interface GA4BookingParams {
  transaction_id: string;
  value: number;
  currency?: string;
  /**
   * Product type slug — "farm_tour" | "nordic_spa" | "wedding_call".
   * Used to fire a product-specific conversion event alongside "purchase" so
   * farm tour, spa, and wedding call ad campaigns can each use their own
   * conversion goal for smart bidding.
   */
  booking_type?: string;
  appointment_type?: string;
  items?: GA4BookingItem[];
}

/**
 * Fires GA4 events via Measurement Protocol when an Acuity appointment is booked.
 * Sends TWO events per booking in a single request:
 *   1. "purchase"          → feeds GA4 e-commerce / revenue reports
 *   2. "book_{type}"       → product-specific conversion for Google Ads bidding
 *      e.g. "book_farm_tour", "book_nordic_spa", "book_wedding_call"
 *
 * Note: Webhook requests come from Acuity's servers so there are no _ga cookies.
 * An ephemeral client_id is used — revenue records correctly but has no session
 * attribution. This is expected for server-side booking events.
 */
export async function sendBookingPurchase(
  params: GA4BookingParams,
): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) return;

  const {
    transaction_id,
    value,
    currency = "USD",
    booking_type,
    appointment_type,
    items = [],
  } = params;

  const sharedParams = {
    transaction_id,
    value,
    currency,
    items,
    engagement_time_msec: 1,
    ...(booking_type && { booking_type }),
    ...(appointment_type && { appointment_type }),
  };

  // Always include "purchase" for GA4 e-commerce revenue tracking
  const events: { name: string; params: Record<string, unknown> }[] = [
    { name: "purchase", params: sharedParams },
  ];

  // Also fire product-specific event so each ad type gets its own conversion signal
  // "book_farm_tour" | "book_nordic_spa" | "book_wedding_call"
  if (booking_type && booking_type !== "other") {
    events.push({
      name: `book_${booking_type}`,
      params: sharedParams,
    });
  }

  try {
    const res = await fetch(
      `${MP_ENDPOINT}?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: getClientId(null), // ephemeral — no browser session available
          events,
        }),
      },
    );
    if (!res.ok) console.error("GA4 MP booking error:", res.status, await res.text());
  } catch (err) {
    console.error("GA4 MP booking send error:", err);
  }
}

/**
 * Fires a GA4 lead event via Measurement Protocol when the contact form is submitted.
 *
 * For wedding-type inquiries the caller should invoke this TWICE:
 *   1. event_name: "generate_lead"         — general signal for all campaigns
 *   2. event_name: "generate_lead_wedding" — wedding campaign–specific conversion
 */
export async function sendGenerateLead(
  cookieHeader: string | null,
  params: GA4LeadEventParams,
): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) return;

  const clientId = getClientId(cookieHeader);
  const sessionId = getSessionId(cookieHeader, measurementId);

  const payload = {
    client_id: clientId,
    events: [
      {
        name: params.event_name ?? "generate_lead",
        params: {
          event_type: params.event_type,
          form_name: params.form_name,
          engagement_time_msec: 1,
          ...(params.event_id && { event_id: params.event_id }),
          ...(sessionId && { session_id: sessionId }),
        },
      },
    ],
  };

  try {
    const res = await fetch(
      `${MP_ENDPOINT}?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    );
    if (!res.ok) console.error("GA4 MP error:", res.status, await res.text());
  } catch (err) {
    console.error("GA4 MP send error:", err);
  }
}
