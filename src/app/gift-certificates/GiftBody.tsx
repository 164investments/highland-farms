"use client";

import { useEffect, useRef, useState } from "react";
import { formatCents } from "@/lib/shop/money";
import { GIFT_PRODUCTS, type GiftProductId } from "@/lib/booking/gift";
import { BookingPayment } from "@/components/booking/BookingPayment";

declare global { interface Window { dataLayer?: Record<string, unknown>[] } }
function push(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

export function GiftBody() {
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
  const detailsComplete = Boolean(
    product
      && purchaserName.trim()
      && /.+@.+\..+/.test(purchaserEmail)
      && (!recipientEmail || /.+@.+\..+/.test(recipientEmail)),
  );

  async function submit(sourceId: string) {
    if (!product || submitting) return;
    setSubmitting(true);
    setError("");
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {GIFT_PRODUCTS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setProductId(p.id)}
            className={`rounded-2xl border p-5 text-left transition ${
              productId === p.id
                ? "border-forest bg-forest/5"
                : "border-forest/15 hover:border-forest/30"
            }`}
          >
            <p className="text-lg text-forest">{p.name}</p>
            <p className="mt-1 font-sans text-sm text-stone-600">{formatCents(p.amountCents)}</p>
            <p className="mt-2 font-sans text-xs text-stone-500">{p.blurb}</p>
          </button>
        ))}
      </div>

      {product && (
        <div className="relative mt-6 rounded-2xl border border-forest/15 p-5 sm:p-7">
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

          {error && <p className="mt-4 font-sans text-sm text-red-700">{error}</p>}

          {detailsComplete && (
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
