"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { X, Phone, Mail, Instagram } from "lucide-react";
import { mainNavItems } from "@/data/navigation";
import { CONTACT } from "@/lib/constants";
import { giftCertificatesHref, nativeCalendarEnabled } from "@/lib/booking/flag";
import { MastheadCheckDate, MastheadLogo } from "./Masthead";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="surface-paper fixed inset-0 z-50 bg-paper text-ink"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      ref={menuRef}
    >
      <div className="flex h-full flex-col">
        {/* Mirrors the masthead: close where the menu button was, lettermark, Check date */}
        <div className="grid h-[60px] shrink-0 grid-cols-3 items-center border-b-[3px] border-double border-frame pl-1.5 pr-3">
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center text-ink transition-opacity hover:opacity-70"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />
          </button>
          <MastheadLogo onClick={onClose} />
          <MastheadCheckDate onClick={onClose} />
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-6 pt-2 pb-4" aria-label="Mobile navigation">
          <ul className="space-y-0">
            {mainNavItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="block py-3.5 text-xl font-medium text-ink hover:text-pine transition-colors border-b border-rule font-display"
                >
                  {item.label}
                </Link>
                {item.children && (
                  <ul className="pl-4">
                    {item.children
                      .filter((child) => child.label !== "Gift Certificates")
                      .map((child) => (
                      <li key={child.href}>
                        {child.external ? (
                          <a
                            href={child.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onClose}
                            className="block py-2.5 text-sm text-ink-body hover:text-pine transition-colors font-sans"
                          >
                            {child.label}
                          </a>
                        ) : (
                          <Link
                            href={child.href}
                            onClick={onClose}
                            className="block py-2.5 text-sm text-ink-body hover:text-pine transition-colors font-sans"
                          >
                            {child.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {item.href === "/shop" && (
                  <a
                    href={giftCertificatesHref()}
                    {...(nativeCalendarEnabled()
                      ? {}
                      : { target: "_blank", rel: "noopener noreferrer" })}
                    onClick={onClose}
                    className="block py-3.5 text-xl font-medium text-ink hover:text-pine transition-colors border-b border-rule font-display"
                  >
                    Gift Certificates
                  </a>
                )}
              </li>
            ))}

            {/* Contact as a nav item */}
            <li>
              <Link
                href="/contact"
                onClick={onClose}
                className="block py-3.5 text-xl font-medium text-pine hover:text-pine-dark transition-colors font-display"
              >
                Get in Touch
              </Link>
            </li>
          </ul>
        </nav>

        {/* Footer with contact info */}
        <div className="border-t border-rule px-6 py-5 space-y-3">
          <div className="flex items-center gap-3">
            <a
              href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
              className="flex min-h-11 items-center gap-2 text-sm text-ink-body hover:text-pine transition-colors font-sans"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {CONTACT.phone}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`mailto:${CONTACT.email}`}
              className="flex min-h-11 items-center gap-2 text-sm text-ink-body hover:text-pine transition-colors font-sans"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {CONTACT.email}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={CONTACT.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-2 text-sm text-ink-body hover:text-pine transition-colors font-sans"
            >
              <Instagram className="h-3.5 w-3.5 shrink-0" />
              {CONTACT.instagramHandle}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
