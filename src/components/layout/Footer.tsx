import Link from "next/link";
import { CONTACT, INSTAGRAM_FOLLOWERS } from "@/lib/constants";
import { FieldArrow, FieldDoorInner, FieldDrawing, FieldStars, fieldDoorRowClass } from "@/components/ui/FieldGuide";
import { REVIEW_TIER_COUNTS, GOOGLE_REVIEW_LINK } from "@/components/field/Reviews";
import { WeddingCallLink } from "@/components/field/WeddingCallLink";
import { MastheadName } from "./Masthead";
import {
  CHECK_DATE_HREF,
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

/** A marker a page renders to hide footer parts it already shows. Renders nothing visible. */
export function FooterHide({ parts }: { parts: readonly FooterPart[] }) {
  return <span hidden data-footer-hide={parts.join(" ")} />;
}

const TEL = `tel:+1${CONTACT.phone.replace(/\D/g, "")}`;
const DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(CONTACT.fullAddress)}`;

const LABEL = "m-0 font-display text-[15px] italic text-fern lg:text-[17px]";
const TEXT_LINK = "flex min-h-11 items-center transition-colors hover:text-pine";
const UNDERLINED =
  "inline-flex min-h-11 items-center text-ink underline decoration-rule underline-offset-4 transition-colors hover:text-pine";

function FooterDoor({ door }: { door: ChromeDoor }) {
  const className = fieldDoorRowClass("md");
  const inner = <FieldDoorInner title={door.title} note={door.footerNote} size="md" />;
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

function CheckDateLink({ className }: { className: string }) {
  return (
    <Link href={CHECK_DATE_HREF} className={className}>
      <span className="border-b border-pine-line pb-0.5">Check your date</span>
      <FieldArrow size={16} />
    </Link>
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
              <nav aria-label="Weddings" data-footer-part="doors" className="lg:col-span-4">
                <div className="flex items-center justify-between">
                  <p className={LABEL}>Weddings</p>
                  <CheckDateLink className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-pine lg:hidden" />
                </div>
                <ul role="list" className="m-0 list-none border-t border-rule p-0 lg:mt-2">
                  {weddings.map((door) => (
                    <li key={door.title}>
                      <FooterDoor door={door} />
                    </li>
                  ))}
                </ul>
                <CheckDateLink className="mt-3 hidden min-h-11 items-center gap-2 text-[14px] font-medium text-pine lg:inline-flex" />
              </nav>
            )}

            {/* Visit the farm */}
            {!hidden("doors") && (
              <nav aria-label="Visit the farm" data-footer-part="doors" className="lg:col-span-4">
                <p className={LABEL}>Visit the farm</p>
                <ul role="list" className="m-0 mt-1.5 list-none border-t border-rule p-0 lg:mt-2">
                  {visitDoors().map((door) => (
                    <li key={door.title}>
                      <FooterDoor door={door} />
                    </li>
                  ))}
                </ul>
                <ul role="list" className="m-0 mt-0.5 flex list-none flex-wrap gap-x-5 p-0 text-[14px] text-ink-body lg:mt-3 lg:gap-x-6">
                  {MORE_LINKS.map((link) => (
                    <li
                      key={link.href}
                      data-season-only={link.season}
                      className={link.season ? "hidden lg:block" : undefined}
                    >
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
                <ul role="list" className="m-0 list-none border-t border-rule p-0 text-[14px] lg:mt-2">
                  <li>
                    <a href={TEL} className="flex min-h-11 items-center justify-between gap-3 border-b border-rule text-ink transition-colors hover:text-pine">
                      <span>{CONTACT.phone}</span>
                      <span className="text-[12px] uppercase tracking-[0.1em] text-ink-meta">Call us</span>
                    </a>
                  </li>
                  <li>
                    <a href={`mailto:${CONTACT.email}`} className="flex min-h-11 items-center justify-between gap-3 border-b border-rule text-ink transition-colors hover:text-pine">
                      <span className="break-all">{CONTACT.email}</span>
                      <span className="hidden text-[12px] uppercase tracking-[0.1em] text-ink-meta lg:inline">Weddings</span>
                    </a>
                  </li>
                  <li>
                    <a href={`mailto:${CONTACT.emailAlt}`} className="flex min-h-11 items-center justify-between gap-3 text-ink transition-colors hover:text-pine">
                      <span className="break-all">{CONTACT.emailAlt}</span>
                      <span className="hidden text-[12px] uppercase tracking-[0.1em] text-ink-meta lg:inline">Everything else</span>
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
                  <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer" className="hidden min-h-11 items-center gap-2 lg:flex">
                    <InstagramGlyph />
                    <span className="text-ink">
                      {INSTAGRAM_FOLLOWERS} follow {CONTACT.instagramHandle}
                    </span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  <p className="m-0 flex flex-wrap items-center gap-x-3 text-[13px] lg:gap-x-3.5 lg:text-[14px]">
                    <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer" className={`${UNDERLINED} lg:hidden`}>
                      Instagram
                    </a>
                    <span className="hidden text-ink-note lg:inline">Find us on</span>
                    {ELSEWHERE.map((site) => (
                      <a
                        key={site.href}
                        href={site.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={"desktopOnly" in site ? `hidden lg:inline-flex ${UNDERLINED}` : UNDERLINED}
                      >
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

      {/* Checkout: help and legal only (shown instead of the footer above; globals.css). */}
      <footer data-footer-slim="" className="surface-paper hidden border-t border-rule bg-paper px-5 py-6 font-sans text-ink lg:px-16">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-2 text-[13px] text-ink-note lg:flex-row lg:items-center lg:justify-between">
          <p className="m-0">
            Questions about an order? Call or text{" "}
            <a href={TEL} className="whitespace-nowrap font-medium text-pine">
              {CONTACT.phone}
            </a>
          </p>
          <p className="m-0 flex gap-5">
            <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-pine">Privacy</Link>
            <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-pine">Terms</Link>
          </p>
        </div>
      </footer>
    </>
  );
}
