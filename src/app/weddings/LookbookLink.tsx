"use client";

import type { ReactNode } from "react";
import { LOOKBOOK_HREF } from "@/components/layout/chrome";

/**
 * A quiet text link to the 2027 look book PDF. No email gate; opening it pushes the
 * same `lookbook_open` event as the popup, with the placement of the page that holds it.
 */
export function LookbookLink({
  placement,
  className,
  children = "See the 2027 look book",
}: {
  placement: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={LOOKBOOK_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "lookbook_open", placement });
      }}
    >
      {children}
      <span className="sr-only"> (PDF, opens in a new tab)</span>
    </a>
  );
}
