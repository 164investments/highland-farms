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
  title,
  children,
}: {
  href: string;
  title: string;
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
          booking_title: title,
        });
      }}
      className={LINK_CLASS}
    >
      {children}
    </a>
  );
}

const LINK_CLASS =
  "ml-1 shrink-0 whitespace-nowrap underline underline-offset-4 decoration-gold/70 hover:decoration-gold transition-colors";

// Every variant is ONE line: a short message, a short link label, and the
// longer wording only from lg up (xl for the shop strip). The message span
// truncates; the link never shrinks, so the CTA is always visible. The header
// height (--header-h in globals.css) assumes a single 44px line.
const Msg = ({ children }: { children: ReactNode }) => (
  <span className="min-w-0 truncate">{children}</span>
);

const SHOP: Variant = {
  id: "hf-shop-promo-dismissed",
  layout: "shop",
  body: (
    <>
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <Truck className="h-3.5 w-3.5" aria-hidden />
        Free farm pickup<span className="hidden xl:inline">&nbsp;in Brightwood, Oregon</span>
      </span>
      <span aria-hidden className="hidden xl:inline opacity-50">·</span>
      <span className="hidden xl:inline">Local delivery available</span>
      <span aria-hidden className="hidden xl:inline opacity-50">·</span>
      <span className="hidden xl:inline">Pasture-raised &amp; family-run since 2019</span>
      <Link
        href="/shop#cat-featured"
        className="shrink-0 whitespace-nowrap underline underline-offset-4 decoration-gold/70 hover:decoration-gold transition-colors"
      >
        Shop Bestsellers
      </Link>
    </>
  ),
};

const FARM_TOURS: Variant = {
  id: "hf-bar-farm-tours-2026-10",
  layout: "single",
  body: (
    <>
      <Msg>
        <span className="hidden lg:inline">Meet the Highland Coos &middot; </span>
        Private farm tours &middot; $150 for two
      </Msg>
      <AnnouncementBookingLink
        href={bookingUrl(BOOKING_LINKS.farmTourForTwo, "announcement-bar-farm-tours")}
        title="Announcement bar: book a farm tour"
      >
        Book<span className="hidden lg:inline">&nbsp;Your Tour</span>
      </AnnouncementBookingLink>
    </>
  ),
};

const NORDIC_SPA: Variant = {
  id: "hf-bar-nordic-spa-2026-10",
  layout: "single",
  body: (
    <>
      <Msg>
        Sauna + cold plunge &middot; from $75
        <span className="hidden lg:inline"> &middot; 90 min &middot; Weekends go first</span>
      </Msg>
      <AnnouncementBookingLink
        href={bookingUrl(BOOKING_LINKS.nordicSpa, "announcement-bar-nordic-spa")}
        title="Announcement bar: reserve a spa session"
      >
        Reserve<span className="hidden lg:inline">&nbsp;Your Session</span>
      </AnnouncementBookingLink>
    </>
  ),
};

const SAUNA_NEAR_PDX: Variant = {
  id: "hf-bar-sauna-near-pdx-2026-10b",
  layout: "single",
  body: (
    <>
      <Msg>
        <span className="hidden lg:inline">About an Hour From Portland &middot; </span>
        <span className="lg:hidden">Forest sauna &middot; from $75</span>
        <span className="hidden lg:inline">Forest sauna + cold plunge &middot; from $75</span>
      </Msg>
      <AnnouncementBookingLink
        href={bookingUrl(BOOKING_LINKS.nordicSpa, "announcement-bar-sauna-near-portland")}
        title="Announcement bar: reserve a sauna session"
      >
        Reserve<span className="hidden lg:inline">&nbsp;Your Session</span>
      </AnnouncementBookingLink>
    </>
  ),
};

const WEDDINGS: Variant = {
  id: "hf-bar-weddings-2027-2026-10b",
  layout: "single",
  body: (
    <>
      <Msg>
        <span className="hidden lg:inline">All-Inclusive Forest Weddings &middot; </span>
        Now booking 2027<span className="lg:hidden"> weddings</span>
      </Msg>
      <Link href="/weddings#contact" className={LINK_CLASS}>
        Check<span className="hidden lg:inline">&nbsp;your date</span>
      </Link>
    </>
  ),
};

const CELEBRATIONS: Variant = {
  id: "hf-bar-celebrations-2026-10",
  layout: "single",
  body: (
    <>
      <Msg>
        <span className="hidden lg:inline">Anniversaries &middot; Birthdays &middot; </span>
        Family gatherings at Mt. Hood
      </Msg>
      <Link href="/contact" className={LINK_CLASS}>
        Inquire
      </Link>
    </>
  ),
};

