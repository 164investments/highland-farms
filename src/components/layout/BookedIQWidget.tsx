import Script from "next/script";

const LOCATION_ID = process.env.NEXT_PUBLIC_BOOKEDIQ_LOCATION_ID;

export function BookedIQWidget() {
  if (!LOCATION_ID) return null;

  return (
    <>
      <link
        rel="stylesheet"
        media="print"
        // @ts-expect-error onLoad on link is non-standard but valid for this GHL pattern
        onLoad="this.media='all'"
        href="https://widgets.leadconnectorhq.com/loader.css"
      />
      <Script
        id="bookediq-widget"
        src="https://widgets.leadconnectorhq.com/loader.js"
        data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
        data-widget-id={LOCATION_ID}
        strategy="afterInteractive"
      />
    </>
  );
}
