import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidToken, tokenFromRequest } from "@/lib/shop/admin-auth";
import { listBookingsRange, listBlackoutsRange, listSchedules } from "@/lib/booking/store";
import { addDays } from "@/lib/booking/time";

/**
 * Admin read: everything the calendar screen needs for one date range in a
 * single request — bookings (any status), blackouts overlapping the range,
 * and every schedule rule (unfiltered; see `listSchedules`'s own note on why
 * a date-clipped slice would be the wrong thing to hand the engine's
 * latest-effectiveFrom logic).
 */

export const dynamic = "force-dynamic";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const querySchema = z.object({
  from: z.string().regex(dateRe),
  to: z.string().regex(dateRe),
});

export async function GET(request: Request) {
  if (!isValidToken(tokenFromRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "from and to (YYYY-MM-DD) are required." }, { status: 400 });
  }
  const { from, to } = parsed.data;
  if (to < from) {
    return NextResponse.json({ error: "to must be on or after from." }, { status: 400 });
  }

  try {
    // One extra UTC day on the upper bound, same reasoning as
    // `getScheduleData`: a Pacific evening slot on `to` can land on the next
    // UTC date.
    const [bookings, blackouts, schedules] = await Promise.all([
      listBookingsRange(`${from}T00:00:00Z`, `${addDays(to, 1)}T23:59:59Z`),
      listBlackoutsRange(from, to),
      listSchedules(),
    ]);
    return NextResponse.json({ bookings, blackouts, schedules });
  } catch (err) {
    console.error("[booking-admin] range read failed:", err);
    return NextResponse.json({ error: "Could not load bookings." }, { status: 500 });
  }
}
