import { DELIVERY_FEE_CENTS, DELIVERY_MINIMUM_CENTS } from "@/lib/shop/fulfillment";
import { formatCents, formatCentsShort } from "@/lib/shop/money";

/**
 * "$36 of $50 for local delivery" with the goal bar and the true gap. Hidden at
 * or above the minimum. Pickup stays free either way.
 */
export function DeliveryGoal({ subtotalCents, headingClass = "text-[24px] lg:text-[26px]" }: { subtotalCents: number; headingClass?: string }) {
  const min = DELIVERY_MINIMUM_CENTS;
  if (subtotalCents >= min) {
    return (
      <div className="border-b border-rule pb-3">
        <h2 className={`m-0 font-display font-medium leading-none ${headingClass}`}>Want it delivered?</h2>
        <p className="m-0 mt-3 text-[13px] leading-[1.45] text-ink-body">
          Your order reaches the {formatCentsShort(min)} delivery minimum. Delivery is{" "}
          {formatCentsShort(DELIVERY_FEE_CENTS)}, and checkout checks your ZIP.
        </p>
      </div>
    );
  }
  const pct = Math.max(4, Math.round((subtotalCents / min) * 100));
  return (
    <div className="border-b border-rule pb-3">
      <h2 className={`m-0 font-display font-medium leading-none ${headingClass}`}>Want it delivered?</h2>
      <p className="m-0 mt-3 text-[13px] text-ink-body">
        <span className="font-semibold text-ink">{formatCentsShort(subtotalCents)}</span> of {formatCentsShort(min)} for local delivery
      </p>
      <div
        className="mt-1.5 h-1.5 bg-paper-shade"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={min / 100}
        aria-valuenow={Math.floor(subtotalCents / 100)}
        aria-label={`Progress to the ${formatCentsShort(min)} delivery minimum`}
      >
        <div className="h-full bg-fern" style={{ width: `${pct}%` }} />
      </div>
      <p className="m-0 mt-2 text-[13px] leading-[1.45] text-ink-note">
        Add {formatCents(min - subtotalCents).replace(/\.00$/, "")} and we drive it to you for {formatCentsShort(DELIVERY_FEE_CENTS)}. Pickup stays free at any total.
      </p>
    </div>
  );
}
