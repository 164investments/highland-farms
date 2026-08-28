"use client";

import { cn } from "@/lib/utils";

/**
 * Native-calendar sticky mobile CTA. Mirrors StickyMobileCTA's look, but is a
 * plain in-page anchor to the #book section (NativeBookingSection) instead of
 * an Acuity modal trigger — mounted only in the flag-ON branch on the product
 * pages, where BookingStickyCTA is hidden.
 */
export function NativeStickyCTA({ className }: { className?: string }) {
  return (
    <div className={cn("fixed bottom-0 left-0 right-0 z-30 lg:hidden", className)}>
      <div className="bg-white border-t border-cream-dark px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <a
          href="#book"
          className="flex items-center justify-center gap-2 w-full rounded-full bg-forest py-3.5 text-sm font-light uppercase tracking-wider text-white transition-colors hover:bg-forest-light active:bg-forest-light"
        >
          Book now
        </a>
      </div>
    </div>
  );
}
