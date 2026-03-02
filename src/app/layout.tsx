import type { Metadata } from "next";
import { Cormorant_Garamond, Lora, Dancing_Script } from "next/font/google";
import Script from "next/script";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SkipLink } from "@/components/layout/SkipLink";
import { StructuredData } from "@/components/layout/StructuredData";
import { GoogleTagManager, GoogleTagManagerNoScript } from "@/components/layout/GoogleTagManager";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { EmailPopup } from "@/components/layout/EmailPopup";
import { MicrosoftClarity } from "@/components/layout/MicrosoftClarity";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
  weight: ["400", "700"],
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
      </head>
      <body className={`${cormorant.variable} ${lora.variable} ${dancingScript.variable} antialiased overflow-x-hidden`}>
        <GoogleTagManager />
        <GoogleTagManagerNoScript />
        <Script
          id="hs-script-loader"
          src="//js.hs-scripts.com/241936089.js"
          strategy="afterInteractive"
        />
        <SkipLink />
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
        <CookieConsent />
        <EmailPopup />
        {process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID && (
          <MicrosoftClarity projectId={process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID} />
        )}
      </body>
    </html>
  );
}
