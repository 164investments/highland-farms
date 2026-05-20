"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, Instagram, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { mainNavItems } from "@/data/navigation";
import { CONTACT } from "@/lib/constants";
import { MobileMenu } from "./MobileMenu";
import { AnnouncementBar } from "./AnnouncementBar";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

        <header
          className={cn(
            "transition-all duration-500",
            scrolled
              ? "bg-white/95 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.04)]"
              : "bg-gradient-to-b from-black/40 to-transparent"
          )}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between lg:h-18">
              {/* Logo */}
              <Link
                href="/"
                className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
              >
                <Image
                  src="/images/logo/HF-logo-white.png"
                  alt="Highland Farms"
                  width={44}
                  height={26}
                  className={cn(
                    "h-6 w-auto transition-all duration-500",
                    scrolled ? "brightness-0 opacity-70" : ""
                  )}
                  priority
                />
                <span
                  className={cn(
                    "text-lg sm:text-xl font-normal transition-colors font-logo",
                    scrolled ? "text-charcoal" : "text-white"
                  )}
                >
                  Highland Farms
                </span>
              </Link>

              {/* Desktop nav */}
              <nav className="hidden lg:flex items-center gap-0.5">
                {mainNavItems.map((item) => (
                  <div key={item.href} className="relative group">
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-1 px-3.5 py-2 text-xs font-light tracking-[0.12em] uppercase transition-colors font-sans",
                        scrolled
                          ? "text-charcoal/70 hover:text-charcoal"
                          : "text-white/90 hover:text-white"
                      )}
                    >
                      {item.label}
                      {item.children && <ChevronDown className="h-3 w-3 opacity-50" />}
                    </Link>

                    {item.children && (
                      <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-black/5 py-2 min-w-[180px]">
                          {item.children.map((child) =>
                            child.external ? (
                              <a
                                key={child.href}
                                href={child.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block px-4 py-2 text-xs tracking-wide text-charcoal/70 hover:text-forest hover:bg-sage/5 transition-colors font-sans"
                              >
                                {child.label}
                              </a>
                            ) : (
                              <Link
                                key={child.href}
                                href={child.href}
                                className="block px-4 py-2 text-xs tracking-wide text-charcoal/70 hover:text-forest hover:bg-sage/5 transition-colors font-sans"
                              >
                                {child.label}
                              </Link>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <a
                  href={CONTACT.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "ml-2 p-2 transition-colors",
                    scrolled
                      ? "text-charcoal/60 hover:text-charcoal"
                      : "text-white/80 hover:text-white"
                  )}
                  aria-label="Follow us on Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>

                <Link
                  href="/contact"
                  className="ml-3 inline-flex items-center justify-center rounded-full border border-white/50 bg-white/10 backdrop-blur-sm px-5 py-2 text-xs font-light tracking-[0.12em] uppercase text-white transition-all hover:bg-white/20 hover:border-white/70"
                  style={scrolled ? { borderColor: 'rgba(74,103,65,0.3)', backgroundColor: 'rgba(74,103,65,0.05)', color: '#4A6741' } : {}}
                >
                  Inquire
                </Link>
              </nav>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(true)}
                className={cn(
                  "lg:hidden p-2 transition-colors",
                  scrolled ? "text-charcoal" : "text-white"
                )}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>
      </div>

      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
