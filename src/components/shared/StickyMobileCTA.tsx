"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StickyMobileCTAProps {
  label: string;
  href: string;
  sublabel?: string;
  className?: string;
  external?: boolean;
  /** If provided, the CTA fires onClick instead of navigating (e.g. to open a modal). */
  onClick?: () => void;
}

export function StickyMobileCTA({
  label,
  href,
  sublabel,
  className,
  external,
  onClick,
}: StickyMobileCTAProps) {
  // One primary button on screen at a time: hide while any element marked
  // data-hero-cta is in view. With no marked element, show after 400px of scroll.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const heroes = Array.from(document.querySelectorAll("[data-hero-cta]"));
    if (heroes.length === 0) {
      const onScroll = () => setShown(window.scrollY > 400);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }
    const inView = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) inView.add(e.target);
        else inView.delete(e.target);
      }
      setShown(inView.size === 0);
    });
    heroes.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, []);

  const linkClasses =
    "flex items-center justify-center gap-2 w-full rounded-full bg-forest py-3.5 text-sm font-light uppercase tracking-wider text-white transition-colors hover:bg-forest-light active:bg-forest-light";

  const inner = (
    <>
      {label}
      {sublabel && <span className="text-sm text-white/80">{sublabel}</span>}
    </>
  );

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 transition-transform duration-300 lg:hidden",
        shown ? "translate-y-0" : "pointer-events-none translate-y-full",
        className,
      )}
      aria-hidden={!shown}
      inert={!shown}
    >
      <div className="bg-white border-t border-cream-dark px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        {onClick ? (
          <button type="button" onClick={onClick} className={linkClasses}>
            {inner}
          </button>
        ) : external ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClasses}
          >
            {inner}
          </a>
        ) : (
          <Link href={href} className={linkClasses}>
            {inner}
          </Link>
        )}
      </div>
    </div>
  );
}
