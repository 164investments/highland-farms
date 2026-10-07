"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FieldArrow, fieldCtaClass } from "@/components/ui/FieldGuide";
import { LOOKBOOK_HREF } from "./chrome";

/*
 * The look-book card (mobile review board B2, direction C; Hayden 2026-10-07:
 * "drop the gate"). A docked, non-modal paper card with one button that opens
 * the 2027 look book. No email is asked for; opening it pushes lookbook_open.
 *
 * Couples only, on the pages where a couple is browsing, not deciding:
 * the real-weddings journal (index and each couple), /about, and home after a
 * wedding page in the same visit. Never on a form or booking page.
 * Second page view or later; phones after 30 s AND half the page scrolled,
 * desktop after 45 s or on leaving the tab. Once per visit; quiet for 30 days
 * after closing; never again after opening the look book from it. Never while another dialog is
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
    local.set(STORAGE_KEYS.dismissed, String(Date.now()));
  }, []);

  useEffect(() => {
    if (!visible) return;
    // A docked, non-modal card: the page stays usable behind it, so no focus trap and no scroll lock.
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, dismiss]);

  function opened() {
    push("lookbook_open", { placement: "lookbook-popup" });
    // Opening it is the whole job, so it never comes back.
    local.set(STORAGE_KEYS.subscribed, "true");
    local.remove(STORAGE_KEYS.pageviews);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="lookbook-popup-title"
      className="surface-paper fixed inset-x-0 bottom-0 z-[9990] border-t-[3px] border-double border-frame bg-paper px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-0.5 font-sans text-ink shadow-[0_-8px_24px_rgba(34,34,30,0.12)] animate-[popup-slide-up_0.3s_ease-out] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[420px] lg:border lg:border-frame lg:p-6"
    >
      <div className="flex items-start gap-3">
        <div className="mt-2.5 h-[55px] w-[84px] shrink-0 border border-frame bg-paper-light p-[3px] max-[359px]:h-[50px] max-[359px]:w-[76px] lg:mt-0">
          <div className="relative h-full w-full overflow-hidden">
            <Image
              src="/images/weddings/lookbook-cover.jpg"
              alt="Cover of the Highland Farms 2027 Wedding Lookbook"
              fill
              sizes="84px"
              className="object-cover object-[50%_30%]"
            />
          </div>
        </div>
        <div className="min-w-0 flex-1 pt-2.5 lg:pt-0">
          <p className="m-0 font-display text-[15px] italic leading-tight text-fern">For couples planning 2027</p>
          <p id="lookbook-popup-title" className="field-heading m-0 font-display text-[23px] font-medium leading-[1.05]">
            The 2027 look book
          </p>
        </div>
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
      </div>
      <a
        href={LOOKBOOK_HREF}
        target="_blank"
        rel="noopener noreferrer"
        onClick={opened}
        className={`${fieldCtaClass} mt-2.5 h-12 w-full`}
      >
        Open the look book
        <FieldArrow />
        <span className="sr-only"> (PDF, opens in a new tab)</span>
      </a>
    </div>
  );
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}
