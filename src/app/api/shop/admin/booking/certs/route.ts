import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidToken, tokenFromRequest } from "@/lib/shop/admin-auth";
import { getGiftProduct, issueGiftCertificate } from "@/lib/booking/gift";
import { lookupGiftCertificate, voidGiftCertificate, auditBooking } from "@/lib/booking/store";

/**
 * Admin gift-certificate desk: look one up, issue one for a phone/counter
 * sale, or void one outright (lost code, a refunded order, etc.).
 *
 * Issuing reuses `issueGiftCertificate` from `gift.ts` (the same code
 * generator + collision retry the online purchase flow uses) rather than
 * duplicating it. `paymentId` is optional here — a phone sale may have been
 * run on the farm's Square POS terminal directly (admin enters that payment
 * id) or taken as cash/check (left null, recorded as "admin_manual" so the
 * distinction is visible in the row without a schema change).
 */

export const dynamic = "force-dynamic";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  if (!isValidToken(tokenFromRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim().toUpperCase();
  if (!code) return bad("code is required.");

  try {
    const certificate = await lookupGiftCertificate(code);
    if (!certificate) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ certificate });
  } catch (err) {
    console.error("[booking-admin] cert lookup failed:", err);
    return NextResponse.json({ error: "Could not look up that certificate." }, { status: 500 });
  }
}

const issueSchema = z.object({
  action: z.literal("issue"),
  productId: z.enum(["tour-for-two", "spa-for-two", "spa-3-visit"]),
  purchaserEmail: z.string().trim().email().max(200),
  recipientEmail: z.string().trim().email().max(200).nullable().optional(),
  paymentId: z.string().trim().max(64).nullable().optional(),
});

const voidSchema = z.object({
  action: z.literal("void"),
  code: z.string().trim().min(1).max(64),
});

const postSchema = z.discriminatedUnion("action", [issueSchema, voidSchema]);

export async function POST(request: Request) {
  if (!isValidToken(tokenFromRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return bad("Invalid payload");
  const body = parsed.data;

  if (body.action === "issue") {
    const product = getGiftProduct(body.productId);
    if (!product) return bad("Unknown gift product.");
    try {
      const code = await issueGiftCertificate({
        product,
        purchaserEmail: body.purchaserEmail,
        recipientEmail: body.recipientEmail ?? null,
        paymentId: body.paymentId ?? "admin_manual",
      });
      await auditBooking(
        "gift_cert_issued",
        null,
        {
          code,
          product_id: body.productId,
          purchaser_email: body.purchaserEmail,
          recipient_email: body.recipientEmail ?? null,
          payment_id: body.paymentId ?? null,
        },
        "admin",
      );
      return NextResponse.json({ ok: true, code });
    } catch (err) {
      console.error("[booking-admin] cert issue failed:", err);
      return NextResponse.json({ error: "Could not issue the certificate." }, { status: 500 });
    }
  }

  // action === "void"
  const code = body.code.trim().toUpperCase();
  try {
    const voided = await voidGiftCertificate(code);
    if (!voided) {
      return NextResponse.json({ error: "Certificate not found, or already void." }, { status: 404 });
    }
    await auditBooking("gift_cert_voided", null, { code }, "admin");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[booking-admin] cert void failed:", err);
    return NextResponse.json({ error: "Could not void the certificate." }, { status: 500 });
  }
}
