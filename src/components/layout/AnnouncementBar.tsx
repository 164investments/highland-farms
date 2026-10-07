"use client";

import { useEffect } from "react";
import Link from "next/link";
import { giftCertificatesHref } from "@/lib/booking/flag";
import { BOOKING_PRODUCTS } from "@/lib/booking/products";
import { DELIVERY_FEE_CENTS, DELIVERY_MINIMUM_CENTS } from "@/lib/shop/fulfillment";
import { WeddingCallLink } from "@/components/field/WeddingCallLink";
import {
  SEASON_SCRIPT,
  activeSeasons,
  barFor,
  pacificToday,
  type BarId,
  type PageType,
  type SeasonId,
} from "./chrome";

/*
 * The one-line pine bar above the name row (CONSISTENCY #8). No dismiss
 * button: it scrolls away with the page while the name row stays pinned
 * (Header translates the masthead up 40px). Home, weddings and the portfolio
 * never get one; seasonal bars hide outside their dates.
 *
 * Visibility lives on <html>: data-bar-hidden collapses the bar and the
 * --header-h defaults in globals.css. The inline scripts set it before the
 * first paint from the visitor's own clock, so a page prerendered weeks ago
 * still shows the right bar; the effect keeps it right across client
 * navigations.
 */

const LINK =
  "ml-1 inline-flex min-h-10 items-center font-medium underline decoration-paper-light/60 underline-offset-4 transition-colors hover:decoration-paper-light";

const dollars = (cents: number) => `$${cents % 100 === 0 ? cents / 100 : (cents / 100).toFixed(2)}`;

function GiftLink() {
  const href = giftCertificatesHref();
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={LINK}>
        Gift certificates
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      Gift certificates
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function BarCopy({ id }: { id: BarId }) {
  switch (id) {
    case "call":
      return (
        <p className="m-0 whitespace-nowrap">
          <span className="hidden lg:inline">Now booking 2027 weddings. </span>
          <WeddingCallLink content="announcement-bar-call" title="Announcement bar: wedding call" className={LINK}>
            Book a free {BOOKING_PRODUCTS["wedding-call"].durationMin}-minute call with Connor
          </WeddingCallLink>
        </p>
      );
    case "gift":
      return (
        <p className="m-0 whitespace-nowrap">
          <span className="lg:hidden">Giving it as a gift?</span>
          <span className="hidden lg:inline">Give a private farm tour or a Nordic spa session this year.</span>{" "}
          <GiftLink />
        </p>
      );
    case "stays":
      return (
        <p className="m-0 whitespace-nowrap">
          <span className="lg:hidden">Thanksgiving, Nov 24 to 28.</span>
          <span className="hidden lg:inline">Thanksgiving on the farm: four nights, November 24 to 28, 2026.</span>{" "}
          <Link href="/thanksgiving#packages" className={LINK}>
            <span className="lg:hidden">See packages</span>
            <span className="hidden lg:inline">See the packages</span>
          </Link>
        </p>
      );
    case "shop":
      return (
        <p className="m-0 whitespace-nowrap">
          <span className="lg:hidden">
            Free farm pickup. {dollars(DELIVERY_FEE_CENTS)} delivery on {dollars(DELIVERY_MINIMUM_CENTS)}+.
          </span>
          <span className="hidden lg:inline">
            Free pickup at the farm in Brightwood, or {dollars(DELIVERY_FEE_CENTS)} local delivery on orders of{" "}
            {dollars(DELIVERY_MINIMUM_CENTS)} or more. We don&apos;t ship.
          </span>
        </p>
      );
  }
}

/** Runs where the bar would be: hide it now if this route has none or its season is over. */
function barScript(season: SeasonId | undefined, hasBar: boolean): string {
  const hide = 'document.documentElement.setAttribute("data-bar-hidden","1")';
  const show = 'document.documentElement.removeAttribute("data-bar-hidden")';
  if (!hasBar) return `${SEASON_SCRIPT}try{${hide}}catch(e){}`;
  if (!season) return `${SEASON_SCRIPT}try{${show}}catch(e){}`;
  return `${SEASON_SCRIPT}try{var s=(document.documentElement.getAttribute("data-season")||"").split(" ");if(s.indexOf(${JSON.stringify(season)})<0){${hide}}else{${show}}}catch(e){}`;
}

export function AnnouncementBar({ type }: { type: PageType }) {
  const bar = barFor(type);
  const id = bar?.id;
  const season = bar?.season;

  useEffect(() => {
    const html = document.documentElement;
    const seasons = activeSeasons(pacificToday());
    html.setAttribute("data-season", seasons.join(" "));
    const on = Boolean(id) && (!season || seasons.includes(season));
    if (on) html.removeAttribute("data-bar-hidden");
    else html.setAttribute("data-bar-hidden", "1");
  }, [id, season]);

  return (
    <>
      {bar && (
        <div
          data-announcement-bar=""
          className="flex h-10 items-center justify-center overflow-hidden bg-pine px-4 text-center font-sans text-[12.5px] leading-none text-paper-light lg:text-[13px]"
        >
          <BarCopy id={bar.id} />
        </div>
      )}
      <script dangerouslySetInnerHTML={{ __html: barScript(season, Boolean(bar)) }} />
    </>
  );
}
