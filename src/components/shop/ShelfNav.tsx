"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { pushEvent } from "./track";

export interface Shelf {
  /** Section id: "favorites", "mangalitsa", "gifts". */
  key: string;
  label: string;
  /** Items in stock now; omitted for the gifts tab. */
  count?: number;
}

const numberClass = "font-display italic [font-variant-numeric:lining-nums]";

/**
 * The hero's labeled shelf buttons (validated pattern, counts = in stock now)
 * and the tab bar fixed under the masthead, shown only after the buttons
 * scroll away so the nav never appears twice. The first button carries
 * data-hero-cta (the sticky cart bar waits for it to leave).
 */
export function ShelfNav({ shelves, tabs }: { shelves: Shelf[]; tabs: Shelf[] }) {
  const buttons = useRef<HTMLElement>(null);
  const [showTabs, setShowTabs] = useState(false);
  const [active, setActive] = useState(tabs[0]?.key ?? "");

  useEffect(() => {
    const el = buttons.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) =>
      setShowTabs(!e.isIntersecting && e.boundingClientRect.top < 0),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const els = tabs.map((t) => document.getElementById(t.key)).filter((x): x is HTMLElement => Boolean(x));
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [tabs]);

  const promo = (key: string, label: string, slot: string) =>
    pushEvent("select_promotion", {
      promotion_id: `shop_category_${key}`,
      promotion_name: label,
      creative_slot: slot,
    });

  return (
    <>
      <nav ref={buttons} id="shelf-buttons" aria-label="Store shelves" className="mt-4 lg:mt-8">
        <p className="m-0 mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-meta">
          Browse the shelves · in stock now
        </p>
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 lg:grid-cols-3 lg:gap-2.5">
          {shelves.map((s, i) => (
            <li key={s.key}>
              <a
                href={`#${s.key}`}
                {...(i === 0 ? { "data-hero-cta": "" } : {})}
                onClick={() => promo(s.key, s.label, "hero_shelf_buttons")}
                className={cn(
                  "flex h-11 items-center justify-between gap-2 px-3.5 lg:h-[52px] lg:px-4",
                  i === 0
                    ? "bg-pine text-paper-light hover:bg-pine-dark"
                    : "border border-frame bg-paper-light text-ink hover:bg-paper-shade",
                )}
              >
                <span className={cn("text-[14px]", i === 0 ? "font-semibold" : "font-medium")}>{s.label}</span>
                <span className={cn("text-[19px]", numberClass, i !== 0 && "text-fern")}>
                  {s.count}
                  <span className="sr-only"> in stock now</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div
        aria-hidden={!showTabs}
        inert={!showTabs}
        className={cn(
          "fixed inset-x-0 top-[60px] z-30 border-b border-rule bg-paper xl:top-[96px]",
          showTabs ? "block" : "hidden",
        )}
      >
        <nav
          aria-label="Jump to a shelf"
          className="mx-auto flex max-w-[1312px] gap-5 overflow-x-auto px-5 [scrollbar-width:none] lg:justify-center lg:gap-9 lg:px-16"
        >
          {tabs.map((t) => {
            const on = active === t.key;
            return (
              <a
                key={t.key}
                href={`#${t.key}`}
                aria-current={on ? "true" : undefined}
                onClick={() => promo(t.key, t.label, "sticky_pill_nav")}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-1.5 border-b-2 text-[13px]",
                  on ? "border-pine font-semibold text-ink" : "border-transparent text-ink-body",
                )}
              >
                {t.label}
                {t.count !== undefined && <span className={cn("text-[16px] text-fern", numberClass)}>{t.count}</span>}
              </a>
            );
          })}
        </nav>
      </div>
    </>
  );
}
