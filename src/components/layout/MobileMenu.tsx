"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, CalendarDays, ChevronRight, Images, Instagram, MapPin, Phone, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONTACT, INSTAGRAM_FOLLOWERS } from "@/lib/constants";
import { useCart } from "@/lib/shop/cart";
import { FieldArrow, FieldStars, fieldEyebrowClass } from "@/components/ui/FieldGuide";
import { WeddingCallLink } from "@/components/field/WeddingCallLink";
import { MastheadName, MenuIcon } from "./Masthead";
import {
  DIRECTIONS_HREF,
  LOOKBOOK_DOOR,
  MORE_LINKS,
  TEL_HREF,
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
  /** Google review count (compact tier), resolved on the server: the snapshot must not ship to the client. */
  reviewCount: number;
}

/** Slide and fade time; the sheet unmounts after it. */
const MOTION_MS = 300;

/** The Weddings plate: a couple between two of the coos, which reads as a wide strip. */
const WEDDING_PHOTO = "/images/weddings/details.jpg";

/** Real farm photos for the visit rows, by door title (each page's own subject). */
const VISIT_PHOTOS: Record<string, string> = {
  "Farm tours": "/images/farm/cow-calf.jpg",
  "Nordic spa": "/images/spa/spa-exterior-plunge-moss.jpg",
  Stays: "/images/properties/lodge.jpg",
  "Gift certificates": "/images/farm/agritourism-stay.jpg",
  "Farm shop": "/images/farm/farm-visit.jpg",
};

/** Icons for the three wedding steps, by door title. */
const STEP_ICONS: Record<string, LucideIcon> = {
  "Real weddings": Images,
  "2027 look book": BookOpen,
  "Call with Connor": CalendarDays,
};

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
  return <span className="shrink-0 font-display text-[15px] italic text-pine">You are here</span>;
}

/** The pine bar at the sheet's left edge that marks the current row. */
const CURRENT_BAR =
  "before:absolute before:inset-y-2 before:-left-5 before:w-[3px] before:bg-pine max-[359px]:before:-left-4";

function Chevron() {
  return <ChevronRight aria-hidden="true" size={18} strokeWidth={1.6} className="shrink-0 text-ink-meta" />;
}

/** A wedding step: icon, name, and "PDF" on the look book. */
function StepRow({ door, pathname, onClose }: { door: ChromeDoor; pathname: string; onClose: () => void }) {
  const current = door.current?.(pathname) ?? false;
  const Icon = STEP_ICONS[door.title];
  return (
    <DoorLink
      door={door}
      pathname={pathname}
      onClose={onClose}
      className={cn("group relative flex min-h-11 items-center gap-3 text-ink", current && CURRENT_BAR)}
    >
      {Icon && <Icon aria-hidden="true" size={18} strokeWidth={1.6} className="shrink-0 text-pine" />}
      <span
        className={cn(
          "flex-1 font-sans text-[15px] font-medium leading-snug transition-colors group-hover:text-pine",
          current && "text-pine",
        )}
      >
        <DoorTitle door={door} />
      </span>
      {current ? (
        <YouAreHere />
      ) : (
        door === LOOKBOOK_DOOR && <span className="shrink-0 text-[11px] font-medium tracking-[0.08em] text-ink-meta">PDF</span>
      )}
    </DoorLink>
  );
}

/** A visit row: framed photo, name, one-line hint (the footer's), chevron. */
function VisitRow({ door, pathname, onClose }: { door: ChromeDoor; pathname: string; onClose: () => void }) {
  const current = door.current?.(pathname) ?? false;
  const photo = VISIT_PHOTOS[door.title];
  return (
    <DoorLink
      door={door}
      pathname={pathname}
      onClose={onClose}
      className={cn("group relative flex min-h-[58px] items-center gap-3 py-1.5 text-ink", current && CURRENT_BAR)}
    >
      {photo && (
        <span className="block shrink-0 border border-frame bg-paper-light p-[2px]">
          <span className="relative block h-11 w-11 overflow-hidden">
            <Image src={photo} alt="" fill sizes="44px" className="object-cover" />
          </span>
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block font-display text-[21px] font-semibold leading-none transition-colors group-hover:text-pine",
            current && "text-pine",
          )}
        >
          {door.title}
        </span>
        {current ? (
          <span className="mt-1 block">
            <YouAreHere />
          </span>
        ) : (
          <span className="mt-1 block text-[12.5px] leading-snug text-ink-note">{door.note}</span>
        )}
      </span>
      <Chevron />
    </DoorLink>
  );
}

const QUICK =
  "flex min-h-14 flex-col items-center justify-center gap-1 border border-rule bg-paper-light px-1 py-2 text-center text-[12px] font-medium leading-tight text-ink-body transition-colors hover:border-pine hover:text-pine";

function QuickIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon aria-hidden="true" size={18} strokeWidth={1.6} className="text-pine" />;
}

/**
 * The menu: a sheet that slides in from the left, where the menu button sits,
 * over the page dimmed behind it (tap the page, swipe left, press Escape or
 * the close button to dismiss). Menu round 3, 2026-10-07: the text-only list
 * read "very basic", so the sheet follows mobile-drawer practice with the
 * farm's own photos. Top: close, the name, tap to call. Weddings leads as a
 * framed photo plate with the coos line, the Google review count and its
 * three steps; the visits are photo rows with their one-line hints; then the
 * short links, quick actions (call, directions, Instagram) and the page's
 * own action pinned at the thumb. The current page carries a pine bar and
 * "You are here". The list scrolls under a fade while rows sit below it.
 */
