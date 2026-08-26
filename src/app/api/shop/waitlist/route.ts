import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getVariant } from "@/app/shop/data";

/**
 * "Tell me when it's back."
 *
 * Turns a sold-out page from a dead end into the only email capture this store
 * has before checkout.
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
    if (!url || !key) throw new Error("waitlist needs Supabase server credentials");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

const schema = z.object({
  variantId: z.string().min(1).max(64),
  email: z.string().trim().email().max(200),
  website: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  if (!isAllowedOrigin(request.headers.get("origin")) && !isAllowedOrigin(request.headers.get("referer"))) {
    return NextResponse.json({ error: "Unauthorized request origin." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That email didn't look right." }, { status: 400 });
  }
  const { variantId, email, website } = parsed.data;

  // Honeypot. Look successful, write nothing.
  if (website) return NextResponse.json({ ok: true });

  if (!getVariant(variantId)) {
    return NextResponse.json({ error: "That product is no longer listed." }, { status: 404 });
  }

  const { error } = await db()
    .from("shop_waitlist")
    .insert({ variant_id: variantId, email: email.toLowerCase() });

  // 23505 = already on the list. From the customer's side that's a success.
  if (error && error.code !== "23505") {
    console.error("[shop] waitlist insert failed:", error.message);
    return NextResponse.json({ error: "Couldn't save that. Try again?" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
