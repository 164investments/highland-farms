"use client";

import { useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";

type Background = "cream" | "warm-white" | "sage";

const BG: Record<Background, string> = {
  cream: "bg-cream",
  "warm-white": "bg-warm-white",
  sage: "bg-sage/10",
};

interface InlineEmailCaptureProps {
  /**
   * Capture source → `email_subscribers.source`. Must be allowlisted in
   * `/api/subscribe` so it isn't lumped in with the site-wide popup.
   */
  source: "spa-page" | "farm-tours-page";
  eyebrow?: string;
  heading: string;
  body: string;
  buttonLabel?: string;
  background?: Background;
  className?: string;
}

/**
 * Inline, always-visible soft email capture for the not-ready-to-book visitor.
 * Distinct from the site-wide modal <EmailPopup/> — this lives in the page flow
 * and self-selects non-bookers ("Not ready to book?"), so it doesn't compete
 * with the primary booking CTAs. Reuses the popup's honeypot + timing guards.
 */
export function InlineEmailCapture({
  source,
  eyebrow,
  heading,
  body,
  buttonLabel = "Notify Me",
  background = "sage",
  className,
}: InlineEmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const loadTime = useRef(Date.now());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source,
          website: honeypot || undefined,
          _t: loadTime.current,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to subscribe");
      }

      setStatus("success");
      if (typeof window !== "undefined") {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "email_subscribe", method: source });
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <section className={cn("py-14 sm:py-20", BG[background], className)}>
      <Container className="max-w-2xl text-center">
        {eyebrow && (
          <p className="text-xs font-normal uppercase tracking-[0.18em] text-sage font-sans">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-2 text-2xl font-normal text-charcoal sm:text-3xl">
          {heading}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-base text-muted font-sans font-light leading-relaxed">
          {body}
        </p>

        {status === "success" ? (
          <p className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-forest/10 px-5 py-3 text-sm text-forest font-sans">
            <Bell className="h-4 w-4 shrink-0" />
            You&apos;re on the list — we&apos;ll be in touch when new dates open.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-6 flex max-w-md flex-col gap-2.5 sm:flex-row"
          >
            {/* Honeypot — hidden from real users */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            <label htmlFor={`capture-email-${source}`} className="sr-only">
              Email address
            </label>
            <input
              id={`capture-email-${source}`}
              type="email"
              required
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full flex-1 rounded-lg border border-cream-dark bg-white px-4 py-3 text-sm text-charcoal placeholder:text-muted/60 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest font-sans"
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className="shrink-0 rounded-lg bg-forest px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-forest-light disabled:opacity-60 font-sans"
            >
              {status === "submitting" ? "…" : buttonLabel}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-3 text-sm text-red-600 font-sans" role="alert">
            {errorMsg}
          </p>
        )}

        <p className="mt-4 text-xs text-muted/60 font-sans">
          No spam — just a heads-up when new sessions open. Unsubscribe anytime.
        </p>
      </Container>
    </section>
  );
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}
