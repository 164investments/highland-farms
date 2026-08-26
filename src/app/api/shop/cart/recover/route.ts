import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getVariant } from "@/app/shop/data";

/**
 * Resolve a recovery token back into a cart.
 *
 * Returns variant ids and quantities only. The browser rebuilds the cart from
 * the catalog exactly as it would if the shopper had added the items by hand,
 * so a two-day-old email can never reintroduce a stale price.
 */

export const dynamic = "force-dynamic";

let client: SupabaseClient | undefined;
function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("cart recover needs Supabase server credentials");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ items: [] });

  const { data, error } = await db()
    .from("shop_abandoned_carts")
    .select("id, items")
    .eq("recovery_token", token)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ items: [] });

  // Record the click. Best-effort: a failed stamp shouldn't cost the recovery.
  const { error: stampError } = await db()
    .from("shop_abandoned_carts")
    .update({ clicked_at: new Date().toISOString() })
    .eq("id", data.id)
    .is("clicked_at", null);
  if (stampError) console.error("[shop] cart click stamp failed:", stampError.message);

  const items = ((data.items ?? []) as { variantId: string; quantity: number }[])
    .filter((i) => getVariant(i.variantId))
    .map((i) => ({ variantId: i.variantId, quantity: i.quantity }));

  return NextResponse.json({ items });
}
