import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { inquirySchema } from "@/lib/schemas";
import { sendInquiryNotification } from "@/lib/email";
import { syncInquiryToHubSpot } from "@/lib/hubspot";
import { syncInquiryToBookedIQ } from "@/lib/bookediq";

// In-memory rate limiting (per warm serverless instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // 5 submissions per IP per hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Clean up stale entries periodically
function cleanupRateLimit() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}

const ALLOWED_ORIGINS = [
  "https://highlandfarmsoregon.com",
  "https://www.highlandfarmsoregon.com",
];

// Allow localhost in development
if (process.env.NODE_ENV === "development") {
  ALLOWED_ORIGINS.push("http://localhost:3000");
}

export async function POST(request: Request) {
  try {
    // Clean up stale rate limit entries
    cleanupRateLimit();

    // Origin / Referer validation (CSRF protection)
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const isValidOrigin =
      origin && ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
    const isValidReferer =
      referer && ALLOWED_ORIGINS.some((o) => referer.startsWith(o));

    if (!isValidOrigin && !isValidReferer) {
      return NextResponse.json(
        { error: "Unauthorized request origin." },
        { status: 403 }
      );
    }

    // Rate limiting by IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Honeypot check — "website" field should always be empty
    if (body.website) {
      // Silently accept to not tip off bots, but don't store
      return NextResponse.json({ success: true });
    }

    // Timing check — reject if submitted less than 2 seconds after page load
    if (body._t && Date.now() - body._t < 2000) {
      return NextResponse.json({ success: true });
    }

    // Validate
    const result = inquirySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid form data. Please check your entries and try again." },
        { status: 400 }
      );
    }

    const { name, email, phone, event_type, guest_count, preferred_date, referral_source, message, consent_marketing_sms, consent_appointment_sms } = result.data;

    // Insert into Supabase
    const { error } = await supabase.from("event_inquiries").insert({
      name,
      email,
      phone: phone || null,
      event_type,
      guest_count: guest_count || null,
      preferred_date: preferred_date || null,
      referral_source: referral_source || null,
      message: message || null,
      consent_marketing_sms: consent_marketing_sms ?? false,
      consent_appointment_sms: consent_appointment_sms ?? false,
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to submit inquiry. Please try again." },
        { status: 500 }
      );
    }

    // Send email notification (fire-and-forget — data is safe in Supabase)
    sendInquiryNotification(result.data).catch((err) => {
      console.error("Email notification error:", err);
    });

    // Sync to HubSpot CRM (fire-and-forget — non-blocking)
    syncInquiryToHubSpot(result.data).catch((err) => {
      console.error("HubSpot sync error:", err);
    });

    // Sync to BookedIQ CRM (fire-and-forget — non-blocking)
    syncInquiryToBookedIQ(result.data).catch((err) => {
      console.error("BookedIQ sync error:", err);
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
