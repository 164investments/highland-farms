import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getVariant } from "@/app/shop/data";
import { toCents } from "@/lib/shop/money";

/**
 * Save an in-progress cart against an email, so an abandonment is recoverable.
 *
 * Called from the checkout page the moment a valid email has been typed. That
 * is the earliest honest point to capture: the shopper has volunteered an
 * address in the course of buying, which is the same basis on which they'd get
 * a receipt.
 *
 * ⛔ Only variant ids and quantities are stored. Prices are re-derived when the
 * cart is restored, exactly as the checkout re-derives them. `subtotalCents` is
 * recomputed here from the catalog and kept for the email and reporting only —
 * the client's arithmetic is never trusted, and it is never used to charge.
 */

export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = [
  "https://highlandfarmsoregon.com",
  "https://www.highlandfarmsoregon.com",
];
if (process.env.NODE_ENV === "development") {
  ALLOWED_ORIGINS.push("http://localhost:3000", "http://localhost:3099");
}

function isAllowedOrigin(value: string | null): boolean {
  if (!value) return false;
  try {
    return ALLOWED_ORIGINS.includes(new URL(value).origin);
  } catch {
    return false;
  }
}

let client: SupabaseClient | undefined;
function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("cart save needs Supabase server credentials");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

const schema = z.object({
  email: z.string().trim().email().max(200),
  name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  fulfillment: z.enum(["pickup", "delivery"]).optional(),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1).max(64),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(40),
  website: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  if (
    !isAllowedOrigin(request.headers.get("origin")) &&
    !isAllowedOrigin(request.headers.get("referer"))
  ) {
    return NextResponse.json({ error: "Unauthorized request origin." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    // Silent: this fires in the background while someone types. A validation
    // failure must never surface as an error in the middle of checkout.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
  const body = parsed.data;
  if (body.website) return NextResponse.json({ ok: true });

  // Re-derive from the catalog; drop anything we no longer sell.
  const items: { variantId: string; quantity: number }[] = [];
  let subtotalCents = 0;
  for (const item of body.items) {
    const found = getVariant(item.variantId);
    if (!found) continue;
    items.push({ variantId: item.variantId, quantity: item.quantity });
    subtotalCents += toCents(found.variant.price) * item.quantity;
  }
  if (items.length === 0) return NextResponse.json({ ok: false }, { status: 200 });

  try {
    const { error } = await db().rpc("save_abandoned_cart", {
      p_token: randomUUID(),
      p_email: body.email,
      p_name: body.name ?? null,
      p_phone: body.phone ?? null,
      p_fulfillment: body.fulfillment ?? "pickup",
      p_items: items,
      p_subtotal: subtotalCents,
    });
    if (error) console.error("[shop] save_abandoned_cart failed:", error.message);
  } catch (err) {
    console.error("[shop] save_abandoned_cart threw:", err);
  }

  return NextResponse.json({ ok: true });
}
