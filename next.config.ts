import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // admin.highlandfarmsoregon.com serves the farm-store admin at its root.
  //
  // Only the root path is rewritten, deliberately. Rewriting /:path* would also
  // capture /api/*, and the admin screens post to /api/shop/admin/* on whatever
  // host they were loaded from — so a blanket rewrite would break every save.
  // MUST be beforeFiles. A bare array (or afterFiles) only runs once the
  // filesystem routes have been checked, and "/" already exists as a page, so
  // the rewrite would never fire and the subdomain would serve the homepage.
  async rewrites() {
    const ADMIN_HOST = "admin.highlandfarmsoregon.com";
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host" as const, value: ADMIN_HOST }],
          destination: "/shop/admin",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  async redirects() {
    return [
      // Old Squarespace URL redirects
      { source: "/wedding-venue", destination: "/weddings", permanent: true },
      { source: "/outdoor-wedding-venue", destination: "/weddings", permanent: true },
      { source: "/farm-wedding-venue", destination: "/weddings", permanent: true },
      { source: "/farm-tour-spa", destination: "/farm-tours", permanent: true },
      { source: "/farm-stay", destination: "/stay", permanent: true },
      { source: "/gatherings-retreats", destination: "/celebrations", permanent: true },
      { source: "/photoshoots-productions", destination: "/contact", permanent: true },
      { source: "/events", destination: "/weddings", permanent: true },
      { source: "/retreats", destination: "/celebrations", permanent: true },
      { source: "/photoshoots", destination: "/contact", permanent: true },
      { source: "/home", destination: "/", permanent: true },
      { source: "/spa", destination: "/nordic-spa", permanent: true },
      { source: "/staywithus", destination: "/stay", permanent: true },
      { source: "/cottage", destination: "/stay/cottage", permanent: true },
      { source: "/lodge", destination: "/stay/lodge", permanent: true },
      { source: "/camp", destination: "/stay/camp", permanent: true },
      { source: "/highland-farm", destination: "/stay/whole-farm", permanent: true },
      { source: "/faq", destination: "/about", permanent: true },
      { source: "/gallery-1", destination: "/wedding-portfolio", permanent: true },
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/highland-cow-photoshoot", destination: "/farm-tours", permanent: true },
      { source: "/newsletter", destination: "/contact", permanent: true },
      { source: "/event-type", destination: "/celebrations", permanent: true },
      { source: "/wedding-inquiry-submission-confirmation", destination: "/contact", permanent: true },
      { source: "/event-inquiry-submission-confirmation", destination: "/contact", permanent: true },
      { source: "/calendar-backend/:path*", destination: "/", permanent: true },
      // Old Squarespace product pages → shop subdomain
      { source: "/shop/p/:slug*", destination: "https://shop.highlandfarmsoregon.com/shop/p/:slug*", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
