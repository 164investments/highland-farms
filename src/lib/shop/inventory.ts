import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SquareInventorySnapshot } from "./square";

/**
 * Live stock for the farm store.
 *
 * The catalog (names, prices, images) is static in `src/app/shop/data.ts`, but
 * availability lives in Supabase so the farm can sell out a cut without a
 * deploy. Reads go through the service-role key: `shop_inventory` has RLS on
 * and no anon grants, so the browser can never read or write it directly.
 */

/** variant id -> units left. `null` means unlimited / made to order. */
export type StockMap = Map<string, number | null>;

let client: SupabaseClient | undefined;

function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Shop inventory needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
      );
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

/**
 * Read the whole stock table.
 *
 * Used for display only. It is deliberately NOT the thing that decides whether
 * an order may proceed — a shopper can sit on the page while the last plush
 * sells. Checkout re-checks atomically via `claim_shop_stock`.
 *
 * Fails soft: if Supabase is unreachable the store still renders, it just
 * can't show "only 2 left". Better a browsable shop than a 500.
 */
export async function getStockMap(): Promise<StockMap> {
  try {
    const { data, error } = await db()
      .from("shop_inventory")
      .select("variant_id, stock");

    if (error) {
      console.error("[shop] inventory read failed:", error.message);
      return new Map();
    }
    return new Map((data ?? []).map((r) => [r.variant_id as string, r.stock as number | null]));
  } catch (err) {
    console.error("[shop] inventory read threw:", err);
    return new Map();
  }
}

/**
 * variant id -> Square catalog variation id, for variants the farm has linked.
 * Used to build itemised Square orders so an online sale moves the same count
 * the POS reads.
 */
export async function getSquareVariationMap(strict = false): Promise<Map<string, string>> {
  try {
    const { data, error } = await db()
      .from("shop_inventory")
      .select("variant_id, square_variation_id")
      .not("square_variation_id", "is", null);
    if (error) {
      console.error("[shop] square mapping read failed:", error.message);
      if (strict) throw new Error(`Square mapping read failed: ${error.message}`);
      return new Map();
    }
    return new Map(
      (data ?? []).map((r) => [r.variant_id as string, r.square_variation_id as string]),
    );
  } catch (err) {
    console.error("[shop] square mapping read threw:", err);
    if (strict) throw err;
    return new Map();
  }
}

/** Refresh after an idempotent paid-order adjustment; RPC subtracts open Stripe holds. */
export async function syncSquareInventoryCounts(counts: Map<string, SquareInventorySnapshot>): Promise<void> {
  for (const [variationId, count] of counts) {
    if (!count.calculatedAt || !Number.isFinite(Date.parse(count.calculatedAt))) throw new Error("Square inventory source timestamp is required");
    const { data, error } = await db().rpc("sync_square_stock_snapshot", {
      p_variation_id: variationId,
      p_quantity: count.quantity,
      p_calculated_at: count.calculatedAt,
    });
    if (error) throw new Error(`Square inventory sync failed: ${error.message}`);
    if (data === -1) throw new Error("Square inventory snapshot was superseded; retry with current canonical counts");
  }
}

/** Units left for a variant. Unknown variants read as unlimited, matching getStockMap's fail-soft. */
export function stockFor(stock: StockMap, variantId: string): number | null {
  return stock.has(variantId) ? stock.get(variantId)! : null;
}

export function isSoldOut(stock: StockMap, variantId: string): boolean {
  return stockFor(stock, variantId) === 0;
}

/** True when every variant of a product is at zero. */
export function allSoldOut(stock: StockMap, variantIds: string[]): boolean {
  return variantIds.length > 0 && variantIds.every((id) => isSoldOut(stock, id));
}
