"use client";

import { useEffect, useRef, useState } from "react";

interface HospitableWidgetProps {
  widgetUrl: string;
  propertyName: string;
  /** Stay slug (kept for callers; not used for tracking). */
  propertySlug?: string;
}

/** Reserve space until the provider reports its current document height. */
const WIDGET_INITIAL_HEIGHT = 520;

export function HospitableWidget({ widgetUrl, propertyName }: HospitableWidgetProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(WIDGET_INITIAL_HEIGHT);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Validate origin to prevent untrusted postMessage data
      let host: string;
      try {
        host = new URL(event.origin).hostname;
      } catch {
        return;
      }
      if (host !== "hospitable.com" && !host.endsWith(".hospitable.com")) return;
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const reported = event.data?.iframeHeight;
      if (typeof reported !== "number" && typeof reported !== "string") return;
      const nextHeight = Number(reported);
      if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
      setHeight(nextHeight);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!widgetUrl) {
    return (
      <div className="border border-dashed border-rule bg-paper-light p-12 text-center">
        <p className="text-lg text-ink font-sans">Booking Widget Coming Soon</p>
        <p className="mt-2 text-sm text-ink-note font-sans">
          The booking calendar for {propertyName} will appear here once the Hospitable widget URL is configured.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-[315px] max-w-full overflow-hidden rounded-lg" style={{ minHeight: height }}>
      <iframe
        ref={iframeRef}
        sandbox="allow-top-navigation allow-scripts allow-same-origin"
        src={widgetUrl}
        title={`Book ${propertyName}`}
        className="block mx-auto border-0 max-w-full"
        style={{ width: 315, height }}
        allow="payment"
      />
    </div>
  );
}
