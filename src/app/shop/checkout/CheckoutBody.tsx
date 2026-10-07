"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FieldLeader, FieldReviewLine, PendingSlot } from "@/components/ui/FieldGuide";
import { ChevronDownIcon, LockIcon } from "@/components/shop/icons";
import { useCart } from "@/lib/shop/cart";
import { formatCents, formatCentsShort } from "@/lib/shop/money";
import {
  DELIVERY_FEE_CENTS,
  DELIVERY_MINIMUM_CENTS,
  PICKUP_LOCATION,
  deliveryProblem,
  type Fulfillment,
} from "@/lib/shop/fulfillment";
import { CONTACT } from "@/lib/constants";
import { pushEvent } from "@/components/shop/track";
import { ExpressPay, type WalletBlock } from "./ExpressPay";
import { getProduct } from "../data";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Checkout.
 *
 * Card details are tokenised in Square's own iframe fields — this component
 * never sees a card number. It posts a one-use `sourceId` plus variant ids and
 * quantities; the server re-prices everything from the catalog, so the totals
 * rendered here are for the customer's benefit and carry no authority.
 */

const SQUARE_SDK_URL = "https://web.squarecdn.com/v1/square.js";

interface SquareCard {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
  destroy?: () => void;
}
interface SquarePayments {
  card: () => Promise<SquareCard>;
  paymentRequest: (req: unknown) => unknown;
  applePay: (req: unknown) => Promise<{
    tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
    destroy?: () => void;
  }>;
  googlePay: (req: unknown) => Promise<{
    tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
    attach?: (selector: string) => Promise<void>;
    destroy?: () => void;
  }>;
}
declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => SquarePayments;
    };
  }
}

/**
 * The email check `POST /api/shop/checkout` runs (zod 4's `.email()` pattern).
 * The form must be at least as strict as the server: a wallet token is only
 * requested once the details pass, so the server never rejects them after the
 * shopper has approved a payment.
 */
const EMAIL_RE =
  /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

/** Where the last payment error belongs: under the wallets or under the card. */
type Failure = { at: "wallet" | "card"; message: string };

type Status = "loading" | "ready" | "submitting" | "unavailable";

