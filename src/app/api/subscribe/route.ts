import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

// In-memory rate limiting (per warm serverless instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;

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

if (process.env.NODE_ENV === "development") {
  ALLOWED_ORIGINS.push("http://localhost:3000");
}

// Allowlisted capture sources so we can segment where a subscriber came from.
// Unknown/missing values fall back to "popup" (the original site-wide popup).
const SUBSCRIBE_SOURCES = ["popup", "spa-page", "farm-tours-page"] as const;

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  source: z.enum(SUBSCRIBE_SOURCES).optional(),
  website: z.string().optional(), // honeypot
  _t: z.number().optional(), // timing
});

export async function POST(request: Request) {
  try {
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

    // Honeypot check
    if (body.website) {
      return NextResponse.json({ success: true });
    }

    // Timing check — reject if submitted less than 2 seconds after load
    if (body._t && Date.now() - body._t < 2000) {
      return NextResponse.json({ success: true });
    }

    const result = subscribeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const { email, phone, source } = result.data;

    // Upsert: if email exists, update phone if provided
    const { error } = await supabase
      .from("email_subscribers")
      .upsert(
        {
          email,
          phone: phone || null,
          source: source ?? "popup",
        },
        { onConflict: "email" }
      );

    if (error) {
      console.error("Supabase subscribe error:", error);
      return NextResponse.json(
        { error: "Failed to subscribe. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
