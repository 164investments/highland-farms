"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { formatCents } from "@/lib/shop/money";

/**
 * Gift-certificate desk: issue, look up, void.
 *
 * The issue product list mirrors `GIFT_PRODUCTS` in `src/lib/booking/gift.ts`
 * for display only — that module can't be imported client-side (it pulls in
 * the service-role Supabase store), and the admin `/certs` POST route only
 * accepts these three fixed product ids (no free-form/custom-value cert path
 * exists server-side, despite the task brief's mention of one — see that
 * route's `issueSchema`).
 */

const GIFT_PRODUCTS = [
  { id: "tour-for-two", name: "Farm Tour for Two", amountCents: 15000, blurb: "A private 60-minute Highland Cow tour for two guests." },
  { id: "spa-for-two", name: "Nordic Spa for Two", amountCents: 20000, blurb: "A 90-minute Nordic Forest Spa session for two guests." },
  { id: "spa-3-visit", name: "Spa 3-Visit Pack", amountCents: 19900, blurb: "Three single-guest Nordic Forest Spa visits, any time." },
] as const;

type GiftProductId = (typeof GIFT_PRODUCTS)[number]["id"];

interface GiftCertificate {
  code: string;
  kind: "value" | "visits";
  productScope: string | null;
  initialUnits: number;
  remainingUnits: number;
  purchaserEmail: string | null;
  recipientEmail: string | null;
  squarePaymentId: string | null;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

function remainingLabel(cert: GiftCertificate): string {
  if (cert.kind === "value") {
    return `${formatCents(cert.remainingUnits)} of ${formatCents(cert.initialUnits)}`;
  }
  return `${cert.remainingUnits} of ${cert.initialUnits} visits`;
}

export function CertsTab({ token }: { token: string }) {
  return (
    <div className="space-y-4">
      <IssueForm token={token} />
      <LookupPanel token={token} />
    </div>
  );
}

function IssueForm({ token }: { token: string }) {
  const [productId, setProductId] = useState<GiftProductId>("tour-for-two");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const product = GIFT_PRODUCTS.find((p) => p.id === productId)!;

  async function issue() {
    setError(null);
    setCode(null);
    if (!purchaserEmail.trim()) {
      setError("Purchaser email is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/shop/admin/booking/certs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "issue",
          productId,
          purchaserEmail: purchaserEmail.trim(),
          recipientEmail: recipientEmail.trim() || null,
          paymentId: paymentId.trim() || null,
        }),
      });
      if (res.status === 401) {
        setSessionExpired(true);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not issue the certificate.");
        return;
      }
      setCode(body.code ?? null);
      setPurchaserEmail("");
      setRecipientEmail("");
      setPaymentId("");
    } finally {
      setBusy(false);
    }
  }

  if (sessionExpired) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-sm text-charcoal shadow-sm font-sans">
        Session expired — reload with your admin link.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-2 text-xs uppercase tracking-[0.1em] text-muted font-sans">Issue a gift certificate</p>
      <div className="mb-2 flex flex-wrap gap-2">
        {GIFT_PRODUCTS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setProductId(p.id)}
            className={`rounded-xl border px-3 py-2 text-left text-xs font-sans ${
              productId === p.id
                ? "border-forest bg-forest/5"
                : "border-cream-dark hover:border-forest/40"
            }`}
          >
            <span className="block text-sm text-charcoal">{p.name}</span>
            <span className="block text-muted">{formatCents(p.amountCents)}</span>
          </button>
        ))}
      </div>
      <p className="mb-3 text-xs text-muted font-sans">{product.blurb}</p>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block text-xs font-sans">
          <span className="mb-1 block text-muted">Purchaser email</span>
          <input
            type="email"
            value={purchaserEmail}
            onChange={(e) => setPurchaserEmail(e.target.value)}
            className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
          />
        </label>
        <label className="block text-xs font-sans">
          <span className="mb-1 block text-muted">Recipient email (optional)</span>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
          />
        </label>
        <label className="block text-xs font-sans">
          <span className="mb-1 block text-muted">Square payment ID (blank for cash/check)</span>
          <input
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
          />
        </label>
      </div>

      {error && <p role="alert" className="mt-2 text-xs text-red-700 font-sans">{error}</p>}
      {code && (
        <p role="status" className="mt-2 text-sm text-forest font-sans">
          Issued <span className="font-medium">{code}</span>.
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={issue}
        className={`mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-xs uppercase tracking-[0.1em] font-sans ${
          busy ? "cursor-not-allowed bg-cream-dark text-muted" : "bg-forest text-white shadow-sm hover:shadow-md"
        }`}
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Issue certificate
      </button>
    </div>
  );
}

