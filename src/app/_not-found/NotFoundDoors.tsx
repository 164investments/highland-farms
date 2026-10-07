"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { FieldArrow, FieldLink } from "@/components/ui/FieldGuide";

interface Row {
  no: number;
  title: string;
  hint: string;
  href: string;
}

interface QuietLink {
  label: string;
  href: string;
}

interface NotFoundDoorsProps {
  weddingsHref: string;
  /** The lead door's one true note ("Up to 125 guests, plus the coos"). */
  weddingsNote: string;
  tourHint: string;
  spaHint: string;
  staysHint: string;
  shopHint: string;
  /** The review line; rendered once, under the rows. */
  children?: ReactNode;
}

const SHOP_PATH = /\/(shop|store|product)/i;

const quietLink =
  "inline-flex min-h-11 items-center px-3 text-[14px] text-ink-note underline decoration-rule underline-offset-4 hover:text-ink";

/**
 * Board B4 (404 B): one wide Weddings door, then three ruled visit rows, the
 * review line, and one quiet link row. Also pushes `page_not_found` with the
 * missing path and referrer. On a shop path, door No. 4 is the farm shop and
 * the quiet row offers Stays instead.
 */
export function NotFoundDoors({
  weddingsHref,
  weddingsNote,
  tourHint,
  spaHint,
  staysHint,
  shopHint,
  children,
}: NotFoundDoorsProps) {
  const pathname = usePathname() ?? "";
  const shopVisitor = SHOP_PATH.test(pathname);

  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "page_not_found",
      missing_path: pathname,
      missing_referrer: document.referrer,
    });
  }, [pathname]);

  const rows: Row[] = [
    { no: 2, title: "Farm tours", hint: tourHint, href: "/farm-tours" },
    { no: 3, title: "Nordic spa", hint: spaHint, href: "/nordic-spa" },
    shopVisitor
      ? { no: 4, title: "Farm shop", hint: shopHint, href: "/shop" }
      : { no: 4, title: "Stays", hint: staysHint, href: "/stay" },
  ];

  const quiet: QuietLink[] = [
    { label: "Real weddings", href: "/wedding-portfolio" },
    ...(shopVisitor ? [{ label: "Stays", href: "/stay" }] : []),
    { label: "Contact", href: "/contact" },
  ];

  return (
    <>
      <nav aria-label="Main ways in" className="mt-1.5 text-left lg:mt-9">
        <FieldLink
          href={weddingsHref}
          className="block bg-pine px-3.5 pb-3.5 pt-3 text-paper-light hover:bg-pine-dark hover:text-paper-light min-[390px]:px-4 lg:px-6 lg:py-6"
        >
          <span className="block text-[10.5px] uppercase tracking-[0.16em] text-paper-light/80 lg:text-[11px]">
            No. 1
          </span>
          <span className="mt-2 flex items-baseline justify-between gap-2.5">
            <span className="whitespace-nowrap font-display text-[27px] font-medium leading-none min-[390px]:text-[30px] lg:text-[36px]">
              Weddings
            </span>
            <span className="hidden items-center gap-1.5 whitespace-nowrap text-[13.5px] font-semibold leading-none min-[390px]:flex">
              Check your date
              <FieldArrow size={14} />
            </span>
          </span>
          <span className="mt-1.5 block font-display text-[16px] italic leading-tight text-paper-light/90 lg:text-[18px]">
            {weddingsNote}
          </span>
          <span className="mt-2.5 flex items-center gap-1.5 whitespace-nowrap text-[13.5px] font-semibold leading-none min-[390px]:hidden">
            Check your date
            <FieldArrow size={14} />
          </span>
        </FieldLink>

        <ul role="list" className="m-0 mt-1 list-none p-0">
          {rows.map((row) => (
            <li key={row.no} className="border-b border-rule">
              <FieldLink
                href={row.href}
                className="grid min-h-[54px] grid-cols-[48px_1fr_auto] items-center py-[7px] min-[390px]:min-h-14 min-[390px]:grid-cols-[52px_1fr_auto] min-[390px]:py-2 lg:min-h-16"
              >
                <span className="self-start whitespace-nowrap pt-1.5 text-[10.5px] uppercase tracking-[0.14em] text-ink-meta">
                  No. {row.no}
                </span>
                <span>
                  <span className="block whitespace-nowrap font-display text-[22px] font-semibold leading-none text-ink lg:text-[26px]">
                    {row.title}
                  </span>
                  <span className="mt-1 block whitespace-nowrap text-[13px] leading-tight text-ink-note lg:text-[14px]">
                    {row.hint}
                  </span>
                </span>
                <span className="text-ink-meta">
                  <FieldArrow size={16} />
                </span>
              </FieldLink>
            </li>
          ))}
        </ul>
      </nav>

      {children}

      <nav aria-label="More pages" className="mt-0.5">
        <ul role="list" className="m-0 flex list-none flex-wrap justify-center p-0 lg:justify-start lg:[&>li:first-child>a]:pl-0">
          {quiet.map((link) => (
            <li key={link.href}>
              <FieldLink href={link.href} className={quietLink}>
                {link.label}
              </FieldLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
