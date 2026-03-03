/**
 * Meta Conversions API (CAPI) — server-side event tracking.
 *
 * Sends Purchase events directly to Meta from the Acuity webhook handler,
 * bypassing ad blockers and cookie consent gates.
 *
 * Why server-side: farm tour and spa bookings happen on highlandfarms.as.me
 * (Acuity's domain), not on the Highland Farms site, so the browser pixel
 * never fires. CAPI from the webhook is the only reliable way to attribute
 * these conversions back to Meta ad spend.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import { createHash } from "crypto";

const CAPI_VERSION = "v19.0";
const CAPI_ENDPOINT = `https://graph.facebook.com/${CAPI_VERSION}`;

/** SHA-256 hash a string (email, phone) for Meta user data matching */
function hash(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/** Normalize phone → digits only, then hash */
function hashPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return createHash("sha256").update(digits).digest("hex");
}

export interface MetaPurchaseParams {
  /** Acuity appointment ID — used as event_id for deduplication */
  transaction_id: string;
  value: number;
  currency?: string;
  content_name: string;
  content_category: string;
  /** Customer email from Acuity booking — hashed before sending */
  email?: string;
  /** Customer phone from Acuity booking — hashed before sending */
  phone?: string;
}

/**
 * Fires a Meta CAPI `Purchase` event when an Acuity booking completes.
 * Only fires for paid bookings (value > 0).
 *
 * Env vars required:
 *   META_PIXEL_ID    — from Meta Events Manager
 *   META_CAPI_TOKEN  — System user access token with `ads_management` scope
 */
export async function sendMetaPurchase(params: MetaPurchaseParams): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID;
  const capiToken = process.env.META_CAPI_TOKEN;
  if (!pixelId || !capiToken) return;

  // Skip free bookings (wedding calls) — no value to attribute
  if (params.value <= 0) return;

  const {
    transaction_id,
    value,
    currency = "USD",
    content_name,
    content_category,
    email,
    phone,
  } = params;

  // Build user_data — only include fields we have from the Acuity webhook
  const user_data: Record<string, string> = {};
  if (email) user_data.em = hash(email);
  if (phone) user_data.ph = hashPhone(phone);

  const event = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    action_source: "system", // server-side, not originating from a browser
    event_id: transaction_id, // deduplication key
    user_data,
    custom_data: {
      value,
      currency,
      content_name,
      content_category,
      content_type: "product",
      content_ids: [content_category.toLowerCase().replace(/\s+/g, "_")],
    },
  };

  try {
    const res = await fetch(
      `${CAPI_ENDPOINT}/${pixelId}/events?access_token=${capiToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [event] }),
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("Meta CAPI error:", res.status, body);
    }
  } catch (err) {
    console.error("Meta CAPI send error:", err);
  }
}
