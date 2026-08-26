"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Apple Pay and Google Pay.
 *
 * On a phone this removes the single worst piece of checkout friction: typing a
 * card number. The server is untouched — both wallets hand back a `source_id`
 * token that the existing `POST /v2/payments` call already accepts.
 *
 * The wallets are rebuilt whenever the total changes, because a Square
 * paymentRequest is fixed at creation and switching pickup to delivery moves the
 * total by $15. A stale request would authorise the wrong amount.
 */

interface TokenResult {
  status: string;
  token?: string;
  errors?: { message: string }[];
}
interface WalletInstance {
  tokenize: () => Promise<TokenResult>;
  attach?: (selector: string) => Promise<void>;
  destroy?: () => void;
}
interface PaymentsInstance {
  paymentRequest: (req: unknown) => unknown;
  applePay: (req: unknown) => Promise<WalletInstance>;
  googlePay: (req: unknown) => Promise<WalletInstance>;
}

export function ExpressPay({
  payments,
  totalCents,
  disabled,
  onToken,
  onError,
}: {
  payments: PaymentsInstance | null;
  totalCents: number;
  disabled: boolean;
  onToken: (token: string) => void;
  onError: (message: string) => void;
}) {
  const [appleReady, setAppleReady] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const appleRef = useRef<WalletInstance | null>(null);
  const googleRef = useRef<WalletInstance | null>(null);

  useEffect(() => {
    if (!payments || totalCents <= 0) return;
    let cancelled = false;

    async function build() {
      // Tear down the previous pair before building the new one, or Google Pay
      // stacks a second button into the container on every total change.
      appleRef.current?.destroy?.();
      googleRef.current?.destroy?.();
      appleRef.current = null;
      googleRef.current = null;
      setAppleReady(false);
      setGoogleReady(false);

      const container = document.getElementById("google-pay-button");
      if (container) container.innerHTML = "";

      const request = payments!.paymentRequest({
        countryCode: "US",
        currencyCode: "USD",
        total: { amount: (totalCents / 100).toFixed(2), label: "Highland Farms" },
      });

      // Apple Pay is Safari-only and throws elsewhere. Google Pay is unavailable
      // in some browsers too. Neither failing is an error worth showing anyone —
      // the card form is right underneath.
      try {
        const apple = await payments!.applePay(request);
        if (cancelled) {
          apple.destroy?.();
        } else {
          appleRef.current = apple;
          setAppleReady(true);
        }
      } catch {
        /* not available here */
      }

      try {
        const google = await payments!.googlePay(request);
        if (cancelled) {
          google.destroy?.();
          return;
        }
        await google.attach?.("#google-pay-button");
        if (cancelled) {
          google.destroy?.();
          return;
        }
        googleRef.current = google;
        setGoogleReady(true);
      } catch {
        /* not available here */
      }
    }

    void build();
    return () => {
      cancelled = true;
    };
  }, [payments, totalCents]);

  async function pay(wallet: WalletInstance | null) {
    if (!wallet || disabled) return;
    try {
      // Apple Pay requires tokenize() to be reached synchronously from the
      // click; any awaited work before this line kills the sheet.
      const result = await wallet.tokenize();
      if (result.status !== "OK" || !result.token) {
        if (result.status !== "CANCEL") {
          onError(result.errors?.[0]?.message ?? "That didn't go through. Try the card form below.");
        }
        return;
      }
      onToken(result.token);
    } catch (err) {
      console.error("[shop] wallet tokenize failed:", err);
      onError("That didn't go through. Try the card form below.");
    }
  }

  const anyReady = appleReady || googleReady;

  // The Google Pay container must EXIST in the DOM before attach() can mount
  // into it, so it is always rendered and merely hidden until a wallet is ready.
  // Gating it behind `anyReady` was a chicken-and-egg: attach failed because the
  // node wasn't there, so nothing ever became ready.
  return (
    <div className={anyReady ? "mb-5" : "contents"}>
      <div className={anyReady ? "flex flex-col gap-2.5" : "hidden"}>
        {appleReady && (
          <button
            type="button"
            onClick={() => pay(appleRef.current)}
            disabled={disabled}
            aria-label="Pay with Apple Pay"
            className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-black text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <span className="text-[15px] font-medium">Pay with </span>
            <svg viewBox="0 0 24 24" className="ml-1.5 h-5 w-5 fill-white" aria-hidden>
              <path d="M17.05 12.54c-.02-2.02 1.65-2.99 1.72-3.04-.94-1.37-2.4-1.56-2.92-1.58-1.24-.13-2.42.73-3.05.73-.63 0-1.6-.71-2.63-.69-1.35.02-2.6.79-3.29 2-1.4 2.44-.36 6.05 1.01 8.03.67.97 1.47 2.06 2.52 2.02 1.01-.04 1.39-.65 2.61-.65s1.57.65 2.64.63c1.09-.02 1.78-.99 2.44-1.96.77-1.12 1.09-2.21 1.11-2.27-.02-.01-2.13-.82-2.16-3.22zM15.1 6.4c.56-.68.94-1.62.83-2.56-.81.03-1.79.54-2.36 1.21-.51.6-.96 1.56-.84 2.48.9.07 1.82-.46 2.37-1.13z" />
            </svg>
            <span className="text-[15px] font-semibold">Pay</span>
          </button>
        )}
      </div>

      {/* Lives outside the hidden wrapper so it is always mountable. */}
      <div
        id="google-pay-button"
        className={googleReady ? "mt-2.5" : "pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"}
      />

      <div className={anyReady ? "my-4 flex items-center gap-3" : "hidden"}>
        <span className="h-px flex-1 bg-cream-dark" />
        <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted font-sans">
          or pay by card
        </span>
        <span className="h-px flex-1 bg-cream-dark" />
      </div>
    </div>
  );
}
