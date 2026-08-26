import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifySquareSignature } from "@/lib/shop/square-webhook";

/**
 * Square webhook — the other half of the POS link, and the reconciliation the
 * checkout couldn't do on its own.
 *
 * Handles:
 *   inventory.count.updated — a sale rung up at the farm (or any stock edit in
 *     Square) lands here and updates the website's count, so the same physical
 *     item can't be sold twice.
 *   payment.created / payment.updated — proves a payment exists. If a payment
 *     completed but no order row was ever written (the charge succeeded and the
 *     insert failed), we surface it loudly instead of losing it.
 *   refund.created / refund.updated — records money given back, which the
 *     Square dashboard previously did without the website ever knowing.
 *
 * Every branch is idempotent: Square retries until it gets a 2xx, so the same
 * event id WILL arrive more than once.
 */

export const dynamic = "force-dynamic";

let client: SupabaseClient | undefined;
function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Square webhook needs Supabase server credentials");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

interface SquareEvent {
  event_id?: string;
  type?: string;
  data?: {
    id?: string;
    object?: {
      inventory_counts?: {
        catalog_object_id?: string;
        state?: string;
        quantity?: string;
        location_id?: string;
      }[];
      payment?: {
        id?: string;
        status?: string;
        reference_id?: string;
        order_id?: string;
        amount_money?: { amount?: number };
      };
      refund?: {
        id?: string;
        status?: string;
        payment_id?: string;
        amount_money?: { amount?: number };
      };
    };
  };
}

/** Returns false when this event id has already been processed. */
async function claimEvent(eventId: string, eventType: string): Promise<boolean> {
  const { error } = await db()
    .from("shop_webhook_events")
    .insert({ event_id: eventId, event_type: eventType });

  if (!error) return true;
  // 23505 = unique violation = we've already handled this delivery.
  if (error.code === "23505") return false;
  console.error("[square-webhook] could not claim event:", error.message);
  // Fail open: better to risk a duplicate-safe handler than to drop the event.
  return true;
}

async function handleInventory(event: SquareEvent): Promise<void> {
  const counts = event.data?.object?.inventory_counts ?? [];
  for (const c of counts) {
    if (c.state !== "IN_STOCK" || !c.catalog_object_id) continue;
    const quantity = Math.max(0, Math.floor(Number(c.quantity ?? 0)));

    const { data, error } = await db().rpc("sync_square_stock", {
      p_variation_id: c.catalog_object_id,
      p_quantity: quantity,
    });

    if (error) {
      console.error("[square-webhook] sync_square_stock failed:", error.message);
      continue;
    }
    // 0 rows = a Square variation we have no mapping for. Normal: the farm
    // sells plenty (wedding deposits, pumpkins) the website never lists.
    if (data === 0) continue;
    console.log(
      `[square-webhook] stock synced from Square: ${c.catalog_object_id} -> ${quantity}`,
    );
  }
}

async function handlePayment(event: SquareEvent): Promise<void> {
  const payment = event.data?.object?.payment;
  if (!payment?.id || payment.status !== "COMPLETED") return;

  // Does this payment correspond to an order we recorded?
  const { data, error } = await db()
    .from("shop_orders")
    .select("id, order_number")
    .eq("square_payment_id", payment.id)
    .maybeSingle();

  if (error) {
    console.error("[square-webhook] order lookup failed:", error.message);
    return;
  }
  if (data) return; // already reconciled

  // A payment carrying our reference_id but with no order row means the charge
  // succeeded and the order write did not. That is the failure mode that used
  // to be invisible — money taken, farm never told.
  if (payment.reference_id?.startsWith("HF-")) {
    console.error(
      `[square-webhook] ⚠️ ORPHAN PAYMENT — website order ${payment.reference_id} was charged ` +
        `(square_payment=${payment.id}, amount=${payment.amount_money?.amount}) but no shop_orders row exists. ` +
        `Reconcile manually.`,
    );
    await db()
      .from("shop_webhook_events")
      .update({ event_type: "payment.orphan" })
      .eq("event_id", event.event_id ?? "");
  }
  // Payments without our reference are ordinary POS/invoice sales. Not ours.
}

async function handleRefund(event: SquareEvent): Promise<void> {
  const refund = event.data?.object?.refund;
  if (!refund?.payment_id || refund.status !== "COMPLETED") return;

  const { data, error } = await db()
    .from("shop_orders")
    .select("id, refunded_cents, total_cents")
    .eq("square_payment_id", refund.payment_id)
    .maybeSingle();

  if (error || !data) return; // a refund on a POS sale, not a website order

  const refunded = (data.refunded_cents as number) + (refund.amount_money?.amount ?? 0);
  const fullyRefunded = refunded >= (data.total_cents as number);

  const { error: updateError } = await db()
    .from("shop_orders")
    .update({
      refunded_cents: refunded,
      status: fullyRefunded ? "refunded" : "partially_refunded",
    })
    .eq("id", data.id);

  if (updateError) {
    console.error("[square-webhook] refund update failed:", updateError.message);
    return;
  }
  console.log(`[square-webhook] refund recorded on order ${data.id}: ${refunded} cents`);
}

export async function POST(request: Request) {
  // Read the RAW body. Re-serialising parsed JSON changes bytes and the
  // signature will never match.
  const rawBody = await request.text();

  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl =
    process.env.SQUARE_WEBHOOK_URL ??
    "https://highlandfarmsoregon.com/api/square/webhook";

  if (!signatureKey) {
    console.error("[square-webhook] SQUARE_WEBHOOK_SIGNATURE_KEY is not set");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const valid = verifySquareSignature(
    rawBody,
    request.headers.get("x-square-hmacsha256-signature"),
    notificationUrl,
    signatureKey,
  );
  if (!valid) {
    console.error("[square-webhook] signature mismatch");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: SquareEvent;
  try {
    event = JSON.parse(rawBody) as SquareEvent;
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const eventId = event.event_id;
  const type = event.type ?? "";
  if (!eventId) return NextResponse.json({ ok: true });

  if (!(await claimEvent(eventId, type))) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    if (type === "inventory.count.updated") {
      await handleInventory(event);
    } else if (type === "payment.created" || type === "payment.updated") {
      await handlePayment(event);
    } else if (type === "refund.created" || type === "refund.updated") {
      await handleRefund(event);
    }
  } catch (err) {
    // Always 200 after a verified event: a 5xx makes Square retry, and a
    // handler bug would turn into an infinite redelivery loop.
    console.error(`[square-webhook] handler for ${type} threw:`, err);
  }

  return NextResponse.json({ ok: true });
}
