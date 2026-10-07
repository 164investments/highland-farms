import { Children, type ReactNode } from "react";
import { FieldLink, fieldEyebrowClass } from "@/components/ui/FieldGuide";
import { CONTACT } from "@/lib/constants";
import { cn } from "@/lib/utils";

/*
 * The one template for /terms, /privacy and /accessibility (boards/info/legal.html):
 * a title block, a three-way policy switch, optional header extras, contents (a
 * closed <details> on phones, a sticky rail from lg) and numbered sections at a
 * ~68ch measure. Legal wording lives in each page; this file only sets it.
 */

export type LegalPolicy = "privacy" | "terms" | "accessibility";

export interface LegalSection {
  id: string;
  title: string;
  /** Set on a panel that must be easy to find (the cancellation section). */
  emphasis?: boolean;
  children: ReactNode;
}

const POLICIES: { id: LegalPolicy; href: string; short: string; long: string }[] = [
  { id: "privacy", href: "/privacy", short: "Privacy", long: "Privacy Policy" },
  { id: "terms", href: "/terms", short: "Terms", long: "Terms of Service" },
  { id: "accessibility", href: "/accessibility", short: "Accessibility", long: "Accessibility" },
];

const linkClass = "font-medium text-pine underline decoration-pine-line underline-offset-4";

/** A link inside legal copy. */
export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  const external = /^https?:\/\//.test(href);
  return (
    <FieldLink href={href} external={external} className={linkClass}>
      {children}
    </FieldLink>
  );
}

/** Bulleted list with the square leader mark. */
export function LegalList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ul role="list" className={cn("list-none space-y-2.5 p-0", className)}>
      {Children.map(children, (child) => (
        <li className="relative pl-5 before:absolute before:left-0 before:top-[0.72em] before:h-[5px] before:w-[5px] before:bg-leader">
          {child}
        </li>
      ))}
    </ul>
  );
}

/** Numbered list ("1." in fern Cormorant) on a left rule: the SMS program terms. */
export function LegalSteps({ children }: { children: ReactNode }) {
  return (
    <ol role="list" className="list-none space-y-3 border-l border-rule p-0 pl-4">
      {Children.map(children, (child, i) => (
        <li>
          <span aria-hidden="true" className="font-display text-[18px] text-fern [font-variant-numeric:lining-nums]">
            {i + 1}.
          </span>{" "}
          {child}
        </li>
      ))}
    </ol>
  );
}

/** Inter 600 subhead inside a section (privacy, SMS blocks). */
export function LegalSub({ children }: { children: ReactNode }) {
  return <h3 className="font-sans text-[16px] font-semibold leading-snug text-ink lg:text-[17px]">{children}</h3>;
}

/** Small caps label line ("Highland Farms Oregon LLC · Effective Date"). */
export function LegalMeta({ children }: { children: ReactNode }) {
  return <p className="text-[13px] uppercase tracking-[0.08em] text-ink-meta">{children}</p>;
}

export function LegalAddress({ lines }: { lines: ReactNode[] }) {
  return (
    <address className="border-l-2 border-pine-line pl-4 not-italic">
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {line}
        </span>
      ))}
    </address>
  );
}

export function LegalStrong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}

