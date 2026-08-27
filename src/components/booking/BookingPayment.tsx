"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCents } from "@/lib/shop/money";
import { ExpressPay } from "@/app/shop/checkout/ExpressPay";

/**
 * Square card + wallets for the booking flow.
 *
 * Mirrors CheckoutBody's SDK bootstrap (script load, payments() init, card()
 * attach, tokenize) — that code is proven in production. This component owns
 * its own Square init instead of taking applicationId/locationId as props
 * from a page, since NEXT_PUBLIC_ vars are inlined at build time and are
 * readable directly here.
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

type Status = "loading" | "ready" | "unavailable";

export function BookingPayment({
  totalCents,
  disabled,
  onToken,
  onError,
}: {
  totalCents: number;
  disabled: boolean;
  onToken: (sourceId: string) => void;
  onError: (message: string) => void;
}) {
  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "";
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "";
  const configured = Boolean(applicationId && locationId);

  const [status, setStatus] = useState<Status>("loading");
  const [payments, setPayments] = useState<SquarePayments | null>(null);
  const cardRef = useRef<SquareCard | null>(null);
  const attachedRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

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
        await card.attach("#booking-square-card");
        if (cancelled) {
          card.destroy?.();
          return;
        }
        cardRef.current = card;
        setStatus("ready");
      } catch (err) {
        console.error("[booking] Square SDK failed to load:", err);
        if (!cancelled) setStatus("unavailable");
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [applicationId, locationId, configured]);

  async function handlePay() {
    if (!cardRef.current || status !== "ready" || disabled || submitting) return;
    setSubmitting(true);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== "OK" || !result.token) {
        onError(result.errors?.[0]?.message ?? "Please check your card details and try again.");
        return;
      }
      onToken(result.token);
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "unavailable") {
    return (
      <p className="font-sans text-sm text-stone-600">
        Online payment isn&apos;t available right now. Call or text (971)
        563-1921 and we&apos;ll book you by phone.
      </p>
    );
  }

  const busy = disabled || submitting;

  return (
    <div>
      <ExpressPay
        payments={payments}
        totalCents={totalCents}
        disabled={busy}
        onToken={onToken}
        onError={onError}
      />
      <div id="booking-square-card" className="min-h-[90px]" />
      {status === "loading" && (
        <p className="mt-3 flex items-center gap-2 font-sans text-sm text-stone-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading secure card form…
        </p>
      )}
      {status === "ready" && (
        <Button className="mt-4 w-full" type="button" onClick={handlePay}>
          {submitting ? "Processing…" : `Pay ${formatCents(totalCents)}`}
        </Button>
      )}
    </div>
  );
}
