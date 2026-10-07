"use client";

import { useEffect, useRef } from "react";

interface HospitableWidgetProps {
  widgetUrl: string;
  propertyName: string;
  /** Stay slug (kept for callers; not used for tracking). */
  propertySlug?: string;
}

/** The widget reports 520 high with no dates, 558 with a month shown and about 777 with a quote. */
const WIDGET_MIN_HEIGHT = 520;

export function HospitableWidget({ widgetUrl, propertyName }: HospitableWidgetProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

      if (event.data?.iframeHeight && iframeRef.current) {
        iframeRef.current.style.height = event.data.iframeHeight + "px";
      }
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
    <div className="mx-auto w-[315px] max-w-full overflow-hidden rounded-lg" style={{ minHeight: WIDGET_MIN_HEIGHT }}>
      <iframe
        ref={iframeRef}
        sandbox="allow-top-navigation allow-scripts allow-same-origin"
        src={widgetUrl}
        title={`Book ${propertyName}`}
        className="block mx-auto border-0 max-w-full"
        style={{ width: 315, height: WIDGET_MIN_HEIGHT }}
        allow="payment"
      />
    </div>
  );
}
