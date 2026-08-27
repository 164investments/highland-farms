import { after, NextResponse } from "next/server";
import { z } from "zod";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import {
  BOOKING_PRODUCTS, COMBO, unitsFor,
} from "@/lib/booking/products";
import { slotCapacity } from "@/lib/booking/engine";
import { slotToUtc } from "@/lib/booking/time";
import {
  claimSlots, confirmBookings, releaseBookings,
  getGiftCertificate, redeemGiftCertificate, restoreGiftCertificate,
  getScheduleData, type ClaimLeg,
} from "@/lib/booking/store";
import { generateBookingNumber } from "@/lib/booking/booking-number";
import { chargeCard, isSquareConfigured } from "@/lib/shop/square";
import { claimTrackingEvent } from "@/lib/tracking-dedupe";
import { sendBookingPurchase } from "@/lib/ga4";
import { sendMetaPurchase } from "@/lib/meta";
import { sendBookingEmails } from "@/lib/booking/confirmation-email";

/**
 * Native calendar checkout.
 *
 * Order of operations mirrors src/app/api/shop/checkout/route.ts:
 *   1. validate the request shape
 *   2. re-derive every leg's slot + price from the server catalog/engine
 *   3. RESERVE the slot(s) — before any money moves
 *   4. apply a gift certificate, if any
 *   5. charge the remaining balance
 *   6. on any failure after the claim, release the hold (and restore the gift)
 *   7. confirm, then email + track
 */

const ALLOWED_ORIGINS = [
  "https://highlandfarmsoregon.com",
  "https://www.highlandfarmsoregon.com",
];
if (process.env.NODE_ENV === "development") {
  ALLOWED_ORIGINS.push("http://localhost:3000", "http://localhost:3099");
}

// Checkout is more forgiving than the contact form: a declined card is a
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

const checkoutSchema = z.object({
  sourceId: z.string().min(1).max(2048).optional(),
  idempotencyKey: z.string().min(8).max(128),
  product: z.enum(["farm-tour", "nordic-spa", "combo", "wedding-call"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  spaTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), // combo's second leg
  partySize: z.number().int().min(1).max(6),
  customer: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().min(7).max(40),
  }),
  referralSource: z.string().trim().min(1).max(200),
  policyAgreed: z.literal(true),
  locationChoice: z.enum(["meet", "in_person"]).optional(),
  giftCode: z.string().trim().max(64).optional(),
  attribution: z.record(z.string(), z.string()).optional(),
  clientId: z.string().max(64).optional(),
  fbp: z.string().max(128).optional(),
  fbc: z.string().max(256).optional(),
  website: z.string().max(200).optional(), // honeypot
});

