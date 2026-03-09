"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const CONSENT_KEY = "hf-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on initial load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(CONSENT_KEY, "dismissed");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-cream-dark bg-white px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] sm:px-6 animate-[slide-up_0.3s_ease-out]"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <p className="text-sm text-charcoal font-sans leading-relaxed">
          We use cookies to improve your experience and analyze site traffic.
          See our{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 text-forest hover:text-forest-light transition-colors"
          >
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
        <div className="flex shrink-0 items-center gap-3 sm:gap-3">
          <button
            onClick={dismiss}
            className="flex-1 rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-white hover:bg-forest-light transition-colors font-sans sm:flex-none sm:py-2"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
