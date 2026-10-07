"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Fallback for the mailto links: in-app browsers (Instagram, Facebook) and
 * phones without a mail account can swallow a mailto tap. The address stays
 * visible and selectable; this button copies it.
 */
export function CopyEmail({ email, className }: { email: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the address is on screen and select-all, so do nothing.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      data-cta="tg-copy-email"
      className={cn("group inline-flex min-h-11 items-center", className)}
    >
      <span
        aria-live="polite"
        className="border-b border-pine-line pb-0.5 font-sans text-[13px] font-medium text-pine transition-colors group-hover:border-pine"
      >
        {copied ? "Copied" : "Copy email address"}
      </span>
    </button>
  );
}
