import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BookingTextLink } from "@/components/shared/BookingButton";
import { FieldArrow, FieldLink, fieldLeaderClass } from "@/components/ui/FieldGuide";

/*
 * Price rows: name, dotted leader, price. A row is static, a link, or a
 * booking (BookingTextLink, so booking_start + InitiateCheckout fire and the
 * Acuity modal opens). No data imports: safe in client components too.
 */

type RowSize = "lg" | "md" | "sm";

const ROW: Record<RowSize, string> = {
  lg: "min-h-[52px] items-center gap-2.5 border-b border-rule lg:min-h-14",
  md: "min-h-[46px] items-center gap-3 border-b border-rule",
  sm: "items-baseline gap-2 py-1",
};

const LABEL: Record<RowSize, string> = {
  lg: "font-display text-[22px] font-medium leading-none lg:text-[26px]",
  md: "font-display text-[20px] font-medium leading-none lg:text-[22px]",
  sm: "font-sans text-[15px] text-ink-body",
};

const PRICE: Record<RowSize, string> = {
  lg: "font-sans text-[15px] lg:text-[17px]",
  md: "font-sans text-[15px] font-semibold",
  sm: "font-sans text-[15px] font-semibold",
};

export interface FieldPriceRowProps {
  label: ReactNode;
  price: ReactNode;
  /** Small pine caps tag: "Most popular", "Private session". Only when the data proves it. */
  tag?: ReactNode;
  /** Put the tag under the label instead of beside it. */
  tagBelow?: boolean;
  /** lg: booking rows (22/26). md: listed prices (20/22). sm: summary lines (Inter 15, no rule). */
  size?: RowSize;
  /** The paper-shade band that marks the default choice. */
  highlight?: boolean;
  /** A site or external link. */
  href?: string;
  external?: boolean;
  /** Opens the booking modal through BookingTextLink (keeps booking_start). */
  booking?: { href: string; label: string; title?: string };
  /** Screen-reader suffix for an action row, e.g. ", see open dates". */
  srAction?: string;
  /** Arrow on action rows (default true when the row is a link or booking). */
  arrow?: boolean;
  className?: string;
  labelClassName?: string;
  priceClassName?: string;
}

/** One price row. */
export function FieldPriceRow({
  label,
  price,
  tag,
  tagBelow = false,
  size = "lg",
  highlight = false,
  href,
  external,
  booking,
  srAction,
  arrow,
  className,
  labelClassName,
  priceClassName,
}: FieldPriceRowProps) {
  const actionable = Boolean(href || booking);
  const showArrow = arrow ?? actionable;
  const tagNode = tag && (
    <span
      className={cn(
        "font-sans text-[11px] uppercase tracking-[0.1em] text-pine lg:text-[12px]",
        tagBelow && "mt-1",
      )}
    >
      {tag}
    </span>
  );
  const labelNode = (
    <span className={cn(LABEL[size], highlight && size !== "sm" && "font-semibold", labelClassName)}>
      {label}
    </span>
  );
  const inner = (
    <>
      {tag && tagBelow ? (
        <span className="flex flex-col">
          {labelNode}
          {tagNode}
        </span>
      ) : (
        <>
          {labelNode}
          {tagNode}
        </>
      )}
      <span
        aria-hidden="true"
        className={cn(fieldLeaderClass, size === "sm" && "-translate-y-1")}
      />
      <span className={cn(PRICE[size], priceClassName)}>{price}</span>
      {srAction && <span className="sr-only">{srAction}</span>}
      {showArrow && <FieldArrow className="text-pine" />}
    </>
  );
  const classes = cn(
    "flex w-full text-left text-ink",
    ROW[size],
    highlight && "-mx-2.5 w-[calc(100%+20px)] bg-paper-shade px-2.5",
    highlight && size === "lg" && "min-h-[56px] lg:min-h-16",
    actionable && "cursor-pointer transition-colors hover:text-pine",
    className,
  );
  if (booking) {
    return (
      <BookingTextLink href={booking.href} label={booking.label} title={booking.title} className={classes}>
        {inner}
      </BookingTextLink>
    );
  }
  if (href) {
    return (
      <FieldLink href={href} external={external} className={classes}>
        {inner}
      </FieldLink>
    );
  }
  return <div className={classes}>{inner}</div>;
}

/** A row inside FieldPriceRows; `id` is the React key (defaults to the index). */
export type FieldPriceRowData = FieldPriceRowProps & { id?: string };

interface FieldPriceRowsProps {
  rows: readonly FieldPriceRowData[];
  /** A small caps label above the list ("How many are coming? Pick to see dates"). */
  label?: ReactNode;
  /** Needed with `label`, so the list is labelled for screen readers. */
  labelId?: string;
  size?: RowSize;
  /** Desktop columns (gift ledgers use 2). */
  columns?: 1 | 2 | 3;
  className?: string;
  listClassName?: string;
}

/** A ruled list of price rows under an optional small-caps label. */
export function FieldPriceRows({
  rows,
  label,
  labelId,
  size = "lg",
  columns = 1,
  className,
  listClassName,
}: FieldPriceRowsProps) {
  return (
    <div className={className}>
      {label && (
        <p
          id={labelId}
          className="m-0 mb-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink-meta lg:mb-2 lg:text-[12px]"
        >
          {label}
        </p>
      )}
      <ul
        role="list"
        aria-labelledby={label && labelId ? labelId : undefined}
        className={cn(
          "m-0 list-none p-0",
          size !== "sm" && "border-t border-rule",
          columns === 2 && "lg:grid lg:grid-cols-2 lg:gap-x-8",
          columns === 3 && "lg:grid lg:grid-cols-3 lg:gap-x-8",
          listClassName,
        )}
      >
        {rows.map(({ id, ...row }, i) => (
          <li key={id ?? i}>
            <FieldPriceRow size={size} {...row} />
          </li>
        ))}
      </ul>
    </div>
  );
}
