"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fieldCtaClass, fieldTextLinkClass } from "@/components/ui/FieldGuide";
import { CONTACT } from "@/lib/constants";
import { useCart } from "@/lib/shop/cart";
import { formatCents } from "@/lib/shop/money";
import { pushEvent } from "@/components/shop/track";
import { forgetCompletedCheckout, forgetExpiredCheckout, paymentRestartPath, SHOP_CONTEXT_PREFIX, type PaymentKind, type ShopPaymentContext } from "@/lib/payments/client";

type PaymentStatus = "pending" | "processing" | "paid" | "expired" | "review";
interface PaymentState {
  status: PaymentStatus;
  kind: PaymentKind;
  reference: string;
  restartPath?: string;
  result?: { orderNumber?: string; bookingNumber?: string; code?: string; amountCents?: number; expiresAt?: string | null };
}
const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "processing", "paid", "expired", "review"];
const MAX_POLLS = 10;

export function PaymentReturn() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") ?? "";
  const validSession = /^cs_[A-Za-z0-9_]{1,240}$/.test(sessionId);
  const { lines, clear, ready: cartReady } = useCart();
  const [payment, setPayment] = useState<PaymentState | null>(null);
  const [stopped, setStopped] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const recorded = useRef("");

  useEffect(() => {
    if (!validSession) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;

    async function check() {
      try {
        const response = await fetch(`/api/payments/stripe/status?session_id=${encodeURIComponent(sessionId)}`, {
          cache: "no-store", signal: controller.signal,
        });
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok || !PAYMENT_STATUSES.includes(data.status) || !["shop", "booking", "gift"].includes(data.kind)) {
          throw new Error("unavailable");
        }
        if (data.status === "expired") forgetExpiredCheckout(sessionId);
        if (data.status === "paid") forgetCompletedCheckout(sessionId);
        setPayment({ ...data, restartPath: paymentRestartPath(sessionId, data.kind) } as PaymentState);
        polls += 1;
        if (data.status === "pending" || data.status === "processing") {
          if (polls < MAX_POLLS) {
            timer = setTimeout(() => void check(), 3000);
            return;
          }
          setStopped(true);
        }
        setChecking(false);
      } catch {
        if (controller.signal.aborted) return;
        setError("We couldn’t check the payment just now. Please check again, or contact the farm if you need help.");
        setChecking(false);
        setStopped(true);
      }
    }
    void check();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [sessionId, validSession, retry]);

  // A redirect is never proof of purchase. Only the server's fulfilled, paid
  // state can clear the matching cart or emit the existing purchase event.
  useEffect(() => {
    if (payment?.status !== "paid" || payment.kind !== "shop" || !cartReady || recorded.current === sessionId) return;
    recorded.current = sessionId;
    try {
      const raw = window.sessionStorage.getItem(SHOP_CONTEXT_PREFIX + sessionId);
      if (!raw) return;
      const context = JSON.parse(raw) as ShopPaymentContext;
      if (!Array.isArray(context.lines) || !Number.isFinite(context.totalCents) || !Number.isFinite(context.feeCents)) return;
      const signature = (items: { variantId: string; quantity: number }[]) => JSON.stringify(
        items.map((line) => [line.variantId, line.quantity]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
      );
      if (signature(lines) === signature(context.lines)) clear();
      const purchaseKey = `hf-stripe-purchase-v1:${sessionId}`;
      if (!window.sessionStorage.getItem(purchaseKey)) {
        pushEvent("purchase", { ecommerce: {
          transaction_id: payment.result?.orderNumber ?? payment.reference,
          currency: "USD", value: (payment.result?.amountCents ?? context.totalCents) / 100,
          shipping: context.feeCents / 100,
          items: context.lines.map((line) => ({ item_id: line.slug, item_name: line.name,
            item_variant: line.label, price: line.unitPriceCents / 100, quantity: line.quantity })),
        } });
        window.sessionStorage.setItem(purchaseKey, "1");
      }
      window.sessionStorage.removeItem(SHOP_CONTEXT_PREFIX + sessionId);
    } catch { /* Confirmation remains available when browser storage is blocked. */ }
  }, [payment, sessionId, cartReady, lines, clear]);

  function checkAgain() {
    setChecking(true); setStopped(false); setError(""); setRetry((value) => value + 1);
  }

  const paid = payment?.status === "paid";
  const expired = payment?.status === "expired";
  const review = payment?.status === "review";
  const pending = !paid && !expired && !review;
  const reference = payment?.result?.orderNumber ?? payment?.result?.bookingNumber ?? payment?.reference;
  const restartUrl = payment?.restartPath ?? "/shop/checkout";
  const title = !validSession ? "Let’s check your payment." : paid
    ? payment.kind === "shop" ? "Your order is confirmed." : payment.kind === "gift" ? "Your gift is ready." : "You’re booked."
    : expired ? "This payment session has ended." : review ? "The farm is checking your payment." : "Checking your payment.";

  return (
    <>
      <h1 className="field-heading m-0 font-display text-[38px] leading-[1.05] lg:text-[52px]">{title}</h1>
      <div role="status" aria-live="polite" aria-busy={validSession && checking} className="mt-5 border-y border-rule py-5 text-[15px] leading-relaxed text-ink-body">
        {!validSession ? <p className="m-0">This link is missing a valid payment session. Please use the link from secure checkout or contact the farm.</p>
          : paid ? <>
            {reference && <p className="m-0">Reference <strong className="text-ink">{reference}</strong></p>}
            {typeof payment.result?.amountCents === "number" && <p className="m-0 mt-2">Paid {formatCents(payment.result.amountCents)}.</p>}
            {payment.kind === "gift" && payment.result?.code && <p className="m-0 mt-2">Gift certificate code: <strong className="text-ink">{payment.result.code}</strong></p>}
            {payment.kind === "gift" && payment.result?.expiresAt && <p className="m-0 mt-2">Use your visits by {new Date(payment.result.expiresAt).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "long", day: "numeric" })}.</p>}
            <p className="m-0 mt-2">Your confirmation is on its way by email.</p>
            {payment.kind === "shop" && <p className="m-0 mt-2">The farm will call when your order is packed.</p>}
          </> : expired ? <p className="m-0">This session is no longer available. You can return and start again. If you see a charge or already have a confirmation, contact the farm before making another payment.</p>
            : review ? <p className="m-0">Please don’t pay again while we check this payment. Contact the farm with the reference below and we’ll help.</p>
              : <p className="m-0">{stopped ? "Your confirmation is taking a little longer. Please check again shortly. Don’t start another payment while this one is being checked." : "Please keep this page open while we verify your payment and finish your confirmation."}</p>}
        {review && reference && <p className="m-0 mt-2">Reference <strong>{reference}</strong></p>}
      </div>
      {error && <p role="alert" className="mt-4 text-[14px] text-[#8c3b2a]">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-5">
        {validSession && pending && stopped && <button type="button" onClick={checkAgain} disabled={checking} className={fieldCtaClass}>Check again</button>}
        {expired && <Link href={restartUrl} className={fieldCtaClass}>Return to checkout</Link>}
        {paid && <Link href={payment.kind === "shop" ? "/shop" : "/"} className={fieldCtaClass}>{payment.kind === "shop" ? "Keep shopping" : "Back to the farm"}</Link>}
        <a href={`tel:+1${CONTACT.phone.replace(/\D/g, "")}`} className={fieldTextLinkClass}>Call {CONTACT.phone}</a>
      </div>
      {(!validSession || review || stopped) && <p className="mt-5 text-[13px] text-ink-note">You can also email <a href={`mailto:${CONTACT.emailAlt}`} className={fieldTextLinkClass}>{CONTACT.emailAlt}</a>.</p>}
    </>
  );
}
