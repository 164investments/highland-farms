"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Phone, Mail, Instagram } from "lucide-react";
import { mainNavItems } from "@/data/navigation";
import { CONTACT } from "@/lib/constants";

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
      className="fixed inset-0 z-50 bg-warm-white"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      ref={menuRef}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <Link href="/" onClick={onClose} className="inline-flex items-center gap-2">
            <Image
              src="/images/logo/HF-Lettermark.png"
              alt="Highland Farms"
              width={36}
              height={21}
              className="h-5 w-auto"
            />
            <span className="text-lg font-normal font-logo">
              Highland Farms
            </span>
          </Link>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-3 -mr-1 hover:opacity-70 transition-opacity"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-6 pt-2 pb-4" aria-label="Mobile navigation">
          <ul className="space-y-0">
            {mainNavItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="block py-3.5 text-lg font-normal text-charcoal hover:text-forest transition-colors border-b border-cream-dark/20 font-display"
                >
                  {item.label}
                </Link>
                {item.children && (
                  <ul className="pl-4">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        {child.external ? (
                          <a
                            href={child.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onClose}
                            className="block py-2.5 text-sm text-muted font-light hover:text-forest transition-colors font-sans"
                          >
                            {child.label}
                          </a>
                        ) : (
                          <Link
                            href={child.href}
                            onClick={onClose}
                            className="block py-2.5 text-sm text-muted font-light hover:text-forest transition-colors font-sans"
                          >
                            {child.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}

            {/* Contact as a nav item */}
            <li>
              <Link
                href="/contact"
                onClick={onClose}
                className="block py-3.5 text-lg font-normal text-forest hover:text-forest-light transition-colors font-display"
              >
                Get in Touch
              </Link>
            </li>
          </ul>
        </nav>

        {/* Footer with contact info */}
        <div className="border-t border-cream-dark/20 px-6 py-5 space-y-3">
          <div className="flex items-center gap-3">
            <a
              href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-2 text-sm text-charcoal/70 hover:text-forest transition-colors font-sans font-light"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {CONTACT.phone}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`mailto:${CONTACT.email}`}
              className="flex items-center gap-2 text-sm text-charcoal/70 hover:text-forest transition-colors font-sans font-light"
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
              className="flex items-center gap-2 text-sm text-charcoal/70 hover:text-forest transition-colors font-sans font-light"
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
