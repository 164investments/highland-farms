/**
 * Google Calendar + Meet for wedding calls, via a service account with
 * domain-wide delegation. No SDK — Node crypto signs the JWT, same approach
 * as src/lib/ga4-data.ts, with two differences this file owns because
 * ga4-data.ts has no need for them:
 *   - scope: calendar.events (not analytics.readonly)
 *   - `sub: events@highlandfarms-oregon.com` — impersonation. A service
 *     account has no calendar of its own that can host a Meet link; it has
 *     to act AS a real mailbox that domain-wide delegation has authorized.
 *
 * Required env vars (optional — the caller falls back gracefully without
 * them):
 *   GOOGLE_SA_EMAIL       — service account email
 *   GOOGLE_SA_PRIVATE_KEY — PEM private key (literal \n or real newlines)
 */

import { createSign } from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const IMPERSONATE = "events@highlandfarms-oregon.com";
const TZ = "America/Los_Angeles";

export function isCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SA_EMAIL && process.env.GOOGLE_SA_PRIVATE_KEY);
}

async function getAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SA_EMAIL;
  const rawKey = process.env.GOOGLE_SA_PRIVATE_KEY;
  if (!email || !rawKey) return null;

  const privateKey = rawKey.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: email,
      sub: IMPERSONATE,
      scope: "https://www.googleapis.com/auth/calendar.events",
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");

  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, "base64url");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${header}.${payload}.${signature}`,
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

export interface CreateWeddingCallEventOpts {
  startIso: string; // UTC ISO instant
  durationMin: number;
  guestEmail: string;
  guestName: string;
  locationChoice: "meet" | "in_person";
  bookingNumber: string;
}

export interface CreatedCalendarEvent {
  eventId: string;
  meetLink: string | null;
}

/**
 * Creates the wedding-call event on the impersonated events@ calendar.
 * NEVER throws — every failure (missing config, non-2xx, network error,
 * malformed response) resolves null and is logged with the booking number
 * so a support hunt has something to grep for. A calendar hiccup must never
 * fail a booking that has already taken (or waived) payment.
 */
export async function createWeddingCallEvent(
  opts: CreateWeddingCallEventOpts,
): Promise<CreatedCalendarEvent | null> {
  try {
    const token = await getAccessToken();
    if (!token) {
      console.error("[booking] calendar event failed", opts.bookingNumber, "no access token");
      return null;
    }

    const start = new Date(opts.startIso);
    const end = new Date(start.getTime() + opts.durationMin * 60000);

    const body: Record<string, unknown> = {
      summary: `Wedding Call: ${opts.guestName} + Highland Farms`,
      description: `Highland Farms wedding call. Booking ${opts.bookingNumber}.`,
      start: { dateTime: start.toISOString(), timeZone: TZ },
      end: { dateTime: end.toISOString(), timeZone: TZ },
      attendees: [{ email: opts.guestEmail }],
    };

    if (opts.locationChoice === "meet") {
      body.conferenceData = {
        createRequest: {
          requestId: opts.bookingNumber,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    } else {
      body.location = "Highland Farms, Brightwood, OR";
    }

    const res = await fetch(`${EVENTS_API}?conferenceDataVersion=1&sendUpdates=all`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[booking] calendar event failed", opts.bookingNumber, res.status, text);
      return null;
    }

    const data = await res.json();
    return {
      eventId: data.id as string,
      meetLink: (data.hangoutLink as string | undefined) ?? null,
    };
  } catch (err) {
    console.error("[booking] calendar event failed", opts.bookingNumber, err);
    return null;
  }
}

/** Best-effort delete, used only by the DWD live probe script to clean up after itself. */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    const token = await getAccessToken();
    if (!token) return false;
    const res = await fetch(`${EVENTS_API}/${eventId}?sendUpdates=none`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok || res.status === 410; // 410 Gone = already deleted
  } catch {
    return false;
  }
}