export async function POST(request: Request) {
  if (!nativeCalendarEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    cleanupRateLimit();

    // Compare parsed origins, never startsWith — "https://highlandfarmsoregon.com"
    // is a prefix of "https://highlandfarmsoregon.com.evil.com".
    const originOk = isAllowedOrigin(request.headers.get("origin"));
    const refererOk = isAllowedOrigin(request.headers.get("referer"));
    if (!originOk && !refererOk) {
      return bad("Unauthorized request origin.", 403);
    }

    // Vercel sets x-vercel-forwarded-for itself; the leftmost value of the
    // plain x-forwarded-for is client-supplied and trivially spoofed, which
    // would let one attacker rotate past the limiter at will.
    const ip =
      request.headers.get("x-vercel-forwarded-for")?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
      "unknown";
    if (isRateLimited(ip)) {
      return bad("Too many attempts. Please wait a few minutes, or call the farm.", 429);
    }

    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) {
      return bad("That booking didn't look right. Please check your details and try again.");
    }
    const body = parsed.data;
    if (body.website) {
      return NextResponse.json({ success: true, bookingNumber: generateBookingNumber(), amountCents: 0 });
    }

    // ---- Resolve legs. The server re-derives every price and slot. ----
    const isCombo = body.product === "combo";
    const legDefs = isCombo
      ? [
          { slug: "farm-tour" as const, time: body.time },
          { slug: "nordic-spa" as const, time: body.spaTime! },
        ]
      : [{ slug: body.product as Exclude<typeof body.product, "combo">, time: body.time }];
    if (isCombo && !body.spaTime) return bad("Pick a spa time for your Full Farm Day.");

    const slugs = legDefs.map((l) => l.slug);
    const data = await getScheduleData(slugs, body.date, body.date);
    const now = new Date();

    const legs: ClaimLeg[] = [];
    for (const def of legDefs) {
      const product = BOOKING_PRODUCTS[def.slug];
      if (body.partySize < product.minParty || body.partySize > product.maxParty) {
        return bad(`${product.name} is for ${product.minParty}-${product.maxParty} guests.`);
      }
      const capacity = slotCapacity({
        product, dateStr: body.date, time: def.time,
        schedules: data.schedules, exceptions: data.exceptions,
        blackouts: data.blackouts, now,
      });
      if (capacity === null) {
        return bad("That time isn't offered on that date. Please pick from the calendar.", 409);
      }
      legs.push({
        productSlug: product.slug,
        startsAt: slotToUtc(body.date, def.time).toISOString(),
        durationMin: product.durationMin,
        capacity,
        partySize: body.partySize,
        units: unitsFor(product, body.partySize),
        amountCents: product.pricePerPersonCents * body.partySize,
      });
    }

    // Combo buffer, either order (mirror of engine.comboDays). `legs` is built
    // from `legDefs` above, which puts the tour leg first for combo — the
    // destructure below is safe.
    if (isCombo) {
      const [tourLeg, spaLeg] = legs;
      const t = Date.parse(tourLeg.startsAt);
      const s = Date.parse(spaLeg.startsAt);
      const ok =
        s - (t + tourLeg.durationMin * 60000) >= COMBO.bufferMin * 60000 ||
        t - (s + spaLeg.durationMin * 60000) >= COMBO.bufferMin * 60000;
      if (!ok) return bad("Those two times overlap. Leave at least 30 minutes between them.");
    }

    const totalCents = legs.reduce((sum, l) => sum + l.amountCents, 0);

    // ---- Hold the slot(s) BEFORE money moves ----
    const bookingNumber = generateBookingNumber();
    const claim = await claimSlots(legs, {
      bookingNumber,
      firstName: body.customer.firstName,
      lastName: body.customer.lastName,
      email: body.customer.email,
      phone: body.customer.phone,
      referralSource: body.referralSource,
      policyAgreedAt: new Date().toISOString(),
      locationChoice: body.locationChoice ?? null,
    });
    if (!claim.ok) return bad(claim.message, claim.reason === "slot_full" ? 409 : 503);

    // ---- Gift certificate ----
    // `value` certs hold cents; `visits` certs (the Spa 3-Visit Pack) hold
    // per-person session credits. The units the redeem RPC consumes therefore
    // DIFFER by kind — decrementing a visits cert by cents would vaporize it.
    let giftApplied = 0;        // cents credited toward this booking
    let giftUnitsUsed = 0;      // raw units consumed (for restore on failure)
    const giftCode = body.giftCode?.toUpperCase() ?? null;
    if (giftCode && totalCents > 0) {
      const cert = await getGiftCertificate(giftCode);
      // visits certs MUST be product-scoped (a visit credit is a seat in ONE
      // product); value certs may be scoped or universal.
      const scopeOk =
        cert &&
        (cert.kind === "visits"
          ? cert.productScope !== null &&
            legs.every((l) => l.productSlug === cert.productScope)
          : cert.productScope === null ||
            legs.every((l) => l.productSlug === cert.productScope));
      if (!cert || !scopeOk) {
        await releaseBookings(claim.ids);
        return bad(
          cert
            ? "That gift code is for a different experience."
            : "That gift code isn't valid. Check it and try again.",
          400,
        );
      }
      const requested =
        cert.kind === "visits" ? body.partySize /* seats */ : totalCents;
      const applied = await redeemGiftCertificate(giftCode, requested);
      if (applied === null) {
        await releaseBookings(claim.ids);
        return bad("That gift code isn't valid. Check it and try again.", 400);
      }
      giftUnitsUsed = applied;
      // A visit credit = one seat at the scoped product's per-person price
      // (single-leg here — visits certs are scope-checked above, and combo has
      // two products so it can never match a scoped cert).
      const perSeatCents = totalCents / body.partySize;
      giftApplied =
        cert.kind === "visits"
          ? Math.min(applied * perSeatCents, totalCents)
          : applied;
    }
    const dueCents = totalCents - giftApplied;

    // ---- Charge (skipped when free or fully covered) ----
    let paymentId: string | null = null;
    if (dueCents > 0) {
      if (!isSquareConfigured()) {
        console.error("[booking] checkout hit with Square unconfigured");
        if (giftUnitsUsed > 0 && giftCode) await restoreGiftCertificate(giftCode, giftUnitsUsed);
        await releaseBookings(claim.ids);
        return bad("Online payment isn't available right now. Please call the farm.", 503);
      }
      if (!body.sourceId) {
        if (giftUnitsUsed > 0 && giftCode) await restoreGiftCertificate(giftCode, giftUnitsUsed);
        await releaseBookings(claim.ids);
        return bad("Please add a payment method.");
      }
      const charge = await chargeCard({
        sourceId: body.sourceId,
        amountCents: dueCents,
        idempotencyKey: body.idempotencyKey,
        orderNumber: bookingNumber,
        buyerEmail: body.customer.email,
        note: `Highland Farms booking ${bookingNumber} (${body.product})`,
      });
      if (!charge.ok || !charge.paymentId) {
        if (giftUnitsUsed > 0 && giftCode) await restoreGiftCertificate(giftCode, giftUnitsUsed);
        await releaseBookings(claim.ids);
        return bad(charge.error ?? "That payment didn't go through.", 402, {
          reuseIdempotencyKey: charge.outcome === "unknown",
        });
      }
      if (typeof charge.amountCents === "number" && charge.amountCents !== dueCents) {
        console.error(
          `[booking] AMOUNT MISMATCH booking=${bookingNumber} square_payment=${charge.paymentId} expected=${dueCents} captured=${charge.amountCents}`,
        );
      }
      paymentId = charge.paymentId;
    }

    // ---- Money taken (or free). Nothing below may fail the request. ----
    try {
      await confirmBookings(claim.ids, paymentId, giftApplied > 0 ? giftCode : null, giftApplied);
    } catch {
      console.error(
        `[booking] CONFIRM FAILED after payment. booking=${bookingNumber} payment=${paymentId} ids=${claim.ids.join(",")}`,
      );
    }

    const emailData = {
      bookingNumber,
      product: body.product,
      legs: legs.map((l) => ({
        productSlug: l.productSlug,
        startsAt: l.startsAt,
        durationMin: l.durationMin,
      })),
      partySize: body.partySize,
      customerName: `${body.customer.firstName} ${body.customer.lastName}`,
      customerEmail: body.customer.email,
      customerPhone: body.customer.phone,
      totalCents,
      giftAppliedCents: giftApplied,
      paidCents: dueCents,
      locationChoice: body.locationChoice ?? null,
    };

    after(async () => {
      try {
        await sendBookingEmails(emailData);
      } catch (err) {
        console.error("[booking] confirmation emails threw:", err);
      }
      try {
        // Track CASH COLLECTED (dueCents), not the pre-gift total: gift-cert
        // revenue is tracked when the certificate is sold — counting it again
        // at redemption would double-count and inflate ad ROAS.
        const fresh = await claimTrackingEvent(`native_${bookingNumber}`, "purchase", "native-booking");
        if (fresh && dueCents > 0) {
          await sendBookingPurchase({
            transaction_id: bookingNumber,
            value: dueCents / 100,
            booking_type: body.product === "nordic-spa" ? "nordic_spa" : body.product.replace(/-/g, "_"),
            items: legs.map((l) => ({
              item_id: l.productSlug,
              item_name: BOOKING_PRODUCTS[l.productSlug as keyof typeof BOOKING_PRODUCTS].name,
              price: l.amountCents / 100,
              quantity: 1,
            })),
            referral_source: body.referralSource,
            attribution: body.attribution,
            client_id: body.clientId,
          });
          await sendMetaPurchase({
            transaction_id: `native_${bookingNumber}`,
            value: dueCents / 100,
            content_name: emailData.legs.map((l) => l.productSlug).join("+"),
            content_category: "booking",
            email: body.customer.email,
            phone: body.customer.phone,
            fbc: body.fbc,
            fbp: body.fbp,
            referral_source: body.referralSource,
          });
        }
      } catch (err) {
        console.error("[booking] tracking threw:", err);
      }
    });

    return NextResponse.json({ success: true, bookingNumber, amountCents: dueCents });
  } catch (err) {
    console.error("[booking] checkout error:", err);
    return bad("Something went wrong. Please try again, or call the farm.", 500);
  }
}
