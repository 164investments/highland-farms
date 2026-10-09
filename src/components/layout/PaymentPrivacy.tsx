"use client";

import { usePathname } from "next/navigation";

/** A hosted-checkout return URL is a receipt capability. Keep analytics,
 * replay, CRM and chat scripts off this document, including noscript tags. */
export function PaymentPrivacy({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith("/payments/") ? null : children;
}
