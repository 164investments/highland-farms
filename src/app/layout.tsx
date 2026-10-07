import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Dancing_Script } from "next/font/google";
import Script from "next/script";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SkipLink } from "@/components/layout/SkipLink";
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from "@/components/layout/GoogleTagManager";
import { EmailPopup } from "@/components/layout/EmailPopup";
import { MicrosoftClarity } from "@/components/layout/MicrosoftClarity";
import { BookedIQWidget } from "@/components/layout/BookedIQWidget";
import { AttributionTracker } from "@/components/layout/AttributionTracker";
import { CartProvider } from "@/lib/shop/cart";
import "./globals.css";

// 600 costs no extra download: both are variable fonts and Google serves the
// same woff2 for 400-600 (checked 2026-10-06). The paper masthead and the
// first screens use 600 for CTAs, list labels and the "Most popular" row.
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: {
    default: "Highland Farms | Forest Wedding Venue & Highland Cow Farm near Portland",
    template: "%s | Highland Farms Oregon",
  },
  description:
    "A private forest farm at the base of Mt. Hood, about an hour from Portland: whimsical forest weddings with the Highland coos as honorary guests, private Highland Cow farm tours, a wood-fired Nordic spa with cold plunge, and farm stays.",
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
    title: "Highland Farms | Forest Wedding Venue & Highland Cow Farm near Portland",
    description:
      "Whimsical forest weddings with the Highland coos, about an hour from Portland.",
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
    // Title, description and image are deliberately omitted so Next fills
    // them from each page's own openGraph (twitter:image === og:image).
    card: "summary_large_image",
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
    <html
      lang="en"
      // Font variables live on <html> so the @theme tokens in globals.css
      // (--font-display, --font-sans), which resolve at :root, can read them.
      // On <body> they resolved to nothing and every page fell back to the
      // system font.
      className={`${cormorant.variable} ${inter.variable} ${dancingScript.variable} overflow-x-hidden`}
      suppressHydrationWarning
    >
      <head>
        {/*
          The JSON-LD entity graph is NOT mounted here any more.

          `StructuredData` now derives its BreadcrumbList from a `pathname`
          prop, and a root-layout Server Component cannot read the current
          path: `usePathname` is a client hook, and the `headers()` +
          `middleware.ts` route would force all 24+ statically prerendered
          routes into dynamic rendering — trading correct breadcrumbs for the
          static HTML that a non-JS AI crawler actually reads.

          So every page renders `<StructuredData pathname="..." />` itself.
          ⛔ When you add a page, add that line too, or the page ships with no
          structured data at all.
        */}
        <link
          rel="alternate"
          type="text/plain"
          href="/llms.txt"
          title="llms.txt"
        />
      </head>
      <body
        className="antialiased overflow-x-hidden"
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
        <CartProvider>
          <Header />
          <main id="main-content">{children}</main>
          <Footer />
        </CartProvider>
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
