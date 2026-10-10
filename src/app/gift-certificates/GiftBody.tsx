"use client";

import { useEffect, useRef, useState } from "react";
import { formatCents } from "@/lib/shop/money";
import { GIFT_PRODUCTS, type GiftProductFamily, type GiftProductId } from "@/lib/booking/gift-products";
import { BookingPayment } from "@/components/booking/BookingPayment";
import { fieldCtaClass } from "@/components/ui/FieldGuide";
import { startStripeCheckout, stripeCheckoutEnabled, usePaymentCancelled } from "@/lib/payments/client";

declare global { interface Window { dataLayer?: Record<string, unknown>[] } }
function push(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

export function GiftBody() {
  const paymentCancelled = usePaymentCancelled();
  const [productId, setProductId] = useState<GiftProductId | null>(null);
  const [purchaserName, setPurchaserName] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ code: string | null } | null>(null);

  // Same reuse-on-unknown-outcome contract as src/lib/booking/client.ts: a
  // failed request whose Square outcome is "unknown" must replay the SAME
  // idempotency key so a retry can never double-charge the card.
  const idempotencyKeyRef = useRef<string | null>(null);
  const reuseKeyRef = useRef(false);

  useEffect(() => push("gift_view"), []);

  const product = GIFT_PRODUCTS.find((p) => p.id === productId) ?? null;
  const familyProducts = product ? GIFT_PRODUCTS.filter((p) => p.family === product.family) : [];
  const detailsComplete = Boolean(
    product
      && purchaserName.trim()
      && /.+@.+\..+/.test(purchaserEmail)
      && (!recipientEmail || /.+@.+\..+/.test(recipientEmail)),
  );

  async function submit(sourceId?: string) {
    if (!product || !detailsComplete || submitting) return;
    setSubmitting(true);
    setError("");
    if (stripeCheckoutEnabled) {
      const result = await startStripeCheckout({
        kind: "gift", productId: product.id,
        purchaser: { name: purchaserName.trim(), email: purchaserEmail.trim() },
        recipientEmail: recipientEmail.trim() || undefined,
        message: message.trim() || undefined, website: website || undefined,
      });
      if (result.ok && "checkoutUrl" in result) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      setSubmitting(false);
      setError(result.ok ? "We couldn’t open secure payment. Please try again." : result.error);
      return;
    }
    if (!idempotencyKeyRef.current || !reuseKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }
    reuseKeyRef.current = false;

    let res: Response;
    let data: Record<string, unknown> & {
      success?: boolean;
      code?: string | null;
      reuseIdempotencyKey?: boolean;
      error?: string;
    };
    try {
      res = await fetch("/api/booking/gift/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          idempotencyKey: idempotencyKeyRef.current,
          sourceId,
          purchaser: { name: purchaserName.trim(), email: purchaserEmail.trim() },
          recipientEmail: recipientEmail.trim() || undefined,
          message: message.trim() || undefined,
          website: website || undefined,
        }),
      });
      data = await res.json().catch(() => ({}));
    } catch {
      reuseKeyRef.current = true;
      setSubmitting(false);
      setError("Connection hiccup. Check your connection and try again.");
      return;
    }
    setSubmitting(false);
    if (res.ok && data.success) {
      idempotencyKeyRef.current = null;
      const code = (data.code as string | null | undefined) ?? null;
      push("gift_purchase", { value: product.amountCents / 100, gift_product: product.id });
      setDone({ code });
      return;
    }
    reuseKeyRef.current = res.status === 402 && data.reuseIdempotencyKey === true;
    setError(data.error ?? "Something went wrong. Please try again.");
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-forest/20 bg-sage/10 p-6 text-center">
        <h3 className="text-2xl text-forest">Thank you.</h3>
        {done.code ? (
          <>
            <p className="mt-2 font-sans text-sm text-stone-700">
              Your gift certificate code: <strong>{done.code}</strong>
            </p>
            <p className="mt-2 font-sans text-sm text-stone-700">We&apos;ve emailed it too.</p>
          </>
        ) : (
          <p className="mt-2 font-sans text-sm text-stone-700">
            Payment received. We&apos;re finishing your certificate and will email it shortly.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {stripeCheckoutEnabled && paymentCancelled && <p role="status" className="mb-5 border-l-2 border-pine-line bg-paper-shade px-4 py-3 font-sans text-sm text-ink-body">
        You returned from secure payment. Choose your gift and review your details to try again.
      </p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {([['tour', 'Farm tour'], ['spa', 'Nordic spa'], ['day', 'Highland Day'], ['pack', 'Spa visit packs']] as [GiftProductFamily, string][]).map(([family, label]) => {
          const firstProduct = GIFT_PRODUCTS.find((p) => p.family === family)!;
          return (
          <button
            key={family}
            type="button"
            aria-pressed={product?.family === family}
            onClick={() => setProductId(firstProduct.id)}
            className={`border p-5 text-left transition ${
              product?.family === family
                ? "border-pine bg-paper-shade"
                : "border-frame bg-paper-light hover:border-pine"
            }`}
          >
            <span className="block font-display text-[24px] font-semibold text-ink">{label}</span>
            <span className="mt-1 block font-sans text-sm text-ink-body">From {formatCents(firstProduct.amountCents)}</span>
            <span className="mt-2 block font-sans text-xs text-ink-note">{family === 'day' ? 'A private tour and a spa spot for each guest.' : family === 'tour' ? 'A private 60-minute tour with the herd.' : family === 'pack' ? 'Three, five, or ten visits. Use within 180 days.' : 'A 90-minute Nordic Forest Spa session.'}</span>
          </button>
          );
        })}
      </div>

      {product && (
        <div className="relative mt-6 rounded-2xl border border-forest/15 p-5 sm:p-7">
          <label htmlFor="gift-guests" className="block font-sans text-sm font-medium text-ink">{product.family === 'pack' ? 'Choose a visit pack' : 'How many guests?'}</label>
          <select id="gift-guests" value={product.id} onChange={(e) => setProductId(e.target.value)}
            className="mt-2 h-12 w-full border border-frame bg-paper-light px-3 font-sans text-base text-ink">
            {familyProducts.map((p) => <option key={p.id} value={p.id}>{p.family === 'pack' ? `${p.units} visits` : `${p.guests} ${p.guests === 1 ? 'guest' : 'guests'}`} · {formatCents(p.amountCents)}</option>)}
          </select>
          <p className="mb-5 mt-2 font-sans text-sm text-ink-body">{product.blurb}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              className="rounded-lg border border-stone-300 px-3 py-2.5 font-sans text-sm"
              placeholder="Your name" autoComplete="name"
              value={purchaserName} onChange={(e) => setPurchaserName(e.target.value)}
            />
            <input
              className="rounded-lg border border-stone-300 px-3 py-2.5 font-sans text-sm"
              placeholder="Your email" type="email" autoComplete="email"
              value={purchaserEmail} onChange={(e) => setPurchaserEmail(e.target.value)}
            />
            <input
              className="rounded-lg border border-stone-300 px-3 py-2.5 font-sans text-sm sm:col-span-2"
              placeholder="Recipient email (optional, leave blank to keep it for yourself)"
              type="email" value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
            <textarea
              className="rounded-lg border border-stone-300 px-3 py-2.5 font-sans text-sm sm:col-span-2"
              placeholder="A short message (optional)" maxLength={280} rows={3}
              value={message} onChange={(e) => setMessage(e.target.value)}
            />
            <p className="-mt-2 font-sans text-xs text-stone-400 sm:col-span-2">{message.length}/280</p>
          </div>

          {/* Honeypot — hidden from real users, bots auto-fill it */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <label htmlFor="gift-website">Website</label>
            <input
              type="text" id="gift-website" autoComplete="off" tabIndex={-1}
              value={website} onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {error && <p role="alert" className="mt-4 font-sans text-sm text-red-700">{error}</p>}

          {stripeCheckoutEnabled && (
            <div className="mt-5">
              <button type="button" onClick={() => void submit()} disabled={!detailsComplete || submitting}
                className={`${fieldCtaClass} w-full disabled:cursor-not-allowed disabled:bg-paper-shade disabled:text-ink-note`}>
                {submitting ? "Opening secure payment…" : `Continue to secure payment · ${formatCents(product.amountCents)}`}
              </button>
              <p className="mt-2 font-sans text-xs text-ink-note">Choose your payment method securely with Stripe.</p>
            </div>
          )}
          {detailsComplete && !stripeCheckoutEnabled && (
            <div className="mt-5">
              <BookingPayment
                totalCents={product.amountCents} disabled={submitting}
                onToken={(sourceId) => submit(sourceId)} onError={(m) => setError(m)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
