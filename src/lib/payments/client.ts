"use client";

import { useSyncExternalStore } from "react";
import { getClientAttribution } from "@/lib/attribution";
import type { DetailedLine } from "@/lib/shop/cart";

export const stripeCheckoutEnabled = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER === "stripe";
export type PaymentKind = "shop" | "booking" | "gift";
export type CheckoutResult =
  | { ok: true; checkoutUrl: string; sessionId: string }
  | { ok: true; success: true; bookingNumber: string; amountCents: number }
  | { ok: false; status: number; error: string };

const keys = new Map<string, string>();
const KEY_PREFIX = "hf-stripe-attempt-v1:";
export const SHOP_CONTEXT_PREFIX = "hf-stripe-shop-v1:";
const RETURN_PATH_PREFIX = "hf-stripe-return-v1:";
const ATTEMPT_SESSION_PREFIX = "hf-stripe-session-v1:";

export interface ShopPaymentContext {
  lines: DetailedLine[];
  totalCents: number;
  feeCents: number;
}

function subscribeCancellation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}
export function usePaymentCancelled() {
  return useSyncExternalStore(subscribeCancellation,
    () => new URLSearchParams(window.location.search).get("payment") === "cancelled",
    () => false);
}

/** Store only a digest and random key. Contact details never enter browser storage. */
async function attemptKey(payload: Record<string, unknown>) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
  const fingerprint = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
  const storageKey = KEY_PREFIX + fingerprint;
  let key = keys.get(fingerprint);
  try { key ??= window.sessionStorage.getItem(storageKey) ?? undefined; } catch { /* storage unavailable */ }
  if (!key) key = crypto.randomUUID();
  keys.set(fingerprint, key);
  try { window.sessionStorage.setItem(storageKey, key); } catch { /* same-page retries still work */ }
  return { key, fingerprint };
}

export function validStripeCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "checkout.stripe.com"
      && !url.port && !url.username && !url.password;
  } catch { return false; }
}

export async function startStripeCheckout(payload: Record<string, unknown> & { kind: PaymentKind }): Promise<CheckoutResult> {
  try {
    const { key: idempotencyKey, fingerprint } = await attemptKey(payload);
    const attribution = getClientAttribution();
    // Timestamps and the cancel query must not change the meaning of a retry.
    delete attribution.updated_at;
    const cookies = document.cookie;
    const response = await fetch("/api/payments/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, idempotencyKey, attribution,
        clientId: cookies.match(/_ga=GA\d+\.\d+\.(.+?)(;|$)/)?.[1],
        fbp: cookies.match(/_fbp=([^;]+)/)?.[1], fbc: cookies.match(/_fbc=([^;]+)/)?.[1] }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.status === "expired") {
        // The checkout endpoint can prove expiry even when no receipt page
        // was opened (for example, after an abandoned session).
        keys.delete(fingerprint);
        try { window.sessionStorage.removeItem(KEY_PREFIX + fingerprint); } catch { /* optional storage */ }
      }
      return { ok: false, status: response.status,
        error: typeof data.error === "string" ? data.error : "We couldn’t open secure payment. Please try again." };
    }
    if (validStripeCheckoutUrl(data.checkoutUrl) && typeof data.sessionId === "string" && /^cs_[A-Za-z0-9_]+$/.test(data.sessionId)) {
      try {
        window.sessionStorage.setItem(RETURN_PATH_PREFIX + data.sessionId, window.location.pathname + window.location.hash);
        window.sessionStorage.setItem(ATTEMPT_SESSION_PREFIX + data.sessionId, fingerprint);
      } catch { /* Optional recovery context only. */ }
      return { ok: true, checkoutUrl: data.checkoutUrl, sessionId: data.sessionId };
    }
    if (payload.kind === "booking" && data.success === true && typeof data.bookingNumber === "string" && data.amountCents === 0) {
      return { ok: true, success: true, bookingNumber: data.bookingNumber, amountCents: 0 };
    }
    return { ok: false, status: 502, error: "Secure payment isn’t ready. Please try again or contact the farm." };
  } catch {
    return { ok: false, status: 0, error: "Connection hiccup. Check your connection and try again." };
  }
}

export function rememberShopPayment(sessionId: string, context: ShopPaymentContext) {
  try { window.sessionStorage.setItem(SHOP_CONTEXT_PREFIX + sessionId, JSON.stringify(context)); } catch { /* confirmation still works */ }
}

/** Only call after the server has verified that this session expired. */
export function forgetExpiredCheckout(sessionId: string) {
  try {
    const fingerprint = window.sessionStorage.getItem(ATTEMPT_SESSION_PREFIX + sessionId);
    if (fingerprint) {
      keys.delete(fingerprint);
      window.sessionStorage.removeItem(KEY_PREFIX + fingerprint);
      window.sessionStorage.removeItem(ATTEMPT_SESSION_PREFIX + sessionId);
    }
  } catch { /* Browser storage may be unavailable. */ }
}

export function paymentRestartPath(sessionId: string, kind: PaymentKind) {
  try {
    const stored = window.sessionStorage.getItem(RETURN_PATH_PREFIX + sessionId);
    if (stored && /^\/(?:shop\/checkout|farm-tours|nordic-spa|wedding-call|gift-certificates)(?:#[A-Za-z0-9_-]+)?$/.test(stored)) return stored;
  } catch { /* Use a known internal route below. */ }
  return kind === "shop" ? "/shop/checkout" : kind === "gift" ? "/gift-certificates#choose" : "/farm-tours#book";
}
