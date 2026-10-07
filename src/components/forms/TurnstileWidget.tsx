"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  action?: string;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "flexible" | "compact";
  /**
   * Bump to get a fresh token. Tokens are single-use, so after a failed
   * submit the old one cannot pass siteverify again.
   */
  resetSignal?: number;
}

interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  theme?: string;
  size?: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  "timeout-callback"?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement | string, options: TurnstileRenderOptions) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
    };
  }
}

export function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  action = "contact-form",
  theme = "light",
  size = "flexible",
  resetSignal = 0,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbackRef = useRef({ onVerify, onExpire });
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    callbackRef.current = { onVerify, onExpire };
  }, [onVerify, onExpire]);

  // If the script was already loaded by a previous mount, skip waiting on onLoad
  useEffect(() => {
    if (typeof window !== "undefined" && window.turnstile) {
      queueMicrotask(() => setScriptReady(true));
    }
  }, []);

  const handleScriptLoad = useCallback(() => setScriptReady(true), []);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || widgetIdRef.current) return;
    if (!window.turnstile) return;

    const id = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme,
      size,
      callback: (token: string) => callbackRef.current.onVerify(token),
      "expired-callback": () => callbackRef.current.onExpire?.(),
      "error-callback": () => callbackRef.current.onExpire?.(),
      "timeout-callback": () => callbackRef.current.onExpire?.(),
    });

    widgetIdRef.current = id;

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // widget may already be gone
        }
        widgetIdRef.current = null;
      }
    };
  }, [scriptReady, siteKey, action, theme, size]);

  useEffect(() => {
    if (!resetSignal || !widgetIdRef.current || !window.turnstile) return;
    try {
      window.turnstile.reset(widgetIdRef.current);
    } catch {
      // widget may already be gone
    }
    callbackRef.current.onExpire?.();
  }, [resetSignal]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />
      <div ref={containerRef} />
    </>
  );
}
