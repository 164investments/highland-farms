import type { NavItem } from "@/lib/types";
import { nativeCalendarEnabled, giftCertificatesHref } from "@/lib/booking/flag";

export const mainNavItems: NavItem[] = [
  {
    label: "Weddings",
    href: "/weddings",
    children: [
      { label: "Wedding Info", href: "/weddings" },
      { label: "Wedding Portfolio", href: "/wedding-portfolio" },
    ],
  },
  { label: "Farm Tours", href: "/farm-tours" },
  { label: "Nordic Spa", href: "/nordic-spa" },
  { label: "Stays", href: "/stay" },
  { label: "Celebrations", href: "/celebrations" },
  { label: "About", href: "/about" },
  {
    label: "Shop",
    href: "/shop",
    children: [
      { label: "Farm Store", href: "/shop" },
      {
        label: "Gift Certificates",
        href: giftCertificatesHref(),
        external: !nativeCalendarEnabled(),
      },
    ],
  },
];
