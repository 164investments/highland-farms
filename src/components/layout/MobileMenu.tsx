"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/shop/cart";
import { FieldArrow } from "@/components/ui/FieldGuide";
import { WeddingCallLink } from "@/components/field/WeddingCallLink";
import { MastheadName, MenuIcon } from "./Masthead";
import {
  LOOKBOOK_DOOR,
  MORE_LINKS,
  WEDDING_MENU_NOTE,
  isQuietChrome,
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

/** Weddings, Real weddings, 2027 look book, the free call (same order as the footer). */
function withLookbook(doors: ChromeDoor[]): ChromeDoor[] {
  const rows = [...doors];
  rows.splice(2, 0, LOOKBOOK_DOOR);
  return rows;
}

function DoorTitle({ door }: { door: ChromeDoor }) {
  if (door.menuTitle && door.menuTitleShort) {
    return (
      <>
        <span className="max-[374px]:hidden">{door.menuTitle}</span>
        <span className="min-[375px]:hidden">{door.menuTitleShort}</span>
      </>
    );
  }
  return <>{door.menuTitle ?? door.title}</>;
}

function DoorLink({
  door,
  pathname,
  onClose,
  className,
  children,
}: {
  door: ChromeDoor;
  pathname: string;
  onClose: () => void;
  className: string;
  children: ReactNode;
}) {
  const current = door.current?.(pathname) ?? false;
  if (door.weddingCall) {
    return (
      <WeddingCallLink content="menu-call" title="Menu: wedding call" className={className}>
        {children}
      </WeddingCallLink>
    );
  }
  if (door.external) {
    return (
      <a href={door.href} target="_blank" rel="noopener noreferrer" onClick={onClose} className={className}>
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={door.href} onClick={onClose} aria-current={current ? "page" : undefined} className={className}>
      {children}
    </Link>
  );
}

function YouAreHere() {
  return <span className="shrink-0 font-display text-[15px] italic text-fern">You are here</span>;
}

/** One menu row: the name in Cormorant, nothing on the right unless it is this page. */
function Door({ door, pathname, onClose }: { door: ChromeDoor; pathname: string; onClose: () => void }) {
  const current = door.current?.(pathname) ?? false;
  return (
    <DoorLink
      door={door}
      pathname={pathname}
      onClose={onClose}
      className="group flex min-h-11 items-center justify-between gap-3 text-ink"
    >
      <span
        className={cn(
          "font-display text-[23px] font-semibold leading-none transition-colors group-hover:text-pine",
          current && "text-pine",
        )}
      >
        <DoorTitle door={door} />
      </span>
      {current && <YouAreHere />}
    </DoorLink>
  );
}

const DIVIDER = "my-2 h-px bg-rule";

/**
 * The menu sheet (menu round 2, 2026-10-07: Hayden found the hinted rows
 * "very busy"). The top row is the close button and the name. Weddings is the
 * one large line, with one note (the coos) and its three steps indented
 * beneath; then the visits as plain rows; then the short links on one line.
 * No hints, no rules between rows: the phone line, Instagram and the address
 * live in the footer and on Contact. The page's own action is pinned at the
 * bottom, at the thumb. On a screen too short for every row (iPhone SE) the
 * list scrolls under a fade.
 */
export function MobileMenu({ isOpen, onClose, type, pathname }: MobileMenuProps) {
  const sheet = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLElement>(null);
  const [more, setMore] = useState(false);
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

  // The fade at the foot of the list shows only while rows sit below it.
  useEffect(() => {
    if (!isOpen) return;
    const el = list.current;
    if (!el) return;
    const update = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const action = pageActionFor(type);
  const quiet = isQuietChrome(type);
  const [lead, ...steps] = withLookbook(weddingDoors());
  const leadCurrent = lead.current?.(pathname) ?? false;

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

      <div className="relative flex min-h-0 flex-1 flex-col">
        <nav ref={list} aria-label="Menu" className="flex-1 overflow-y-auto px-5 pb-2 pt-2">
          <DoorLink door={lead} pathname={pathname} onClose={onClose} className="group block pb-4 text-ink">
            <span className="flex items-end justify-between gap-3">
              <span
                className={cn(
                  "font-display text-[34px] font-semibold leading-none transition-colors group-hover:text-pine",
                  leadCurrent && "text-pine",
                )}
              >
                {lead.title}
              </span>
              {leadCurrent && <YouAreHere />}
            </span>
            <span className="mt-1.5 block font-display text-[17px] italic leading-tight text-ink-note">
              {WEDDING_MENU_NOTE}
            </span>
          </DoorLink>
          <ul role="list" aria-label="Plan your wedding" className="m-0 list-none p-0 pl-4">
            {steps.map((door) => (
              <li key={door.title}>
                <Door door={door} pathname={pathname} onClose={onClose} />
              </li>
            ))}
          </ul>

          <div aria-hidden="true" className={DIVIDER} />

          <ul role="list" aria-label="Visit the farm" className="m-0 list-none p-0">
            {visitDoors().map((door) => (
              <li key={door.title}>
                <Door door={door} pathname={pathname} onClose={onClose} />
              </li>
            ))}
          </ul>

          <div aria-hidden="true" className={DIVIDER} />

          {/* One dotted line from 375px; a two-by-two below, where the line would wrap. */}
          <ul
            role="list"
            className="m-0 grid list-none grid-cols-2 p-0 font-sans text-[14px] min-[375px]:flex min-[375px]:flex-wrap"
          >
            {MORE_LINKS.map((link, i) => (
              <li key={link.href} data-season-only={link.season} className="flex items-center">
                {i > 0 && (
                  <span aria-hidden="true" className="hidden px-2.5 text-ink-meta min-[375px]:inline">
                    ·
                  </span>
                )}
                <Link
                  href={link.href}
                  onClick={onClose}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className="flex min-h-11 items-center text-ink-body transition-colors hover:text-pine aria-[current=page]:text-pine"
                >
                  {link.menuLabel ?? link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-b from-paper/0 to-paper transition-opacity duration-200",
            more ? "opacity-100" : "opacity-0",
          )}
        />
      </div>

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