export function MobileMenu({ isOpen, onClose, type, pathname, reviewCount }: MobileMenuProps) {
  const sheet = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [more, setMore] = useState(false);
  // Mounted while open and during the slide out; entered once the first frame has painted off-screen.
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const { count } = useCart();

  if (isOpen && !mounted) setMounted(true);
  const shown = isOpen && entered;

  useEffect(() => {
    if (isOpen) {
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    const t = window.setTimeout(() => {
      setMounted(false);
      setEntered(false);
    }, MOTION_MS);
    return () => window.clearTimeout(t);
  }, [isOpen]);

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

  if (!mounted) return null;

  const action = pageActionFor(type);
  const quiet = isQuietChrome(type);
  const [lead, ...steps] = withLookbook(weddingDoors());
  const leadCurrent = lead.current?.(pathname) ?? false;

  return (
    <div className="fixed inset-0 z-50 font-sans text-ink">
      {/* The page behind, dimmed: a tap closes the sheet. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-[rgba(20,20,16,0.5)] transition-opacity ease-out motion-reduce:transition-none",
          shown ? "opacity-100" : "opacity-0",
        )}
        style={{ transitionDuration: `${MOTION_MS}ms` }}
      />
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        onTouchStart={(e) => {
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          if (dx < -60 && Math.abs(dy) < 40) onClose();
        }}
        className={cn(
          "surface-paper absolute inset-y-0 left-0 flex h-dvh w-[88%] max-w-[380px] flex-col bg-paper shadow-[8px_0_24px_rgba(0,0,0,0.18)] transition-transform ease-out motion-reduce:transition-none",
          shown ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ transitionDuration: `${MOTION_MS}ms` }}
      >
        <div className="flex h-[60px] shrink-0 items-center gap-1 border-b-[3px] border-double border-frame pl-1.5 pr-2">
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-11 w-11 shrink-0 items-center justify-center text-ink transition-opacity hover:opacity-70"
          >
            <MenuIcon open />
          </button>
          <MastheadName onClick={onClose} className="items-start text-left" />
          <a
            href={TEL_HREF}
            aria-label={`Call ${CONTACT.phone}`}
            className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center text-pine transition-opacity hover:opacity-70"
          >
            <Phone aria-hidden="true" size={20} strokeWidth={1.6} />
          </a>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <nav
            ref={list}
            aria-label="Menu"
            className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-2.5 max-[359px]:px-4"
          >
            {/* Weddings: the plate, the name, the coos. */}
            <DoorLink door={lead} pathname={pathname} onClose={onClose} className="group relative block text-ink">
              <span className="block border border-frame bg-paper-light p-[5px]">
                <span className="relative block h-[92px] overflow-hidden max-[359px]:h-[80px]">
                  <Image
                    src={WEDDING_PHOTO}
                    alt=""
                    fill
                    sizes="(max-width: 440px) 88vw, 380px"
                    className="object-cover object-[center_56%]"
                  />
                </span>
                <span className="flex items-center gap-1.5 px-0.5 pt-[5px] text-[11.5px] leading-none text-ink-note">
                  <FieldStars size={11} />
                  {reviewCount} reviews on Google
                </span>
              </span>
              <span className="mt-2 flex items-center justify-between gap-3">
                <span
                  className={cn(
                    "font-display text-[30px] font-semibold leading-none transition-colors group-hover:text-pine",
                    leadCurrent && "text-pine",
                  )}
                >
                  {lead.title}
                </span>
                {leadCurrent ? <YouAreHere /> : <Chevron />}
              </span>
              <span className="mt-1 block font-display text-[16px] italic leading-tight text-ink-note">
                {WEDDING_MENU_NOTE}
              </span>
            </DoorLink>
            <ul role="list" aria-label="Plan your wedding" className="m-0 mt-1 list-none p-0">
              {steps.map((door) => (
                <li key={door.title}>
                  <StepRow door={door} pathname={pathname} onClose={onClose} />
                </li>
              ))}
            </ul>

            <p className={`m-0 mt-3 text-[15px] ${fieldEyebrowClass}`}>Visit the farm</p>
            <ul role="list" className="m-0 mt-1.5 list-none border-t border-rule p-0">
              {visitDoors().map((door) => (
                <li key={door.title} className="border-b border-rule">
                  <VisitRow door={door} pathname={pathname} onClose={onClose} />
                </li>
              ))}
            </ul>

            <p className={`m-0 mt-5 text-[15px] ${fieldEyebrowClass}`}>More from the farm</p>
            <ul role="list" className="m-0 mt-1 grid list-none grid-cols-2 gap-x-3 p-0 text-[14px]">
              {MORE_LINKS.map((link) => (
                <li key={link.href} data-season-only={link.season}>
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

            <ul role="list" aria-label="Get in touch" className="m-0 mt-3 grid list-none grid-cols-3 gap-2 p-0">
              <li>
                <a href={TEL_HREF} className={QUICK}>
                  <QuickIcon icon={Phone} />
                  Call
                </a>
              </li>
              <li>
                <a href={DIRECTIONS_HREF} target="_blank" rel="noopener noreferrer" className={QUICK}>
                  <QuickIcon icon={MapPin} />
                  Directions
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
              <li>
                <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer" className={QUICK}>
                  <QuickIcon icon={Instagram} />
                  Instagram
                  <span className="text-[11px] font-normal text-ink-meta">{INSTAGRAM_FOLLOWERS} followers</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
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
          <div className="shrink-0 border-t border-rule bg-paper px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 max-[359px]:px-4">
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
