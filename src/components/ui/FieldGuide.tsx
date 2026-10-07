import { Fragment, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/*
 * Field Guide primitives: the paper system approved on 2026-10-06 ("Field
 * Guide", wedding-led). Colours are the --paper / --ink / --pine tokens in
 * globals.css. Port notes and usage: finish/notes/PRIMITIVES.md.
 *
 * This file is imported by client components (InquiryForm, InquirySuccess),
 * so it must stay light: no hooks, no data files (the review snapshot lives
 * behind src/components/field/Reviews.tsx), no booking modal. Anything that
 * reads data or opens a booking lives in src/components/field/.
 */

/* ------------------------------------------------------------------ */
/* Class tokens                                                        */
/* ------------------------------------------------------------------ */

/** Square forest CTA. Pair with an <a>, <Link> or <button>. */
export const fieldCtaClass =
  "inline-flex h-[52px] items-center justify-center gap-2.5 bg-pine px-[30px] font-sans text-[15px] font-semibold tracking-[0.02em] text-paper-light transition-colors hover:bg-pine-dark hover:text-paper-light";

/** The outlined square button (the gift half of a sticky bar, the masthead "Cart (n)"). */
export const fieldCtaOutlineClass =
  "inline-flex h-[52px] items-center justify-center gap-2.5 border border-pine bg-paper-light px-[30px] font-sans text-[15px] font-semibold tracking-[0.02em] text-pine transition-colors hover:bg-paper-shade";

/** Quiet underlined text link that sits beside the CTA. */
export const fieldTextLinkClass =
  "border-b border-pine-line pb-0.5 font-sans text-[15px] font-medium text-pine transition-colors hover:border-pine";

/** Italic Cormorant eyebrow. */
export const fieldEyebrowClass = "font-display italic text-fern";

/**
 * Inter 11px caps, tracked: the "No. 1" catalogue label and small list
 * labels ("How many are coming? Pick to see dates", "Photographed on the farm").
 */
export const fieldLabelClass =
  "font-sans text-[11px] uppercase tracking-[0.16em] text-ink-meta lg:text-[12px]";

/** The one quote attribution style: `FIRST L. · MONTH YEAR · GOOGLE REVIEW`. */
export const fieldAttributionClass =
  "font-sans text-[11px] uppercase tracking-[0.08em] text-ink-meta";

/** The dotted leader between a name and its price. */
export const fieldLeaderClass =
  "min-w-4 flex-1 translate-y-1 border-b-[1.5px] border-dotted border-leader";

/* ------------------------------------------------------------------ */
/* Small marks                                                          */
/* ------------------------------------------------------------------ */

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

/** The dotted leader. Decorative. */
export function FieldLeader({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn(fieldLeaderClass, className)} />;
}

/** "No. 1": the catalogue label (CONSISTENCY #4). */
export function FieldNo({ n, className }: { n: number; className?: string }) {
  return <p className={cn("m-0", fieldLabelClass, className)}>No. {n}</p>;
}

const ROMAN: [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** 1 -> "I", 4 -> "IV". For sequences in time (CONSISTENCY #4). */
export function toRoman(n: number): string {
  let rest = Math.max(1, Math.floor(n));
  let out = "";
  for (const [value, mark] of ROMAN) {
    while (rest >= value) {
      out += mark;
      rest -= value;
    }
  }
  return out;
}

/** A Roman numeral in fern Cormorant. Decorative: the <ol> carries the order. */
export function FieldNumeral({ n, className }: { n: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "font-display text-[30px] leading-none text-fern [font-variant-numeric:lining-nums]",
        className,
      )}
    >
      {toRoman(n)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Links                                                                */
/* ------------------------------------------------------------------ */

interface SmartLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  /** Open in a new tab (external sites, Google reviews, PDFs). */
  external?: boolean;
  "aria-current"?: "page";
  "aria-label"?: string;
}

/** next/link for site paths, a plain <a> for hashes, tel:, mailto: and other sites. */
export function FieldLink({ href, className, children, external, ...aria }: SmartLinkProps) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...aria}>
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} className={className} {...aria}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} {...aria}>
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                              */
/* ------------------------------------------------------------------ */

