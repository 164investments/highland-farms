"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { FieldArrow } from "@/components/ui/FieldGuide";
import { giftCertificatesHref } from "@/lib/booking/flag";
import { appendAttributionToUrl, getClientAttribution } from "@/lib/attribution";
import { pushEvent } from "./track";

/**
 * "Choose a gift": the shop's gift CTA. Internal page (/gift-certificates) or
 * the Acuity catalog (new tab, attribution appended), per giftCertificatesHref().
 *
 * Exactly one booking_start per gift intent. The external link opens Acuity
 * itself, so it pushes booking_start here. The internal link only navigates:
 * the row the visitor picks on /gift-certificates pushes booking_start when it
 * opens Acuity (BookingTextLink), so pushing one here as well would count the
 * same gift twice, and count visitors who never open Acuity at all.
 * select_promotion is pushed on both.
 */
export function GiftLink({ className }: { className?: string }) {
  const href = giftCertificatesHref();
  const external = !href.startsWith("/");
  const promote = () =>
    pushEvent("select_promotion", {
      promotion_id: "gift-certificates",
      promotion_name: "Gift Certificates",
      creative_slot: "shop_gift_section",
    });
  const track = (url: string) => {
    promote();
    pushEvent("booking_start", {
      booking_type: "gift_certificate",
      booking_url: url,
      booking_title: "Gift Certificates",
    });
  };
  if (!external) {
    return (
      <Link href={href} onClick={promote} className={cn(className)}>
        Choose a gift
        <FieldArrow />
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        event.currentTarget.href = appendAttributionToUrl(href, getClientAttribution());
        track(event.currentTarget.href);
      }}
      className={className}
    >
      Choose a gift
      <FieldArrow />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