const STAY: Variant = {
  id: "hf-bar-stay-2026-10",
  layout: "single",
  body: (
    <>
      <Msg>
        <span className="hidden lg:inline">William Wallace Lodge, Bonnie Lass Cottage &amp; The Camp</span>
        <span className="lg:hidden">Farm stays</span> &middot; Up to 20 guests
      </Msg>
      <Link href="/stay" className={LINK_CLASS}>
        <span className="lg:hidden">See stays</span>
        <span className="hidden lg:inline">Plan Your Stay</span>
      </Link>
    </>
  ),
};

const DEFAULT: Variant = {
  id: "hf-bar-default-weddings-2027-2026-10b",
  layout: "single",
  body: (
    <>
      <Msg>
        <span className="hidden lg:inline">Forest Weddings &middot; </span>
        Now booking 2027<span className="lg:hidden"> weddings</span>
      </Msg>
      <Link href="/weddings" className={LINK_CLASS}>
        Inquire
      </Link>
    </>
  ),
};

const THANKSGIVING: Variant = {
  id: "hf-bar-thanksgiving-2026",
  layout: "single",
  body: (
    <>
      <Msg>
        Thanksgiving on the farm<span className="hidden lg:inline"> &middot; November 24–28, 2026</span>
      </Msg>
      <Link href="/thanksgiving#packages" className={LINK_CLASS}>
        See Packages
      </Link>
    </>
  ),
};

function pickVariant(pathname: string | null): Variant {
  if (!pathname) return DEFAULT;
  if (pathname === "/thanksgiving") return THANKSGIVING;
  if (pathname.startsWith("/shop")) return SHOP;
  if (pathname.startsWith("/farm-tours")) return FARM_TOURS;
  if (pathname.startsWith("/sauna-near-portland")) return SAUNA_NEAR_PDX;
  if (pathname.startsWith("/nordic-spa")) return NORDIC_SPA;
  if (pathname.startsWith("/weddings") || pathname.startsWith("/wedding-portfolio")) return WEDDINGS;
  if (pathname.startsWith("/celebrations")) return CELEBRATIONS;
  if (pathname.startsWith("/stay")) return STAY;
  return DEFAULT;
}

const HIDE_ATTR = "data-bar-hidden";

function setBarHidden(hidden: boolean) {
  const el = document.documentElement;
  if (hidden) el.setAttribute(HIDE_ATTR, "1");
  else el.removeAttribute(HIDE_ATTR);
}

export function AnnouncementBar() {
  // Rendered on the server (visible by default) so the header height is right
  // in the first paint. A visitor who dismissed this variant gets it hidden by
  // the inline script below before first paint; the effect then syncs state.
  const [visible, setVisible] = useState(true);
  const pathname = usePathname();
  const variant = pickVariant(pathname);
  // Checkout and cart get no announcement bar: its CTA is a competing link out
  // of the one page whose only job is finishing the order.
  const suppressed = pathname === "/shop/checkout" || pathname === "/shop/cart";

  useEffect(() => {
    if (suppressed) {
      setBarHidden(true);
      return;
    }
    let dismissed = false;
    try {
      dismissed = !!localStorage.getItem(variant.id);
    } catch {}
    queueMicrotask(() => setVisible(!dismissed));
    setBarHidden(dismissed);
  }, [variant.id, suppressed]);

  function dismiss() {
    setVisible(false);
    setBarHidden(true);
    try {
      localStorage.setItem(variant.id, "true");
    } catch {}
  }

  if (suppressed) {
    return (
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.setAttribute("${HIDE_ATTR}","1")`,
        }}
      />
    );
  }

  if (!visible) return null;

  const script = `try{if(localStorage.getItem(${JSON.stringify(variant.id)}))document.documentElement.setAttribute("${HIDE_ATTR}","1")}catch(e){}`;
  const barClass =
    "relative flex h-11 items-center justify-center bg-charcoal/90 backdrop-blur-sm text-white text-center";

  return (
    <>
      <div
        data-announcement-bar
        className={
          variant.layout === "shop"
            ? `${barClass} text-[0.6875rem] pl-3 pr-12 sm:px-12 sm:text-xs`
            : `${barClass} text-[0.6875rem] pl-3 pr-12 sm:px-12 sm:text-xs`
        }
      >
        <p
          className={
            variant.layout === "shop"
              ? "flex min-w-0 max-w-full items-center justify-center gap-x-3 whitespace-nowrap overflow-hidden font-light tracking-[0.06em] uppercase font-sans sm:gap-x-5 sm:tracking-[0.14em]"
              : "flex min-w-0 max-w-full items-center justify-center whitespace-nowrap font-light tracking-[0.06em] sm:tracking-[0.15em] uppercase font-sans"
          }
        >
          {variant.body}
        </p>
        <button
          onClick={dismiss}
          className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center hover:opacity-70 transition-opacity"
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </>
  );
}
