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
