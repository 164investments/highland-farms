import Image from "next/image";
import Link from "next/link";
import { BookOpen, CalendarCheck, ChevronRight, Images, type LucideIcon } from "lucide-react";
import { CONTACT } from "@/lib/constants";
import { FieldDrawing, FieldStars } from "@/components/ui/FieldGuide";
import { REVIEW_TIER_COUNTS, GOOGLE_REVIEW_LINK } from "@/components/field/Reviews";
import { WeddingCallLink } from "@/components/field/WeddingCallLink";
import { confirmedCouples } from "@/data/wedding-portfolio";
import { ELSEWHERE, LOOKBOOK_DOOR, MORE_LINKS, WEDDING_MENU_NOTE, visitDoors, weddingDoors } from "./chrome";

/*
 * The shared footer (mobile review board B1, direction A, 2026-10-07): the phone menu laid flat. It
 * opens on the menu's own plate (a couple between two of the coos, the review count in the mat), then
 * Weddings as the one large lead with one note and the menu's three steps, the visit doors as plain
 * rows, the short links on one dotted line, the one public phone line as the only pine link, and the
 * legal line. One note per group, one link style, no hint column. Server-rendered.
 *
 * Parts a page already shows above can be hidden ("don't repeat what the
 * page above already shows"): render <FooterHide parts={["find", "talk"]} />
 * anywhere in the page, or pass `hide` when rendering <Footer> directly.
 * /contact hides find and talk by route (globals.css). Checkout, the cart and
 * the order pages swap this footer for the slim one below (also globals.css).
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

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);

/* One link style: Inter, ink, no underline, 44px tall. */
const LINK = "flex min-h-11 items-center font-sans text-[15px] leading-tight text-ink transition-colors hover:text-pine";
const EYEBROW = "m-0 font-display text-[16px] italic leading-tight text-fern lg:text-[18px]";
const NOTE = "m-0 font-display text-[16px] italic leading-tight text-ink-note";
/* Dotted lines: a dot before each item, clipped where a line starts, so no line begins or ends on a dot. */
const DOTS = "m-0 flex list-none flex-wrap p-0 [--sep:20px] -ml-[var(--sep)] [clip-path:inset(0_0_0_var(--sep))]";
const DOT_ITEM =
  "flex items-center before:w-[var(--sep)] before:flex-none before:text-center before:text-ink-meta before:content-['·']";

function Step({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <>
      <Icon className="h-[18px] w-[18px] flex-none text-pine" strokeWidth={1.6} aria-hidden="true" />
      {children}
    </>
  );
}

function Row({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`${LINK} justify-between`}>
      {children}
      <ChevronRight className="h-[18px] w-[18px] flex-none text-ink-meta" strokeWidth={1.6} aria-hidden="true" />
    </Link>
  );
}

