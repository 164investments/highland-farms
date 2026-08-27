import { randomInt } from "crypto";
import { insertGiftCertificate } from "./store";

/**
 * Gift certificates: fixed-price products, redeemable at booking checkout via
 * `giftCode` (see `src/app/api/booking/checkout/route.ts`). Prices and units
 * are static here, like `products.ts` — the server derives the charge amount
 * from THIS file, never from the browser.
 */

export type GiftProductId = "tour-for-two" | "spa-for-two" | "spa-3-visit";

export interface GiftProduct {
  id: GiftProductId;
  name: string;
  amountCents: number;
  kind: "value" | "visits";
  /** The booking product this certificate is scoped to. */
  productScope: string;
  /** `value` certs hold cents; `visits` certs hold a count of seats. */
  units: number;
  /** One line for the purchase card and the gift email. */
  blurb: string;
}

export const GIFT_PRODUCTS: GiftProduct[] = [
  {
    id: "tour-for-two",
    name: "Farm Tour for Two",
    amountCents: 15000,
    kind: "value",
    productScope: "farm-tour",
    units: 15000,
    blurb: "A private 60-minute Highland Cow tour for two guests.",
  },
  {
    id: "spa-for-two",
    name: "Nordic Spa for Two",
    amountCents: 20000,
    kind: "value",
    productScope: "nordic-spa",
    units: 20000,
    blurb: "A 90-minute Nordic Forest Spa session for two guests.",
  },
  {
    id: "spa-3-visit",
    name: "Spa 3-Visit Pack",
    amountCents: 19900,
    kind: "visits",
    productScope: "nordic-spa",
    units: 3,
    blurb: "Three single-guest Nordic Forest Spa visits, any time.",
  },
];

export function getGiftProduct(id: string): GiftProduct | undefined {
  return GIFT_PRODUCTS.find((p) => p.id === id);
}

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
}

/**
 * Generates a code, inserts the certificate row, and retries exactly once
 * with a fresh code on a primary-key collision (Postgres 23505 — astronomically
 * unlikely at this alphabet/length, but free to guard). Any other insert
 * failure is rethrown: the caller (the checkout route) is responsible for the
 * "money taken, certificate missing" reconciliation path, not this function.
 */
export async function issueGiftCertificate(input: IssueGiftCertificateInput): Promise<string> {
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