export type FieldHeadingSize = "xl" | "lg" | "md" | "sm";

const HEADING_SIZE: Record<FieldHeadingSize, string> = {
  xl: "text-[40px] leading-[1.0] lg:text-[64px]",
  lg: "text-[36px] leading-[1.02] lg:text-[56px]",
  md: "text-[30px] leading-[1.05] lg:text-[44px]",
  sm: "text-[25px] leading-[1.15] lg:text-[30px]",
};

const EYEBROW_SIZE: Record<FieldHeadingSize, string> = {
  xl: "text-[20px] lg:text-[24px]",
  lg: "text-[18px] lg:text-[22px]",
  md: "text-[17px] lg:text-[20px]",
  sm: "text-[15px] lg:text-[17px]",
};

interface FieldSectionHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  /** One short paragraph under the heading. */
  intro?: ReactNode;
  /** Sits to the right of the heading from lg (e.g. a compact review tier); under it on phones. */
  aside?: ReactNode;
  /** Heading id, for aria-labelledby on the section. */
  id?: string;
  as?: "h1" | "h2" | "h3";
  size?: FieldHeadingSize;
  className?: string;
  eyebrowClassName?: string;
  titleClassName?: string;
  introClassName?: string;
}

/** Italic fern eyebrow over a `field-heading` title, with an optional intro and aside. */
export function FieldSectionHeader({
  title,
  eyebrow,
  intro,
  aside,
  id,
  as: Heading = "h2",
  size = "xl",
  className,
  eyebrowClassName,
  titleClassName,
  introClassName,
}: FieldSectionHeaderProps) {
  const block = (
    <div>
      {eyebrow && (
        <p className={cn("m-0", fieldEyebrowClass, EYEBROW_SIZE[size], eyebrowClassName)}>
          {eyebrow}
        </p>
      )}
      <Heading
        id={id}
        className={cn(
          "field-heading m-0 font-display text-ink",
          eyebrow && "mt-1",
          HEADING_SIZE[size],
          titleClassName,
        )}
      >
        {title}
      </Heading>
      {intro && (
        <p
          className={cn(
            "m-0 mt-3 max-w-[600px] font-sans text-[15px] leading-[1.6] text-ink-body lg:mt-4 lg:text-[17px]",
            introClassName,
          )}
        >
          {intro}
        </p>
      )}
    </div>
  );
  if (!aside) return <div className={className}>{block}</div>;
  return (
    <div className={cn("lg:flex lg:items-end lg:justify-between lg:gap-12", className)}>
      {block}
      <div className="mt-3 lg:mt-0 lg:shrink-0">{aside}</div>
    </div>
  );
}

interface FieldSectionProps extends Partial<Omit<FieldSectionHeaderProps, "id" | "className">> {
  /** Section id (an anchor target gets scroll-margin under the masthead). */
  id?: string;
  /** Heading id; defaults to `${id}-title`. */
  titleId?: string;
  /** Top rule: hairline (default), the 3px double rule that opens a major part, or none. */
  rule?: "hairline" | "double" | "none";
  tone?: "paper" | "light" | "shade";
  /** Vertical padding: default py-12 / lg:py-24, compact py-10 / lg:py-16. */
  pad?: "default" | "compact" | "none";
  children?: ReactNode;
  className?: string;
  /** The inner max-width container. */
  innerClassName?: string;
  headerClassName?: string;
  "aria-label"?: string;
}

const RULE = {
  hairline: "border-t border-rule",
  double: "border-t-[3px] border-double border-frame",
  none: "",
} as const;

const TONE = { paper: "", light: "bg-paper-light", shade: "bg-paper-shade" } as const;

const PAD = { default: "py-12 lg:py-24", compact: "py-10 lg:py-16", none: "" } as const;

