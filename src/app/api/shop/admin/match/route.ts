import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { isValidToken, tokenFromRequest } from "@/lib/shop/admin-auth";

/**
 * Link (or unlink) a website variant to a Square catalog variation.
 *
 * This is the decision the auto-matcher deliberately refuses to make on its own.
 * It got one wrong already — the website's New York Steak was matched to a
 * variable-price duplicate rather than the real "NY Steak" — which is the whole
 * argument for a human doing it in a screen instead of a script guessing.
 *
 * Linking is one-to-one: a unique index rejects a second variant claiming the
 * same Square variation, and that error is surfaced rather than swallowed.
 */

export const dynamic = "force-dynamic";

let client: SupabaseClient | undefined;
function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("match needs Supabase server credentials");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

const schema = z.object({
  variantId: z.string().min(1).max(64),
  // null clears the link
  squareVariationId: z.string().min(1).max(64).nullable(),
  squareItemName: z.string().max(200).nullable().optional(),
});

export async function POST(request: Request) {
  if (!isValidToken(tokenFromRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { variantId, squareVariationId, squareItemName } = parsed.data;

  const { error } = await db().rpc("map_square_variant", {
    p_variant_id: variantId,
    p_square_variation_id: squareVariationId ?? "",
    p_square_item_name: squareItemName ?? "",
  });

  if (error) {
    console.error("[shop-admin] map_square_variant failed:", error.code, error.message);
    if (error.code === "23505") {
      return NextResponse.json(
        {
          error:
            "That Square item is already linked to another product. Unlink it there first — one Square item can only back one product, or a single sale would move two counts.",
        },
        { status: 409 },
      );
    }
    if (error.code === "P0002") {
      return NextResponse.json({ error: "Unknown product." }, { status: 404 });
    }
    return NextResponse.json({ error: "Could not save the link." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
