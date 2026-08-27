import { after, NextResponse } from "next/server";
import { z } from "zod";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { GIFT_PRODUCTS, generateGiftCode, getGiftProduct, issueGiftCertificate } from "@/lib/booking/gift";
import { sendGiftEmails } from "@/lib/booking/gift-email";
import { chargeCard, isSquareConfigured } from "@/lib/shop/square";

/**
 * Gift certificate checkout.
 *
 * Order of operations:
 *   1. validate the request shape
 *   2. re-derive the exact price from GIFT_PRODUCTS (the browser never sends it)
 *   3. charge the card
 *   4. on charge failure, insert NOTHING
 *   5. on charge success, insert the certificate — if THAT fails, the money is
 *      already taken and gone: log CRITICAL and return success with a null
 *      code (never a failure — the customer was charged) so the farm
 *      reconciles from the log, not the customer re-buying
 *   6. after(): email the code
 */

const ALLOWED_ORIGINS = [
  "https://highlandfarmsoregon.com",
  "https://www.highlandfarmsoregon.com",
];
if (process.env.NODE_ENV === "development") {
  ALLOWED_ORIGINS.push("http://localhost:3000", "http://localhost:3099");
}

// Same forgiveness rationale as the booking checkout: a declined card is a
// legitimate retry, and locking a paying customer out is worse than the spam.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 12;

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

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Exact origin match on the parsed URL origin, so a suffix can't spoof it. */
function isAllowedOrigin(value: string | null): boolean {
  if (!value) return false;
  try {
    return ALLOWED_ORIGINS.includes(new URL(value).origin);
  } catch {
    return false;
  }
}

const giftProductIds = GIFT_PRODUCTS.map((p) => p.id) as [string, ...string[]];

const giftCheckoutSchema = z.object({
  productId: z.enum(giftProductIds),
  idempotencyKey: z.string().min(8).max(128),
  sourceId: z.string().min(1).max(2048).optional(),
  purchaser: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(200),
  }),
  recipientEmail: z.string().trim().email().max(200).optional(),
  message: z.string().trim().max(280).optional(),
  website: z.string().max(200).optional(), // honeypot
});

export async function POST(request: Request) {
  if (!nativeCalendarEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    cleanupRateLimit();

    const originOk = isAllowedOrigin(request.headers.get("origin"));
    const refererOk = isAllowedOrigin(request.headers.get("referer"));
    if (!originOk && !refererOk) {
      return bad("Unauthorized request origin.", 403);
    }

    const ip =
      request.headers.get("x-vercel-forwarded-for")?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
      "unknown";
    if (isRateLimited(ip)) {
      return bad("Too many attempts. Please wait a few minutes, or call the farm.", 429);
    }

    const parsed = giftCheckoutSchema.safeParse(await request.json());
    if (!parsed.success) {
      return bad("That didn't look right. Please check your details and try again.");
    }
    const body = parsed.data;
    if (body.website) {
      // Fake success (plausible code, mirroring the booking checkout's fake
      // bookingNumber) — a bot that filled the honeypot never learns this
      // failed. No certificate is issued.
      return NextResponse.json({ success: true, code: generateGiftCode() });
    }

    const product = getGiftProduct(body.productId);
    if (!product) return bad("That gift certificate isn't available.");

    // ---- Charge (server-priced, never trusts the browser) ----
    if (!isSquareConfigured()) {
      console.error("[gift] checkout hit with Square unconfigured");
      return bad("Online payment isn't available right now. Please call the farm.", 503);
    }
    if (!body.sourceId) {
      return bad("Please add a payment method.");
    }
    const charge = await chargeCard({
      sourceId: body.sourceId,
      amountCents: product.amountCents,
      idempotencyKey: body.idempotencyKey,
      orderNumber: `GIFT-${Date.now().toString(36).toUpperCase()}`,
      buyerEmail: body.purchaser.email,
      note: `Highland Farms gift certificate: ${product.name}`,
    });
    if (!charge.ok || !charge.paymentId) {
      return bad(charge.error ?? "That payment didn't go through.", 402, {
        reuseIdempotencyKey: charge.outcome === "unknown",
      });
    }
    if (typeof charge.amountCents === "number" && charge.amountCents !== product.amountCents) {
      console.error(
        `[gift] AMOUNT MISMATCH product=${product.id} square_payment=${charge.paymentId} expected=${product.amountCents} captured=${charge.amountCents}`,
      );
    }

    // ---- Money taken. Issue the certificate. ----
    let code: string;
    try {
      code = await issueGiftCertificate({
        product,
        purchaserEmail: body.purchaser.email,
        recipientEmail: body.recipientEmail ?? null,
        paymentId: charge.paymentId,
      });
    } catch (err) {
      // The card was charged and there is no certificate row. This is the
      // exact "money taken, record missing" failure the booking checkout's
      // confirm-fallback path exists to avoid — there is no fallback here
      // (there is no row to force-confirm), so the loudest possible trace is
      // the only recovery mechanism: the farm reconciles this payment id by
      // hand and issues the code manually.
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[gift] CRITICAL: charge succeeded but certificate insert failed. PAID and UNISSUED. product=${product.id} payment=${charge.paymentId} purchaser=${body.purchaser.email} error=${message}`,
        err,
      );
      return NextResponse.json({ success: true, code: null });
    }

    after(async () => {
      try {
        await sendGiftEmails({
          code,
          product,
          purchaserName: body.purchaser.name,
          purchaserEmail: body.purchaser.email,
          recipientEmail: body.recipientEmail ?? null,
          message: body.message ?? null,
        });
      } catch (err) {
        console.error("[gift] confirmation emails threw:", err);
      }
    });

    return NextResponse.json({ success: true, code });
  } catch (err) {
    console.error("[gift] checkout error:", err);
    return bad("Something went wrong. Please try again, or call the farm.", 500);
  }
}
