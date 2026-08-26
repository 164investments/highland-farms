import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Fulfillment } from "./fulfillment";

/**
 * Order persistence and the stock reservation around it.
 *
 * Service-role only — `shop_orders` has RLS on and no anon grants, so orders
 * are never readable from the browser.
 */

let client: SupabaseClient | undefined;

function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Orders need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export interface PricedLine {
  variantId: string;
  /** Square catalog variation this maps to, when the farm has linked it. */
  squareVariationId?: string;
  productSlug: string;
  productName: string;
  variantLabel?: string;
  unitPriceCents: number;
  quantity: number;
}

export interface OrderInput {
  orderNumber: string;
  squareOrderId?: string;
  fulfillment: Fulfillment;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryZip?: string;
  notes?: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  squarePaymentId: string;
  lines: PricedLine[];
}

/** Human-facing order id: HF-260826-4821. Short enough to read over the phone. */
export function generateOrderNumber(now = new Date()): string {
  const stamp = [
    String(now.getUTCFullYear()).slice(2),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `HF-${stamp}-${suffix}`;
}

export type ClaimResult =
  | { ok: true }
  | { ok: false; reason: "out_of_stock" | "error"; message: string };

/**
 * Reserve stock for the cart. Runs BEFORE the card is charged so nobody pays
 * for something that just sold out.
 */
export async function claimStock(lines: PricedLine[]): Promise<ClaimResult> {
  const items = lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity }));
  const { error } = await db().rpc("claim_shop_stock", { items });

  if (!error) return { ok: true };

  // P0001 is the "insufficient stock" raise inside claim_shop_stock.
  if (error.code === "P0001" || /insufficient stock/i.test(error.message)) {
    return {
      ok: false,
      reason: "out_of_stock",
      message:
        "Someone just bought the last of one of those. Your card has not been charged — please refresh and try again.",
    };
  }

  console.error("[shop] claim_shop_stock failed:", error.code, error.message);
  return {
    ok: false,
    reason: "error",
    message: "We couldn't confirm availability. Your card has not been charged.",
  };
}

/** Hand reserved stock back after a failed charge. Best-effort by design. */
export async function releaseStock(lines: PricedLine[]): Promise<void> {
  const items = lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity }));
  const { error } = await db().rpc("release_shop_stock", { items });
  if (error) {
    // Loud, because it means the counts are now understated until someone looks.
    console.error(
      "[shop] release_shop_stock FAILED — inventory understated for:",
      JSON.stringify(items),
      error.message,
    );
  }
}

/**
 * Record a paid order.
 *
 * Called after the money is taken, so a failure here must never look like a
 * failed purchase to the customer — the caller reports success and this throws
 * loudly for the farm to reconcile against Square.
 *
 * The order and its lines are written by one transactional RPC: two separate
 * inserts could strand an order row with no items, which the farm cannot pick.
 */
export async function recordOrder(input: OrderInput): Promise<string> {
  const { data, error } = await db().rpc("record_shop_order", {
    order_row: {
      order_number: input.orderNumber,
      status: "paid",
      fulfillment: input.fulfillment,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      delivery_address: input.deliveryAddress ?? null,
      delivery_city: input.deliveryCity ?? null,
      delivery_zip: input.deliveryZip ?? null,
      notes: input.notes ?? null,
      subtotal_cents: input.subtotalCents,
      delivery_fee_cents: input.deliveryFeeCents,
      total_cents: input.totalCents,
      square_payment_id: input.squarePaymentId,
      square_order_id: input.squareOrderId ?? null,
      channel: "online",
    },
    order_items: input.lines.map((l) => ({
      variant_id: l.variantId,
      product_slug: l.productSlug,
      product_name: l.productName,
      variant_label: l.variantLabel ?? null,
      unit_price_cents: l.unitPriceCents,
      quantity: l.quantity,
    })),
  });

  if (error || !data) {
    throw new Error(`order insert failed: ${error?.message ?? "no id returned"}`);
  }

  return data as string;
}
