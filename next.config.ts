import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