/**
 * One page section: top rule, 1440 container with the 20px / 64px gutters,
 * and (when `title` is given) the section header. Children follow the header
 * directly; give the first child its own top margin (boards use mt-7 lg:mt-12).
 */
export function FieldSection({
  id,
  titleId,
  rule = "hairline",
  tone = "paper",
  pad = "default",
  children,
  className,
  innerClassName,
  headerClassName,
  title,
  "aria-label": ariaLabel,
  ...header
}: FieldSectionProps) {
  const headingId = title ? (titleId ?? (id ? `${id}-title` : undefined)) : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      aria-label={headingId ? undefined : ariaLabel}
      className={cn(
        RULE[rule],
        TONE[tone],
        id && "scroll-mt-[var(--header-h)]",
        className,
      )}
    >
      <div className={cn("mx-auto max-w-[1440px] px-5 lg:px-16", PAD[pad], innerClassName)}>
        {title && (
          <FieldSectionHeader {...header} title={title} id={headingId} className={headerClassName} />
        )}
        {children}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Plates: photographs and drawings                                     */
/* ------------------------------------------------------------------ */

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

/**
 * The field-guide drawings in public/images/field-guide (indexed in
 * finish/graphics/GRAPHICS.md), with the intrinsic size of each cutout.
 */
export const FIELD_DRAWINGS = {
  "highland-cow": [1200, 1200],
  "highland-calf": [1200, 1200],
  "highland-cow-head": [800, 800],
  "icelandic-sheep": [1200, 1200],
  "white-peacock": [1200, 960],
  "guardian-dog": [1200, 1200],
  hen: [800, 800],
  "sauna-cabin": [1200, 960],
  lodge: [1200, 960],
  cottage: [1200, 960],
  "airstream-camp": [1200, 960],
  "wedding-ceremony-site": [1200, 960],
  "gift-card": [1200, 800],
  "sword-fern": [800, 800],
  "douglas-fir-sprig": [800, 800],
  "vine-maple-leaf": [772, 772],
  "salal-sprig": [800, 800],
} as const satisfies Record<string, readonly [number, number]>;

export type FieldDrawingName = keyof typeof FIELD_DRAWINGS;

interface FieldDrawingProps {
  name: FieldDrawingName;
  /** Size it with width classes (h-auto keeps the ratio), e.g. "w-[96px] lg:w-[176px]". */
  className?: string;
  /** Rendered widths for next/image. Match the className. */
  sizes?: string;
  /** Decorative by default. Give alt only where the drawing means something alone (the 404). */
  alt?: string;
  /** Above-the-fold drawings only. Everything else stays lazy. */
  eager?: boolean;
}

/**
 * A field-guide drawing (the transparent `-cutout.webp`, never the cream file,
 * never a blend mode). Illustration is decoration: never a stand-in for a
 * photo, never a hero, never captioned as a photograph.
 */
export function FieldDrawing({
  name,
  className,
  sizes = "(min-width: 1024px) 260px, 120px",
  alt = "",
  eager = false,
}: FieldDrawingProps) {
  const [width, height] = FIELD_DRAWINGS[name];
  return (
    <Image
      src={`/images/field-guide/${name}-cutout.webp`}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      className={cn("h-auto object-contain", className)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Lists                                                                 */
/* ------------------------------------------------------------------ */

interface FieldRowsProps {
  rows: readonly { term: string; detail: ReactNode }[];
  /**
   * "hero": single-line rows, centred (the first-screen fact rows).
   * "list": multi-line rows, top-aligned (Know before you book, specs).
   */
  size?: "hero" | "list";
  /** Width of the term column, e.g. "w-[92px]". */
  termClassName?: string;
  /** Row height and gap overrides. */
  rowClassName?: string;
  detailClassName?: string;
  className?: string;
}

/** A ruled definition list: Cormorant term, Inter detail. */
export function FieldRows({
  rows,
  size = "hero",
  termClassName,
  rowClassName,
  detailClassName,
  className,
}: FieldRowsProps) {
  const list = size === "list";
  return (
    <dl className={cn("m-0 flex flex-col border-t border-rule", className)}>
      {rows.map((row) => (
        <div
          key={row.term}
          className={cn(
            list
              ? "flex items-start gap-3 border-b border-rule py-2.5 lg:gap-5 lg:py-3.5"
              : "flex min-h-[42px] items-center gap-3 border-b border-rule py-1.5 lg:min-h-[54px] lg:gap-5",
            rowClassName,
          )}
        >
          <dt
            className={cn(
              "shrink-0 font-display font-semibold leading-tight text-ink",
              list ? "w-[76px] text-[19px] lg:w-[120px] lg:text-[22px]" : "text-[20px] lg:text-[24px]",
              termClassName,
            )}
          >
            {row.term}
          </dt>
          <dd
            className={cn(
              "m-0 font-sans leading-snug text-ink-body",
              list ? "text-[14px] leading-[1.5] lg:text-[15px]" : "text-[13px] lg:text-[16px]",
              detailClassName,
            )}
          >
            {row.detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export interface FieldCatalogueItem {
  /** React key; defaults to the index. */
  id?: string;
  title: ReactNode;
  body?: ReactNode;
  /** A <Plate> (photo) or <FieldDrawing>. */
  media?: ReactNode;
  /** A line under the title (e.g. the italic Latin name, or a meta line). */
  subtitle?: ReactNode;
  /** Anything after the body: a quote, a price row, a text link. */
  footer?: ReactNode;
}

interface FieldCatalogueProps {
  items: readonly FieldCatalogueItem[];
  /** Number of the first item (a featured No. 1 drawn apart passes start={2}). */
  start?: number;
  /** Desktop columns. Phones always stack. */
  columns?: 1 | 2 | 3 | 4;
  /**
   * "above": media on top (home reasons). "side": a small drawing beside the
   * text on phones, on top from lg (tours "Who you'll meet").
   */
  mediaLayout?: "above" | "side";
  /** Hairline rules between items (tours "The short version"). */
  ruled?: boolean;
  /** Title size: md 26/30, lg 34/48. */
  titleSize?: "md" | "lg";
  className?: string;
  itemClassName?: string;
}

/** A catalogue numbered "No. 1, No. 2" (doors, animals, stays, shelves, reasons). */
export function FieldCatalogue({
  items,
  start = 1,
  columns = 1,
  mediaLayout = "above",
  ruled = false,
  titleSize = "md",
  className,
  itemClassName,
}: FieldCatalogueProps) {
  const side = mediaLayout === "side";
  return (
    <ul
      role="list"
      className={cn(
        "m-0 grid list-none grid-cols-1 p-0",
        ruled ? "border-t border-rule" : "gap-9",
        columns === 2 && "lg:grid-cols-2 lg:gap-x-10",
        columns === 3 && "lg:grid-cols-3 lg:gap-x-10",
        columns === 4 && "lg:grid-cols-4 lg:gap-x-10",
        ruled && columns > 1 && "lg:border-t-0",
        className,
      )}
    >
      {items.map((item, i) => (
        <li
          key={item.id ?? i}
          className={cn(
            side ? "grid grid-cols-[92px_1fr] items-start gap-4 lg:block" : "flex flex-col",
            ruled && "border-b border-rule py-6 lg:py-8",
            ruled && columns > 1 && "lg:border-b-0 lg:border-t",
            itemClassName,
          )}
        >
          {item.media}
          <div className={cn(item.media && (side ? "lg:mt-4" : "mt-4 lg:mt-5"))}>
            <FieldNo n={start + i} />
            <h3
              className={cn(
                "field-heading m-0 mt-0.5 font-display text-ink",
                titleSize === "lg"
                  ? "text-[34px] leading-[1.02] lg:text-[48px]"
                  : "text-[26px] leading-tight lg:text-[30px]",
              )}
            >
              {item.title}
            </h3>
            {item.subtitle && (
              <p className="m-0 font-display text-[15px] italic text-ink-note lg:text-[17px]">
                {item.subtitle}
              </p>
            )}
            {item.body && (
              <p className="m-0 mt-1.5 font-sans text-[15px] leading-[1.6] text-ink-body lg:mt-2 lg:text-[16px]">
                {item.body}
              </p>
            )}
            {item.footer}
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface FieldSequenceItem {
  /** React key; defaults to the index. */
  id?: string;
  title: ReactNode;
  body?: ReactNode;
  /** Optional media under the text (a small plate, a quote). */
  footer?: ReactNode;
}

interface FieldSequenceProps {
  items: readonly FieldSequenceItem[];
  start?: number;
  /** "rows": one ruled row per step (the hour, the ritual). "columns": three across from lg (the weekend). */
  layout?: "rows" | "columns";
  className?: string;
  itemClassName?: string;
}

/** A sequence in time, numbered I, II, III in fern Cormorant (CONSISTENCY #4). */
export function FieldSequence({
  items,
  start = 1,
  layout = "rows",
  className,
  itemClassName,
}: FieldSequenceProps) {
  const columns = layout === "columns";
  return (
    <ol
      role="list"
      className={cn(
        "m-0 list-none p-0",
        columns ? "grid gap-8 lg:grid-cols-3 lg:gap-12" : "border-b border-rule",
        className,
      )}
    >
      {items.map((item, i) => (
        <li
          key={item.id ?? i}
          className={cn(
            "grid grid-cols-[48px_1fr] gap-x-3",
            columns ? "lg:block" : "border-t border-rule py-5 lg:py-6",
            itemClassName,
          )}
        >
          <FieldNumeral n={start + i} className={cn(columns && "lg:block lg:text-[32px]")} />
          <div className={cn(columns && "lg:mt-3")}>
            <h3 className="m-0 font-display text-[24px] font-semibold leading-tight text-ink lg:text-[28px]">
              {item.title}
            </h3>
            {item.body && (
              <p className="m-0 mt-1.5 font-sans text-[15px] leading-[1.6] text-ink-body lg:text-[16px]">
                {item.body}
              </p>
            )}
            {item.footer}
          </div>
        </li>
      ))}
    </ol>
  );
}

export interface FieldDoor {
  /** React key; defaults to the title. */
  id?: string;
  title: ReactNode;
  /** The hint on the right: "Private, $150 for two". Replaced by "You are here" when current. */
  note?: ReactNode;
  href: string;
  current?: boolean;
  external?: boolean;
}

interface FieldDoorListProps {
  rows: readonly FieldDoor[];
  /** lg: the menu (22px, 52px rows). md: the footer (20/22px, 44/52px rows). */
  size?: "lg" | "md";
  /** Italic fern group label above the list ("Visit the farm"). */
  label?: ReactNode;
  className?: string;
  listClassName?: string;
}

/** The row classes of a door (for a door wrapped in another link component). */
export function fieldDoorRowClass(size: "lg" | "md" = "lg"): string {
  return cn(
    "group flex items-center justify-between gap-3 border-b border-rule text-ink",
    size === "lg" ? "min-h-[52px]" : "min-h-11 lg:min-h-[52px]",
  );
}

/** The inside of a door row: Cormorant name, Inter hint (or "You are here"). */
export function FieldDoorInner({
  title,
  note,
  current,
  size = "lg",
}: {
  title: ReactNode;
  note?: ReactNode;
  current?: boolean;
  size?: "lg" | "md";
}) {
  return (
    <>
      <span
        className={cn(
          "font-display font-semibold leading-none transition-colors group-hover:text-pine",
          size === "lg" ? "text-[22px]" : "text-[20px] lg:text-[22px]",
        )}
      >
        {title}
      </span>
      {current ? (
        <span className="font-display text-[15px] italic text-fern">You are here</span>
      ) : (
        note && <span className="text-right font-sans text-[13px] leading-snug text-ink-note">{note}</span>
      )}
    </>
  );
}

/** Ruled rows of doors: name on the left, a short hint on the right. Menu, footer, 404. */
export function FieldDoorList({ rows, size = "lg", label, className, listClassName }: FieldDoorListProps) {
  return (
    <div className={className}>
      {label && (
        <p className={cn("m-0 text-[15px] lg:text-[17px]", fieldEyebrowClass)}>{label}</p>
      )}
      <ul role="list" className={cn("m-0 list-none border-t border-rule p-0", label && "mt-1.5", listClassName)}>
        {rows.map((row, i) => (
          <li key={row.id ?? (typeof row.title === "string" ? row.title : i)}>
            <FieldLink
              href={row.href}
              external={row.external}
              aria-current={row.current ? "page" : undefined}
              className={fieldDoorRowClass(size)}
            >
              <FieldDoorInner title={row.title} note={row.note} current={row.current} size={size} />
            </FieldLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reviews (pure: counts and resolved quotes are passed in)              */
/* ------------------------------------------------------------------ */

/**
 * The three review tiers (CONSISTENCY #1): one number per screen.
 * hero "Loved by N guests on Google" (REVIEW_COUNT), nearCta "N five-star
 * reviews on Google" (FIVE_STAR_COUNT, only directly beside a booking or
 * inquiry action), compact "N reviews on Google" (REVIEW_COUNT).
 */
export type ReviewTier = "hero" | "nearCta" | "compact";

/**
 * `subject` names whose reviews they are, for a line that sits under one part
 * of the farm (a single stay), so the farm-wide count never reads as that
 * part's own: "Loved by N Highland Farms guests on Google".
 */
export function reviewTierText(tier: ReviewTier, count: number, subject?: string): string {
  const of = subject ? `${subject} ` : "";
  if (tier === "hero") return `Loved by ${count} ${of}guests on Google`;
  if (tier === "nearCta") return `${count} five-star ${of}reviews on Google`;
  return `${count} ${of}reviews on Google`;
}

interface FieldReviewLineProps {
  tier: ReviewTier;
  /** From @/lib/reviews (server) or passed down as a prop (client). Never a literal. */
  count: number;
  /** Link the line to Google (opens a new tab). */
  href?: string;
  /** Whose reviews, for a line under one stay: "Highland Farms". */
  subject?: string;
  starSize?: number;
  className?: string;
}

/** Five stars and a tier sentence. For server pages, prefer FieldReviewTier (binds the count). */
export function FieldReviewLine({ tier, count, href, subject, starSize = 13, className }: FieldReviewLineProps) {
  const inner = (
    <>
      <FieldStars size={starSize} />
      <span>{reviewTierText(tier, count, subject)}</span>
    </>
  );
  const base = "flex items-center gap-2 font-sans text-[13px] text-ink-note lg:text-[14px]";
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(base, "min-h-11 w-fit transition-colors hover:text-ink", className)}
      >
        {inner}
        <span className="sr-only"> (opens Google reviews in a new tab)</span>
      </a>
    );
  }
  return <p className={cn("m-0", base, className)}>{inner}</p>;
}

/** "2025-07-29" -> "July 2025". Parsed as a calendar date, so no timezone drift. */
export function fieldMonthYear(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(isoDate);
  if (!m) return "";
  const month = Number(m[2]);
  const names = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return names[month - 1] ? `${names[month - 1]} ${m[1]}` : "";
}

/** "Olivia B. · July 2025 · Google review" (CONSISTENCY #2). Empty parts are skipped. */
export function fieldAttribution(parts: { name: string; role?: string; when?: string }): string {
  return attributionParts(parts).join(" · ");
}

function attributionParts(parts: { name: string; role?: string; when?: string }): string[] {
  return [parts.name, parts.role, parts.when, "Google review"].filter((p): p is string => Boolean(p));
}

/** The attribution with each part kept whole, so a line breaks only at a dot. */
export function FieldAttributionText(parts: { name: string; role?: string; when?: string }) {
  return attributionParts(parts).map((part, i) => (
    <Fragment key={part}>
      {i > 0 && " · "}
      <span className="whitespace-nowrap">{part}</span>
    </Fragment>
  ));
}

export type FieldQuoteSize = "sm" | "md" | "lg";

const QUOTE_SIZE: Record<FieldQuoteSize, string> = {
  sm: "text-[19px] leading-[1.3] lg:text-[22px]",
  md: "text-[21px] leading-[1.3] lg:text-[25px]",
  lg: "text-[22px] leading-[1.28] lg:text-[28px]",
};

/** A quote already resolved from the snapshot (see resolveFieldQuote in field/Reviews.tsx). */
export interface ResolvedFieldQuote {
  quote: string;
  /** Display name: "Olivia B.", or a business in full. */
  name: string;
  /** "July 2025". */
  when: string;
  role?: string;
  rating: number;
}

interface FieldQuoteViewProps extends ResolvedFieldQuote {
  size?: FieldQuoteSize;
  /** The 2px pine-line rule on the left, for a quote set inside running text. */
  rule?: boolean;
  /** Five stars above the quote (shown only for a five-star review). */
  stars?: boolean;
  className?: string;
  quoteClassName?: string;
  metaClassName?: string;
}

/**
 * The one quote style (CONSISTENCY #2): Cormorant italic in curly quotes,
 * then `NAME · MONTH YEAR · GOOGLE REVIEW` in Inter caps. Pure, so a client
 * component can render a quote its server page resolved.
 */
export function FieldQuoteView({
  quote,
  name,
  when,
  role,
  rating,
  size = "md",
  rule = false,
  stars = false,
  className,
  quoteClassName,
  metaClassName,
}: FieldQuoteViewProps) {
  return (
    <figure className={cn("m-0", rule && "border-l-2 border-pine-line pl-4", className)}>
      {stars && rating === 5 && <FieldStars size={13} className="mb-2.5" />}
      <blockquote className="m-0">
        <p className={cn("m-0 font-display italic text-ink", QUOTE_SIZE[size], quoteClassName)}>
          &ldquo;{quote}&rdquo;
        </p>
      </blockquote>
      <figcaption
        className={cn(fieldAttributionClass, "mt-1.5", size !== "sm" && "mt-2 lg:text-[12px]", metaClassName)}
      >
        <FieldAttributionText name={name} role={role} when={when} />
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Pending facts                                                         */
/* ------------------------------------------------------------------ */

interface PendingSlotProps {
  /** What is pending and what to do: "PENDING CONNOR C3: Connor is on the farm for every wedding." */
  note: string;
  /** Content that depends on the unanswered fact. Shown in development only. */
  children?: ReactNode;
  /** A short inline marker inside running text. */
  inline?: boolean;
  className?: string;
}

/**
 * A `[PENDING CONNOR]` / `[DECIDE]` slot. Renders NOTHING in a production
 * build, children included, so production never shows an unconfirmed claim.
 * In development it shows a dashed note so the gap stays visible.
 */
export function PendingSlot({ note, children, inline = false, className }: PendingSlotProps) {
  if (process.env.NODE_ENV === "production") return null;
  if (inline) {
    return (
      <span
        data-pending=""
        className={cn(
          "border border-dashed border-leader bg-paper-shade px-1 font-sans text-[12px] normal-case tracking-normal text-ink-note",
          className,
        )}
      >
        [{note}]{children && <> {children}</>}
      </span>
    );
  }
  return (
    <div data-pending="" className={cn("border border-dashed border-star bg-paper-light p-2.5", className)}>
      <p className="m-0 font-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-meta">
        Pending &middot; hidden in production until answered
      </p>
      <p className="m-0 mt-1 font-sans text-[12px] leading-snug text-ink-note">{note}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
