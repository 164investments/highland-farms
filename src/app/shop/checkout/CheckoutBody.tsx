"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Lock, MapPin, Truck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { useCart } from "@/lib/shop/cart";
import { formatCents } from "@/lib/shop/money";
import {
  DELIVERY_FEE_CENTS,
  DELIVERY_MINIMUM_CENTS,
  PICKUP_LOCATION,
  deliveryProblem,
  type Fulfillment,
} from "@/lib/shop/fulfillment";
import { CONTACT } from "@/lib/constants";
import { Star } from "lucide-react";
import { REVIEW_COUNT } from "@/components/shared/GoogleReviewsSection";

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
}
declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => SquarePayments;
    };
  }
}

function pushEvent(event: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...payload });
}

type Status = "loading" | "ready" | "submitting" | "unavailable";

export function CheckoutBody({
  applicationId,
  locationId,
}: {
  applicationId: string;
  locationId: string;
}) {
  const router = useRouter();
  const { detailed, subtotalCents, count, clear, ready: cartReady } = useCart();

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("pickup");
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
  const attachedRef = useRef(false);
  // Stable per checkout attempt — this is what prevents a double-charge on a
  // double-click or a retried request.
  const idempotencyKeyRef = useRef<string>("");
  if (!idempotencyKeyRef.current && typeof crypto !== "undefined") {
    idempotencyKeyRef.current = crypto.randomUUID();
  }

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

        const payments = window.Square.payments(applicationId, locationId);
        const card = await payments.card();
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!cardRef.current || status !== "ready") return;
    if (blocking) {
      setError(blocking);
      return;
    }

    setStatus("submitting");
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== "OK" || !result.token) {
        setError(
          result.errors?.[0]?.message ??
            "Please check your card details and try again.",
        );
        setStatus("ready");
        return;
      }

      const response = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: result.token,
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
        setError(body.error ?? "Something went wrong. Please try again.");
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
      router.push(`/shop/thank-you?order=${encodeURIComponent(body.orderNumber ?? "")}`);
    } catch (err) {
      console.error("[shop] checkout submit failed:", err);
      setError("We couldn't reach the farm. Please try again.");
      setStatus("ready");
    }
  }

  if (cartReady && count === 0) {
    return (
      <main className="bg-cream pt-32 pb-20">
        <Container className="max-w-2xl text-center">
          <h1 className="font-display text-3xl font-light text-charcoal">Your cart is empty</h1>
          <Link
            href="/shop"
            className="mt-6 inline-flex min-h-[52px] items-center rounded-full bg-forest px-8 text-sm uppercase tracking-[0.12em] text-white font-sans"
          >
            Browse the farm store
          </Link>
        </Container>
      </main>
    );
  }

  const busy = status === "submitting";

  return (
    <main className="bg-cream pt-32 pb-20 sm:pb-28">
      <Container className="max-w-3xl">
        <Link
          href="/shop/cart"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-forest font-sans"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cart
        </Link>

        <h1 className="font-display text-3xl font-light tracking-tight text-charcoal sm:text-4xl">
          Checkout
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* ---- Fulfillment ---- */}
          <fieldset className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <legend className="px-1 text-xs uppercase tracking-[0.12em] text-muted font-sans">
              How would you like it?
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    key: "pickup" as const,
                    icon: MapPin,
                    title: "Farm pickup",
                    detail: "Free · Brightwood",
                  },
                  {
                    key: "delivery" as const,
                    icon: Truck,
                    title: "Local delivery",
                    detail: `${formatCents(DELIVERY_FEE_CENTS)} · Mt. Hood & east Portland`,
                  },
                ]
              ).map((opt) => {
                const Icon = opt.icon;
                const selected = fulfillment === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFulfillment(opt.key)}
                    aria-pressed={selected}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                      selected
                        ? "border-forest bg-forest/5 shadow-sm"
                        : "border-cream-dark bg-white hover:border-forest/40"
                    }`}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                    <span className="font-sans">
                      <span className="block text-sm text-charcoal">{opt.title}</span>
                      <span className="block text-xs text-muted">{opt.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {fulfillment === "pickup" && (
              <p className="mt-3 text-xs text-muted font-sans">
                {PICKUP_LOCATION.address} — we&apos;ll call when it&apos;s packed.
              </p>
            )}
          </fieldset>

          {/* ---- Contact ---- */}
          <fieldset className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <legend className="px-1 text-xs uppercase tracking-[0.12em] text-muted font-sans">
              Your details
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Name" value={form.name} onChange={set("name")} required autoComplete="name" />
              <Field label="Phone" value={form.phone} onChange={set("phone")} required type="tel" autoComplete="tel" />
              <div className="sm:col-span-2">
                <Field label="Email" value={form.email} onChange={set("email")} required type="email" autoComplete="email" />
              </div>
            </div>

            {fulfillment === "delivery" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Street address" value={form.address} onChange={set("address")} required autoComplete="address-line1" />
                </div>
                <Field label="City" value={form.city} onChange={set("city")} required autoComplete="address-level2" />
                <Field label="ZIP" value={form.zip} onChange={set("zip")} required inputMode="numeric" autoComplete="postal-code" />
              </div>
            )}

            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted font-sans">
                Notes for the farm (optional)
              </span>
              <textarea
                value={form.notes}
                onChange={set("notes")}
                rows={2}
                maxLength={1000}
                className="w-full rounded-xl border border-cream-dark bg-white px-3.5 py-2.5 text-sm text-charcoal outline-none transition-colors focus:border-forest font-sans"
              />
            </label>

            {/* Honeypot — hidden from people, irresistible to bots. */}
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

          {/* ---- Payment ---- */}
          <fieldset className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <legend className="px-1 text-xs uppercase tracking-[0.12em] text-muted font-sans">
              Payment
            </legend>

            {status === "unavailable" ? (
              <div className="mt-3 rounded-xl bg-cream p-4 text-sm text-charcoal font-sans">
                <p>Card payment isn&apos;t available right now.</p>
                <p className="mt-1.5 text-muted">
                  Call or text {CONTACT.phone} and we&apos;ll take your order over the
                  phone.
                </p>
              </div>
            ) : (
              <>
                <div id="square-card" className="mt-3 min-h-[90px]" />
                {status === "loading" && (
                  <p className="flex items-center gap-2 text-sm text-muted font-sans">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading secure card form…
                  </p>
                )}
              </>
            )}
          </fieldset>

          {/* ---- Totals ---- */}
          <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <ul className="mb-4 space-y-1.5 border-b border-cream-dark/60 pb-4 text-sm font-sans">
              {detailed.map((line) => (
                <li key={line.variantId} className="flex justify-between gap-3">
                  <span className="min-w-0 text-charcoal">
                    {line.quantity} × {line.name}
                    {line.label && (
                      <span className="text-muted"> · {line.label}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-muted">
                    {formatCents(line.lineTotalCents)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 text-sm font-sans">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="text-charcoal">{formatCents(subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">
                  {fulfillment === "delivery" ? "Local delivery" : "Farm pickup"}
                </dt>
                <dd className="text-charcoal">
                  {feeCents === 0 ? "Free" : formatCents(feeCents)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-cream-dark/60 pt-2.5 text-base">
                <dt className="text-charcoal">Total</dt>
                <dd className="font-medium text-forest">{formatCents(totalCents)}</dd>
              </div>
            </dl>

            {(error || shownProblem) && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-cream px-4 py-3 text-sm text-charcoal font-sans"
              >
                {error ?? shownProblem}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || status !== "ready" || Boolean(blocking)}
              className={`mt-5 flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-full text-sm uppercase tracking-[0.12em] transition-all font-sans ${
                busy || status !== "ready" || blocking
                  ? "cursor-not-allowed bg-cream-dark text-muted"
                  : "bg-forest text-white shadow-sm hover:shadow-md"
              }`}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Placing order…
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  Pay {formatCents(totalCents)}
                </>
              )}
            </button>

            <p className="mt-3 text-center text-xs text-muted font-sans">
              Card details go straight to Square. We never see or store your card
              number.
            </p>
            {/* Proof at the highest-anxiety moment. Deliberately NOT the
                ReviewBadge component — that links out to Google, and a link off
                the checkout page is a leak, not a convenience. */}
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-xs text-muted font-sans">
              <Star className="h-3 w-3 fill-forest text-forest" aria-hidden />
              Loved by {REVIEW_COUNT}+ guests on Google
            </p>
          </div>
        </form>
      </Container>
    </main>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted font-sans">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-xl border border-cream-dark bg-white px-3.5 py-2.5 text-sm text-charcoal outline-none transition-colors focus:border-forest font-sans"
      />
    </label>
  );
}
