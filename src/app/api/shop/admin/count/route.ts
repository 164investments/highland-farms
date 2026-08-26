import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { isValidToken, tokenFromRequest } from "@/lib/shop/admin-auth";

/**
 * Submit a stock count.
 *
 * The whole session lands in one transaction and leaves an audit row per item
 * recording what the system thought beforehand. This is the replacement for
 * counting onto a spreadsheet and re-typing it: the count goes straight into the
 * number the storefront reads, and it stays traceable.
 */

export const dynamic = "force-dynamic";

let client: SupabaseClient | undefined;
function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("stock count needs Supabase server credentials");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

const schema = z.object({
  countedBy: z.string().trim().min(1).max(80),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1).max(64),
        counted: z.number().int().min(0).max(100000),
      }),
    )
    .min(1)
    .max(500),
});

export async function POST(request: Request) {
  if (!isValidToken(tokenFromRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Add your name and at least one count." },
      { status: 400 },
    );
  }
  const { countedBy, items } = parsed.data;

  const { data, error } = await db().rpc("apply_stock_count", {
    p_counted_by: countedBy,
    p_items: items.map((i) => ({ variant_id: i.variantId, counted: i.counted })),
  });

  if (error) {
    console.error("[shop-admin] apply_stock_count failed:", error.code, error.message);
    if (error.code === "P0002") {
      return NextResponse.json(
        { error: "One of those products is no longer in the catalog. Reload and try again." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Could not save the count." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, applied: data as number });
}
