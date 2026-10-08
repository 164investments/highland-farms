"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { LOOKBOOK_HREF } from "@/components/layout/chrome";
import { FieldArrow, fieldCtaOutlineClass } from "@/components/ui/FieldGuide";
import { cn } from "@/lib/utils";

/**
 * A quiet text link to the 2027 look book PDF. No email gate; opening it pushes the
 * same `lookbook_open` event as the popup, with the placement of the page that holds it.
 */
export function LookbookLink({
  placement,
  className,
  children = "See the 2027 look book",
}: {
  placement: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={LOOKBOOK_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "lookbook_open", placement });
      }}
    >
      {children}
      <span className="sr-only"> (PDF, opens in a new tab)</span>
    </a>
  );
}

/**
 * The look book as an object: a small framed cover, "The 2027 look book" and one outline
 * button. Same image as the popup card; opening pushes `lookbook_open` with the placement.
 */
export function LookbookCard({ placement, className }: { placement: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 border border-rule bg-paper-light p-3", className)}>
      <div className="h-[66px] w-[100px] shrink-0 border border-frame bg-paper-light p-[3px]">
        <div className="relative h-full w-full overflow-hidden">
          <Image
            src="/images/weddings/lookbook-cover.jpg"
            alt="Cover of the Highland Farms 2027 Wedding Lookbook"
            fill
            sizes="100px"
            className="object-cover object-[50%_30%]"
          />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="m-0 font-display text-[20px] font-medium leading-tight text-ink">The 2027 look book</p>
        <LookbookLink
          placement={placement}
          className={cn(fieldCtaOutlineClass, "mt-2 h-11 w-full px-3 text-[14px]")}
        >
          Open the look book
          <FieldArrow size={15} />
        </LookbookLink>
      </div>
    </div>
  );
}
