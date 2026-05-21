"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

const STORAGE_KEYS = {
  subscribed: "hf-email-subscribed",
  dismissed: "hf-email-dismissed",
  pageviews: "hf-email-pageviews",
} as const;

const DISMISS_DAYS = 30;
const TRIGGER_DELAY_MS = 45_000;
const MIN_PAGEVIEWS = 2;

export function EmailPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const loadTime = useRef(Date.now());
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerFired = useRef(false);

  const show = useCallback(() => {
    if (triggerFired.current) return;
    triggerFired.current = true;
    setVisible(true);
  }, []);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEYS.subscribed)) return;

    const dismissedAt = localStorage.getItem(STORAGE_KEYS.dismissed);
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
      localStorage.removeItem(STORAGE_KEYS.dismissed);
    }

    const views = Number(localStorage.getItem(STORAGE_KEYS.pageviews) || "0") + 1;
    localStorage.setItem(STORAGE_KEYS.pageviews, String(views));
    const hasEnoughViews = views >= MIN_PAGEVIEWS;

    const timer = setTimeout(() => show(), TRIGGER_DELAY_MS);

    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0 && hasEnoughViews) show();
    }

    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouch) {
      document.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      clearTimeout(timer);
      if (!isTouch) {
        document.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [show]);

  useEffect(() => {
    if (!visible) return;

    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        dismiss();
        return;
      }

      if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [visible]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEYS.dismissed, String(Date.now()));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          website: honeypot || undefined,
          _t: loadTime.current,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to subscribe");
      }

      setStatus("success");
      localStorage.setItem(STORAGE_KEYS.subscribed, "true");
      localStorage.removeItem(STORAGE_KEYS.pageviews);

      if (typeof window !== "undefined" && window.dataLayer) {
        window.dataLayer.push({ event: "email_subscribe", method: "popup" });
      }

      setTimeout(() => setVisible(false), 3000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center px-4 animate-[fade-in_0.2s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Don't miss what's next at the farm"
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-warm-white shadow-xl animate-[popup-slide-up_0.3s_ease-out]"
      >
        {/* Close button */}
        <button
          ref={closeButtonRef}
          onClick={dismiss}
          aria-label="Close popup"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/50"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Hero image banner */}
        <div className="relative h-48 sm:h-56">
          <Image
            src="/images/farm/cow-calf.jpg"
            alt="Young visitor feeding a Highland cow calf"
            fill
            sizes="(max-width: 448px) 100vw, 448px"
            className="object-cover object-top"
            priority
          />
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
          {status === "success" ? (
            <div className="py-2 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-forest/10">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" stroke="var(--forest)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="font-display text-xl text-charcoal">You&apos;re on the list!</h3>
              <p className="mt-1 text-sm text-muted font-sans">
                We&apos;ll keep you in the loop on all things Highland Farms.
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl leading-snug text-charcoal">
                Don&apos;t Miss What&apos;s Next at the Farm
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted font-sans">
                Seasonal experiences, new availability, and farm happenings — straight to your inbox.
              </p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-2.5">
                {/* Honeypot */}
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                />

                <label htmlFor="popup-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="popup-email"
                  type="email"
                  required
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-cream-dark bg-white px-4 py-3 text-sm text-charcoal placeholder:text-muted/60 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest font-sans"
                />
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="w-full rounded-lg bg-forest py-3 text-sm font-medium text-white transition-colors hover:bg-forest-light disabled:opacity-60 font-sans"
                >
                  {status === "submitting" ? "Joining..." : "Keep Me Posted"}
                </button>

                {errorMsg && (
                  <p className="text-sm text-red-600 font-sans" role="alert">
                    {errorMsg}
                  </p>
                )}
              </form>

              <p className="mt-4 text-center text-xs text-muted/60 font-sans">
                Join 2,000+ visitors who stay connected with the farm. Unsubscribe anytime.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}
