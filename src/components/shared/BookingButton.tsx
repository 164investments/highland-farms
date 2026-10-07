"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { appendAttributionToUrl, getClientAttribution } from "@/lib/attribution";
import { bookingTrackingFromUrl } from "@/lib/booking/tracking";
import { SPA_MAX_PARTY, SPA_PRICE_PER_PERSON } from "@/data/nordic-spa";

const OPEN_EVENT = "hf:open-booking";

interface OpenDetail {
  src: string;
  title?: string;
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (
      action: "track" | "trackCustom",
      eventName: string,
      params?: Record<string, unknown>,
    ) => void;
  }
}

/**
 * Dispatched anywhere — opens the Acuity booking modal mounted by
 * <BookingModalRoot/>. Falls back to navigating to the URL if the modal
 * isn't mounted (e.g. on pages that didn't include it).
 */
export function openBookingModal(detail: OpenDetail) {
  if (typeof window === "undefined") return;
  // A mounted <BookingModalRoot/> calls preventDefault() to claim the event.
  // dispatchEvent() returns true when nobody did, so navigate instead of
  // silently doing nothing.
  const unhandled = window.dispatchEvent(
    new CustomEvent<OpenDetail>(OPEN_EVENT, { detail, cancelable: true }),
  );
  if (unhandled && detail?.src) window.location.href = detail.src;
}

function bookingTypeFromUrl(url: string): string {
  if (url.includes("85942611") || url.includes("calendar/13047082")) return "nordic_spa";
  if (url.includes("/catalog/")) return "gift_certificate";
  return "farm_tour";
}

/**
 * One line under the dialog title for the spa's class calendar, where Acuity
 * shows "@ $75.00" and a Quantity field. A row with a fixed count prefills
 * Quantity (`?quantity=N`, see SPA_SPOT_ROWS); every other spa entry (hero,
 * sticky bar, the 3-to-5 row, stay add-ons) asks the guest to set it.
 */
/** One line under the modal title: the spa quantity help, or the tour's reassurance. */
export function wrapperNote(src: string): string | null {
  const type = bookingTypeFromUrl(src);
  if (type === "nordic_spa") return spaQuantityNote(src) ?? "Rain or shine. Pick a date and time below.";
  // Tours are the "Private Tour for N" calendar; the wedding call and the tour menu also fall back to farm_tour.
  if (type === "farm_tour" && src.includes("calendar/7539520")) return "Private tour, rain or shine. Pick a date and time below.";
  return null;
}

export function spaQuantityNote(src: string): string | null {
  if (bookingTypeFromUrl(src) !== "nordic_spa") return null;
  let quantity = NaN;
  try {
    quantity = Number(new URL(src).searchParams.get("quantity"));
  } catch {
    return null;
  }
  const each = SPA_PRICE_PER_PERSON;
  if (!Number.isInteger(quantity) || quantity < 1) {
    return `Set Quantity below to your number of guests, $${each} each.`;
  }
  if (quantity === 1) return null;
  const total = `${quantity} × $${each} = $${quantity * each}`;
  if (quantity >= SPA_MAX_PARTY) {
    return `Quantity is set to ${quantity} for the whole session: ${total}. You can pick only times with all six spots open.`;
  }
  return `Quantity is set to ${quantity}: ${total}.`;
}

function prepareBookingUrl(href: string): string {
  return appendAttributionToUrl(href, getClientAttribution());
}

/**
 * `href` is the link as written; `src` the same URL with the visitor's stored
 * attribution applied (which overwrites utm_content). The party-size and
 * gift fields come from the written link.
 */
function trackBookingStart(href: string, title: string | undefined, written: string) {
  if (typeof window === "undefined") return;

  const bookingType = bookingTypeFromUrl(href);
  const extras = bookingTrackingFromUrl(written);
  const payload = {
    booking_type: bookingType,
    booking_url: href,
    booking_title: title,
    ...extras,
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "booking_start",
    ...payload,
  });

  window.fbq?.("track", "InitiateCheckout", {
    content_category: bookingType,
    content_name: title ?? bookingType,
    ...(extras.value !== undefined ? { value: extras.value, currency: extras.currency } : {}),
  });
}

interface BookingButtonProps {
  href: string;
  label: string;
  size?: "sm" | "default" | "lg";
  variant?: "primary" | "outline" | "ghost" | "soft";
  className?: string;
  title?: string;
  /** Rich content in place of `label`; `label` still names the tracking event. */
  children?: ReactNode;
}

export function BookingButton({
  href,
  label,
  size = "lg",
  variant = "primary",
  className,
  title,
  children,
}: BookingButtonProps) {
  const handleClick = () => {
    const src = prepareBookingUrl(href);
    trackBookingStart(src, title ?? label, href);
    openBookingModal({ src, title });
  };

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      onClick={handleClick}
    >
      {children ?? label}
    </Button>
  );
}

interface BookingTextLinkProps {
  href: string;
  label: string;
  title?: string;
  className?: string;
  /** Rich content in place of `label` (e.g. a price row); `label` still names the tracking event. */
  children?: ReactNode;
}

/** Quiet text link that opens the booking modal through the same tracking path. */
export function BookingTextLink({ href, label, title, className, children }: BookingTextLinkProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const src = prepareBookingUrl(href);
        trackBookingStart(src, title ?? label, href);
        openBookingModal({ src, title });
      }}
    >
      {children ?? label}
    </button>
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
      if (detail?.src) {
        e.preventDefault();
        setState(detail);
      }
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
  const note = wrapperNote(state.src);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-charcoal/70 backdrop-blur-sm sm:items-start sm:p-4 md:p-6"
      onClick={() => setState(null)}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="relative flex w-full flex-col bg-paper shadow-2xl sm:my-4 sm:max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Paper header like the rest of the site; the title wraps instead of crowding the links. */}
        <div className="shrink-0 border-b border-rule px-5 pb-3 pt-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="m-0 min-w-0 flex-1 pt-2.5 font-display text-[19px] font-semibold leading-tight text-ink">
              {title}
            </h3>
            <div className="flex shrink-0 items-center">
              <a
                href={state.src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center px-1 font-sans text-[12px] text-ink-note underline decoration-rule underline-offset-4 hover:text-ink"
              >
                New tab
                <span className="sr-only"> (opens the booking page in a new tab)</span>
              </a>
              <button
                type="button"
                onClick={() => setState(null)}
                className="-mr-2 inline-flex h-11 w-11 items-center justify-center text-ink transition-colors hover:text-pine focus-visible:outline-2 focus-visible:outline-pine"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={1.6} />
              </button>
            </div>
          </div>
          {note && <p className="m-0 mt-0.5 font-sans text-[13px] leading-[1.45] text-ink-body">{note}</p>}
        </div>
        {/* Phone: fill what the header leaves (it grows by a line when there is a note). */}
        <iframe
          src={state.src}
          title={title}
          className="min-h-0 w-full flex-1 bg-paper sm:h-[80vh] sm:flex-none"
        />
      </div>
    </div>
  );
}
