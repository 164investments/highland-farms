"use client";

import { cn } from "@/lib/utils";
import { MinusIcon, PlusIcon } from "./icons";

/**
 * The quantity stepper: minus, count, plus, in the board's square frame.
 * `controlled` is the cart's own count (shop rows, cart lines); the product
 * page uses `onType` as well for the free-text field.
 */
export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  size = "row",
  variant = "frame",
  className,
  live = false,
}: {
  value: number;
  onChange: (next: number) => void;
  /** Lowest value the minus button can reach; below it the minus removes (onChange(0)). */
  min?: number;
  max?: number;
  /** Product name for the accessible labels ("ground beef"). */
  label: string;
  /** "pdp" 52px, "cart" 44px, "row" 44px with the pine outline. */
  size?: "pdp" | "cart" | "row";
  variant?: "frame" | "pine";
  className?: string;
  live?: boolean;
}) {
  const box = size === "pdp" ? "h-[52px]" : "h-11";
  const btn = size === "pdp" ? "h-[50px] w-11" : "h-[42px] w-11";
  return (
    <div
      role="group"
      aria-label={`Quantity of ${label}`}
      className={cn(
        "flex shrink-0 items-center bg-paper-light",
        box,
        variant === "pine" ? "border border-pine text-pine" : "border border-frame text-ink",
        className,
      )}
    >
      <button
        type="button"
        aria-label={`One fewer ${label}`}
        onClick={() => onChange(value - 1 < min ? 0 : value - 1)}
        className={cn("flex items-center justify-center", btn)}
      >
        <MinusIcon size={size === "pdp" ? 16 : 14} />
      </button>
      <span
        aria-live={live ? "polite" : undefined}
        className={cn(
          "text-center font-semibold text-ink",
          size === "pdp" ? "w-9 text-[16px]" : "min-w-6 flex-1 text-[15px] w-7",
        )}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`One more ${label}`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn("flex items-center justify-center disabled:opacity-40", btn)}
      >
        <PlusIcon size={size === "pdp" ? 16 : 14} />
      </button>
    </div>
  );
}
