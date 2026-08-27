import { NextResponse } from "next/server";
import { z } from "zod";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { getScheduleData } from "@/lib/booking/store";
import { computeAvailability, comboDays } from "@/lib/booking/engine";
import {
  BOOKING_PRODUCTS, COMBO, getBookingProduct, unitsFor, type BookingSlug,
} from "@/lib/booking/products";
import { addDays, pacificDateStr } from "@/lib/booking/time";

const querySchema = z.object({
  product: z.enum(["farm-tour", "nordic-spa", "wedding-call", "combo"]),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  party: z.coerce.number().int().min(1).max(6).default(2),
});

export async function GET(request: Request) {
  if (!nativeCalendarEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad query" }, { status: 400 });
  }
  const { product: slug, from, to, party } = parsed.data;
  const now = new Date();

  // Clamp: never in the past (Pacific today) and at most 62 days per request.
  const today = pacificDateStr(now);
  const lo = from < today ? today : from;
  const hi = to > addDays(lo, 62) ? addDays(lo, 62) : to;
  if (hi < lo) {
    return NextResponse.json({ days: [] }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  }

  // Clamp again to the product's own horizon — combo uses the tighter of its
  // two legs, since neither leg can be booked past its own horizon.
  const horizonDaysFor = (slugs: BookingSlug[]) =>
    Math.min(...slugs.map((s) => BOOKING_PRODUCTS[s].horizonDays));
  const horizonSlugs: BookingSlug[] =
    slug === "combo" ? ["farm-tour", "nordic-spa"] : [slug];
  const horizonCap = addDays(today, horizonDaysFor(horizonSlugs));
  const hiClamped = hi > horizonCap ? horizonCap : hi;
  if (hiClamped < lo) {
    return NextResponse.json({ days: [] }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  }

  try {
    if (slug === "combo") {
      const data = await getScheduleData(["farm-tour", "nordic-spa"], lo, hiClamped);
      const tour = computeAvailability({
        product: BOOKING_PRODUCTS["farm-tour"], from: lo, to: hiClamped, now, ...data,
      });
      const spa = computeAvailability({
        product: BOOKING_PRODUCTS["nordic-spa"], from: lo, to: hiClamped, now, ...data,
      });
      const days = comboDays(tour, spa, {
        tourUnitsNeeded: unitsFor(BOOKING_PRODUCTS["farm-tour"], party),
        spaUnitsNeeded: unitsFor(BOOKING_PRODUCTS["nordic-spa"], party),
        bufferMin: COMBO.bufferMin,
        tourDurationMin: BOOKING_PRODUCTS["farm-tour"].durationMin,
        spaDurationMin: BOOKING_PRODUCTS["nordic-spa"].durationMin,
      });
      return NextResponse.json({ days }, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
      });
    }

    const product = getBookingProduct(slug)!;
    const data = await getScheduleData([slug], lo, hiClamped);
    const days = computeAvailability({ product, from: lo, to: hiClamped, now, ...data });
    return NextResponse.json({ days }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (err) {
    console.error("[booking] availability error:", err);
    return NextResponse.json({ error: "Availability unavailable" }, { status: 503 });
  }
}
