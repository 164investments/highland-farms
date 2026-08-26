import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getVariant } from "@/app/shop/data";
import { toCents } from "@/lib/shop/money";
import { deliveryFeeCents, deliveryProblem } from "@/lib/shop/fulfillment";
import {
  adjustInventory,
  chargeCard,
  createOrder,
  isSquareConfigured,
} from "@/lib/shop/square";
import { getSquareVariationMap } from "@/lib/shop/inventory";
import {
  claimStock,
  generateOrderNumber,
  recordOrder,
  releaseStock,
  type PricedLine,
} from "@/lib/shop/orders";
import { sendOrderEmails } from "@/lib/shop/order-email";

/**
 * Farm store checkout.
 *
 * Order of operations matters here:
 *   1. validate the request shape
 *   2. re-price every line from the server catalog (the browser's prices are ignored)
 *   3. apply the fulfillment rules
 *   4. RESERVE stock — before any money moves
 *   5. charge the card
 *   6. on decline, hand the stock back and stop
 *   7. record the order, then email
 *
 * Reserving before charging is deliberate: a customer must never be charged
 * for a cut that sold out while they were typing their card in.
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

const checkoutSchema = z.object({
  sourceId: z.string().min(1).max(2048),
  idempotencyKey: z.string().min(8).max(128),
  fulfillment: z.enum(["pickup", "delivery"]),
  customer: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().min(7).max(40),
  }),
  delivery: z
    .object({
      address: z.string().trim().min(1).max(240),
      city: z.string().trim().min(1).max(120),
      zip: z.string().trim().min(5).max(10),
    })
    .optional(),
  notes: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1).max(64),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(40),
  // Honeypot. Deliberately permissive: a max(0) rule here would reject the bot
  // at the schema and never reach the silent-success branch below.
  website: z.string().max(200).optional(),
});

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

export async function POST(request: Request) {
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

    if (!isSquareConfigured()) {
      console.error("[shop] checkout hit with Square unconfigured");
      return bad(
        "Online payment isn't available right now. Please call the farm and we'll take your order.",
        503,
      );
    }

    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) {
      return bad("That order didn't look right. Please check your details and try again.");
    }
    const body = parsed.data;

    if (body.website) {
      // Honeypot tripped. Look successful; write nothing.
      return NextResponse.json({ success: true, orderNumber: generateOrderNumber() });
    }

    // ---- Re-price from the server catalog. Client prices are never trusted. ----
    const lines: PricedLine[] = [];
    for (const item of body.items) {
      const found = getVariant(item.variantId);
      if (!found) {
        return bad("One of those items is no longer available. Please refresh your cart.");
      }
      lines.push({
        variantId: item.variantId,
        productSlug: found.product.slug,
        productName: found.product.name,
        variantLabel: found.variant.label,
        unitPriceCents: toCents(found.variant.price),
        quantity: item.quantity,
      });
    }

    // Merge duplicate variant ids so stock maths can't be gamed by splitting a
    // single SKU across several lines.
    const merged = new Map<string, PricedLine>();
    for (const line of lines) {
      const existing = merged.get(line.variantId);
      if (existing) existing.quantity += line.quantity;
      else merged.set(line.variantId, { ...line });
    }
    const finalLines = [...merged.values()];
    if (finalLines.some((l) => l.quantity > 99)) {
      return bad("That's more than we can sell in one order. Please call the farm.");
    }

    const subtotalCents = finalLines.reduce(
      (sum, l) => sum + l.unitPriceCents * l.quantity,
      0,
    );

    // ---- Fulfillment rules ----
    if (body.fulfillment === "delivery" && !body.delivery) {
      return bad("Please add a delivery address.");
    }
    const problem = deliveryProblem(
      body.fulfillment,
      body.delivery?.zip ?? "",
      subtotalCents,
    );
    if (problem) return bad(problem);

    const feeCents = deliveryFeeCents(body.fulfillment);
    const totalCents = subtotalCents + feeCents;
    if (totalCents <= 0) {
      return bad("That order came to nothing. Please add an item.");
    }

    // ---- Reserve stock BEFORE charging ----
    const claim = await claimStock(finalLines);
    if (!claim.ok) {
      return bad(claim.message, claim.reason === "out_of_stock" ? 409 : 503);
    }

    // ---- Build the Square order first, so the sale is itemised in the same
    // reporting the farm reads for the POS, and so a mapped+tracked variation
    // has its Square count moved by this sale. Never allowed to block a charge.
    const orderNumber = generateOrderNumber();
    const squareMap = await getSquareVariationMap();
    const linesWithSquare = finalLines.map((l) => ({
      ...l,
      squareVariationId: squareMap.get(l.variantId),
    }));

    const squareOrderId = await createOrder(
      linesWithSquare.map((l) => ({
        name: l.productName,
        variantLabel: l.variantLabel,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
        squareVariationId: l.squareVariationId,
      })),
      {
        orderNumber,
        deliveryFeeCents: feeCents,
        idempotencyKey: body.idempotencyKey,
      },
    );

    // ---- Charge ----
    const charge = await chargeCard({
      sourceId: body.sourceId,
      amountCents: totalCents,
      idempotencyKey: body.idempotencyKey,
      orderNumber,
      buyerEmail: body.customer.email,
      note: `Highland Farms order ${orderNumber} (${body.fulfillment})`,
      orderId: squareOrderId ?? undefined,
    });

    if (!charge.ok || !charge.paymentId) {
      await releaseStock(finalLines);
      // On an "unknown" outcome the card may in fact have been charged, so the
      // browser must retry with the SAME idempotency key — that is what makes
      // Square return the original payment instead of charging twice.
      return bad(charge.error ?? "That payment didn't go through.", 402, {
        reuseIdempotencyKey: charge.outcome === "unknown",
      });
    }

    // Square should never capture an amount we didn't ask for, but never ship
    // goods against an unverified number.
    if (
      typeof charge.amountCents === "number" &&
      charge.amountCents !== totalCents
    ) {
      console.error(
        `[shop] AMOUNT MISMATCH order=${orderNumber} square_payment=${charge.paymentId} expected=${totalCents} captured=${charge.amountCents}`,
      );
    }

    // ---- Money is taken. Nothing below may fail the request. ----
    const emailData = {
      orderNumber,
      fulfillment: body.fulfillment,
      customerName: body.customer.name,
      customerEmail: body.customer.email,
      customerPhone: body.customer.phone,
      deliveryAddress: body.delivery?.address,
      deliveryCity: body.delivery?.city,
      deliveryZip: body.delivery?.zip,
      notes: body.notes,
      subtotalCents,
      deliveryFeeCents: feeCents,
      totalCents,
      lines: finalLines,
    };

    try {
      await recordOrder({
        ...emailData,
        squarePaymentId: charge.paymentId,
        squareOrderId: squareOrderId ?? undefined,
      });
    } catch (err) {
      // The customer has paid. Do not show them an error — surface it for the
      // farm to reconcile against the Square payment id.
      console.error(
        `[shop] ORDER RECORD FAILED after successful payment. order=${orderNumber} square_payment=${charge.paymentId}`,
        err,
      );
    }

    after(async () => {
      // Move Square's own stock for anything the farm has mapped, so the
      // register sees this sale. Runs after the response for the same reason
      // the emails do: the money is already taken.
      try {
        await adjustInventory(
          linesWithSquare
            .filter((l) => l.squareVariationId)
            .map((l) => ({
              squareVariationId: l.squareVariationId!,
              quantity: l.quantity,
            })),
          body.idempotencyKey,
        );
      } catch (err) {
        console.error("[shop] square inventory adjust threw:", err);
      }

      try {
        await sendOrderEmails(emailData);
      } catch (err) {
        console.error("[shop] order emails threw:", err);
      }
    });

    return NextResponse.json({ success: true, orderNumber });
  } catch (err) {
    console.error("[shop] checkout error:", err);
    return bad("Something went wrong. Please try again, or call the farm.", 500);
  }
}
