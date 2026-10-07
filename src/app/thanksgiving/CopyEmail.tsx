"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Fallback for the mailto links: in-app browsers (Instagram, Facebook) and
 * phones without a mail account can swallow a mailto tap. The address stays
 * visible and selectable; this button copies it.
 */
export function CopyEmail({ email, className, inline = false }: { email: string; className?: string; inline?: boolean }) {
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
      aria-label="Copy email address"
      className={cn("group inline-flex items-center", inline ? "py-3" : "min-h-11", className)}
    >
      <span
        aria-live="polite"
        className="border-b border-pine-line pb-0.5 font-sans text-[13px] font-medium text-pine transition-colors group-hover:border-pine"
      >
        {copied ? "Copied" : inline ? "copy" : "Copy email address"}
      </span>
    </button>
  );
}
