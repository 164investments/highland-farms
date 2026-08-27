import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidToken, tokenFromRequest } from "@/lib/shop/admin-auth";
import { insertBlackout, deleteBlackout, auditBooking } from "@/lib/booking/store";

/**
 * Admin blackout CRUD (create/delete only — an edit is a delete + a new
 * create, same as the schedule rules route).
 */

export const dynamic = "force-dynamic";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const PRODUCT_SLUGS = ["farm-tour", "nordic-spa", "wedding-call"] as const;

const postSchema = z.object({
  kind: z.enum(["wedding", "closure", "private_event"]),
  startsOn: z.string().regex(dateRe),
  endsOn: z.string().regex(dateRe),
  productSlugs: z.array(z.enum(PRODUCT_SLUGS)).min(1).max(PRODUCT_SLUGS.length),
  note: z.string().trim().max(500).nullable().optional(),
});

export async function POST(request: Request) {
  if (!isValidToken(tokenFromRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { kind, startsOn, endsOn, productSlugs, note } = parsed.data;
  if (endsOn < startsOn) {
    return NextResponse.json({ error: "endsOn must be on or after startsOn." }, { status: 400 });
  }

  try {
    const blackout = await insertBlackout({
      kind, startsOn, endsOn, productSlugs, note: note ?? null,
    });
    await auditBooking(
      "blackout_created",
      null,
      { id: blackout.id, kind, startsOn, endsOn, productSlugs, note: note ?? null },
      "admin",
    );
    return NextResponse.json({ ok: true, blackout });
  } catch (err) {
    console.error("[booking-admin] blackout create failed:", err);
    return NextResponse.json({ error: "Could not create the blackout." }, { status: 500 });
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
    const removed = await deleteBlackout(parsed.data.id);
    if (!removed) {
      return NextResponse.json({ error: "Blackout not found." }, { status: 404 });
    }
    await auditBooking("blackout_deleted", null, { id: parsed.data.id }, "admin");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[booking-admin] blackout delete failed:", err);
    return NextResponse.json({ error: "Could not delete the blackout." }, { status: 500 });
  }
}
