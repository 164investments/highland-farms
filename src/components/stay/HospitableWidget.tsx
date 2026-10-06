"use client";

import { useEffect, useRef } from "react";

interface HospitableWidgetProps {
  widgetUrl: string;
  propertyName: string;
}

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
      <div className="rounded-xl border-2 border-dashed border-cream-dark bg-warm-white p-12 text-center">
        <p className="text-lg font-normal text-charcoal font-sans">
          Booking Widget Coming Soon
        </p>
        <p className="mt-2 text-sm text-muted font-sans">
          The booking calendar for {propertyName} will appear here once the Hospitable widget URL is configured.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg">
      <iframe
        ref={iframeRef}
        sandbox="allow-top-navigation allow-scripts allow-same-origin"
        src={widgetUrl}
        title={`Book ${propertyName}`}
        className="block mx-auto border-0 max-w-full"
        style={{ width: 315, height: 680 }}
        allow="payment"
      />
    </div>
  );
}
