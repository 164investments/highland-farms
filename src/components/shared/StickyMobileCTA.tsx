"use client";

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
  const linkClasses =
    "flex items-center justify-center gap-2 w-full rounded-full bg-forest py-3.5 text-sm font-light uppercase tracking-wider text-white transition-colors hover:bg-forest-light active:bg-forest-light";

  const inner = (
    <>
      {label}
      {sublabel && <span className="text-sm text-white/80">{sublabel}</span>}
    </>
  );

  return (
    <div className={cn("fixed bottom-0 left-0 right-0 z-30 lg:hidden", className)}>
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
