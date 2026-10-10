import { NextResponse } from "next/server";
import { z } from "zod";
import { calendarAuthorized } from "@/lib/booking/calendar-auth";
import { calendarDate, calendarProduct, dateScheduleSchema } from "@/lib/booking/calendar-schema";
import { setScheduleException, deleteScheduleException, auditBooking } from "@/lib/booking/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!calendarAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = dateScheduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Use a real date, valid Pacific start times and explicit capacity. Null startTimes closes the date." }, { status: 400 });
  try {
    const exception = await setScheduleException(parsed.data);
    await auditBooking("date_schedule_set", null, { ...parsed.data }, "admin");
    return NextResponse.json({ ok: true, exception });
  } catch {
    return NextResponse.json({ error: "Could not save the date schedule." }, { status: 500 });
  }
}

const deleteSchema = z.object({ productSlug: calendarProduct, onDate: calendarDate }).strict();
export async function DELETE(request: Request) {
  if (!calendarAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid date schedule." }, { status: 400 });
  try {
    const removed = await deleteScheduleException(parsed.data.productSlug, parsed.data.onDate);
    if (!removed) return NextResponse.json({ error: "Date schedule not found." }, { status: 404 });
    await auditBooking("date_schedule_deleted", null, { ...parsed.data }, "admin");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not remove the date schedule." }, { status: 500 });
  }
}
