"use client";

import type { ReactNode } from "react";
import { appendAttributionToUrl, getClientAttribution } from "@/lib/attribution";
import { weddingCallUrl } from "@/components/layout/chrome";

interface WeddingCallLinkProps {
  /** utm_content for this placement, e.g. "footer-call", "home-reasons". */
  content: string;
  /** booking_title in the dataLayer push. */
  title: string;
  className?: string;
  children: ReactNode;
  /** Open Acuity in a new tab (default), so the site stays open. */
  newTab?: boolean;
}

/**
 * "Book a free 45-minute call with Daunte": the same booking_start push the
 * inquiry form uses (booking_type "wedding_call"), with the visitor's stored
 * attribution appended. Acuity until the native calendar flag flips, then
 * /wedding-call.
 */
export function WeddingCallLink({ content, title, className, children, newTab = true }: WeddingCallLinkProps) {
  const href = weddingCallUrl(content);
  const external = !href.startsWith("/");
  return (
    <a
      href={href}
      target={external && newTab ? "_blank" : undefined}
      rel={external && newTab ? "noopener noreferrer" : undefined}
      className={className}
      onClick={(event) => {
        const url = external ? appendAttributionToUrl(href, getClientAttribution()) : href;
        if (external) event.currentTarget.href = url;
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: "booking_start",
          booking_type: "wedding_call",
          booking_url: url,
          booking_title: title,
        });
      }}
    >
      {children}
      {external && newTab && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}
