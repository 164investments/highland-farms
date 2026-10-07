"use client";

import { BookingTextLink } from "@/components/shared/BookingButton";
import {
  StickyAction,
  StickyActionContent,
  StickyActionRow,
  StickyShell,
  stickyActionClass,
  type StickyActionSpec,
  type StickyVisibilityOptions,
} from "@/components/field/StickyShell";

export interface FieldStickyAction extends StickyActionSpec {
  /**
   * Open the Acuity booking modal for `href` through BookingTextLink, so
   * booking_start and InitiateCheckout fire. Pass `{ title }` to name the modal.
   */
  booking?: boolean | { title?: string };
}

interface FieldStickyBarProps extends StickyVisibilityOptions {
  primary: FieldStickyAction;
  /** The outlined third (gift season on tours and spa: "Give it" -> /gift-certificates). */
  secondary?: FieldStickyAction;
  className?: string;
}

function Action({ action, variant }: { action: FieldStickyAction; variant: "primary" | "secondary" }) {
  if (action.booking && action.href) {
    const title = typeof action.booking === "object" ? action.booking.title : undefined;
    return (
      <BookingTextLink
        href={action.href}
        label={action.label}
        title={title}
        className={stickyActionClass(variant, action.sublabel)}
      >
        <StickyActionContent label={action.label} sublabel={action.sublabel} arrow={variant === "primary"} />
      </BookingTextLink>
    );
  }
  return <StickyAction action={action} variant={variant} />;
}

/**
 * The page's one bottom sticky action on phones (CONSISTENCY #13). Mount it
 * once per page that sells or takes an inquiry, anywhere in the page tree.
 *
 *   <FieldStickyBar primary={{ label: "Check your date", href: "#contact" }} hideWhenVisible="#contact" />
 *   <FieldStickyBar
 *     primary={{ label: "See tour dates", sublabel: "Private, $150 for two",
 *                href: bookingUrl(BOOKING_LINKS.farmTourForTwo, "farm-tours-sticky-mobile"), booking: true }}
 *     hideWhenVisible="#choose"
 *   />
 *
 * Pages with no first-screen CTA pass `showOnLoad`, so the bar is there from
 * the first screen (still hidden while its target is on screen):
 *
 *   <FieldStickyBar primary={{ label: "Check your date", href: "/weddings#contact" }} hideWhenVisible="#plan" showOnLoad />
 */
export function FieldStickyBar({ primary, secondary, className, ...visibility }: FieldStickyBarProps) {
  return (
    <StickyShell className={className} {...visibility}>
      <StickyActionRow
        primary={<Action action={primary} variant="primary" />}
        secondary={secondary ? <Action action={secondary} variant="secondary" /> : undefined}
      />
    </StickyShell>
  );
}
