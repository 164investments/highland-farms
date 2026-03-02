import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
      // Explicitly allow AI crawlers
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "Claude-Web",
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "Applebot-Extended",
        allow: "/",
        disallow: ["/api/"],
      },
      // Explicitly allow Bing crawlers
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "BingPreview",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: "https://highlandfarmsoregon.com/sitemap.xml",
  };
}
