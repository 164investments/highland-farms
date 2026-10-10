import { NextResponse } from "next/server";
import { calendarAuthorized } from "@/lib/booking/calendar-auth";
import { calendarDate } from "@/lib/booking/calendar-schema";
import { getScheduleData, listSchedules, listBlackoutsRange, listTimedBlackoutsRange } from "@/lib/booking/store";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!calendarAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const from = calendarDate.safeParse(url.searchParams.get("from"));
  const to = calendarDate.safeParse(url.searchParams.get("to"));
  if (!from.success || !to.success || to.data < from.data || Date.parse(to.data) - Date.parse(from.data) > 62 * 86400000) {
    return NextResponse.json({ error: "Use a date range of at most 63 days." }, { status: 400 });
  }
  try {
    const [data, schedules, blackouts, timedBlackouts] = await Promise.all([
      getScheduleData(["farm-tour", "nordic-spa", "wedding-call"], from.data, to.data),
      listSchedules(), listBlackoutsRange(from.data, to.data),
      listTimedBlackoutsRange(from.data, to.data),
    ]);
    const booked = new Map<string, { productSlug: string; startsAtIso: string; units: number }>();
    for (const row of data.booked) {
      const key = `${row.productSlug}:${row.startsAtIso}`;
      const previous = booked.get(key);
      booked.set(key, { ...row, units: row.units + (previous?.units ?? 0) });
    }
    return NextResponse.json({ timezone: "America/Los_Angeles", from: from.data, to: to.data, schedules,
      exceptions: data.exceptions,
      blackouts: blackouts.map(({ id, kind, startsOn, endsOn, productSlugs }) => ({ id, kind, startsOn, endsOn, productSlugs })),
      timedBlackouts,
      booked: [...booked.values()],
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Calendar is unavailable." }, { status: 503 }); }
}
