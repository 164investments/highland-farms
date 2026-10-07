"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FieldArrow } from "@/components/ui/FieldGuide";
import { ensureChatLauncherStyles } from "@/components/field/ChatLauncher";
import { chatLiftFor, translateYOf } from "@/components/field/chatLift";

/*
 * The bottom sticky action on phones (CONSISTENCY #13, shared board 4 r2).
 *
 * - Appears whenever no first-screen CTA ([data-hero-cta]) is fully on screen
 *   (threshold 1.0): after the visitor scrolls past it, and also before, when
 *   a short in-app browser cuts the button off at the bottom. With no
 *   visible hero CTA on the page, it appears after 400px of scroll. With
 *   `showOnLoad` (pages with no first-screen CTA: the wedding portfolio and
 *   the couple pages) it shows from the first screen.
 * - Hides while its target is on screen (hideWhenVisible selectors, plus any
 *   [data-sticky-stop] element), while a text field has focus (the keyboard
 *   is open), and while `enabled` is false. Targets that render late (the
 *   cart's Check out button after the stored cart loads) are picked up when
 *   they appear.
 * - Reserves its height at the bottom of the page: <html data-sticky> adds
 *   room under [data-site-footer] (globals.css), so it never covers content
 *   at rest, and sets scroll-padding-bottom so keyboard focus is never left
 *   under it. Pages must not add their own spacer.
 * - <html data-sticky-shown> while visible: fades the masthead's matching
 *   action (CONSISTENCY #9) and lifts the chat launcher above the bar.
 *
 * This module holds the shell and the plain actions only. Booking actions
 * (BookingTextLink, the Acuity modal) live in StickyBar.tsx, the one public
 * entry point (FieldStickyBar); keep BookingButton out of this file.
 */

const TEXT_FIELD =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="hidden"]):not([type="range"]):not([type="color"]):not([type="file"]), textarea, select, [contenteditable=""], [contenteditable="true"]';

type HeroState = "in" | "above" | "below" | "absent";

/** The target rule's first read, before its IntersectionObserver reports (same 15% early margin). */
function onScreenNow(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  return r.bottom > 0 && r.top < window.innerHeight * 1.15 && r.right > 0 && r.left < window.innerWidth;
}

export interface StickyVisibilityOptions {
  /** Selectors whose elements hide the bar while on screen ("#contact", "#availability"). */
  hideWhenVisible?: string | readonly string[];
  /** Extra gate, e.g. "the cart has items". Default true. */
  enabled?: boolean;
  /**
   * Show the bar from the first screen instead of waiting for a first-screen
   * CTA to scroll away. For pages with no first-screen CTA (the wedding
   * portfolio and couple pages). The target, keyboard and `enabled` rules
   * still hide it. Default false.
   */
  showOnLoad?: boolean;
}

export function useStickyVisibility({
  hideWhenVisible,
  enabled = true,
  showOnLoad = false,
}: StickyVisibilityOptions): boolean {
  const [heroes, setHeroes] = useState<"none" | "past" | "not-past">("none");
  const [scrolled, setScrolled] = useState(false);
  const [targetOnScreen, setTargetOnScreen] = useState(false);
  const [typing, setTyping] = useState(false);
  const targetKey = typeof hideWhenVisible === "string" ? hideWhenVisible : (hideWhenVisible ?? []).join(",");

  // The first-screen CTA rule.
  useEffect(() => {
    if (showOnLoad) return;
    const els = Array.from(document.querySelectorAll("[data-hero-cta]"));
    if (els.length === 0) return;
    const state = new Map<Element, HeroState>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const r = e.boundingClientRect;
          let s: HeroState;
          if (r.width === 0 && r.height === 0) s = "absent";
          else if (e.intersectionRatio >= 0.99) s = "in";
          else if (r.top < (e.rootBounds?.top ?? 0)) s = "above";
          else s = "below";
          state.set(e.target, s);
        }
        const values = Array.from(state.values());
        if (values.every((v) => v === "absent")) setHeroes("none");
        else setHeroes(!values.includes("in") && values.some((v) => v === "above" || v === "below") ? "past" : "not-past");
      },
      { threshold: [0, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [showOnLoad]);

  // Fallback when the page has no visible hero CTA.
  useEffect(() => {
    if (showOnLoad) return;
    const onScroll = () => setScrolled(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showOnLoad]);

  // The target rule: the form, booking widget or shelf the bar points to.
  // Re-runs when `enabled` flips (the cart's Check out button renders in the
  // same commit that enables the bar), and a MutationObserver picks up
  // targets that mount, or are replaced, while the bar is enabled. A layout
  // effect with a first geometric read, so the bar never paints over a
  // target that is already on screen while the observer warms up.
  useLayoutEffect(() => {
    if (!enabled) return;
    const selectors = [...targetKey.split(",").filter(Boolean), "[data-sticky-stop]"].join(",");
    const observed = new Set<Element>();
    const visible = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        setTargetOnScreen(visible.size > 0);
      },
      // Count the target as on screen a little before it scrolls in.
      { rootMargin: "0px 0px 15% 0px" },
    );
    const sync = () => {
      const current = new Set(document.querySelectorAll(selectors));
      let changed = false;
      for (const el of observed) {
        if (current.has(el)) continue;
        io.unobserve(el);
        observed.delete(el);
        if (visible.delete(el)) changed = true;
      }
      for (const el of current) {
        if (observed.has(el)) continue;
        observed.add(el);
        io.observe(el);
        if (onScreenNow(el)) {
          visible.add(el);
          changed = true;
        }
      }
      if (changed) setTargetOnScreen(visible.size > 0);
    };
    sync();
    let frame = 0;
    const watch = new MutationObserver(() => {
      if (!frame) {
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          sync();
        });
      }
    });
    watch.observe(document.body, { childList: true, subtree: true });
    return () => {
      watch.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      io.disconnect();
      setTargetOnScreen(false);
    };
  }, [targetKey, enabled]);

  // The keyboard rule.
  useEffect(() => {
    const onIn = (e: FocusEvent) => {
      if (e.target instanceof Element && e.target.matches(TEXT_FIELD)) setTyping(true);
    };
    const onOut = () => setTyping(false);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);

  const past = showOnLoad || (heroes === "none" ? scrolled : heroes === "past");
  return enabled && past && !targetOnScreen && !typing;
}

