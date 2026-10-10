import { timingSafeEqual } from "node:crypto";
import { isValidToken, tokenFromRequest } from "@/lib/shop/admin-auth";

/** The Claude/API token can manage calendar rules only. Refunds, customers,
 * certificates, orders and manual bookings retain the full admin gate. */
export function calendarAuthorized(request: Request): boolean {
  const supplied = tokenFromRequest(request);
  if (isValidToken(supplied)) return true;
  const expected = process.env.BOOKING_CALENDAR_API_TOKEN;
  if (!expected || !supplied) return false;
  const actual = Buffer.from(supplied);
  const secret = Buffer.from(expected);
  return actual.length === secret.length && timingSafeEqual(actual, secret);
}
