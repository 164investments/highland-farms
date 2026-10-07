import Link from "next/link";
import { CONTACT, INSTAGRAM_FOLLOWERS } from "@/lib/constants";
import { FieldArrow, FieldDoorInner, FieldDrawing, FieldStars, fieldDoorRowClass } from "@/components/ui/FieldGuide";
import { REVIEW_TIER_COUNTS, GOOGLE_REVIEW_LINK } from "@/components/field/Reviews";
import { WeddingCallLink } from "@/components/field/WeddingCallLink";
import { MastheadName } from "./Masthead";
import {
  ELSEWHERE,
  LOOKBOOK_DOOR,
  MORE_LINKS,
  visitDoors,
  weddingDoors,
  type ChromeDoor,
} from "./chrome";

/*
 * The shared footer (finish/boards/_shared/footer.html, round 2): paper-shade
 * ground under a double rule. Phones read it top to bottom; desktop opens it
 * into three columns. Server-rendered, no client JS of its own (the call row
 * is the one tracked link).
 *
 * Parts a page already shows above can be hidden ("don't repeat what the
 * page above already shows"): render <FooterHide parts={["find", "talk"]} />
 * anywhere in the page, or pass `hide` when rendering <Footer> directly.
 * /contact hides find and talk by route (globals.css). Checkout swaps this
 * footer for the slim one below (also globals.css, keyed off the masthead).
 */

export type FooterPart = "doors" | "find" | "talk" | "proof";

/**
 * A marker for pages that end quietly (the slim footer instead of the full one), like checkout, the cart
 * and the order pages do by route. `bare` also drops the "Questions about an order?" line, for pages
 * that already give the phone (the unsubscribe page).
 */
export function FooterQuiet({ bare = false }: { bare?: boolean }) {
  return <span hidden data-footer-quiet={bare ? "bare" : ""} />;
}

/** A marker a page renders to hide footer parts it already shows. Renders nothing visible. */
export function FooterHide({ parts }: { parts: readonly FooterPart[] }) {
  return <span hidden data-footer-hide={parts.join(" ")} />;
}

