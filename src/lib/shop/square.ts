/**
 * Square payments for the farm store.
 *
 * Square (not Stripe) because the farm's account is already live and approved
 * with CREDIT_CARD_PROCESSING — the Stripe plan from May 2026 was still waiting
 * on approval and has no keys in the environment. Card details never touch this
 * server: the browser tokenises with the Web Payments SDK and posts a one-use
 * `sourceId`.
 *
 * Talks to the REST API over fetch rather than pulling in the Square SDK — one
 * endpoint doesn't justify the dependency.
 */

const SQUARE_API = "https://connect.squareup.com/v2";
const SQUARE_VERSION = "2025-06-18";

export interface ChargeInput {
  sourceId: string;
  amountCents: number;
  /** Must be stable per checkout attempt — this is what stops a double-charge. */
  idempotencyKey: string;
  orderNumber: string;
  buyerEmail: string;
  note: string;
  /** Links the payment to an itemised Square order when one was created. */
  orderId?: string;
}

export interface ChargeResult {
  ok: boolean;
  paymentId?: string;
  /** Cents Square actually captured. Asserted against the order total by the caller. */
  amountCents?: number;
  /** Safe to show a customer. Square's raw detail is logged, not surfaced. */
  error?: string;
  /**
   * Whether Square gave us a definitive answer.
   *
   * "declined" — Square replied and refused. The idempotency key is spent, so a
   *   retry MUST use a fresh one or Square rejects it as a reused key.
   * "unknown" — we never got a usable reply (network error, timeout, surprise
   *   status). The charge may well have succeeded. A retry MUST reuse the SAME
   *   idempotency key so Square returns the original payment instead of
   *   charging the card a second time.
   */
  outcome?: "declined" | "unknown";
}

function config() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!accessToken || !locationId) {
    throw new Error(
      "Square is not configured: SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID are required",
    );
  }
  return { accessToken, locationId };
}

