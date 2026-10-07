/**
 * Which wallets checkout offers. A plain module (no "use client") so server
 * pages can read the flag: a constant imported from a client module arrives
 * on the server as a client reference, not as `false`.
 *
 * Google Pay is off for the 2026-10 release (DECIDE #15): main never wired its
 * click, so it has never taken a payment. Turn it on only after a real https
 * test payment passes end to end. Customer copy follows the flag.
 */
export const ENABLE_GOOGLE_PAY = false;

/** How a shopper can pay, as /shop step I says it ("Card or Apple Pay"). */
export const PAYMENT_METHODS = ENABLE_GOOGLE_PAY ? "Card, Apple Pay or Google Pay" : "Card or Apple Pay";
