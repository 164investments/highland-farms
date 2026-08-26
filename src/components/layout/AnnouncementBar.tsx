"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Truck } from "lucide-react";
import { BOOKING_LINKS, bookingUrl } from "@/lib/constants";
import { appendAttributionToUrl, getClientAttribution } from "@/lib/attribution";

type Variant = {
  id: string;
  layout: "shop" | "single";
  body: ReactNode;
};

function AnnouncementBookingLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={(event) => {
        event.currentTarget.href = appendAttributionToUrl(href, getClientAttribution());
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: "booking_start",
          booking_url: event.currentTarget.href,
          booking_title: typeof children === "string" ? children : undefined,
        });
      }}
      className="underline underline-offset-4 decoration-gold/70 hover:decoration-gold transition-colors ml-1"
    >
      {children}
    </a>
  );
}

const SHOP: Variant = {
  id: "hf-shop-promo-dismissed",
  layout: "shop",
  body: (
    <>
      <span className="inline-flex items-center gap-1.5">
        <Truck className="h-3.5 w-3.5" aria-hidden />
        Free farm pickup in Brightwood, Oregon
      </span>
      <span aria-hidden className="hidden sm:inline opacity-50">·</span>
      <span className="hidden sm:inline">Local delivery available</span>
      <span aria-hidden className="hidden sm:inline opacity-50">·</span>
      <span className="hidden sm:inline">Pasture-raised &amp; family-run since 2019</span>
      <Link
        href="/shop#cat-featured"
        className="underline underline-offset-4 decoration-gold/70 hover:decoration-gold transition-colors"
      >
        Shop Bestsellers
      </Link>
    </>
  ),
};

const FARM_TOURS: Variant = {
  id: "hf-bar-farm-tours-2026-05",
  layout: "single",
  body: (
    <>
      Meet the Highland Coos &middot; Private Farm Tours &middot; 60 Min From $150{" "}
      <AnnouncementBookingLink
        href={bookingUrl(BOOKING_LINKS.farmTour, "announcement-bar-farm-tours")}
      >
        Book Your Tour
      </AnnouncementBookingLink>
    </>
  ),
};

const NORDIC_SPA: Variant = {
  id: "hf-bar-nordic-spa-2026-05",
  layout: "single",
  body: (
    <>
      Nordic Sauna + Cold Plunge &middot; 90 Min From $75 &middot; Weekends Fill Fast{" "}
      <AnnouncementBookingLink
        href={bookingUrl(BOOKING_LINKS.nordicSpa, "announcement-bar-nordic-spa")}
      >
        Reserve Your Session
      </AnnouncementBookingLink>
    </>
  ),
};

const SAUNA_NEAR_PDX: Variant = {
  id: "hf-bar-sauna-near-pdx-2026-05",
  layout: "single",
  body: (
    <>
      50 Minutes From Portland &middot; Forest Sauna + Cold Plunge &middot; From $75{" "}
      <AnnouncementBookingLink
        href={bookingUrl(BOOKING_LINKS.nordicSpa, "announcement-bar-sauna-near-portland")}
      >
        Reserve Your Session
      </AnnouncementBookingLink>
    </>
  ),
};

const WEDDINGS: Variant = {
  id: "hf-bar-weddings-2027-2026-05",
  layout: "single",
  body: (
    <>
      All-Inclusive Forest Weddings &middot; 2027 Summer &amp; Fall Dates Filling Fast{" "}
      <Link
        href="/weddings#contact"
        className="underline underline-offset-4 decoration-gold/70 hover:decoration-gold transition-colors ml-1"
      >
        Schedule a Tour
      </Link>
    </>
  ),
};

const CELEBRATIONS: Variant = {
  id: "hf-bar-celebrations-2026-05",
  layout: "single",
  body: (
    <>
      Anniversaries &middot; Birthdays &middot; Family Gatherings at Mt. Hood{" "}
      <Link
        href="/contact"
        className="underline underline-offset-4 decoration-gold/70 hover:decoration-gold transition-colors ml-1"
      >
        Inquire
      </Link>
    </>
  ),
};

const STAY: Variant = {
  id: "hf-bar-stay-2026-05",
  layout: "single",
  body: (
    <>
      William Wallace Lodge &amp; Bonnie Lass Cottage &middot; Up to 16 Guests{" "}
      <Link
        href="/stay"
        className="underline underline-offset-4 decoration-gold/70 hover:decoration-gold transition-colors ml-1"
      >
        Plan Your Stay
      </Link>
    </>
  ),
};

const DEFAULT: Variant = {
  id: "hf-bar-default-weddings-2027-2026-05",
  layout: "single",
  body: (
    <>
      Forest Weddings &middot; 2027 Summer &amp; Fall Dates Filling Fast{" "}
      <Link
        href="/weddings"
        className="underline underline-offset-4 decoration-gold/70 hover:decoration-gold transition-colors ml-1"
      >
        Inquire
      </Link>
    </>
  ),
};

function pickVariant(pathname: string | null): Variant {
  if (!pathname) return DEFAULT;
  if (pathname.startsWith("/shop")) return SHOP;
  if (pathname.startsWith("/farm-tours")) return FARM_TOURS;
  if (pathname.startsWith("/sauna-near-portland")) return SAUNA_NEAR_PDX;
  if (pathname.startsWith("/nordic-spa")) return NORDIC_SPA;
  if (pathname.startsWith("/weddings") || pathname.startsWith("/wedding-portfolio")) return WEDDINGS;
  if (pathname.startsWith("/celebrations")) return CELEBRATIONS;
  if (pathname.startsWith("/stay")) return STAY;
  return DEFAULT;
}

export function AnnouncementBar() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const variant = pickVariant(pathname);

  useEffect(() => {
    const dismissed = localStorage.getItem(variant.id);
    queueMicrotask(() => setVisible(!dismissed));
  }, [variant.id]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(variant.id, "true");
  }

  // Checkout and cart get no announcement bar: its CTA is a competing link out
  // of the one page whose only job is finishing the order. Same reasoning the
  // floating cart button uses to hide itself there.
  if (pathname === "/shop/checkout" || pathname === "/shop/cart") return null;

  if (!visible) return null;

  if (variant.layout === "shop") {
    return (
      <div className="relative bg-charcoal/90 backdrop-blur-sm text-white text-center text-[0.6875rem] py-2.5 px-12 sm:px-10 sm:text-xs">
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-light tracking-[0.1em] uppercase font-sans sm:gap-x-5 sm:tracking-[0.14em]">
          {variant.body}
        </p>
        <button
          onClick={dismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 hover:opacity-70 transition-opacity"
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative bg-charcoal/90 backdrop-blur-sm text-white text-center text-xs py-2.5 px-12 sm:px-10">
      <p className="font-light tracking-[0.1em] sm:tracking-[0.15em] uppercase font-sans">
        {variant.body}
      </p>
      <button
        onClick={dismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 hover:opacity-70 transition-opacity"
        aria-label="Dismiss announcement"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
