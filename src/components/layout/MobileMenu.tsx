"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CONTACT } from "@/lib/constants";
import { useCart } from "@/lib/shop/cart";
import { FieldArrow, FieldDoorInner, fieldDoorRowClass, fieldEyebrowClass } from "@/components/ui/FieldGuide";
import { WeddingCallLink } from "@/components/field/WeddingCallLink";
import { MastheadMark, MastheadName, MenuIcon } from "./Masthead";
import {
  LOOKBOOK_DOOR,
  MORE_LINKS,
  isQuietChrome,
  menuSecondaryFor,
  pageActionFor,
  visitDoors,
  weddingDoors,
  type ChromeDoor,
  type PageType,
} from "./chrome";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  type: PageType;
  pathname: string;
}

const TEL = `tel:+1${CONTACT.phone.replace(/\D/g, "")}`;

/** Weddings, Real weddings, 2027 look book, Call with Connor (Round 2b, same rows as the footer). */
function withLookbook(doors: ChromeDoor[]): ChromeDoor[] {
  const rows = [...doors];
  rows.splice(2, 0, LOOKBOOK_DOOR);
  return rows;
}

function Door({ door, pathname, onClose }: { door: ChromeDoor; pathname: string; onClose: () => void }) {
  const current = door.current?.(pathname) ?? false;
  const inner = <FieldDoorInner title={door.title} note={door.note} current={current} />;
  const className = fieldDoorRowClass("lg");
  if (door.weddingCall) {
    return (
      <WeddingCallLink content="menu-call" title="Menu: wedding call" className={className}>
        {inner}
      </WeddingCallLink>
    );
  }
  if (door.external) {
    return (
      <a href={door.href} target="_blank" rel="noopener noreferrer" onClick={onClose} className={className}>
        {inner}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={door.href} onClick={onClose} aria-current={current ? "page" : undefined} className={className}>
      {inner}
    </Link>
  );
}

/**
 * The menu sheet (shared board 3, round 2): a page of the field guide.
 * The top row is the close button and the name. Weddings first, then the
 * visits with their price hints (from the data files), then the short links,
 * the one public phone line, Instagram and the lettermark with the address.
 * The page's own action is pinned at the bottom, at the thumb.
 */
export function MobileMenu({ isOpen, onClose, type, pathname }: MobileMenuProps) {
  const sheet = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const { count } = useCart();

  // Scroll lock, focus, and <html data-sheet-open> (hides the chat launcher).
  useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    html.setAttribute("data-sheet-open", "");
    const t = window.setTimeout(() => closeButton.current?.focus(), 30);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = "";
      html.removeAttribute("data-sheet-open");
      previous?.focus?.();
    };
  }, [isOpen]);

  // Escape closes; Tab stays inside the sheet.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !sheet.current) return;
      const focusable = sheet.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Close when the route changes underneath (a door was followed).
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname && isOpen) onClose();
    lastPath.current = pathname;
  }, [pathname, isOpen, onClose]);

  if (!isOpen) return null;

  const action = pageActionFor(type);
  const secondary = menuSecondaryFor(type);
  const quiet = isQuietChrome(type);

  return (
    <div
      ref={sheet}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="surface-paper fixed inset-0 z-50 flex h-dvh flex-col bg-paper font-sans text-ink"
    >
      <div className="grid h-[60px] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-x-3 border-b-[3px] border-double border-frame pl-1.5 pr-3">
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="flex h-11 w-11 items-center justify-center text-ink transition-opacity hover:opacity-70"
        >
          <MenuIcon open />
        </button>
        <MastheadName onClick={onClose} />
        <span aria-hidden="true" />
      </div>

      <nav aria-label="Menu" className="flex-1 overflow-y-auto px-5 pb-8">
        <p className={`m-0 pt-4 text-[15px] ${fieldEyebrowClass}`}>Weddings at the farm</p>
        <ul role="list" className="m-0 mt-1 list-none border-t border-rule p-0">
          {withLookbook(weddingDoors()).map((door) => (
            <li key={door.title}>
              <Door door={door} pathname={pathname} onClose={onClose} />
            </li>
          ))}
        </ul>

        <p className={`m-0 pt-5 text-[15px] ${fieldEyebrowClass}`}>Visit the farm</p>
        <ul role="list" className="m-0 mt-1 list-none border-t border-rule p-0">
          {visitDoors().map((door) => (
            <li key={door.title}>
              <Door door={door} pathname={pathname} onClose={onClose} />
            </li>
          ))}
        </ul>

        <ul role="list" className="m-0 mt-4 grid list-none grid-cols-2 gap-x-4 p-0 text-[15px]">
          {MORE_LINKS.map((link) => (
            <li key={link.href} data-season-only={link.season}>
              <Link
                href={link.href}
                onClick={onClose}
                aria-current={pathname === link.href ? "page" : undefined}
                className="flex min-h-11 items-center text-ink-body transition-colors hover:text-pine aria-[current=page]:text-pine"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-3 border-t border-rule pt-3 text-[14px]">
          <a href={TEL} className="flex min-h-11 items-center justify-between gap-3 text-ink hover:text-pine">
            <span>{CONTACT.phone}</span>
            <span className="text-[12px] text-ink-meta">Call us</span>
          </a>
          <a
            href={CONTACT.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-between gap-3 text-ink hover:text-pine"
          >
            <span>{CONTACT.instagramHandle}</span>
            <span className="text-[12px] text-ink-meta">
              Instagram<span className="sr-only"> (opens in a new tab)</span>
            </span>
          </a>
        </div>

        <div className="mt-5 flex items-center gap-3 border-t border-rule pb-2 pt-4">
          <MastheadMark />
          <p className="m-0 text-[12px] leading-snug text-ink-note">
            {CONTACT.address}, {CONTACT.city}. About an hour from Portland.
          </p>
        </div>
      </nav>

      {!quiet && action && (
        <div className="shrink-0 border-t border-rule bg-paper px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
          {action === "cart" ? (
            <Link
              href="/shop/cart"
              onClick={onClose}
              className="flex h-[52px] w-full items-center justify-center gap-2.5 bg-pine font-sans text-[15px] font-semibold tracking-[0.02em] text-paper-light transition-colors hover:bg-pine-dark"
            >
              View cart ({count})
              <FieldArrow />
            </Link>
          ) : (
            <MenuAction href={action.href} label={action.label} onClose={onClose} />
          )}
          {secondary &&
            (secondary.external ? (
              <a
                href={secondary.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="mt-1 flex min-h-11 items-center justify-center font-sans text-[14px] font-medium text-pine"
              >
                {secondary.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <Link
                href={secondary.href}
                onClick={onClose}
                className="mt-1 flex min-h-11 items-center justify-center font-sans text-[14px] font-medium text-pine"
              >
                {secondary.label}
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}

function MenuAction({ href, label, onClose }: { href: string; label: string; onClose: () => void }) {
  const className =
    "flex h-[52px] w-full items-center justify-center gap-2.5 bg-pine font-sans text-[15px] font-semibold tracking-[0.02em] text-paper-light transition-colors hover:bg-pine-dark";
  if (href.startsWith("#")) {
    return (
      <a href={href} onClick={onClose} className={className}>
        {label}
        <FieldArrow />
      </a>
    );
  }
  return (
    <Link href={href} onClick={onClose} className={className}>
      {label}
      <FieldArrow />
    </Link>
  );
}
