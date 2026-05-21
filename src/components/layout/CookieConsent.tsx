"use client";

import { useEffect, useState } from "react";

const CONSENT_KEY = "hf-cookie-consent";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

function updateConsent(granted: boolean) {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.gtag?.("consent", "update", {
    ad_storage: granted ? "granted" : "denied",
    analytics_storage: granted ? "granted" : "denied",
    ad_user_data: granted ? "granted" : "denied",
    ad_personalization: granted ? "granted" : "denied",
  });
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (saved === "accepted") updateConsent(true);
    if (saved === "declined") updateConsent(false);
    if (!saved) queueMicrotask(() => setVisible(true));
  }, []);

  function choose(value: "accepted" | "declined") {
    localStorage.setItem(CONSENT_KEY, value);
    updateConsent(value === "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] border-t border-cream-dark bg-white px-4 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-charcoal/80 font-sans">
          We use analytics and advertising cookies to understand visits and improve our marketing.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("declined")}
            className="rounded-full border border-cream-dark px-4 py-2 text-xs font-normal uppercase tracking-[0.12em] text-charcoal transition-colors hover:bg-cream font-sans"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="rounded-full bg-forest px-4 py-2 text-xs font-normal uppercase tracking-[0.12em] text-white transition-colors hover:bg-forest-light font-sans"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
