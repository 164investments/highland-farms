import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { isValidToken, tokenFromRequest } from "@/lib/shop/admin-auth";

/**
 * Admin inventory writes.
 *
 * Two operations the farm actually needs day to day: set a count, and set the
 * threshold at which a product starts shouting. Both are the sort of thing
 * Square or Shopify would give you a screen for, which is the whole reason this
 * exists — otherwise the farm is editing rows in Supabase Studio.
 */

export const dynamic = "force-dynamic";

let client: SupabaseClient | undefined;
function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("admin inventory needs Supabase server credentials");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

const schema = z.object({
  variantId: z.string().min(1).max(64),
  // null = unlimited / made to order, which is a real state for firewood and
  // bouquets. Not the same as zero.
  stock: z.number().int().min(0).max(100000).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).max(1000).optional(),
});

export async function POST(request: Request) {
  if (!isValidToken(tokenFromRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { variantId, stock, lowStockThreshold } = parsed.data;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (stock !== undefined) update.stock = stock;
  if (lowStockThreshold !== undefined) update.low_stock_threshold = lowStockThreshold;

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await db()
    .from("shop_inventory")
    .update(update)
    .eq("variant_id", variantId)
    .select("variant_id, stock, low_stock_threshold")
    .maybeSingle();

  if (error) {
    console.error("[shop-admin] inventory update failed:", error.message);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Unknown variant" }, { status: 404 });
  }

  // NOTE: this changes the WEBSITE count only. For a variant linked to Square,
  // Square remains the source of truth and the next inventory.count.updated
  // webhook will overwrite this. Correcting a linked product for real means
  // correcting it in Square.
  return NextResponse.json({ ok: true, ...data });
}