/** True when the server can take a card at all — used to fail fast at checkout. */
export function isSquareConfigured(): boolean {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

interface SquareError {
  code?: string;
  detail?: string;
  category?: string;
}

/**
 * Map Square's error codes to something a customer can act on. Anything
 * unmapped gets a generic message — Square's `detail` can name internal
 * config and shouldn't be echoed to the browser.
 */
function customerMessage(errors: SquareError[] | undefined): string {
  const code = errors?.[0]?.code ?? "";
  switch (code) {
    case "CARD_DECLINED":
    case "GENERIC_DECLINE":
      return "That card was declined. Try another card, or call the farm and we'll take the order by phone.";
    case "INSUFFICIENT_FUNDS":
      return "That card was declined for insufficient funds.";
    case "CVV_FAILURE":
      return "The security code didn't match. Check the CVV and try again.";
    case "ADDRESS_VERIFICATION_FAILURE":
      return "The billing postal code didn't match your card. Check it and try again.";
    case "EXPIRED_CARD":
      return "That card has expired.";
    case "CARD_EXPIRATION_MISMATCH":
      return "The expiration date didn't match. Check it and try again.";
    default:
      return "We couldn't process that card. Try again, or call the farm and we'll take the order by phone.";
  }
}

export async function chargeCard(input: ChargeInput): Promise<ChargeResult> {
  const { accessToken, locationId } = config();

  let response: Response;
  try {
    response = await fetch(`${SQUARE_API}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": SQUARE_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_id: input.sourceId,
        idempotency_key: input.idempotencyKey,
        location_id: locationId,
        amount_money: { amount: input.amountCents, currency: "USD" },
        buyer_email_address: input.buyerEmail,
        reference_id: input.orderNumber,
        note: input.note.slice(0, 500),
        ...(input.orderId && { order_id: input.orderId }),
      }),
    });
  } catch (err) {
    console.error("[shop] Square request failed:", err);
    // We do not know whether the card was charged. Keep the key.
    return {
      ok: false,
      outcome: "unknown",
      error: "We couldn't reach our payment processor. Please try again.",
    };
  }

  const body = (await response.json().catch(() => ({}))) as {
    payment?: {
      id?: string;
      status?: string;
      amount_money?: { amount?: number };
    };
    errors?: SquareError[];
  };

  if (!response.ok || body.errors?.length) {
    console.error(
      "[shop] Square declined payment:",
      response.status,
      JSON.stringify(body.errors ?? {}),
    );
    return { ok: false, outcome: "declined", error: customerMessage(body.errors) };
  }

  const payment = body.payment;
  // COMPLETED is the only status we treat as money taken. Square can also
  // return APPROVED (authorised, not captured); we don't ask for that here,
  // so anything else is unexpected and must not be sold against.
  if (!payment?.id || payment.status !== "COMPLETED") {
    console.error("[shop] Unexpected Square payment status:", payment?.status);
    // A surprise status is not a confirmed refusal — treat it as unknown.
    return {
      ok: false,
      outcome: "unknown",
      error: "That payment didn't complete. Please try again.",
    };
  }

  return {
    ok: true,
    paymentId: payment.id,
    amountCents: payment.amount_money?.amount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Orders, inventory and webhooks — the POS link
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderLineInput {
  name: string;
  variantLabel?: string;
  quantity: number;
  unitPriceCents: number;
  /** Square catalog variation id, when this variant has been mapped. */
  squareVariationId?: string;
}

/**
 * Create a Square Order for a website sale.
 *
 * Two reasons this matters beyond the charge itself:
 *  1. The farm sees itemised online sales in the same Square reporting they
 *     already use for the POS, instead of an opaque lump payment.
 *  2. For a mapped variation that Square is tracking, paying the order makes
 *     Square decrement its own inventory — which is what actually links an
 *     online sale to the count the POS reads.
 *
 * Unmapped variants fall back to an ad-hoc line (name + price). Those still
 * itemise correctly; they just can't move Square's stock, because Square has
 * nothing to move.
 *
 * Returns null on failure — an order is a reporting nicety, and must never
 * block a sale.
 */
export async function createOrder(
  lines: OrderLineInput[],
  opts: { orderNumber: string; deliveryFeeCents: number; idempotencyKey: string },
): Promise<string | null> {
  const { accessToken, locationId } = config();

  // Deliberately ad-hoc lines (name + OUR price), never catalog_object_id.
  // A catalog line is priced from Square's catalog, and Square's prices
  // disagree with the website's (Beef Tenderloin $22 vs $29, Boneless Pork Chop
  // $9 vs $15). Referencing the catalog here would make the Square order total
  // diverge from the amount we actually charge. Inventory is moved separately
  // by adjustInventory(), which keeps pricing and stock independent.
  const lineItems = lines.map((l) => ({
    quantity: String(l.quantity),
    name: [l.name, l.variantLabel].filter(Boolean).join(" — ").slice(0, 512),
    base_price_money: { amount: l.unitPriceCents, currency: "USD" },
  }));

  if (opts.deliveryFeeCents > 0) {
    lineItems.push({
      quantity: "1",
      name: "Local delivery",
      base_price_money: { amount: opts.deliveryFeeCents, currency: "USD" },
    });
  }

  try {
    const response = await fetch(`${SQUARE_API}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": SQUARE_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotency_key: `${opts.idempotencyKey}-order`.slice(0, 192),
        order: {
          location_id: locationId,
          reference_id: opts.orderNumber,
          source: { name: "Farm Store (website)" },
          line_items: lineItems,
        },
      }),
    });

    const body = (await response.json().catch(() => ({}))) as {
      order?: { id?: string };
      errors?: SquareError[];
    };

    if (!response.ok || !body.order?.id) {
      console.error(
        "[shop] Square order create failed:",
        response.status,
        JSON.stringify(body.errors ?? {}),
      );
      return null;
    }
    return body.order.id;
  } catch (err) {
    console.error("[shop] Square order create threw:", err);
    return null;
  }
}

