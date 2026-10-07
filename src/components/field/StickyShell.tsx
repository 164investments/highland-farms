"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FieldArrow } from "@/components/ui/FieldGuide";
import { ensureChatLauncherStyles } from "@/components/field/ChatLauncher";

/*
 * The bottom sticky action on phones (CONSISTENCY #13, shared board 4 r2).
 *
 * - Appears once a first-screen CTA ([data-hero-cta]) is no longer fully on
 *   screen because the visitor scrolled past it (threshold 1.0). With no
 *   visible hero CTA on the page, it appears after 400px of scroll.
 * - Hides while its target is on screen (hideWhenVisible selectors, plus any
 *   [data-sticky-stop] element), while a text field has focus (the keyboard
 *   is open), and while `enabled` is false.
 * - Reserves its height at the bottom of the page: <html data-sticky> adds
 *   room under [data-site-footer] (globals.css), so it never covers content.
 *   Pages must not add their own spacer.
 * - <html data-sticky-shown> while visible: fades the masthead's matching
 *   action (CONSISTENCY #9) and lifts the chat launcher above the bar.
 *
 * This module must not import BookingButton (BookingButton imports
 * StickyMobileCTA, which imports this). Booking actions live in StickyBar.tsx.
 */

const TEXT_FIELD =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="hidden"]):not([type="range"]):not([type="color"]):not([type="file"]), textarea, select, [contenteditable=""], [contenteditable="true"]';

type HeroState = "in" | "above" | "below" | "absent";

export interface StickyVisibilityOptions {
  /** Selectors whose elements hide the bar while on screen ("#contact", "#availability"). */
  hideWhenVisible?: string | readonly string[];
  /** Extra gate, e.g. "the cart has items". Default true. */
  enabled?: boolean;
}

export function useStickyVisibility({ hideWhenVisible, enabled = true }: StickyVisibilityOptions): boolean {
  const [heroes, setHeroes] = useState<"none" | "past" | "not-past">("none");
  const [scrolled, setScrolled] = useState(false);
  const [targetOnScreen, setTargetOnScreen] = useState(false);
  const [typing, setTyping] = useState(false);
  const targetKey = typeof hideWhenVisible === "string" ? hideWhenVisible : (hideWhenVisible ?? []).join(",");

  // The first-screen CTA rule.
  useEffect(() => {
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
        else setHeroes(!values.includes("in") && values.includes("above") ? "past" : "not-past");
      },
      { threshold: [0, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Fallback when the page has no visible hero CTA.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The target rule: the form, booking widget or shelf the bar points to.
  useEffect(() => {
    const selectors = [...targetKey.split(",").filter(Boolean), "[data-sticky-stop]"].join(",");
    const els = Array.from(document.querySelectorAll(selectors));
    if (els.length === 0) return;
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
    els.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      setTargetOnScreen(false);
    };
  }, [targetKey]);

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

  const past = heroes === "none" ? scrolled : heroes === "past";
  return enabled && past && !targetOnScreen && !typing;
}

/** How far the launcher must rise to sit 12px above the bar. */
function measureChatLift(bar: HTMLElement) {
  const host = document.querySelector("chat-widget");
  const bubble =
    host?.shadowRoot?.querySelector<HTMLElement>(".lc_text-widget--bubble") ??
    host?.querySelector<HTMLElement>(".lc_text-widget--bubble");
  const html = document.documentElement;
  if (!bubble) return;
  const current = parseFloat(getComputedStyle(html).getPropertyValue("--hf-chat-lift")) || 0;
  const naturalBottom = bubble.getBoundingClientRect().bottom + current;
  const barTop = window.innerHeight - bar.offsetHeight;
  const lift = Math.max(0, Math.round(naturalBottom - (barTop - 12)));
  html.style.setProperty("--hf-chat-lift-measured", `${lift}px`);
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