/**
 * Sets --hf-chat-lift-measured. Idempotent: it measures the launcher's
 * resting position (its rect minus its current translate), never the
 * previous lift, so showing the bar again does not add another lift.
 */
function measureChatLift(bar: HTMLElement) {
  const host = document.querySelector("chat-widget");
  const bubble =
    host?.shadowRoot?.querySelector<HTMLElement>(".lc_text-widget--bubble") ??
    host?.querySelector<HTMLElement>(".lc_text-widget--bubble");
  if (!bubble) return;
  const lift = chatLiftFor({
    bubbleBottom: bubble.getBoundingClientRect().bottom,
    bubbleTranslateY: translateYOf(getComputedStyle(bubble).translate),
    viewportHeight: window.innerHeight,
    barHeight: bar.offsetHeight,
  });
  document.documentElement.style.setProperty("--hf-chat-lift-measured", `${lift}px`);
}

/* ---------------------------------------------------------------- */
/* The bar                                                            */
/* ---------------------------------------------------------------- */

interface StickyShellProps extends StickyVisibilityOptions {
  children: ReactNode;
  className?: string;
}

/** The paper bar fixed to the bottom of a phone screen. Content: StickyActions or FieldStickyBar. */
export function StickyShell({ children, className, ...visibility }: StickyShellProps) {
  const shown = useStickyVisibility(visibility);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-sticky", "");
    ensureChatLauncherStyles();
    return () => {
      html.removeAttribute("data-sticky");
      html.removeAttribute("data-sticky-shown");
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (!shown) {
      html.removeAttribute("data-sticky-shown");
      return;
    }
    html.setAttribute("data-sticky-shown", "");
    const measure = () => {
      if (bar.current) measureChatLift(bar.current);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [shown]);

  return (
    <div
      ref={bar}
      data-sticky-bar=""
      aria-hidden={!shown}
      inert={!shown}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 transition-transform duration-300 lg:hidden",
        shown ? "translate-y-0" : "pointer-events-none translate-y-full",
        className,
      )}
    >
      <div className="surface-paper border-t border-rule bg-paper px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-3">
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Actions                                                            */
/* ---------------------------------------------------------------- */

export interface StickyActionSpec {
  label: string;
  /** A second line under the label ("Private, $150 for two"). Replaces the arrow. */
  sublabel?: string;
  /** "#contact" scrolls on the page; "/path" navigates; with `external`, a new tab. */
  href?: string;
  external?: boolean;
  /** Client parents only (e.g. the shop). Wins over href. */
  onClick?: () => void;
}

export const stickyPrimaryClass =
  "flex h-[52px] w-full items-center justify-center gap-2.5 bg-pine px-3 font-sans text-[15px] font-semibold tracking-[0.02em] text-paper-light transition-colors hover:bg-pine-dark hover:text-paper-light active:bg-pine-dark";

export const stickySecondaryClass =
  "flex h-[52px] w-full items-center justify-center gap-2 border border-pine bg-paper-light px-3 font-sans text-[15px] font-semibold tracking-[0.02em] text-pine transition-colors hover:bg-paper-shade";

export function stickyActionClass(variant: "primary" | "secondary", sublabel?: string) {
  return cn(variant === "primary" ? stickyPrimaryClass : stickySecondaryClass, sublabel && "flex-col gap-0");
}

/** The label (and sublabel or arrow) inside a sticky action. */
export function StickyActionContent({
  label,
  sublabel,
  arrow = true,
}: {
  label: string;
  sublabel?: string;
  arrow?: boolean;
}) {
  if (sublabel) {
    return (
      <>
        <span className="leading-tight">{label}</span>
        <span className="text-[12px] font-normal leading-tight tracking-normal opacity-80">{sublabel}</span>
      </>
    );
  }
  return (
    <>
      {label}
      {arrow && <FieldArrow />}
    </>
  );
}

/** One non-booking sticky action: a scroll anchor, a page link, an external link or a button. */
export function StickyAction({
  action,
  variant = "primary",
}: {
  action: StickyActionSpec;
  variant?: "primary" | "secondary";
}) {
  const cls = stickyActionClass(variant, action.sublabel);
  const content = (
    <StickyActionContent label={action.label} sublabel={action.sublabel} arrow={variant === "primary"} />
  );
  if (action.onClick || !action.href) {
    return (
      <button type="button" onClick={action.onClick} className={cls}>
        {content}
      </button>
    );
  }
  if (action.external) {
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {content}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  if (action.href.startsWith("/") && !action.href.startsWith("//")) {
    return (
      <Link href={action.href} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <a href={action.href} className={cls}>
      {content}
    </a>
  );
}

/** Lays out one action full width, or two at 2/3 + 1/3 (the gift-season split). */
export function StickyActionRow({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  if (!secondary) return <>{primary}</>;
  return (
    <div className="grid grid-cols-[2fr_1fr] gap-2">
      {primary}
      {secondary}
    </div>
  );
}