export function Footer({ hide = [] }: { hide?: readonly FooterPart[] }) {
  const year = new Date().getFullYear();
  const hidden = (part: FooterPart) => hide.includes(part);
  const [weddings, realWeddings, call] = weddingDoors();
  const couples = numberWord(confirmedCouples.length);
  // The board's directories (Facebook stays out of the phone footer, as before).
  const directories = ELSEWHERE.filter((site) => site.label !== "Facebook");

  return (
    <>
      <footer
        data-site-footer=""
        className="surface-paper border-t-[3px] border-double border-frame bg-paper-shade font-sans text-ink"
      >
        <div className="mx-auto max-w-[1440px] px-5 pb-5 pt-4 lg:grid lg:grid-cols-12 lg:gap-x-12 lg:px-16 lg:pb-10 lg:pt-14">
          {/* The menu's own plate; the review count sits in its mat. */}
          {!hidden("proof") && (
            <div data-footer-part="proof" className="lg:col-span-4">
              <div className="border border-frame bg-paper-light p-[5px] lg:p-2">
                <div className="relative h-[112px] overflow-hidden max-[359px]:h-[96px] lg:h-[260px]">
                  <Image
                    src="/images/weddings/details.jpg"
                    alt="A couple at the pasture fence between two of the Highland cows"
                    fill
                    sizes="(min-width: 1024px) 30vw, 100vw"
                    className="object-cover object-[50%_56%]"
                  />
                </div>
                <a
                  href={GOOGLE_REVIEW_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-9 items-center gap-1.5 px-0.5 pt-1 text-[12px] text-ink-note hover:text-ink"
                >
                  <FieldStars size={11} />
                  <span>{REVIEW_TIER_COUNTS.compact} reviews on Google</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            </div>
          )}

          {/* Weddings: the one large lead, one note, the menu's three steps. */}
          {!hidden("doors") && (
            <nav aria-label="Footer: weddings" data-footer-part="doors" className="mt-1 lg:col-span-4 lg:mt-0">
              <Link href={weddings.href} className="flex min-h-11 items-center justify-between text-ink hover:text-pine">
                <span className="font-display text-[30px] font-semibold leading-none lg:text-[34px]">{weddings.title}</span>
                <ChevronRight className="h-[18px] w-[18px] flex-none text-ink-meta" strokeWidth={1.6} aria-hidden="true" />
              </Link>
              <p className={`${NOTE} -mt-1`}>{WEDDING_MENU_NOTE}</p>
              <ul role="list" className="m-0 mt-0.5 list-none p-0">
                <li>
                  <Link href={realWeddings.href} className={`${LINK} gap-3`}>
                    <Step icon={Images}>See {couples} real weddings</Step>
                  </Link>
                </li>
                <li>
                  <a href={LOOKBOOK_DOOR.href} target="_blank" rel="noopener noreferrer" className={`${LINK} gap-3`}>
                    <Step icon={BookOpen}>{LOOKBOOK_DOOR.title}</Step>
                    <span className="sr-only"> (PDF, opens in a new tab)</span>
                  </a>
                </li>
                <li>
                  <WeddingCallLink content="footer-call" title="Footer: wedding call" className={`${LINK} gap-3`}>
                    <Step icon={CalendarCheck}>
                      <span className="max-[374px]:hidden">{call.menuTitle}</span>
                      <span className="min-[375px]:hidden">{call.menuTitleShort}</span>
                    </Step>
                  </WeddingCallLink>
                </li>
              </ul>
            </nav>
          )}

          {/* Visit the farm: plain rows, then the short links on one dotted line. */}
          {!hidden("doors") && (
            <nav aria-label="Footer: visit the farm" data-footer-part="doors" className="mt-4 lg:col-span-4 lg:mt-0">
              <p className={EYEBROW}>Visit the farm</p>
              <p className={`${NOTE} mt-0.5`}>About an hour from Portland</p>
              <ul role="list" className="m-0 mt-1 list-none border-t border-rule p-0">
                {visitDoors().map((door) => (
                  <li key={door.title} className="border-b border-rule">
                    {door.external ? (
                      <a href={door.href} target="_blank" rel="noopener noreferrer" className={`${LINK} justify-between`}>
                        {door.title}
                        <ChevronRight className="h-[18px] w-[18px] flex-none text-ink-meta" strokeWidth={1.6} aria-hidden="true" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      <Row href={door.href}>{door.title}</Row>
                    )}
                  </li>
                ))}
              </ul>
              <ul role="list" className={`${DOTS} mt-1.5`}>
                {MORE_LINKS.map((link) => (
                  <li key={link.href} data-season-only={link.season} className={DOT_ITEM}>
                    <Link href={link.href} className={`${LINK} whitespace-nowrap`}>
                      {link.menuLabel ?? link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Talk to us: the one public line leads, then the two emails. */}
          {!hidden("talk") && (
            <div data-footer-part="talk" className="mt-4 border-t border-rule pt-2 lg:col-span-4 lg:mt-12">
              <a
                href={TEL}
                className="flex min-h-11 items-center font-display text-[28px] font-semibold text-pine [font-feature-settings:'lnum'_1] [font-variant-numeric:lining-nums] hover:text-pine-dark"
              >
                {CONTACT.phone}
              </a>
              <ul role="list" className="m-0 list-none p-0">
                <li>
                  <a href={`mailto:${CONTACT.email}`} className={`${LINK} break-all`}>{CONTACT.email}</a>
                </li>
                <li>
                  <a href={`mailto:${CONTACT.emailAlt}`} className={`${LINK} break-all`}>{CONTACT.emailAlt}</a>
                </li>
              </ul>
            </div>
          )}

          {/* Finding the farm: the address, then directions in the same quiet link style. */}
          {!hidden("find") && (
            <div data-footer-part="find" className="lg:col-span-4 lg:mt-12 lg:border-t lg:border-rule lg:pt-2">
              <p className={`${NOTE} mt-1`}>
                {CONTACT.address}, <span className="whitespace-nowrap">{CONTACT.city}, {CONTACT.state} {CONTACT.zip}</span>
              </p>
              <a href={DIRECTIONS} target="_blank" rel="noopener noreferrer" className={LINK}>
                Get directions
                <span className="sr-only"> (opens Google Maps in a new tab)</span>
              </a>
            </div>
          )}

          {/* Elsewhere and legal: two quiet dotted lines. */}
          <div className="mt-3 border-t border-rule pt-1 lg:col-span-4 lg:mt-12 lg:pt-2">
            <ul role="list" className={DOTS}>
              {directories.map((site) => (
                <li key={site.href} className={DOT_ITEM}>
                  <a href={site.href} target="_blank" rel="noopener noreferrer" className={`${LINK} whitespace-nowrap text-[13px] text-ink-meta`}>
                    {site.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
              <li className={DOT_ITEM}>
                <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer" className={`${LINK} whitespace-nowrap text-[13px] text-ink-meta`}>
                  Instagram
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            </ul>
            <ul role="list" className={`${DOTS} mt-2`}>
              <li className={DOT_ITEM}><Link href="/privacy" className={`${LINK} text-[13px] text-ink-meta`}>Privacy</Link></li>
              <li className={DOT_ITEM}><Link href="/terms" className={`${LINK} text-[13px] text-ink-meta`}>Terms</Link></li>
              <li className={DOT_ITEM}><Link href="/accessibility" className={`${LINK} text-[13px] text-ink-meta`}>Accessibility</Link></li>
              <li className={DOT_ITEM}><a href="/llms.txt" className={`${LINK} text-[13px] text-ink-meta`}>For AI agents</a></li>
            </ul>
          </div>

          {/* Colophon. */}
          <div className="mt-2 flex items-center gap-3 border-t border-rule pt-2.5 lg:col-span-12 lg:mt-10">
            <FieldDrawing name="highland-cow-head" className="h-10 w-10 flex-none" sizes="40px" />
            <div>
              <p className="m-0 font-display text-[18px] italic leading-tight text-ink">Creating whimsical farm weddings.</p>
              <p className="m-0 pt-0.5 text-[12px] text-ink-meta">&copy; {year} Highland Farms Oregon</p>
            </div>
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
