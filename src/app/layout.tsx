import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Dancing_Script } from "next/font/google";
import Script from "next/script";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SkipLink } from "@/components/layout/SkipLink";
import { StructuredData } from "@/components/layout/StructuredData";
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from "@/components/layout/GoogleTagManager";
import { EmailPopup } from "@/components/layout/EmailPopup";
import { MicrosoftClarity } from "@/components/layout/MicrosoftClarity";
import { BookedIQWidget } from "@/components/layout/BookedIQWidget";
import { AttributionTracker } from "@/components/layout/AttributionTracker";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: {
    default: "Highland Farms | Oregon's Premier Farm Wedding Venue",
    template: "%s | Highland Farms Oregon",
  },
  description:
    "Oregon's premier farm wedding venue & outdoor sauna near Portland. All-inclusive farm and forest weddings, Highland Cow farm tours, sauna & cold plunge, and farm stays at the base of Mt. Hood.",
  keywords: [
    "Oregon wedding venue",
    "farm wedding venue Oregon",
    "outdoor wedding venue Oregon",
    "Mt Hood wedding venue",
    "forest wedding venue",
    "Highland Cow farm tour",
    "Nordic spa Oregon",
    "sauna near Portland",
    "cold plunge Portland",
    "outdoor sauna Oregon",
    "sauna Mt Hood",
    "farm stay Oregon",
    "Brightwood Oregon",
    "destination wedding Oregon",
  ],
  metadataBase: new URL("https://highlandfarmsoregon.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Highland Farms | Oregon's Premier Farm Wedding Venue",
    description:
      "All-inclusive farm and forest weddings at the base of Mt. Hood.",
    url: "https://highlandfarmsoregon.com",
    siteName: "Highland Farms Oregon",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/images/hero/farm-aerial.jpg",
        width: 1200,
        height: 630,
        alt: "Aerial view of Highland Farms at the base of Mt. Hood",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Highland Farms | Oregon's Premier Farm Wedding Venue",
    description:
      "All-inclusive farm and forest weddings at the base of Mt. Hood.",
    images: ["/images/hero/farm-aerial.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
  },
  // Bing Webmaster Tools verification — add NEXT_PUBLIC_BING_VERIFICATION to env vars
  ...(process.env.NEXT_PUBLIC_BING_VERIFICATION && {
    verification: {
      other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION },
    },
  }),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <head>
        <StructuredData />
        <link
          rel="alternate"
          type="text/plain"
          href="/llms.txt"
          title="llms.txt"
        />
      </head>
      <body
        className={`${cormorant.variable} ${inter.variable} ${dancingScript.variable} antialiased overflow-x-hidden`}
      >
        <GoogleTagManager />
        <GoogleTagManagerNoScript />
        <AttributionTracker />
        <Script id="hs-form-capture-off" strategy="beforeInteractive">
          {`window._hsq = window._hsq || []; _hsq.push(["setFormCapture", false]);`}
        </Script>
        <Script
          id="hs-script-loader"
          src="//js.hs-scripts.com/241936089.js"
          strategy="afterInteractive"
        />
        <SkipLink />
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
        <EmailPopup />
        {process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID && (
          <MicrosoftClarity
            projectId={process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID}
          />
        )}
        <BookedIQWidget />
      </body>
    </html>
  );
}
