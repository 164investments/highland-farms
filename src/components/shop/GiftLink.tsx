"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { FieldArrow } from "@/components/ui/FieldGuide";
import { giftCertificatesHref } from "@/lib/booking/flag";
import { appendAttributionToUrl, getClientAttribution } from "@/lib/attribution";
import { pushEvent } from "./track";

/**
 * "Choose a gift": the shop's gift CTA. Internal page when the native calendar
 * is on, the Acuity catalog (new tab, attribution appended) otherwise. Keeps
 * select_promotion and booking_start exactly as the old gift section pushed.
 */
export function GiftLink({ className }: { className?: string }) {
  const href = giftCertificatesHref();
  const external = !href.startsWith("/");
  const track = (url: string) => {
    pushEvent("select_promotion", {
      promotion_id: "gift-certificates",
      promotion_name: "Gift Certificates",
      creative_slot: "shop_gift_section",
    });
    pushEvent("booking_start", {
      booking_type: "gift_certificate",
      booking_url: url,
      booking_title: "Gift Certificates",
    });
  };
  if (!external) {
    return (
      <Link href={href} onClick={() => track(href)} className={cn(className)}>
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
