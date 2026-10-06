import type { MetadataRoute } from "next";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { PRODUCTS } from "./shop/data";

const BASE_URL = "https://highlandfarmsoregon.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
    { path: "/weddings", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/farm-tours", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/nordic-spa", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/sauna-near-portland", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/stay", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/thanksgiving", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/stay/lodge", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/stay/cottage", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/stay/whole-farm", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/wedding-portfolio", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/wedding-portfolio/hannah-max", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/wedding-portfolio/jen-ryan", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/wedding-portfolio/sydney-casey", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/wedding-portfolio/riley-jordan", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/wedding-portfolio/maya-justin", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/wedding-portfolio/olivia-connor", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/celebrations", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/shop", priority: 0.5, changeFrequency: "weekly" as const },
    // One entry per farm-store product, derived from the live catalog
    // (`src/app/shop/data.ts`) so the sitemap can't drift from what's
    // actually buyable. Stock/price changes don't need a new sitemap entry —
    // only new/removed products do, so "weekly" here tracks the catalog,
    // not per-item availability.
    ...PRODUCTS.map((product) => ({
      path: `/shop/${product.slug}`,
      priority: 0.5,
      changeFrequency: "weekly" as const,
    })),
    { path: "/stay/camp", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/accessibility", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
    // Canonical wedding look book PDF. The only canonical URL is
    // https://highlandfarmsoregon.com/lookbook.pdf — never a
    // Squarespace-hosted copy (those paths regenerate and 404).
    { path: "/lookbook.pdf", priority: 0.5, changeFrequency: "monthly" as const },
    ...(nativeCalendarEnabled()
      ? [
          { path: "/wedding-call", priority: 0.6, changeFrequency: "monthly" as const },
          { path: "/gift-certificates", priority: 0.6, changeFrequency: "monthly" as const },
        ]
      : []),
  ];

  return routes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
