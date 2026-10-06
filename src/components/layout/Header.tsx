"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { mainNavItems } from "@/data/navigation";
import { MobileMenu } from "./MobileMenu";
import { AnnouncementBar } from "./AnnouncementBar";
import { CHECK_DATE_HREF, MastheadCheckDate, MastheadLogo } from "./Masthead";

function isCurrent(pathname: string, href: string): boolean {
  if (href.startsWith("http")) return false;
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

/**
 * The paper masthead (Field Guide, approved 2026-10-06), on every page.
 *
 * Solid from the first server render: no transparent-over-photo mode, so the
 * nav is never white text on a light page. Below xl the phone layout (menu,
 * lettermark, "Check date"); from xl the full nav. Seven nav items do not fit
 * a third of a 1024-1279px row, so the full nav waits for xl.
 *
 * Heights are fixed (60px, 84px from xl, including the 3px double rule) and
 * mirrored by the static --header-h defaults in globals.css, which the
 * ResizeObserver below then keeps exact.
 */
export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function updateHeight() {
      if (headerRef.current) {
        const h = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty("--header-h", `${h}px`);
      }
    }
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    if (headerRef.current) observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-40">
        <AnnouncementBar />

        <header className="surface-paper h-[60px] border-b-[3px] border-double border-frame bg-paper text-ink xl:h-[84px]">
          <div className="mx-auto grid h-full max-w-[1440px] grid-cols-3 items-center pl-1.5 pr-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:px-10 min-[90rem]:px-16">
            {/* Left: menu (phone, tablet) or the full nav (xl) */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-11 w-11 items-center justify-center text-ink xl:hidden"
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                aria-haspopup="dialog"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>

              <nav
                aria-label="Main"
                className="hidden items-center gap-[14px] font-sans text-[13px] tracking-[0.04em] xl:flex min-[90rem]:gap-[22px]"
              >
                {mainNavItems.map((item) => (
                  <div key={item.href} className="group relative">
                    <Link
                      href={item.href}
                      aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                      className="flex min-h-11 items-center gap-1 whitespace-nowrap text-ink transition-colors hover:text-pine"
                    >
                      {item.label}
                      {item.children && (
                        <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
                      )}
                    </Link>

                    {item.children && (
                      <div className="invisible absolute left-0 top-full z-10 pt-[21px] opacity-0 transition-opacity duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                        <ul className="min-w-[190px] border border-t-0 border-rule bg-paper-light py-2">
                          {item.children.map((child) => (
                            <li key={child.href}>
                              {child.external ? (
                                <a
                                  href={child.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block px-4 py-2.5 text-[13px] text-ink transition-colors hover:bg-paper hover:text-pine"
                                >
                                  {child.label}
                                </a>
                              ) : (
                                <Link
                                  href={child.href}
                                  aria-current={pathname === child.href ? "page" : undefined}
                                  className="block px-4 py-2.5 text-[13px] text-ink transition-colors hover:bg-paper hover:text-pine"
                                >
                                  {child.label}
                                </Link>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>

            <MastheadLogo />

            {/* Right: "Check date" (phone, tablet) or the square CTA (xl) */}
            <div className="flex justify-end">
              <div className="xl:hidden">
                <MastheadCheckDate />
              </div>
              <Link
                href={CHECK_DATE_HREF}
                className="hidden h-10 items-center bg-pine px-[18px] font-sans text-xs font-semibold uppercase tracking-[0.14em] text-paper-light transition-colors hover:bg-pine-dark xl:flex"
              >
                Check your date
              </Link>
            </div>
          </div>
        </header>
      </div>

      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