/** Current Square counts for the given variation ids. Empty map on failure. */
export async function getInventoryCounts(
  variationIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (variationIds.length === 0) return counts;

  const { accessToken, locationId } = config();
  try {
    const response = await fetch(`${SQUARE_API}/inventory/counts/batch-retrieve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": SQUARE_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        catalog_object_ids: variationIds.slice(0, 500),
        location_ids: [locationId],
      }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      counts?: { catalog_object_id?: string; state?: string; quantity?: string }[];
      errors?: SquareError[];
    };
    if (!response.ok) {
      console.error("[shop] inventory batch-retrieve failed:", JSON.stringify(body.errors ?? {}));
      return counts;
    }
    for (const c of body.counts ?? []) {
      // IN_STOCK is the only state that represents sellable units.
      if (c.state === "IN_STOCK" && c.catalog_object_id) {
        counts.set(c.catalog_object_id, Math.max(0, Math.floor(Number(c.quantity ?? 0))));
      }
    }
    return counts;
  } catch (err) {
    console.error("[shop] inventory batch-retrieve threw:", err);
    return counts;
  }
}

/**
 * Decrement Square's own stock for the mapped variations in a completed sale.
 *
 * This is what actually closes the POS loop from the website side: without it,
 * an online sale is invisible to the count the farm reads on the register.
 * The reverse direction (a POS sale reaching the website) arrives over the
 * inventory.count.updated webhook.
 *
 * Only variations Square is actually tracking will move; an adjustment against
 * an untracked variation is rejected, which is why unmapped/untracked items are
 * simply skipped rather than treated as an error.
 *
 * Best-effort: the money is already taken by the time this runs, so it logs and
 * never throws.
 */
export async function adjustInventory(
  changes: { squareVariationId: string; quantity: number }[],
  idempotencyKey: string,
): Promise<void> {
  if (changes.length === 0) return;
  const { accessToken, locationId } = config();

  // RFC 3339, and Square rejects a future timestamp.
  const occurredAt = new Date(Date.now() - 1000).toISOString();

  try {
    const response = await fetch(`${SQUARE_API}/inventory/changes/batch-create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": SQUARE_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotency_key: `${idempotencyKey}-inv`.slice(0, 128),
        changes: changes.map((c) => ({
          type: "ADJUSTMENT",
          adjustment: {
            catalog_object_id: c.squareVariationId,
            location_id: locationId,
            from_state: "IN_STOCK",
            to_state: "SOLD",
            quantity: String(c.quantity),
            occurred_at: occurredAt,
          },
        })),
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { errors?: SquareError[] };
      console.error(
        "[shop] Square inventory adjust failed:",
        response.status,
        JSON.stringify(body.errors ?? {}),
      );
    }
  } catch (err) {
    console.error("[shop] Square inventory adjust threw:", err);
  }
}

/**
 * Every Square catalog variation, for the admin's match picker.
 *
 * Deliberately unfiltered: the "is this merchandise or a wedding deposit"
 * judgement belongs to the person choosing, not to a regex. Sorted by name so
 * the list is scannable.
 */
export async function listCatalogVariations(): Promise<
  { variationId: string; name: string; priceCents: number | null; trackInventory: boolean }[]
> {
  const { accessToken } = config();
  try {
    const response = await fetch(`${SQUARE_API}/catalog/list?types=ITEM`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": SQUARE_VERSION,
      },
      // The catalog changes rarely; a short cache keeps the admin snappy without
      // going stale enough to matter.
      next: { revalidate: 300 },
    });
    const body = (await response.json().catch(() => ({}))) as {
      objects?: {
        item_data?: {
          name?: string;
          variations?: {
            id?: string;
            item_variation_data?: {
              name?: string;
              price_money?: { amount?: number };
              track_inventory?: boolean;
            };
          }[];
        };
      }[];
      errors?: SquareError[];
    };
    if (!response.ok) {
      console.error("[shop] catalog list failed:", JSON.stringify(body.errors ?? {}));
      return [];
    }
    const rows: {
      variationId: string;
      name: string;
      priceCents: number | null;
      trackInventory: boolean;
    }[] = [];
    for (const obj of body.objects ?? []) {
      const item = obj.item_data;
      for (const v of item?.variations ?? []) {
        const iv = v.item_variation_data;
        if (!v.id) continue;
        // Square names a single-variation item's variation "Regular"; the item
        // name is what a person recognises.
        const variationName = iv?.name && iv.name !== "Regular" ? ` (${iv.name})` : "";
        rows.push({
          variationId: v.id,
          name: `${item?.name ?? "Untitled"}${variationName}`,
          priceCents: iv?.price_money?.amount ?? null,
          trackInventory: Boolean(iv?.track_inventory),
        });
      }
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("[shop] catalog list threw:", err);
    return [];
  }
}