function LookupPanel({ token }: { token: string }) {
  const [code, setCode] = useState("");
  const [cert, setCert] = useState<GiftCertificate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingVoid, setConfirmingVoid] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  async function lookup() {
    setError(null);
    setCert(null);
    setConfirmingVoid(false);
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter a code.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/shop/admin/booking/certs?code=${encodeURIComponent(trimmed)}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setSessionExpired(true);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { certificate?: GiftCertificate; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Not found.");
        return;
      }
      setCert(body.certificate ?? null);
    } finally {
      setBusy(false);
    }
  }

  async function voidCert() {
    if (!cert) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/admin/booking/certs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "void", code: cert.code }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not void that certificate.");
        return;
      }
      setCert({ ...cert, status: "void" });
      setConfirmingVoid(false);
    } finally {
      setBusy(false);
    }
  }

  if (sessionExpired) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-sm text-charcoal shadow-sm font-sans">
        Session expired — reload with your admin link.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-2 text-xs uppercase tracking-[0.1em] text-muted font-sans">Look up a certificate</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="HFGC-XXXX-XXXX"
          className="w-56 rounded-lg border border-cream-dark px-2.5 py-1.5 text-sm uppercase outline-none focus:border-forest font-sans"
        />
        <button
          type="button"
          disabled={busy}
          onClick={lookup}
          className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-4 text-xs uppercase tracking-[0.1em] font-sans ${
            busy ? "cursor-not-allowed bg-cream-dark text-muted" : "bg-forest text-white shadow-sm hover:shadow-md"
          }`}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Look up
        </button>
      </div>

      {error && <p role="alert" className="mt-2 text-xs text-red-700 font-sans">{error}</p>}

      {cert && (
        <div className="mt-3 rounded-xl border border-cream-dark p-3 text-sm font-sans">
          <p className="font-medium text-charcoal">{cert.code}</p>
          <p className="mt-1 text-charcoal">
            {cert.kind === "value" ? "Value certificate" : "Visit pack"}
            {cert.productScope ? ` · ${cert.productScope}` : ""}
          </p>
          <p className="text-charcoal">Remaining: {remainingLabel(cert)}</p>
          <p className="text-charcoal">
            Status:{" "}
            <span className={cert.status === "void" ? "text-muted line-through" : "text-forest"}>
              {cert.status}
            </span>
          </p>
          {cert.purchaserEmail && <p className="text-muted">Purchased by {cert.purchaserEmail}</p>}
          {cert.recipientEmail && <p className="text-muted">For {cert.recipientEmail}</p>}

          {cert.status !== "void" && (
            confirmingVoid ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-charcoal">Void this certificate? It can&apos;t be redeemed after.</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={voidCert}
                  className="rounded-full bg-red-700 px-3 py-1 text-xs uppercase tracking-[0.1em] text-white hover:bg-red-800 font-sans"
                >
                  Confirm void
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingVoid(false)}
                  className="rounded-full border border-cream-dark px-3 py-1 text-xs uppercase tracking-[0.1em] text-charcoal font-sans"
                >
                  Keep
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingVoid(true)}
                className="mt-2 rounded-full border border-red-200 px-3 py-1 text-xs uppercase tracking-[0.1em] text-red-700 hover:border-red-400 font-sans"
              >
                Void
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
