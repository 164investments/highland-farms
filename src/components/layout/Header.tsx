"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/shop/cart";
import { giftCertificatesHref } from "@/lib/booking/flag";
import { MobileMenu } from "./MobileMenu";
import { AnnouncementBar } from "./AnnouncementBar";
import { MastheadAction, MastheadCart, MastheadName, MenuIcon } from "./Masthead";
import { isQuietChrome, pageActionFor, pageTypeFor, type MenuFacts } from "./chrome";

function isCurrent(pathname: string, href: string): boolean {
  if (!href.startsWith("/")) return false;
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

const NAV_LEFT = [
  { label: "Weddings", href: "/weddings" },
  { label: "Real weddings", href: "/wedding-portfolio" },
  { label: "Farm tours", href: "/farm-tours" },
  { label: "Nordic spa", href: "/nordic-spa" },
];

const NAV_LINK =
  "flex min-h-11 items-center whitespace-nowrap font-sans text-[13px] tracking-[0.03em] text-ink decoration-1 underline-offset-[7px] transition-colors hover:text-pine aria-[current=page]:underline";

/**
 * The paper masthead (Field Guide, round 2), on every page.
 *
 * Lockup B in the centre: the name in words on every page and screen size.
 * Left: the menu (below xl) or Weddings · Real weddings · Farm tours ·
 * Nordic spa (xl). Right: Stays · Shop · Gifts (xl) and the page's own
 * action (chrome.ts). Four and four, so the name sits between two groups of
 * about the same width (Hayden 2026-10-08: five on the left crowded the name). Weddings come first; About, Celebrations and Contact
 * live in the menu and footer.
 *
 * Heights are fixed: the bar (when the page has one; --bar-h, 40px or 44px
 * on touch screens) plus the name row, 60px or 96px from xl, 3px double rule
 * included. The --header-h defaults in globals.css mirror them and the
 * ResizeObserver below keeps them exact. Past 40px of scroll the whole
 * masthead moves up by the bar's height, so the bar scrolls away and the
 * name row stays pinned; pages keep their padding.
 *
 * Checkout gets the quiet variant: the name, a way back to the cart, and
 * "Secure". No bar, no nav, no menu.
 */
/** `menuFacts` come from the server layout: the review snapshot and portfolio must not ship to the client. */
export function Header({ menuFacts }: { menuFacts: MenuFacts }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname() ?? "";
  const type = pageTypeFor(pathname);
  const action = pageActionFor(type);
  const { count } = useCart();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function updateHeight() {
      if (wrap.current) {
        document.documentElement.style.setProperty("--header-h", `${wrap.current.offsetHeight}px`);
      }
    }
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    if (wrap.current) observer.observe(wrap.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (type === "checkout") {
    return (
      <div ref={wrap} data-masthead={type} className="fixed inset-x-0 top-0 z-40">
        <AnnouncementBar type={type} />
        <header className="surface-paper border-b-[3px] border-double border-frame bg-paper px-3 text-ink lg:px-16">
          <div className="mx-auto grid h-[60px] max-w-[1180px] grid-cols-[1fr_auto_1fr] items-center gap-x-2 lg:h-[84px]">
            <Link
              href="/shop/cart"
              className="flex min-h-11 items-center gap-1.5 justify-self-start font-sans text-[13px] text-ink-note transition-colors hover:text-pine"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <path d="M19 12H5M11 18l-6-6 6-6" />
              </svg>
              Cart
            </Link>
            <MastheadName size="checkout" />
            <p className="m-0 flex items-center gap-1.5 justify-self-end font-sans text-[12px] font-medium text-fern">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <rect x="5" y="11" width="14" height="10" rx="1" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <span className="max-[374px]:sr-only">Secure</span>
            </p>
          </div>
        </header>
      </div>
    );
  }

  const quiet = isQuietChrome(type);

  return (
    <>
      <div
        ref={wrap}
        data-masthead={type}
        data-scrolled={scrolled ? "" : undefined}
        className="fixed inset-x-0 top-0 z-40 transition-transform duration-300"
      >
        <AnnouncementBar type={type} />

        <header className="surface-paper border-b-[3px] border-double border-frame bg-paper text-ink">
          {/* Centre column = the name. Side tracks stay `1fr` (not minmax(0,1fr)): when a label is too
              long to fit beside a centred name, the name moves over instead of colliding with it. The
              sizes in Masthead.tsx keep that from happening from 374px up; padding is symmetric. */}
          <div className="mx-auto grid h-[60px] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-x-3 px-1.5 xl:h-[96px] xl:px-16">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex h-11 w-11 items-center justify-center text-ink transition-opacity hover:opacity-70 xl:hidden"
                aria-label="Open menu"
                aria-expanded={menuOpen}
                aria-haspopup="dialog"
              >
                <MenuIcon />
              </button>
              <nav aria-label="Main" className="hidden items-center gap-[26px] xl:flex">
                {NAV_LEFT.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                    className={NAV_LINK}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <MastheadName />

            <div className="flex items-center justify-self-end xl:gap-[26px]">
              <Link
                href="/stay"
                aria-current={isCurrent(pathname, "/stay") ? "page" : undefined}
                className={`hidden xl:flex ${NAV_LINK}`}
              >
                Stays
              </Link>
              <Link
                href="/shop"
                aria-current={isCurrent(pathname, "/shop") ? "page" : undefined}
                className={`hidden xl:flex ${NAV_LINK}`}
              >
                Shop
              </Link>
              <GiftsNavLink pathname={pathname} />
              {!quiet && action === "cart" && <MastheadCart count={count} />}
              {!quiet && action && action !== "cart" && <MastheadAction action={action} />}
            </div>
          </div>
        </header>
      </div>

      <MobileMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        type={type}
        pathname={pathname}
        facts={menuFacts}
      />
    </>
  );
}

function GiftsNavLink({ pathname }: { pathname: string }) {
  const href = giftCertificatesHref();
  if (href.startsWith("/")) {
    return (
      <Link
        href={href}
        aria-current={isCurrent(pathname, href) ? "page" : undefined}
        className={`hidden xl:flex ${NAV_LINK}`}
      >
        Gifts
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`hidden xl:flex ${NAV_LINK}`}>
      Gifts
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
