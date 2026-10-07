"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BOOKING_PRODUCTS } from "@/lib/booking/products";
import { FieldArrow, fieldCtaClass } from "@/components/ui/FieldGuide";
import { cn } from "@/lib/utils";
import { WeddingCallLink } from "@/components/field/WeddingCallLink";
import { LOOKBOOK_HREF } from "./chrome";

/*
 * The look-book popup (shared board 5, round 2). It gives the 2027 look book
 * first and promises nothing that isn't built: no email is promised, and the
 * success state hands over the PDF and the next small step.
 *
 * Couples only, on the pages where a couple is browsing, not deciding:
 * the real-weddings journal (index and each couple), /about, and home after a
 * wedding page in the same visit. Never on a form or booking page.
 * Second page view or later; phones after 30 s AND half the page scrolled,
 * desktop after 45 s or on leaving the tab. Once per visit; quiet for 30 days
 * after closing; never again after signing up. Never while another dialog is
 * open, a field has focus, or a form is on screen.
 *
 * Visitors ("new tour dates", J12) and the beef restock note (needs a
 * confirmed shop_waitlist send) are not built until those exist.
 */

const STORAGE_KEYS = {
  subscribed: "hf-email-subscribed",
  dismissed: "hf-email-dismissed",
  pageviews: "hf-email-pageviews",
} as const;
const SESSION_KEYS = {
  shown: "hf-popup-shown",
  weddingSeen: "hf-wedding-page-seen",
} as const;

const DISMISS_DAYS = 30;
const DESKTOP_DELAY_MS = 45_000;
const TOUCH_DELAY_MS = 30_000;
const TOUCH_SCROLL_FRACTION = 0.5;
const MIN_PAGEVIEWS = 2;

/** Wedding pages: visiting one in this session makes home eligible. */
const WEDDING_PATHS = ["/weddings", "/wedding-portfolio", "/wedding-call", "/celebrations"];

function under(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function eligible(pathname: string, weddingSeen: boolean): boolean {
  if (under(pathname, "/wedding-portfolio") || under(pathname, "/about")) return true;
  if (pathname === "/") return weddingSeen;
  return false;
}

// Blocked or full storage (private mode, strict settings) must never throw.
function storage(kind: "local" | "session") {
  return {
    get(key: string): string | null {
      try {
        return (kind === "local" ? localStorage : sessionStorage).getItem(key);
      } catch {
        return null;
      }
    },
    set(key: string, value: string) {
      try {
        (kind === "local" ? localStorage : sessionStorage).setItem(key, value);
      } catch {}
    },
    remove(key: string) {
      try {
        (kind === "local" ? localStorage : sessionStorage).removeItem(key);
      } catch {}
    },
  };
}
const local = storage("local");
const session = storage("session");

function push(event: string, extra: Record<string, unknown> = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...extra });
}

