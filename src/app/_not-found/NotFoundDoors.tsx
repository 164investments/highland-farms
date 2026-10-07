"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { FieldArrow, FieldLink } from "@/components/ui/FieldGuide";
import { cn } from "@/lib/utils";

interface Door {
  no: number;
  title: string;
  hint: string;
  href: string;
  primary?: boolean;
}

interface NotFoundDoorsProps {
  weddingsHref: string;
  tourHint: string;
  spaHint: string;
}

const SHOP_PATH = /\/(shop|store|product)/i;

/**
 * The four trail markers (weddings first), plus the `page_not_found` push
 * with the missing path and referrer. When the missing path is a shop path,
 * door No. 4 sends the visitor to the farm shop instead of the stays.
 */
export function NotFoundDoors({ weddingsHref, tourHint, spaHint }: NotFoundDoorsProps) {
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

  const doors: Door[] = [
    { no: 1, title: "Weddings", hint: "Check your date", href: weddingsHref, primary: true },
    { no: 2, title: "Farm tours", hint: tourHint, href: "/farm-tours" },
    { no: 3, title: "Nordic spa", hint: spaHint, href: "/nordic-spa" },
    shopVisitor
      ? { no: 4, title: "Farm shop", hint: "Free pickup", href: "/shop" }
      : { no: 4, title: "Stays", hint: "Sleeps 4 to 20", href: "/stay" },
  ];

  return (
    <nav aria-label="Main ways in" className="mt-2 grid grid-cols-2 gap-2.5 text-left lg:mt-9 lg:gap-3">
      {doors.map((door) => (
        <FieldLink
          key={door.no}
          href={door.href}
          className={cn(
            "flex min-h-[92px] flex-col justify-between p-3.5 lg:min-h-[132px] lg:p-5",
            door.primary
              ? "bg-pine text-paper-light hover:bg-pine-dark hover:text-paper-light"
              : "border border-frame bg-paper-light hover:bg-paper-shade",
          )}
        >
          <span
            className={cn(
              "text-[10.5px] uppercase tracking-[0.16em] lg:text-[11px]",
              door.primary ? "text-paper-light/80" : "text-ink-meta",
            )}
          >
            No. {door.no}
          </span>
          <span>
            <span className="block font-display text-[24px] font-medium leading-none lg:text-[30px]">
              {door.title}
            </span>
            <span
              className={cn(
                "mt-1.5 flex items-center gap-1.5 text-[13px] lg:text-[14px]",
                door.primary ? "font-semibold" : "text-ink-note",
              )}
            >
              {door.hint}
              <FieldArrow size={14} />
            </span>
          </span>
        </FieldLink>
      ))}
    </nav>
  );
}
