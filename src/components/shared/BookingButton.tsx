"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StickyMobileCTA } from "@/components/shared/StickyMobileCTA";

const OPEN_EVENT = "hf:open-booking";

interface OpenDetail {
  src: string;
  title?: string;
}

/**
 * Dispatched anywhere — opens the Acuity booking modal mounted by
 * <BookingModalRoot/>. Falls back to opening the URL in a new tab if the modal
 * isn't mounted (e.g. on pages that didn't include it).
 */
export function openBookingModal(detail: OpenDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<OpenDetail>(OPEN_EVENT, { detail }));
}

interface BookingButtonProps {
  href: string;
  label: string;
  size?: "sm" | "default" | "lg";
  variant?: "primary" | "outline" | "ghost" | "soft";
  className?: string;
  title?: string;
}

export function BookingButton({
  href,
  label,
  size = "lg",
  variant = "primary",
  className,
  title,
}: BookingButtonProps) {
  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      onClick={() => openBookingModal({ src: href, title })}
    >
      {label}
    </Button>
  );
}

interface BookingStickyCTAProps {
  href: string;
  label: string;
  title?: string;
}

export function BookingStickyCTA({ href, label, title }: BookingStickyCTAProps) {
  return (
    <StickyMobileCTA
      label={label}
      href={href}
      onClick={() => openBookingModal({ src: href, title })}
    />
  );
}

/**
 * Single mount point per page. Listens for openBookingModal() calls and renders
 * an iframe modal that loads the Acuity scheduler. Click outside / Esc / X to
 * close. Always includes an "Open in new tab" escape hatch.
 */
export function BookingModalRoot() {
  const [state, setState] = useState<OpenDetail | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenDetail>).detail;
      if (detail?.src) setState(detail);
    };
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!state) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setState(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [state]);

  if (!state) return null;

  const title = state.title ?? "Book your tour";

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-charcoal/70 backdrop-blur-sm sm:items-start sm:p-4 md:p-6"
      onClick={() => setState(null)}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="relative flex w-full flex-col bg-white shadow-2xl sm:my-4 sm:max-w-3xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-cream-dark/40 px-5 py-4">
          <h3 className="text-base font-normal text-charcoal font-display">
            {title}
          </h3>
          <div className="flex items-center gap-4">
            <a
              href={state.src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted underline-offset-4 hover:text-charcoal hover:underline font-sans"
            >
              Open in new tab
            </a>
            <button
              type="button"
              onClick={() => setState(null)}
              className="rounded-full p-1.5 text-muted transition-colors hover:bg-cream hover:text-charcoal"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <iframe
          src={state.src}
          title={title}
          className="h-[calc(100vh-64px)] w-full sm:h-[80vh] sm:rounded-b-xl"
        />
      </div>
    </div>
  );
}
