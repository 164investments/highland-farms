import { FieldPriceRows, type FieldPriceRowData } from "@/components/field/PriceRows";
import { TOUR_PARTY_SIZES } from "@/data/farm-tours";
import { SPA_SPOT_ROWS, withSpaQuantity } from "@/data/nordic-spa";
import { BOOKING_LINKS, FARM_TOUR_PARTY_LINKS, bookingUrl } from "@/lib/constants";

/*
 * The party-size pickers on the visit pages. Every row is a real booking link
 * (BookingTextLink through FieldPriceRow), so booking_start and InitiateCheckout
 * fire with the row's party size and price (src/lib/booking/tracking.ts reads
 * them from the utm_content built here), and the Acuity modal opens at that
 * size's calendar. With the native calendar on, a row scrolls to #book
 * instead (the native booking flow).
 */

const rowTag =
  "font-sans text-[11px] uppercase tracking-[0.1em] text-pine lg:text-[12px]";

interface PickerProps {
  /** hero: first-screen rows (46/48px); pricing: the booking section (52px). */
  where: "hero" | "pricing";
  label: string;
  labelId: string;
  /** Native calendar on: rows jump to the native booking section. */
  native?: boolean;
}

/** /farm-tours: 2 to 6 guests, the 2-guest row marked (85% of tours are parties of two). */
export function TourPicker({ where, label, labelId, native = false }: PickerProps) {
  const rows: FieldPriceRowData[] = TOUR_PARTY_SIZES.map(({ guests, total, popular }) => {
    const row: FieldPriceRowData = {
      id: String(guests),
      label: popular ? (
        <span className="flex items-baseline gap-2.5 max-[359px]:flex-col max-[359px]:gap-1">
          <span>{guests} guests</span>
          <span className={rowTag}>Most popular</span>
        </span>
      ) : (
        `${guests} guests`
      ),
      price: `$${total}`,
      highlight: popular,
      priceClassName: popular ? "font-semibold" : undefined,
      className: where === "hero" ? "min-h-[46px] lg:min-h-14 lg:gap-3" : undefined,
      srAction: ", see open dates",
    };
    if (native) return { ...row, href: "#book" };
    return {
      ...row,
      booking: {
        href: bookingUrl(FARM_TOUR_PARTY_LINKS[guests], `farm-tours-${where}-${guests}`),
        label: `${guests} guests`,
        title: `Book a farm tour for ${guests}`,
      },
    };
  });
  return <FieldPriceRows label={label} labelId={labelId} rows={rows} />;
}

interface SpaPickerProps extends PickerProps {
  /** utm_content prefix: "nordic-spa" or "sauna-near-portland". */
  prefix: "nordic-spa" | "sauna-near-portland";
}

/**
 * /nordic-spa and /sauna-near-portland: 1, 2, 3 to 5 or all six spots. Every
 * row opens the same class calendar (type 85942611) with its own utm_content;
 * rows with a fixed count also prefill Acuity's Quantity (`?quantity=N`), so
 * "All six spots, $450" opens at 6 x $75 with only fully open sessions
 * selectable. The modal prints a matching line under its title.
 */
export function SpaPicker({ where, prefix, label, labelId, native = false }: SpaPickerProps) {
  const rows: FieldPriceRowData[] = SPA_SPOT_ROWS.map((spot) => {
    const six = spot.key === "6";
    const compact = spot.key === "3to5" || (where === "hero" && !six);
    const row: FieldPriceRowData = {
      id: spot.key,
      label: spot.label,
      price: spot.price,
      highlight: six,
      priceClassName: six ? "font-semibold" : undefined,
      className: compact ? "min-h-[48px] lg:min-h-14" : undefined,
      srAction: ", see open sessions",
      ...("tag" in spot
        ? {
            tag: (
              <>
                {spot.tag}
                <span className="max-[359px]:hidden"> &middot; {spot.tagExtra}</span>
              </>
            ),
            tagBelow: true,
          }
        : {}),
    };
    if (native) return { ...row, href: "#book" };
    return {
      ...row,
      booking: {
        href: withSpaQuantity(
          bookingUrl(BOOKING_LINKS.nordicSpa, `${prefix}-${where}-${spot.key}`),
          "quantity" in spot ? spot.quantity : undefined,
          spot.key === "3to5" ? "3-5" : undefined,
        ),
        label: spot.label,
        title:
          spot.key === "3to5"
            ? "Book a Nordic spa session for 3 to 5 people"
            : six
              ? "Book all six spots for a private Nordic spa session"
              : `Book a Nordic spa session for ${spot.label.split(" ")[0]}`,
      },
    };
  });
  return <FieldPriceRows label={label} labelId={labelId} rows={rows} />;
}