/** Standard "Highland Farms Oregon LLC, address, email, phone" block. */
export function LegalContactAddress() {
  return (
    <LegalAddress
      lines={[
        "Highland Farms Oregon LLC",
        CONTACT.fullAddress,
        <>
          Email: <LegalLink href={`mailto:${CONTACT.email}`}>{CONTACT.email}</LegalLink>
        </>,
        <>
          Phone: <LegalLink href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`}>{CONTACT.phone}</LegalLink>
        </>,
      ]}
    />
  );
}

interface LegalLayoutProps {
  policy: LegalPolicy;
  title: string;
  /** "Last updated October 6, 2026" without the prefix: "October 6, 2026". */
  updated: string;
  sections: LegalSection[];
  /** Under the policy switch: the jump chips and the short version (terms). */
  headerExtra?: ReactNode;
  /** Before section 1, unnumbered (privacy's text-messaging data notice). */
  lead?: ReactNode;
  /** The closing question, e.g. "Still have a question about a booking?". */
  closing?: string;
}

function ContentsList({ sections }: { sections: LegalSection[] }) {
  return (
    <ol role="list" className="m-0 list-none p-0">
      {sections.map((section, i) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="grid min-h-11 grid-cols-[26px_1fr] items-center gap-x-1 border-b border-rule py-1.5 text-[14px] leading-snug text-ink-body hover:text-pine"
          >
            <span className="font-display text-[17px] text-fern [font-variant-numeric:lining-nums]">{i + 1}</span>
            <span>{section.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

export function LegalLayout({
  policy,
  title,
  updated,
  sections,
  headerExtra,
  lead,
  closing = "Still have a question?",
}: LegalLayoutProps) {
  const telHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`;
  return (
    <div className="surface-paper bg-paper pt-[var(--header-h)] font-sans text-ink">
      <div className="px-5 pb-14 pt-7 lg:px-16 lg:pb-24 lg:pt-14">
        <div className="mx-auto max-w-[1100px]">
          <header className="lg:pl-[300px]">
            <p className={cn(fieldEyebrowClass, "m-0 text-[17px] lg:text-[20px]")}>Highland Farms Oregon LLC</p>
            <h1 className="field-heading m-0 mt-1 font-display text-[40px] leading-[1.02] lg:text-[60px]">{title}</h1>
            <p className="m-0 mt-2 text-[13px] uppercase tracking-[0.1em] text-ink-meta">Last updated {updated}</p>
            <nav aria-label="Policies" className="mt-5 flex border-y border-rule">
              {POLICIES.map((p, i) => {
                const current = p.id === policy;
                return (
                  <FieldLink
                    key={p.id}
                    href={p.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 flex-1 items-center justify-center px-2 text-center text-[13.5px] lg:flex-none lg:px-6 lg:text-[14px]",
                      i < POLICIES.length - 1 && "border-r border-rule",
                      current
                        ? "bg-paper-shade font-semibold text-ink shadow-[inset_0_-2px_0_var(--pine)]"
                        : "text-ink-body hover:text-pine",
                    )}
                  >
                    {p.short === p.long ? (
                      p.long
                    ) : (
                      <>
                        <span className="lg:hidden">{p.short}</span>
                        <span className="hidden lg:inline">{p.long}</span>
                      </>
                    )}
                  </FieldLink>
                );
              })}
            </nav>
            {headerExtra}
          </header>

          <div className="mt-6 lg:mt-10 lg:grid lg:grid-cols-[260px_minmax(0,68ch)] lg:gap-x-10">
            <details className="group border border-frame bg-paper-light lg:hidden">
              <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between px-4 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                Contents · {sections.length} sections
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="transition-transform group-open:rotate-180"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="px-4 pb-3">
                <ContentsList sections={sections} />
              </div>
            </details>
            <nav aria-label="Contents" className="hidden lg:block">
              <div className="sticky top-[calc(var(--header-h)+24px)]">
                <p className="m-0 text-[12px] uppercase tracking-[0.14em] text-ink-meta">Contents</p>
                <div className="mt-2 border-t border-rule">
                  <ContentsList sections={sections} />
                </div>
              </div>
            </nav>

            <article className="mt-4 lg:mt-0">
              {lead && <div className="mb-2 lg:mb-4">{lead}</div>}
              {sections.map((section, i) => (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={`${section.id}-title`}
                  className={cn(
                    "scroll-mt-[calc(var(--header-h)+16px)] border-t border-rule py-7 lg:py-9",
                    section.emphasis && "-mx-3 bg-paper-shade px-3 lg:-mx-6 lg:px-6",
                  )}
                >
                  <h2
                    id={`${section.id}-title`}
                    className="field-heading m-0 flex items-baseline gap-3 font-display text-[25px] leading-[1.15] text-ink lg:text-[30px]"
                  >
                    <span className="font-display text-[19px] font-medium text-fern [font-variant-numeric:lining-nums] lg:text-[22px]">
                      {i + 1}
                    </span>
                    {section.title}
                  </h2>
                  <div className="mt-3 text-[15.5px] leading-[1.7] text-ink-body lg:text-[16.5px] [&>*+*]:mt-3 [&>h3:not(:first-child)]:mt-6">
                    {section.children}
                  </div>
                </section>
              ))}
              <div className="mt-10 border-t border-rule pt-6">
                <p className="m-0 font-display text-[21px] leading-snug">{closing}</p>
                <p className="m-0 mt-1 text-[15px] leading-[1.7] text-ink-body">
                  Call{" "}
                  <a href={telHref} className={cn("whitespace-nowrap", linkClass)}>
                    {CONTACT.phone}
                  </a>
                  , or{" "}
                  <FieldLink href="/contact" className={linkClass}>
                    reach the right person
                  </FieldLink>
                  .
                </p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The Terms' jump chips. */
export function LegalJump({ items }: { items: { href: string; label: string }[] }) {
  return (
    <nav aria-label="Jump to" className="mt-5 max-w-[68ch]">
      <p className="m-0 text-[12px] uppercase tracking-[0.12em] text-ink-meta">Jump to</p>
      <div className="mt-2 flex flex-wrap gap-2 lg:gap-3">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex min-h-11 items-center justify-center whitespace-nowrap border border-frame bg-paper-light px-3 text-center text-[13.5px] font-medium text-ink hover:border-pine lg:px-5 lg:text-[14px]"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
