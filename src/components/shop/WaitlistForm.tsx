"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * "Email me when it's back": one email field posted once per variant id to
 * /api/shop/waitlist (the route takes one variant per request). Honeypot kept.
 */
export function WaitlistForm({
  variantIds,
  name,
  label,
  className,
}: {
  variantIds: string[];
  /** What the email is about, for the field label ("Spare ribs", "Medium"). */
  name: string;
  /** Overrides the field label ("Your email"); it is read aloud, not drawn, when `name` is empty. */
  label?: string;
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const id = `wl-${variantIds[0]}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("saving");
    setMessage(null);
    try {
      for (const variantId of variantIds) {
        const res = await fetch("/api/shop/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId, email, website: website || undefined }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setMessage(body.error ?? "Couldn't save that. Try again?");
          setState("error");
          return;
        }
      }
      setState("done");
    } catch {
      setMessage("Couldn't reach the farm. Try again?");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className={cn("m-0 py-3 text-[14px] text-ink-body", className)}>
        You&apos;re on the list.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={cn("py-3", className)}>
      <label htmlFor={id} className={cn("block text-[13px] font-medium text-ink", !name && "sr-only")}>
        {label ?? `Email me when ${name} is back`}
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id={id}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@email.com"
          className="h-12 min-w-0 flex-1 border border-frame bg-paper-light px-3.5 text-[16px] text-ink"
        />
        <button
          type="submit"
          disabled={state === "saving"}
          className="h-12 shrink-0 bg-pine px-5 text-[15px] font-semibold text-paper-light hover:bg-pine-dark disabled:opacity-60"
        >
          {state === "saving" ? "Saving" : "Email me"}
        </button>
      </div>
      <input
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />
      {message && (
        <p role="alert" className="m-0 mt-2 text-[13px] text-ink-body">
          {message}
        </p>
      )}
    </form>
  );
}
