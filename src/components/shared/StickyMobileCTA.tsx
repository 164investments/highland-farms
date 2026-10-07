"use client";

import {
  StickyAction,
  StickyActionRow,
  StickyShell,
  type StickyActionSpec,
} from "@/components/field/StickyShell";

interface StickyMobileCTAProps {
  label: string;
  href: string;
  sublabel?: string;
  className?: string;
  external?: boolean;
  /** If provided, the CTA fires onClick instead of navigating (e.g. to open a modal). */
  onClick?: () => void;
  /** Selectors that hide the bar while on screen (the form, the booking widget). */
  hideWhenVisible?: string | readonly string[];
  /** The outlined 1/3 action (gift season). */
  secondary?: StickyActionSpec;
  /** Extra gate. Default true. */
  enabled?: boolean;
}

/**
 * The bottom sticky action on phones, kept for existing import sites and for
 * BookingStickyCTA. New code: FieldStickyBar (src/components/field/StickyBar.tsx),
 * which also opens bookings with tracking. Same bar, same rules (StickyShell).
 */
export function StickyMobileCTA({
  label,
  href,
  sublabel,
  className,
  external,
  onClick,
  hideWhenVisible,
  secondary,
  enabled,
}: StickyMobileCTAProps) {
  return (
    <StickyShell className={className} hideWhenVisible={hideWhenVisible} enabled={enabled}>
      <StickyActionRow
        primary={
          <StickyAction action={{ label, href, sublabel, external, onClick }} variant="primary" />
        }
        secondary={secondary ? <StickyAction action={secondary} variant="secondary" /> : undefined}
      />
    </StickyShell>
  );
}
