import { NextResponse } from "next/server";
import { z } from "zod";
import { calendarAuthorized } from "@/lib/booking/calendar-auth";
import { calendarProduct } from "@/lib/booking/calendar-schema";
import { insertTimedBlackout, deleteTimedBlackout, auditBooking } from "@/lib/booking/store";

export const dynamic = "force-dynamic";
const schema = z.object({
  kind: z.enum(["wedding", "closure", "private_event"]),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  productSlugs: z.array(calendarProduct).min(1).max(3),
  note: z.string().trim().max(500).nullable().optional(),
}).strict().refine((r) => Date.parse(r.endsAt) > Date.parse(r.startsAt), "End must follow start.");

export async function POST(request: Request) {
  if (!calendarAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Use offset-aware start/end instants, end after start, and at least one product." }, { status: 400 });
  try {
    const blackout = await insertTimedBlackout({ ...parsed.data, productSlugs: [...new Set(parsed.data.productSlugs)], note: parsed.data.note ?? null });
    await auditBooking("timed_blackout_created", null, { ...blackout }, "admin");
    return NextResponse.json({ ok: true, blackout });
  } catch { return NextResponse.json({ error: "Could not create timed blackout." }, { status: 500 }); }
}

const deletion = z.object({ id: z.number().int().positive() }).strict();
export async function DELETE(request: Request) {
  if (!calendarAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = deletion.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid blackout." }, { status: 400 });
  try {
    if (!await deleteTimedBlackout(parsed.data.id)) return NextResponse.json({ error: "Timed blackout not found." }, { status: 404 });
    await auditBooking("timed_blackout_deleted", null, { id: parsed.data.id }, "admin");
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Could not delete timed blackout." }, { status: 500 }); }
}
