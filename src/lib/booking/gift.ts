import { randomInt } from "crypto";
import { insertGiftCertificate } from "./store";
import type { GiftProduct } from "./gift-products";
export { GIFT_PRODUCTS, getGiftProduct, giftScopeAllows } from "./gift-products";
export type { GiftProduct, GiftProductFamily, GiftProductId } from "./gift-products";

/**
 * Gift certificates: fixed-price products, redeemable at booking checkout via
 * `giftCode` (see `src/app/api/booking/checkout/route.ts`). Prices and units
 * come from the shared, client-safe `gift-products.ts` catalog. The server
 * derives the charge amount from that catalog, never from the browser.
 */

// Excludes 0/O/1/I/L so a code read aloud over the phone is never ambiguous.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomChunk(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

/** `HFGC-XXXX-XXXX`. Uses `crypto.randomInt` (not `Math.random`) — this code is redeemable money. */
export function generateGiftCode(): string {
  return `HFGC-${randomChunk(4)}-${randomChunk(4)}`;
}

export interface IssueGiftCertificateInput {
  product: GiftProduct;
  purchaserEmail: string;
  recipientEmail: string | null;
  /** Square payment id from the ALREADY-COMPLETED charge — never called before the charge succeeds. */
  paymentId: string;
  /** Bind legacy purchase expiry and its emailed receipt to the same instant. */
  issuedAt?: string;
}

/**
 * Generates a code, inserts the certificate row, and retries exactly once
 * with a fresh code on a primary-key collision (Postgres 23505 — astronomically
 * unlikely at this alphabet/length, but free to guard). Any other insert
 * failure is rethrown: the caller (the checkout route) is responsible for the
 * "money taken, certificate missing" reconciliation path, not this function.
 */
export async function issueGiftCertificate(input: IssueGiftCertificateInput): Promise<string> {
  const expiresAt = input.product.expiryDays === null ? null
    : new Date((input.issuedAt ? Date.parse(input.issuedAt) : Date.now()) + input.product.expiryDays * 86_400_000).toISOString();
  const row = (code: string) => ({
    code,
    kind: input.product.kind,
    productScope: input.product.productScope,
    initialUnits: input.product.units,
    remainingUnits: input.product.units,
    purchaserEmail: input.purchaserEmail,
    recipientEmail: input.recipientEmail,
    squarePaymentId: input.paymentId,
    status: "active" as const,
    expiresAt,
  });

  const first = generateGiftCode();
  try {
    await insertGiftCertificate(row(first));
    return first;
  } catch (err) {
    if ((err as { code?: string }).code !== "23505") throw err;
    const second = generateGiftCode();
    await insertGiftCertificate(row(second)); // let a second collision throw — caller handles it
    return second;
  }
}