export function CheckoutBody({
  applicationId,
  locationId,
  reviewCount,
  reviewTotal,
}: {
  applicationId: string;
  locationId: string;
  /** FIVE_STAR_COUNT: the near-CTA tier, directly under Pay. */
  reviewCount: number;
  reviewTotal: number;
}) {
  const router = useRouter();
  const { detailed, subtotalCents, count, clear, ready: cartReady } = useCart();

  const [status, setStatus] = useState<Status>("loading");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [paidWith, setPaidWith] = useState<Failure["at"]>("card");
  const [chosen, setFulfillment] = useState<Fulfillment>("pickup");
  const [touched, setTouched] = useState({ email: false, phone: false });
  // Set when Pay (or a held wallet) is tapped with gaps: every empty required
  // field is then marked inline. Client-side UI only; the server rules are unchanged.
  const [showGaps, setShowGaps] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zip: "",
    notes: "",
    website: "", // honeypot
  });

  const cardRef = useRef<SquareCard | null>(null);
  const [payments, setPayments] = useState<SquarePayments | null>(null);
  const attachedRef = useRef(false);
  // Stable per checkout attempt — this is what prevents a double-charge on a
  // double-click or a retried request.
  const idempotencyKeyRef = useRef<string>("");
  if (!idempotencyKeyRef.current && typeof crypto !== "undefined") {
    idempotencyKeyRef.current = crypto.randomUUID();
  }

  // Delivery is locked below the minimum, so a cart that shrank falls back to pickup.
  const deliveryLocked = subtotalCents < DELIVERY_MINIMUM_CENTS;
  const fulfillment: Fulfillment = deliveryLocked ? "pickup" : chosen;
  const feeCents = fulfillment === "delivery" ? DELIVERY_FEE_CENTS : 0;
  const totalCents = subtotalCents + feeCents;

  const configured = Boolean(applicationId && locationId);

  // Load Square's SDK and attach the card fields once.
  useEffect(() => {
    if (!configured) {
      setStatus("unavailable");
      return;
    }
    if (attachedRef.current) return;
    attachedRef.current = true;

    let cancelled = false;

    async function init() {
      try {
        if (!window.Square) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector<HTMLScriptElement>(
              `script[src="${SQUARE_SDK_URL}"]`,
            );
            if (existing) {
              existing.addEventListener("load", () => resolve());
              existing.addEventListener("error", () => reject(new Error("sdk")));
              return;
            }
            const script = document.createElement("script");
            script.src = SQUARE_SDK_URL;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("sdk"));
            document.head.appendChild(script);
          });
        }
        if (cancelled || !window.Square) return;

        const paymentsInstance = window.Square.payments(applicationId, locationId);
        setPayments(paymentsInstance);
        const card = await paymentsInstance.card();
        await card.attach("#square-card");
        if (cancelled) {
          card.destroy?.();
          return;
        }
        cardRef.current = card;
        setStatus("ready");
      } catch (err) {
        console.error("[shop] Square SDK failed to load:", err);
        if (!cancelled) setStatus("unavailable");
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [applicationId, locationId, configured]);

  useEffect(() => {
    if (cartReady && count > 0) {
      pushEvent("begin_checkout", {
        ecommerce: {
          currency: "USD",
          value: subtotalCents / 100,
          items: detailed.map((l) => ({
            item_id: l.slug,
            item_name: l.name,
            item_variant: l.label,
            price: l.unitPriceCents / 100,
            quantity: l.quantity,
          })),
        },
      });
    }
    // Fires once per checkout view; deliberately not re-fired as the cart edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartReady]);

  // Capture the in-progress cart once a valid email exists, so leaving here is
  // recoverable. Debounced, fire-and-forget, and never surfaced: this runs while
  // someone is mid-typing and must not interrupt anything.
  const savedSignature = useRef("");
  useEffect(() => {
    const email = form.email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || detailed.length === 0) return;

    const signature = JSON.stringify([
      email,
      fulfillment,
      detailed.map((l) => [l.variantId, l.quantity]),
    ]);
    if (signature === savedSignature.current) return;

    const timer = window.setTimeout(() => {
      savedSignature.current = signature;
      void fetch("/api/shop/cart/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: form.name || undefined,
          phone: form.phone || undefined,
          fulfillment,
          items: detailed.map((l) => ({
            variantId: l.variantId,
            quantity: l.quantity,
          })),
        }),
      }).catch(() => {
        // Best effort. A failed capture must never affect checkout.
        savedSignature.current = "";
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [form.email, form.name, form.phone, fulfillment, detailed]);

  const set = useCallback(
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
    },
    [],
  );

  // Same rule the server enforces, so the customer sees the problem before they
  // type a card number. `blocking` gates the button; `shownProblem` is what we
  // actually render — the ZIP complaint stays quiet until a ZIP has been typed,
  // so an untouched form doesn't greet people with an error.
  const blocking = deliveryProblem(fulfillment, form.zip, subtotalCents);
  const zipEntered = form.zip.trim().length >= 5;
  const belowMinimum =
    fulfillment === "delivery" && subtotalCents < DELIVERY_MINIMUM_CENTS;
  const shownProblem = belowMinimum
    ? blocking
    : zipEntered
      ? blocking
      : null;

  // The details the server requires (`checkoutSchema` in the checkout route).
  // One computation feeds the card check and the wallet gate, so they can't drift.
  const nameOk = form.name.trim().length > 0;
  const emailOk = EMAIL_RE.test(form.email.trim());
  const phoneOk = form.phone.replace(/\D/g, "").length >= 7;
  const contactOk = nameOk && emailOk && phoneOk;
  const addressOk =
    fulfillment !== "delivery" ||
    (form.address.trim().length > 0 && form.city.trim().length > 0 && form.zip.trim().length >= 5);
  const walletBlock: WalletBlock = !contactOk ? "contact" : !addressOk ? "address" : blocking ? "zip" : null;

  /** A tap on a held wallet: take the shopper to the first field still missing. */
  function firstGapId(): string {
    return !nameOk
      ? "co-name"
      : !emailOk
        ? "co-email"
        : !phoneOk
          ? "co-phone"
          : !form.address.trim()
            ? "co-address"
            : !form.city.trim()
              ? "co-city"
              : "co-zip";
  }

  function showFirstGap() {
    setTouched({ email: true, phone: true });
    setShowGaps(true);
    focusField(firstGapId());
  }

  /** Scroll the field into view (below the sticky header) and focus it. */
  function focusField(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
  }

  // Put the focus on a payment error where it was raised, so a phone user
  // who paid from the top of the page sees it without scrolling.
  useEffect(() => {
    if (!failure) return;
    document.getElementById(failure.at === "wallet" ? "wallet-alert" : "card-alert")?.focus();
  }, [failure]);

  /** True when the card form's order is ready to send. */
  function readyToPay(): boolean {
    setFailure(null);
    const fail = (message: string) => {
      setFailure({ at: "card", message });
      return false;
    };
    if (!contactOk || !addressOk) {
      // Mark every empty required field and take the shopper to the first one.
      setTouched({ email: true, phone: true });
      setShowGaps(true);
      focusField(firstGapId());
      // The marks sit on the fields themselves; no far-away box to read.
      return false;
    }
    if (blocking) return fail(blocking);
    return true;
  }

  /**
   * Everything after a token exists, shared by the card form and the wallets.
   * A wallet token always reaches this call: the wallet gate (`walletBlock`)
   * runs before the sheet opens, never after approval.
   */
  async function submitWithToken(sourceId: string, at: Failure["at"]) {
    setPaidWith(at);
    setFailure(null);
    setStatus("submitting");
    try {
      const response = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId,
          idempotencyKey: idempotencyKeyRef.current,
          fulfillment,
          customer: { name: form.name, email: form.email, phone: form.phone },
          ...(fulfillment === "delivery" && {
            delivery: { address: form.address, city: form.city, zip: form.zip },
          }),
          notes: form.notes || undefined,
          website: form.website || undefined,
          items: detailed.map((l) => ({
            variantId: l.variantId,
            quantity: l.quantity,
          })),
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        orderNumber?: string;
        error?: string;
        reuseIdempotencyKey?: boolean;
      };

      if (!response.ok || !body.success) {
        setFailure({ at, message: body.error ?? "Something went wrong. Please try again." });
        setStatus("ready");
        // The Square card TOKEN is single-use and is always regenerated by the
        // next tokenize() call. The IDEMPOTENCY KEY is different: it is the only
        // thing stopping a double charge, so it must survive a retry whenever
        // the outcome was unknown (lost response, timeout) — the server tells us
        // via reuseIdempotencyKey. Rotate it only when Square definitively
        // declined, because a spent key would then be rejected as reused.
        if (!body.reuseIdempotencyKey) {
          idempotencyKeyRef.current = crypto.randomUUID();
        }
        return;
      }

      pushEvent("purchase", {
        ecommerce: {
          transaction_id: body.orderNumber,
          currency: "USD",
          value: totalCents / 100,
          shipping: feeCents / 100,
          items: detailed.map((l) => ({
            item_id: l.slug,
            item_name: l.name,
            item_variant: l.label,
            price: l.unitPriceCents / 100,
            quantity: l.quantity,
          })),
        },
      });

      clear();
      router.push(
        `/shop/thank-you?order=${encodeURIComponent(body.orderNumber ?? "")}&f=${fulfillment}`,
      );
    } catch (err) {
      console.error("[shop] checkout submit failed:", err);
      setFailure({ at, message: "We couldn't reach the farm. Please try again." });
      setStatus("ready");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    // Gaps first: empty required fields are marked and focused even while the card
    // form is still loading, and this never reaches Square.
    if (!readyToPay()) return;
    if (!cardRef.current || status !== "ready") {
      setFailure({
        at: "card",
        message:
          status === "unavailable"
            ? "Card payment isn't loading right now. Please call us and we'll take the order."
            : "The secure card form is still loading. Give it a moment and tap Pay again.",
      });
      return;
    }

    setPaidWith("card");
    setStatus("submitting");
    const result = await cardRef.current.tokenize();
    if (result.status !== "OK" || !result.token) {
      setFailure({
        at: "card",
        message: result.errors?.[0]?.message ?? "Please check your card details and try again.",
      });
      setStatus("ready");
      return;
    }
    await submitWithToken(result.token, "card");
  }

  const busy = status === "submitting";
  const emailBad = (touched.email || showGaps) && !emailOk;
  const phoneBad = (touched.phone || showGaps) && !phoneOk;
  const nameBad = showGaps && !nameOk;
  const addressBad = showGaps && !form.address.trim();
  const cityBad = showGaps && !form.city.trim();
  const zipBad = showGaps && form.zip.trim().length < 5;
  const errorRing = "border-[#8c3b2a] focus:border-[#8c3b2a]";
  const errorText = "m-0 mt-1 text-[12px] font-medium text-[#8c3b2a]";
  const shortBy = Math.max(0, DELIVERY_MINIMUM_CENTS - subtotalCents);
  const payDisabled = busy || Boolean(blocking);

  // The shop has one empty state, the cart's (r4): an empty checkout goes there.
  // Never while an order is being placed: a paid order clears the cart just
  // before it navigates to the thank-you page, and that navigation must win.
  const cartEmpty = cartReady && count === 0;
  const placing = status === "submitting";
  useEffect(() => {
    if (cartEmpty && !placing) router.replace("/shop/cart");
  }, [cartEmpty, placing, router]);

  if (cartEmpty) {
    // Paper only, for the moment before the cart or thank-you page loads.
    return <div aria-busy="true" className="surface-paper min-h-svh bg-paper" />;
  }

  const legend =
    "float-left w-full font-display text-[23px] font-semibold leading-tight lg:text-[26px]";
  const numeral = "mr-2 text-fern [font-variant-numeric:lining-nums]";
  const orderLines = (
    <ul className="m-0 list-none border-t border-rule p-0 text-[14px]">
      {detailed.map((line) => {
        const product = getProduct(line.slug);
        return (
          <li key={line.variantId} className="flex items-center gap-3 border-b border-rule py-2.5">
            <span className="relative h-12 w-12 shrink-0 border border-frame bg-paper p-[2px]">
              <span className="relative block h-full w-full overflow-hidden">
                <Image src={line.image} alt="" fill sizes="48px" className="object-cover" />
              </span>
              {line.quantity > 1 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center bg-ink px-1 text-[11px] font-semibold text-paper-light">
                  {line.quantity}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1 leading-snug">
              {product?.title ?? line.name}
              {line.label && <span className="text-ink-note"> · {line.label}</span>}
            </span>
            <span className="font-medium">{formatCents(line.lineTotalCents)}</span>
          </li>
        );
      })}
    </ul>
  );
  const input =
    "mt-1.5 h-12 w-full border border-frame bg-paper-light px-3.5 text-[16px] text-ink focus:border-pine";

  return (
    // min-h-svh: the paper ground reaches the bottom of a short screen; the slim
    // footer sits below it, never above a band of white (r4).
    <div className="surface-paper min-h-svh bg-paper pt-[var(--header-h,60px)] font-sans text-ink">
      <form onSubmit={handleSubmit} noValidate className="px-5 pb-14 pt-5 lg:px-16 lg:pb-24 lg:pt-12">
        <div className="mx-auto max-w-[1180px] lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-16">
          <div className="lg:col-start-1 lg:row-start-1">
            <h1 className="field-heading m-0 font-display text-[34px] leading-none lg:text-[52px]">Checkout</h1>
            <p className="m-0 mt-2 text-[14px] text-ink-note">Guest checkout. No account to make.</p>

            {/* Phone: the order as one collapsed row, so Pay sits right under the card field */}
            <details className="group mt-5 border-y border-rule lg:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 text-[15px] [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="font-semibold">Your order</span>{" "}
                  <span className="text-ink-note">
                    · {count} {count === 1 ? "item" : "items"}
                  </span>
                </span>
                <span className="flex items-center gap-2 font-semibold">
                  {formatCents(totalCents)}
                  <ChevronDownIcon size={14} className="text-pine transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <div className="pb-3">
                {orderLines}
                <p className="m-0 mt-2 text-[12px] text-ink-note">
                  <Link href="/shop/cart" className="font-medium text-pine">Edit your order</Link>
                </p>
              </div>
            </details>

            {/* Wallets: first screen, pickup preselected. The payment request asks
                for no contact fields, so the wallets stay held (aria-disabled, with
                a plain line) until name, email and phone pass the server's rules. */}
            <ExpressPay
              payments={payments}
              totalCents={totalCents}
              disabled={busy || status !== "ready"}
              blocked={walletBlock}
              onBlocked={showFirstGap}
              onToken={(t) => void submitWithToken(t, "wallet")}
              onError={(message) => setFailure({ at: "wallet", message })}
              alert={failure?.at === "wallet" ? failure.message : null}
              placing={busy && paidWith === "wallet"}
            />

            {/* I. How you'll get it */}
            <fieldset className="m-0 mt-5 border-0 border-t border-ink p-0 pt-4">
              <legend className={legend}>
                <span className={numeral}>I</span>How you&apos;ll get it
              </legend>
              <div className="clear-left grid gap-2.5 pt-3 lg:grid-cols-2 lg:gap-3">
                <label
                  className={cn(
                    "flex cursor-pointer gap-3 border-2 bg-paper-light p-4",
                    fulfillment === "pickup" ? "border-pine" : "border-frame",
                  )}
                >
                  <input
                    type="radio"
                    name="fulfillment"
                    checked={fulfillment === "pickup"}
                    onChange={() => setFulfillment("pickup")}
                    className="mt-1 h-5 w-5 shrink-0 accent-pine"
                  />
                  <span>
                    <span className="flex items-baseline gap-2">
                      <span className="text-[16px] font-semibold">Pick up at the farm</span>
                      <span className="text-[14px] font-semibold text-fern">Free</span>
                    </span>
                    <span className="mt-1 block text-[13px] leading-[1.45] text-ink-body">
                      {PICKUP_LOCATION.address.replace(", OR 97011", "")}. We call you when it&apos;s packed.
                    </span>
                  </span>
                </label>
                <label
                  className={cn(
                    "flex gap-3 border-2 p-4",
                    deliveryLocked ? "cursor-not-allowed border-frame bg-paper" : "cursor-pointer bg-paper-light",
                    !deliveryLocked && (fulfillment === "delivery" ? "border-pine" : "border-frame"),
                  )}
                >
                  <input
                    type="radio"
                    name="fulfillment"
                    disabled={deliveryLocked}
                    checked={fulfillment === "delivery"}
                    onChange={() => setFulfillment("delivery")}
                    className="mt-1 h-5 w-5 shrink-0 accent-pine"
                  />
                  <span>
                    <span className="flex items-baseline gap-2">
                      <span className={cn("text-[16px] font-semibold", deliveryLocked && "text-ink-note")}>Local delivery</span>
                      <span className="text-[14px] text-ink-note">{formatCents(DELIVERY_FEE_CENTS).replace(/\.00$/, "")}</span>
                    </span>
                    <span className={cn("mt-1 block text-[13px] leading-[1.45]", deliveryLocked ? "text-ink-note" : "text-ink-body")}>
                      {/* The fee is in the label above; the body says it once (Jobs r3). */}
                      On orders of {formatCentsShort(DELIVERY_MINIMUM_CENTS)} or more, Mt. Hood corridor to east Portland.
                      {deliveryLocked && (
                        <>
                          {" "}Yours is {formatCents(shortBy).replace(/\.00$/, "")} short.{" "}
                          <Link href="/shop/cart" className="font-medium text-pine underline decoration-pine-line underline-offset-4">
                            Add to it
                          </Link>
                        </>
                      )}
                    </span>
                  </span>
                </label>
              </div>
              <PendingSlot className="mt-2.5" note="PENDING CONNOR: pickup hours (D22)." />
            </fieldset>

            {/* II. Your details */}
            <fieldset className="m-0 mt-8 border-0 border-t border-ink p-0 pt-4">
              <legend className={legend}>
                <span className={numeral}>II</span>Your details
              </legend>
              <div className="clear-left grid gap-4 pt-3 lg:grid-cols-2 lg:gap-x-5">
                <div className="lg:col-span-2">
                  <label htmlFor="co-name" className="block text-[13px] font-medium text-ink">Name</label>
                  <input id="co-name" type="text" autoComplete="name" required maxLength={120} value={form.name} onChange={set("name")} aria-invalid={nameBad || undefined} aria-describedby={nameBad ? "co-name-err" : undefined} className={cn(input, nameBad && errorRing)} />
                  {nameBad && <p id="co-name-err" className={errorText}>Add your name so we know who to look for.</p>}
                </div>
                <div>
                  <label htmlFor="co-email" className="block text-[13px] font-medium text-ink">Email</label>
                  <input
                    id="co-email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={200}
                    value={form.email}
                    onChange={set("email")}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    aria-describedby="co-email-help"
                    aria-invalid={emailBad || undefined}
                    className={cn(input, emailBad && errorRing)}
                  />
                  <p id="co-email-help" className={cn("m-0 mt-1 text-[12px]", emailBad ? "font-medium text-[#8c3b2a]" : "text-ink-note")}>
                    {emailBad
                      ? form.email.trim()
                        ? "Check the email so your receipt reaches you."
                        : "Add your email so we can send the receipt."
                      : "Your receipt goes here."}
                  </p>
                </div>
                <div>
                  <label htmlFor="co-phone" className="block text-[13px] font-medium text-ink">Phone</label>
                  <input
                    id="co-phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    maxLength={40}
                    value={form.phone}
                    onChange={set("phone")}
                    onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                    aria-describedby="co-phone-help"
                    aria-invalid={phoneBad || undefined}
                    className={cn(input, phoneBad && errorRing)}
                  />
                  <p id="co-phone-help" className={cn("m-0 mt-1 text-[12px]", phoneBad ? "font-medium text-[#8c3b2a]" : "text-ink-note")}>
                    {phoneBad
                      ? "Add a phone number so we can call you when it's packed."
                      : "So we can call you when it's packed."}
                  </p>
                </div>
                {fulfillment === "delivery" && (
                  <>
                    <div className="lg:col-span-2">
                      <label htmlFor="co-address" className="block text-[13px] font-medium text-ink">Street address</label>
                      <input id="co-address" type="text" autoComplete="address-line1" required maxLength={240} value={form.address} onChange={set("address")} aria-invalid={addressBad || undefined} aria-describedby={addressBad ? "co-address-err" : undefined} className={cn(input, addressBad && errorRing)} />
                      {addressBad && <p id="co-address-err" className={errorText}>Add the street address for delivery.</p>}
                    </div>
                    <div>
                      <label htmlFor="co-city" className="block text-[13px] font-medium text-ink">City</label>
                      <input id="co-city" type="text" autoComplete="address-level2" required maxLength={120} value={form.city} onChange={set("city")} aria-invalid={cityBad || undefined} aria-describedby={cityBad ? "co-city-err" : undefined} className={cn(input, cityBad && errorRing)} />
                      {cityBad && <p id="co-city-err" className={errorText}>Add the city.</p>}
                    </div>
                    <div>
                      <label htmlFor="co-zip" className="block text-[13px] font-medium text-ink">ZIP</label>
                      <input id="co-zip" type="text" inputMode="numeric" autoComplete="postal-code" required maxLength={10} value={form.zip} onChange={set("zip")} aria-invalid={zipBad || undefined} aria-describedby={zipBad ? "co-zip-err" : undefined} className={cn(input, zipBad && errorRing)} />
                      {zipBad && <p id="co-zip-err" className={errorText}>Add the 5-digit ZIP.</p>}
                    </div>
                  </>
                )}
              </div>
              <details className="mt-3 border-b border-rule">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[14px] font-medium text-pine [&::-webkit-details-marker]:hidden">
                  <span aria-hidden="true">+</span>Add a note for the farm (optional)
                </summary>
                <textarea
                  aria-label="Note for the farm"
                  value={form.notes}
                  onChange={set("notes")}
                  rows={2}
                  maxLength={1000}
                  className="mb-3 w-full border border-frame bg-paper-light px-3.5 py-2.5 text-[16px] text-ink focus:border-pine"
                />
              </details>
              {/* Honeypot: hidden from people, irresistible to bots. */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={form.website}
                onChange={set("website")}
                className="absolute left-[-9999px] h-0 w-0 opacity-0"
              />
            </fieldset>

            {/* III. Card, then Pay directly under it */}
            <fieldset className="m-0 mt-8 border-0 border-t border-ink p-0 pt-4">
              <legend className={legend}>
                <span className={numeral}>III</span>Card
              </legend>
              <div className="clear-left pt-3">
                {status === "unavailable" ? (
                  <p role="status" className="m-0 border-y border-rule py-3 text-[14px] leading-[1.5] text-ink-body">
                    Card payment isn&apos;t loading right now. Call{" "}
                    <a href={`tel:+1${CONTACT.phone.replace(/\D/g, "")}`} className="whitespace-nowrap font-medium text-pine">
                      {CONTACT.phone}
                    </a>{" "}
                    and we&apos;ll take the order.
                  </p>
                ) : (
                  <>
                    {/* #square-card: Square's iframe mounts here; height reserved so nothing jumps */}
                    <div id="square-card" aria-label="Secure card field from Square" className="min-h-[52px]" />
                    {status === "loading" && (
                      <p className="m-0 text-[13px] text-ink-note" role="status">Loading the secure card form…</p>
                    )}
                    <p className="m-0 mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-note">
                      <LockIcon size={12} />
                      Card details go straight to Square. We never see them.
                    </p>
                  </>
                )}

                {(failure?.at === "card" || shownProblem) && (
                  <p
                    id="card-alert"
                    role="alert"
                    tabIndex={-1}
                    className="m-0 mt-4 border-l-2 border-pine-line bg-paper-shade px-4 py-3 text-[14px] text-ink"
                  >
                    {failure?.at === "card" ? failure.message : shownProblem}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={payDisabled}
                  className={cn(
                    "mt-4 inline-flex h-14 w-full items-center justify-center gap-2.5 px-6 text-[16px] font-semibold tracking-[0.02em]",
                    payDisabled ? "cursor-not-allowed bg-paper-shade text-ink-note" : "bg-pine text-paper-light hover:bg-pine-dark",
                  )}
                >
                  <LockIcon size={15} />
                  {busy ? "Paying…" : `Pay ${formatCents(totalCents)}`}
                </button>
                <p className="m-0 mt-2.5 text-[13px] text-ink-note lg:hidden">
                  That&apos;s everything. No sales tax.
                </p>
                <FieldReviewLine tier="nearCta" count={reviewCount} total={reviewTotal} starSize={12} className="mt-3 text-[13px] text-ink-body lg:text-[13px]" />
              </div>
            </fieldset>
          </div>

          {/* Desktop: the order summary, sticky on the right */}
          <aside className="hidden border border-frame bg-paper-light p-8 lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1 lg:block lg:self-start">
            <div className="flex items-baseline justify-between">
              <h2 className="m-0 font-display text-[26px] font-semibold leading-none">Your order</h2>
              <Link href="/shop/cart" className="flex min-h-11 items-center text-[13px] font-medium text-pine">
                <span className="border-b border-pine-line">Edit</span>
              </Link>
            </div>
            <div className="mt-2">{orderLines}</div>
            <dl className="m-0 mt-3 space-y-1.5 text-[15px]">
              <div className="flex items-baseline gap-2">
                <dt className="text-ink-body">Subtotal</dt>
                <FieldLeader />
                <dd className="m-0">{formatCents(subtotalCents)}</dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="text-ink-body">{fulfillment === "delivery" ? "Local delivery" : "Farm pickup"}</dt>
                <FieldLeader />
                <dd className="m-0 text-fern">{feeCents === 0 ? "Free" : formatCents(feeCents)}</dd>
              </div>
              <div className="flex items-baseline gap-2 border-t border-ink pt-2.5">
                <dt className="font-display text-[22px] font-semibold">Total</dt>
                <dd className="m-0 min-w-4 flex-1" />
                <dd className="m-0 text-[20px] font-semibold">{formatCents(totalCents)}</dd>
              </div>
            </dl>
            <p className="m-0 mt-1 text-[12px] text-ink-note">That&apos;s everything. No sales tax.</p>
          </aside>
        </div>
      </form>
    </div>
  );
}
