"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Truck } from "lucide-react";

export function AnnouncementBar() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const isShop = pathname?.startsWith("/shop");
  const storageKey = isShop ? "hf-shop-promo-dismissed" : "hf-announcement-dismissed";

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) setVisible(true);
  }, [storageKey]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(storageKey, "true");
  }

  if (!visible) return null;

  if (isShop) {
    return (
      <div className="relative bg-charcoal/90 backdrop-blur-sm text-white text-center text-[0.6875rem] py-2.5 px-12 sm:px-10 sm:text-xs">
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-light tracking-[0.1em] uppercase font-sans sm:gap-x-5 sm:tracking-[0.14em]">
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" aria-hidden />
            Free farm pickup in Brightwood, Oregon
          </span>
          <span aria-hidden className="hidden sm:inline opacity-50">·</span>
          <span className="hidden sm:inline">Insulated shipping available</span>
          <span aria-hidden className="hidden sm:inline opacity-50">·</span>
          <span className="hidden sm:inline">Pasture-raised &amp; family-run since 2019</span>
          <Link
            href="#cat-featured"
            className="underline underline-offset-4 decoration-gold/70 hover:decoration-gold transition-colors"
          >
            Shop Bestsellers
          </Link>
        </p>
        <button
          onClick={dismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 hover:opacity-70 transition-opacity"
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative bg-charcoal/90 backdrop-blur-sm text-white text-center text-xs py-2.5 px-12 sm:px-10">
      <p className="font-light tracking-[0.1em] sm:tracking-[0.15em] uppercase font-sans">
        Forest Weddings &middot; 2027 Summer &amp; Fall Dates Filling Fast{" "}
        <Link href="/weddings" className="underline underline-offset-4 decoration-gold/70 hover:decoration-gold transition-colors ml-1">
          Inquire
        </Link>
      </p>
      <button
        onClick={dismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 hover:opacity-70 transition-opacity"
        aria-label="Dismiss announcement"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