export function EmailPopup() {
  const pathname = usePathname() ?? "";
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const loadTime = useRef(Date.now());
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerFired = useRef(false);

  const show = useCallback(() => {
    if (triggerFired.current) return;
    triggerFired.current = true;
    session.set(SESSION_KEYS.shown, "1");
    setVisible(true);
  }, []);

  useEffect(() => {
    if (WEDDING_PATHS.some((p) => under(pathname, p))) session.set(SESSION_KEYS.weddingSeen, "1");

    const views = Number(local.get(STORAGE_KEYS.pageviews) || "0") + 1;
    local.set(STORAGE_KEYS.pageviews, String(views));

    if (!eligible(pathname, Boolean(session.get(SESSION_KEYS.weddingSeen)))) return;
    if (local.get(STORAGE_KEYS.subscribed) || session.get(SESSION_KEYS.shown)) return;
    const dismissedAt = local.get(STORAGE_KEYS.dismissed);
    if (dismissedAt) {
      if (Date.now() - Number(dismissedAt) < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
      local.remove(STORAGE_KEYS.dismissed);
    }
    if (views < MIN_PAGEVIEWS) return;

    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    // Forms on screen: never interrupt someone reading or filling one.
    const formsOnScreen = new Set<Element>();
    const formWatch = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) formsOnScreen.add(e.target);
        else formsOnScreen.delete(e.target);
      }
    });
    document.querySelectorAll("form").forEach((f) => formWatch.observe(f));

    function blocked() {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
      const otherDialog = document.querySelector('[aria-modal="true"]');
      return typing || Boolean(otherDialog) || formsOnScreen.size > 0;
    }

    let timeOk = false;
    let scrollOk = !isTouch;
    function check() {
      if (timeOk && scrollOk && !blocked()) show();
    }
    function onScroll() {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable > 0 && window.scrollY / scrollable >= TOUCH_SCROLL_FRACTION) {
        scrollOk = true;
        check();
      }
    }
    const timer = window.setTimeout(
      () => {
        timeOk = true;
        check();
      },
      isTouch ? TOUCH_DELAY_MS : DESKTOP_DELAY_MS,
    );
    // Re-check when a field loses focus or the visitor keeps scrolling.
    const onFocusOut = () => window.setTimeout(check, 0);
    function onLeave(e: MouseEvent) {
      if (e.clientY <= 0 && !blocked()) show();
    }
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("scroll", isTouch ? onScroll : check, { passive: true });
    if (!isTouch) document.addEventListener("mouseleave", onLeave);

    return () => {
      window.clearTimeout(timer);
      formWatch.disconnect();
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("scroll", isTouch ? onScroll : check);
      if (!isTouch) document.removeEventListener("mouseleave", onLeave);
    };
  }, [show, pathname]);

  const dismiss = useCallback(() => {
    setVisible(false);
    if (status !== "success") local.set(STORAGE_KEYS.dismissed, String(Date.now()));
  }, [status]);

  useEffect(() => {
    if (!visible) return;
    // Focus the dialog itself, not the close button: a focused X drew the browser's boxed focus ring on open.
    dialogRef.current?.focus({ preventScroll: true });

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        dismiss();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [visible, dismiss]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "lookbook-popup", website: honeypot || undefined, _t: loadTime.current }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "That didn't go through. Please try again.");
      }
      setStatus("success");
      local.set(STORAGE_KEYS.subscribed, "true");
      local.remove(STORAGE_KEYS.pageviews);
      push("email_subscribe", { method: "popup" });
      push("lookbook_email_submit", { placement: "lookbook-popup" });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "That didn't go through. Please try again.");
    }
  }

  if (!visible) return null;

  const callMinutes = BOOKING_PRODUCTS["wedding-call"].durationMin;
  const closeButton = (
    <button
      type="button"
      onClick={dismiss}
      aria-label="Close"
      className="-mr-3 flex h-11 w-11 shrink-0 items-center justify-center text-ink outline-none transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-pine"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" focusable="false">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-end justify-center bg-ink/45 animate-[fade-in_0.2s_ease-out] lg:items-center lg:px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lookbook-popup-title"
        tabIndex={-1}
        className="surface-paper w-full outline-none border-t-[3px] border-double border-frame bg-paper px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 font-sans text-ink animate-[popup-slide-up_0.3s_ease-out] lg:max-w-[480px] lg:border lg:border-frame lg:p-8"
      >
        {status === "success" ? (
          <div className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <p id="lookbook-popup-title" className="field-heading m-0 pt-3 font-display text-[26px] font-medium leading-[1.05] lg:pt-0 lg:text-[30px]">
                Here it is.
              </p>
              {closeButton}
            </div>
            <a
              href={LOOKBOOK_HREF}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => push("lookbook_open", { placement: "lookbook-popup-success" })}
              className={`${fieldCtaClass} mt-3 w-full`}
            >
              Open the 2027 look book (PDF)
              <FieldArrow />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <p className="m-0 mt-4 text-[14px] leading-relaxed text-ink-body">
              When you&apos;ve had a look, Connor&apos;s free {callMinutes}-minute call is here.
            </p>
            <WeddingCallLink
              content="lookbook-popup-success"
              title="Look book popup: wedding call"
              className="mt-1 inline-flex min-h-11 items-center gap-2 text-[14px] font-medium text-pine"
            >
              <span className="border-b border-pine-line pb-0.5">Book a free {callMinutes}-minute call with Connor</span>
            </WeddingCallLink>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="relative mt-3 h-[66px] w-[90px] shrink-0 border border-frame bg-paper-light p-[3px] min-[360px]:w-[104px] lg:mt-0 lg:h-[88px] lg:w-[132px]">
                <div className="relative h-full w-full overflow-hidden">
                  <Image
                    src="/images/weddings/lookbook-cover.jpg"
                    alt="Cover of the Highland Farms 2027 Wedding Lookbook"
                    fill
                    sizes="132px"
                    className="object-cover object-[50%_30%]"
                  />
                </div>
              </div>
              <div className="min-w-0 flex-1 pt-3 lg:pt-1">
                <p id="lookbook-popup-title" className="field-heading m-0 font-display text-[26px] font-medium leading-[1.02] [text-wrap:balance] lg:text-[30px]">
                  The 2027 look book
                </p>
                <p className="m-0 mt-1 text-[12.5px] leading-snug text-ink-meta">20 pages, PDF</p>
              </div>
              {closeButton}
            </div>

            <form onSubmit={handleSubmit} className="mt-2">
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
              <label htmlFor="popup-email" className="block text-[13px] font-medium text-ink">
                Your email
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="popup-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={status === "error" || undefined}
                  aria-describedby={errorMsg ? "popup-email-error" : undefined}
                  className="h-12 min-w-0 flex-1 rounded-none border border-frame bg-paper-light px-3 text-[16px] text-ink placeholder:text-ink-meta focus:border-pine focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className={cn(fieldCtaClass, "h-12 shrink-0 px-5 disabled:opacity-60")}
                >
                  {status === "submitting" ? "One moment" : "Get it"}
                </button>
              </div>
              {errorMsg && (
                <p id="popup-email-error" role="alert" className="m-0 mt-1.5 text-[13px] text-[#8A2A1C]">
                  {errorMsg}
                </p>
              )}
              <div className="mt-1 flex items-center justify-between gap-3 text-[12px] leading-snug text-ink-meta">
                <span>Joins our list. Unsubscribe anytime.</span>
                <a
                  href={LOOKBOOK_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => push("lookbook_open", { placement: "lookbook-popup-ask" })}
                  className="flex min-h-11 shrink-0 items-center whitespace-nowrap text-[12.5px] text-ink-note underline decoration-rule underline-offset-4"
                >
                  or open it now
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}
