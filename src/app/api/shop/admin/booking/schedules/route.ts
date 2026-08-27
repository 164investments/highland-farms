import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidToken, tokenFromRequest } from "@/lib/shop/admin-auth";
import { upsertScheduleRule, deleteScheduleRule, auditBooking } from "@/lib/booking/store";

/**
 * Admin schedule-rule CRUD. "Upsert" here is always an insert — editing a
 * rule from the admin screen is a DELETE of the old row followed by a POST
 * of the new one. The engine's `dayPlan()` (src/lib/booking/engine.ts)
 * already resolves overlapping rows for the same product+weekday by taking
 * the latest `effectiveFrom`, so two rows briefly coexisting between the two
 * calls never produces a wrong availability answer.
 */

export const dynamic = "force-dynamic";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const timeRe = /^\d{2}:\d{2}$/;

const postSchema = z.object({
  productSlug: z.enum(["farm-tour", "nordic-spa", "wedding-call"]),
  weekday: z.number().int().min(0).max(6),
  startTimes: z.array(z.string().regex(timeRe)).min(1).max(20),
  capacity: z.number().int().min(1).max(500),
  effectiveFrom: z.string().regex(dateRe),
  effectiveTo: z.string().regex(dateRe).nullable().optional(),
});

export async function POST(request: Request) {
  if (!isValidToken(tokenFromRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { productSlug, weekday, startTimes, capacity, effectiveFrom, effectiveTo } = parsed.data;
  if (effectiveTo && effectiveTo < effectiveFrom) {
    return NextResponse.json({ error: "effectiveTo must be on or after effectiveFrom." }, { status: 400 });
  }

  try {
    const rule = await upsertScheduleRule({
      productSlug, weekday, startTimes, capacity, effectiveFrom, effectiveTo: effectiveTo ?? null,
    });
    await auditBooking(
      "schedule_rule_created",
      null,
      { id: rule.id, productSlug, weekday, startTimes, capacity, effectiveFrom, effectiveTo: effectiveTo ?? null },
      "admin",
    );
    return NextResponse.json({ ok: true, rule });
  } catch (err) {
    console.error("[booking-admin] schedule create failed:", err);
    return NextResponse.json({ error: "Could not save the schedule rule." }, { status: 500 });
  }
}

const deleteSchema = z.object({ id: z.number().int().positive() });

export async function DELETE(request: Request) {
  if (!isValidToken(tokenFromRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const removed = await deleteScheduleRule(parsed.data.id);
    if (!removed) {
      return NextResponse.json({ error: "Schedule rule not found." }, { status: 404 });
    }
    await auditBooking("schedule_rule_deleted", null, { id: parsed.data.id }, "admin");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[booking-admin] schedule delete failed:", err);
    return NextResponse.json({ error: "Could not delete the schedule rule." }, { status: 500 });
  }
}