const TEL = `tel:+1${CONTACT.phone.replace(/\D/g, "")}`;
const DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(CONTACT.fullAddress)}`;

const LABEL = "m-0 font-display text-[15px] italic text-fern lg:text-[17px]";
const TEXT_LINK = "flex min-h-11 items-center transition-colors hover:text-pine";
/* Contact rows: value left, its label right. On a narrow phone the label wraps under the value, right-aligned. */
const CONTACT_ROW =
  "flex min-h-11 flex-wrap content-center items-center justify-between gap-x-3 py-1 text-ink transition-colors hover:text-pine";
const CONTACT_LABEL = "ml-auto text-[11px] uppercase tracking-[0.08em] text-ink-meta lg:text-[12px] lg:tracking-[0.1em]";

const UNDERLINED =
  "inline-flex min-h-11 items-center text-ink underline decoration-rule underline-offset-4 transition-colors hover:text-pine";

function FooterDoor({ door }: { door: ChromeDoor }) {
  const className = fieldDoorRowClass("md");
  const inner = <FieldDoorInner title={door.title} note={door.note} size="md" />;
  if (door.weddingCall) {
    return (
      <WeddingCallLink content="footer-call" title="Footer: wedding call" className={className}>
        {inner}
      </WeddingCallLink>
    );
  }
  if (door.external) {
    return (
      <a href={door.href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={door.href} className={className}>
      {inner}
    </Link>
  );
}

/** Facebook gets its own row (desktop), so "Find us on" holds the three directories on one line. */
const FACEBOOK = ELSEWHERE.find((site) => site.label === "Facebook");
const DIRECTORIES = ELSEWHERE.filter((site) => site.label !== "Facebook");

function FacebookGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M13.5 20v-7h2.4l.4-2.8h-2.8V8.6c0-.8.3-1.4 1.4-1.4h1.5V4.8a19 19 0 0 0-2.2-.1c-2.2 0-3.6 1.3-3.6 3.7v1.8H8.2V13h2.4v7" />
    </svg>
  );
}

function InstagramGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Footer({ hide = [] }: { hide?: readonly FooterPart[] }) {
  const year = new Date().getFullYear();
  const hidden = (part: FooterPart) => hide.includes(part);
  const weddings = [...weddingDoors()];
  // Board order: Weddings, Real weddings, 2027 look book, Call with Connor.
  weddings.splice(2, 0, LOOKBOOK_DOOR);

  return (
    <>
      <footer
        data-site-footer=""
        className="surface-paper border-t-[3px] border-double border-frame bg-paper-shade font-sans text-ink"
      >
        <div className="mx-auto max-w-[1440px] px-5 pb-5 pt-7 lg:px-16 lg:pb-10 lg:pt-16">
          <div className="grid gap-y-5 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-14">
            {/* Name and promise */}
            <div className="flex flex-col items-center text-center lg:col-span-4 lg:items-start lg:text-left">
              <FieldDrawing
                name="highland-cow-head"
                className="h-14 w-14 lg:-ml-2 lg:h-[96px] lg:w-[96px]"
                sizes="(min-width: 1024px) 96px, 56px"
              />
              <MastheadName size="footer" className="mt-1 lg:mt-2 lg:items-start lg:text-left" />
              <p className="m-0 mt-2.5 font-display text-[19px] italic leading-snug text-ink lg:mt-5 lg:text-[23px]">
                Creating whimsical farm weddings.
              </p>
              <p className="m-0 mt-1 max-w-[340px] text-[13.5px] leading-relaxed text-ink-body lg:mt-2 lg:text-[14px]">
                <span className="lg:hidden">Where the coos are honorary wedding guests.</span>
                <span className="hidden lg:inline">
                  A private forest farm where the coos are honorary wedding guests. Come for a private tour, the
                  Nordic spa, or a night on the farm.
                </span>
              </p>
            </div>

            {/* Weddings */}
            {!hidden("doors") && (
              <nav aria-label="Footer: weddings" data-footer-part="doors" className="lg:col-span-4">
                <p className={LABEL}>Weddings</p>
                <ul role="list" className="m-0 mt-1.5 list-none border-t border-rule p-0 lg:mt-2">
                  {weddings.map((door) => (
                    <li key={door.title}>
                      <FooterDoor door={door} />
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {/* Visit the farm */}
            {!hidden("doors") && (
              <nav aria-label="Footer: visit the farm" data-footer-part="doors" className="lg:col-span-4">
                <p className={LABEL}>Visit the farm</p>
                <ul role="list" className="m-0 mt-1.5 list-none border-t border-rule p-0 lg:mt-2">
                  {visitDoors().map((door) => (
                    <li key={door.title}>
                      <FooterDoor door={door} />
                    </li>
                  ))}
                </ul>
                <ul role="list" className="m-0 mt-0.5 grid w-fit list-none grid-cols-2 gap-x-6 p-0 text-[14px] text-ink-body lg:mt-3 lg:gap-x-8">
                  {MORE_LINKS.map((link) => (
                    <li key={link.href} data-season-only={link.season}>
                      <Link href={link.href} className={TEXT_LINK}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {/* Finding the farm */}
            {!hidden("find") && (
              <div data-footer-part="find" className="lg:col-span-4">
                <p className={LABEL}>Finding the farm</p>
                <address className="mt-1.5 border-t border-rule pt-2.5 text-[14px] not-italic leading-relaxed text-ink-body lg:mt-2 lg:pt-3">
                  {CONTACT.address}
                  <br className="hidden lg:block" />
                  <span className="lg:hidden">, </span>
                  {CONTACT.city}, {CONTACT.state} {CONTACT.zip}
                </address>
                <p className="m-0 mt-1 text-[14px] leading-relaxed text-ink-body lg:mt-2">
                  About an hour from Portland, about 25 minutes from Government Camp.
                  <span className="hidden lg:inline"> Tours and spa sessions are booked ahead.</span>
                </p>
                <a
                  href={DIRECTIONS}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 text-[14px] font-medium text-pine lg:mt-1"
                >
                  <span className="border-b border-pine-line pb-0.5">Get directions</span>
                  <FieldArrow size={16} />
                  <span className="sr-only"> (opens Google Maps in a new tab)</span>
                </a>
              </div>
            )}

            {/* Talk to us: the one public line */}
            {!hidden("talk") && (
              <div data-footer-part="talk" className="-mt-5 lg:col-span-4 lg:mt-0">
                <p className={`hidden lg:block ${LABEL}`}>Talk to us</p>
                {/* 13px on phones so each email and its label share one line from 375px up. */}
                <ul role="list" className="m-0 list-none border-t border-rule p-0 text-[13px] lg:mt-2 lg:text-[14px]">
                  <li>
                    <a href={TEL} className={`${CONTACT_ROW} border-b border-rule`}>
                      <span className="font-medium text-pine">{CONTACT.phone}</span>
                      <span className={CONTACT_LABEL}>Call us</span>
                    </a>
                  </li>
                  <li>
                    <a href={`mailto:${CONTACT.email}`} className={`${CONTACT_ROW} border-b border-rule`}>
                      <span className="break-all">{CONTACT.email}</span>
                      <span className={CONTACT_LABEL}>Weddings</span>
                    </a>
                  </li>
                  <li>
                    <a href={`mailto:${CONTACT.emailAlt}`} className={CONTACT_ROW}>
                      <span className="break-all">{CONTACT.emailAlt}</span>
                      <span className={CONTACT_LABEL}>Everything else</span>
                    </a>
                  </li>
                </ul>
              </div>
            )}

            {/* Reviews and elsewhere: real links only */}
            {!hidden("proof") && (
              <div data-footer-part="proof" className="lg:col-span-4">
                <p className={`hidden lg:block ${LABEL}`}>Reviews and elsewhere</p>
                <div className="border-t border-rule pt-1 text-[14px] text-ink-body lg:mt-2">
                  <a href={GOOGLE_REVIEW_LINK} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2">
                    <FieldStars size={12} />
                    <span className="text-ink">{REVIEW_TIER_COUNTS.compact} reviews on Google</span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2">
                    <InstagramGlyph />
                    <span className="text-ink">
                      {INSTAGRAM_FOLLOWERS} follow {CONTACT.instagramHandle}
                    </span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  {FACEBOOK && (
                    <a href={FACEBOOK.href} target="_blank" rel="noopener noreferrer" className="hidden min-h-11 items-center gap-2 lg:flex">
                      <FacebookGlyph />
                      <span className="text-ink">Highland Farms on Facebook</span>
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                  <p className="m-0 flex flex-wrap items-center gap-x-3 text-[13px] lg:gap-x-3.5 lg:text-[14px]">
                    <span className="text-ink-note">Find us on</span>
                    {DIRECTORIES.map((site) => (
                      <a key={site.href} href={site.href} target="_blank" rel="noopener noreferrer" className={UNDERLINED}>
                        {site.label}
                      </a>
                    ))}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Legal */}
          <div className="mt-4 flex flex-col border-t border-rule pt-2 text-[12px] text-ink-meta lg:mt-14 lg:flex-row lg:items-center lg:justify-between lg:gap-1 lg:pt-4">
            <p className="m-0 pt-1 lg:pt-0">&copy; {year} Highland Farms Oregon. All rights reserved.</p>
            <ul role="list" className="m-0 flex list-none flex-wrap gap-x-4 p-0 lg:gap-x-5">
              <li><Link href="/privacy" className={TEXT_LINK}>Privacy</Link></li>
              <li><Link href="/terms" className={TEXT_LINK}>Terms</Link></li>
              <li><Link href="/accessibility" className={TEXT_LINK}>Accessibility</Link></li>
              <li><a href="/llms.txt" className={TEXT_LINK}>For AI agents</a></li>
            </ul>
          </div>
        </div>
      </footer>

      {/* Checkout, cart, order pages and FooterQuiet pages: help and legal only (globals.css). */}
      <footer data-footer-slim="" className="surface-paper hidden border-t border-rule bg-paper px-5 py-6 font-sans text-ink lg:px-16">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-2 text-[13px] text-ink-note lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <FieldDrawing name="highland-cow-head" className="h-9 w-9 shrink-0" sizes="36px" />
            <p data-footer-slim-help="" className="m-0">
              Questions about an order? Call{" "}
              <a href={TEL} className="whitespace-nowrap font-medium text-pine">
                {CONTACT.phone}
              </a>
            </p>
          </div>
          <p className="m-0 flex gap-5">
            <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-pine">Privacy</Link>
            <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-pine">Terms</Link>
            <Link href="/accessibility" className="inline-flex min-h-11 items-center hover:text-pine">Accessibility</Link>
          </p>
        </div>
      </footer>
    </>
  );
}
