import { createHmac, timingSafeEqual } from "crypto";

/**
 * Square webhook signature verification.
 *
 * Square signs HMAC-SHA256 over the **notification URL concatenated with the
 * raw request body**, keyed by the subscription's signature key, and sends it
 * base64 in `x-square-hmacsha256-signature`. The URL is part of the signed
 * payload, so it must match the endpoint registered in Square byte for byte —
 * a trailing slash or the wrong host silently fails every request.
 *
 * The raw body must be the exact bytes received. Re-serialising parsed JSON
 * changes key order and whitespace and will never verify.
 */
export function verifySquareSignature(
  rawBody: string,
  signatureHeader: string | null,
  notificationUrl: string,
  signatureKey: string,
): boolean {
  if (!signatureHeader || !signatureKey) return false;

  const expected = createHmac("sha256", signatureKey)
    .update(notificationUrl + rawBody)
    .digest("base64");

  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, which is itself a signal.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
