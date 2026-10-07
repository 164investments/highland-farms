"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Off for the 2026-10 release; see the note in build() below. */
const ENABLE_GOOGLE_PAY = false;

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
 *
 * ⛔ A WALLET MUST NEVER OPEN BEFORE THE ORDER CAN BE SENT. The payment request
 * asks the wallet for no contact details, so the name, email and phone come from
 * the form. The buttons sit above that form (first screen, by design), so they
 * stay aria-disabled with a plain line under them until `blocked` is null, and
 * `pay()` re-checks `blocked` synchronously before tokenize(). Once a wallet
 * hands back a token, the caller always submits it: an approved wallet sheet is
 * never followed by a silent drop. Do not add a check between `onToken` and the
 * submit; add it to `blocked` instead.
 */

/** Why the wallets can't open yet; null when the order is ready to send. */
export type WalletBlock = "contact" | "address" | "zip" | null;

function blockedLine(block: Exclude<WalletBlock, null>, wallet: string): string {
  if (block === "contact") return `Add your name, email and phone below to pay with ${wallet}.`;
  if (block === "address") return `Add your delivery address below to pay with ${wallet}.`;
  return `We don't deliver to that ZIP yet. Choose farm pickup to pay with ${wallet}.`;
}

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
  blocked = null,
  onBlocked,
  onToken,
  onError,
  alert = null,
  placing = false,
}: {
  payments: PaymentsInstance | null;
  totalCents: number;
  /** The SDK isn't ready, or an order is already being placed. */
  disabled: boolean;
  /**
   * Set while the form can't yet be sent; the wallets refuse to open. Omitted
   * by callers whose details are complete before the wallets render (the
   * native booking payment step).
   */
  blocked?: WalletBlock;
  /** A tap on a blocked wallet: move the shopper to the first missing field. */
  onBlocked?: () => void;
  /** Always submitted by the caller. Never re-validated after approval. */
  onToken: (token: string) => void;
  onError: (message: string) => void;
  /** An error from a wallet payment, shown (and focused) right under the buttons. */
  alert?: string | null;
  /** A wallet token is being sent to the farm. */
  placing?: boolean;
}) {
  const [appleReady, setAppleReady] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const appleRef = useRef<WalletInstance | null>(null);
  const googleRef = useRef<WalletInstance | null>(null);
  // One wallet sheet at a time: a second tap while tokenize() is pending is ignored.
  const openRef = useRef(false);

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

      // Google Pay stays off until a real payment has been tested end to end on
      // https (main never wired its click, so it never took a payment).
      if (!ENABLE_GOOGLE_PAY) return;
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
    if (!wallet || disabled || openRef.current) return;
    // Synchronous gate, before any sheet opens: nothing is approved while the
    // form is incomplete, so nothing can be dropped afterwards.
    if (blocked) {
      onBlocked?.();
      return;
    }
    openRef.current = true;
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
    } finally {
      openRef.current = false;
    }
  }

  const anyReady = appleReady || googleReady;
  const walletName =
    appleReady && googleReady ? "Apple Pay or Google Pay" : appleReady ? "Apple Pay" : "Google Pay";
  const held = Boolean(blocked) && !placing;
  const describedBy = held && !alert ? "wallet-needs" : undefined;

  // Square draws Google's own <button> inside the container; mirror the held
  // state onto it so a screen reader hears why the tap does nothing yet.
  useEffect(() => {
    if (!googleReady) return;
    const button = document.querySelector<HTMLElement>("#google-pay-button button");
    if (!button) return;
    if (held) button.setAttribute("aria-disabled", "true");
    else button.removeAttribute("aria-disabled");
    if (describedBy) button.setAttribute("aria-describedby", describedBy);
    else button.removeAttribute("aria-describedby");
  }, [googleReady, held, describedBy]);

  // The Google Pay container must EXIST in the DOM before attach() can mount
  // into it, so it is always rendered and merely hidden until a wallet is ready.
  // Gating it behind `anyReady` was a chicken-and-egg: attach failed because the
  // node wasn't there, so nothing ever became ready.
  return (
    <div className={anyReady ? "mt-6" : "contents"}>
      <p className={anyReady ? "m-0 text-[13px] font-medium text-ink" : "hidden"}>Pay fast</p>
      <div className={anyReady ? "mt-2 flex flex-col gap-2.5" : "hidden"}>
        {appleReady && (
          <button
            type="button"
            onClick={() => pay(appleRef.current)}
            disabled={disabled}
            aria-disabled={held || undefined}
            aria-describedby={describedBy}
            aria-label="Pay with Apple Pay"
            className={cn(
              "flex h-12 w-full items-center justify-center bg-black text-white transition-opacity disabled:opacity-50",
              held ? "opacity-50" : "hover:opacity-90",
            )}
          >
            <span className="text-[15px] font-medium">Pay with </span>
            <svg viewBox="0 0 24 24" className="ml-1.5 h-5 w-5 fill-white" aria-hidden>
              <path d="M17.05 12.54c-.02-2.02 1.65-2.99 1.72-3.04-.94-1.37-2.4-1.56-2.92-1.58-1.24-.13-2.42.73-3.05.73-.63 0-1.6-.71-2.63-.69-1.35.02-2.6.79-3.29 2-1.4 2.44-.36 6.05 1.01 8.03.67.97 1.47 2.06 2.52 2.02 1.01-.04 1.39-.65 2.61-.65s1.57.65 2.64.63c1.09-.02 1.78-.99 2.44-1.96.77-1.12 1.09-2.21 1.11-2.27-.02-.01-2.13-.82-2.16-3.22zM15.1 6.4c.56-.68.94-1.62.83-2.56-.81.03-1.79.54-2.36 1.21-.51.6-.96 1.56-.84 2.48.9.07 1.82-.46 2.37-1.13z" />
            </svg>
            <span className="text-[15px] font-semibold">Pay</span>
          </button>
        )}
      </div>

      {/* Lives outside the hidden wrapper so it is always mountable. Square's
          attach() only draws the button: the sheet opens from this click
          handler (Square docs, "Add Google Pay"), behind the same gate. */}
      <div
        id="google-pay-button"
        onClick={() => pay(googleRef.current)}
        className={
          googleReady
            ? cn("mt-2.5 transition-opacity", (held || disabled) && "opacity-50")
            : "pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
        }
      />

      {anyReady && placing && (
        <p role="status" className="m-0 mt-2.5 text-[13px] text-ink-body">
          Placing your order…
        </p>
      )}
      {anyReady && !placing && alert && (
        <p
          id="wallet-alert"
          role="alert"
          tabIndex={-1}
          className="m-0 mt-2.5 border-l-2 border-pine-line bg-paper-shade px-4 py-3 text-[14px] text-ink"
        >
          {alert}
        </p>
      )}
      {anyReady && held && !alert && blocked && (
        <p id="wallet-needs" className="m-0 mt-2 text-[13px] leading-[1.45] text-ink-note">
          {blockedLine(blocked, walletName)}
        </p>
      )}

      <div className={anyReady ? "mt-5 flex items-center gap-3 text-[12px] uppercase tracking-[0.14em] text-ink-meta" : "hidden"}>
        <span className="h-px flex-1 bg-rule" />
        or pay by card
        <span className="h-px flex-1 bg-rule" />
      </div>
    </div>
  );
}
