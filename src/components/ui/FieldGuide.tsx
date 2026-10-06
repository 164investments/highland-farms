import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Field Guide primitives: the paper system approved on 2026-10-06 for the
 * masthead and the first screens of home, /weddings, /farm-tours and
 * /nordic-spa. Colours are the --paper / --ink / --pine tokens in globals.css.
 * Server-safe: no hooks, no client JS.
 */

/** Square forest CTA. Pair with an <a>, <Link> or <button>. */
export const fieldCtaClass =
  "inline-flex h-[52px] items-center justify-center gap-2.5 bg-pine px-[30px] font-sans text-[15px] font-semibold tracking-[0.02em] text-paper-light transition-colors hover:bg-pine-dark hover:text-paper-light";

/** Quiet underlined text link that sits beside the CTA. */
export const fieldTextLinkClass =
  "border-b border-pine-line pb-0.5 font-sans text-[15px] font-medium text-pine transition-colors hover:border-pine";

/** Italic Cormorant eyebrow. */
export const fieldEyebrowClass = "font-display italic text-fern";

/** The arrow used on every Field Guide CTA and row. */
export function FieldArrow({
  size = 18,
  strokeWidth = 1.7,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const STAR_PATH =
  "M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7z";

/** Five filled stars. Decorative: the count beside them carries the meaning. */
export function FieldStars({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("flex shrink-0 gap-0.5", className)} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" focusable="false">
          <path d={STAR_PATH} fill="var(--star)" />
        </svg>
      ))}
    </span>
  );
}

interface PlateProps {
  /** A next/image with `fill` (or a <picture> filling its box). */
  children: ReactNode;
  caption?: ReactNode;
  className?: string;
  /** Sizing for the frame itself, e.g. a fixed mobile height. */
  frameClassName?: string;
  captionClassName?: string;
}

/**
 * The framed photograph: 1px frame, paper mat (7px on phones, 10px from lg),
 * and an italic caption. The frame's size comes from layout, never from the
 * image, so a `fill` image inside it cannot shift the page as it loads.
 */
export function Plate({ children, caption, className, frameClassName, captionClassName }: PlateProps) {
  return (
    <figure className={cn("m-0 flex flex-col gap-[5px] lg:gap-2.5", className)}>
      <div className={cn("border border-frame bg-paper-light p-[7px] lg:p-2.5", frameClassName)}>
        <div className="relative h-full w-full overflow-hidden">{children}</div>
      </div>
      {caption && (
        <figcaption
          className={cn(
            "font-display text-[15px] italic text-ink-body lg:text-[17px]",
            captionClassName,
          )}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

interface FieldRowsProps {
  rows: readonly { term: string; detail: string }[];
  /** Width of the term column, e.g. "w-[92px]". */
  termClassName?: string;
  /** Row height and gap overrides. */
  rowClassName?: string;
  className?: string;
}

/** A ruled definition list: Cormorant term, Inter detail. */
export function FieldRows({ rows, termClassName, rowClassName, className }: FieldRowsProps) {
  return (
    <dl className={cn("m-0 flex flex-col border-t border-rule", className)}>
      {rows.map((row) => (
        <div
          key={row.term}
          className={cn(
            "flex min-h-[42px] items-center gap-3 border-b border-rule py-1.5 lg:min-h-[54px] lg:gap-5",
            rowClassName,
          )}
        >
          <dt
            className={cn(
              "shrink-0 font-display text-[20px] font-semibold leading-tight text-ink lg:text-[24px]",
              termClassName,
            )}
          >
            {row.term}
          </dt>
          <dd className="m-0 font-sans text-[13px] leading-snug text-ink-body lg:text-[16px]">
            {row.detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}
