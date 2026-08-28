import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { pacificDateStr } from "@/lib/booking/time";
import { sendReminder, type ReminderBooking } from "@/lib/booking/reminder-email";

export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Sweep abandoned holds even while the flag is off. Imports only ever
  // write status='confirmed' rows (`upsertAcuityBooking` in
  // acuity-import.ts) -- pending holds are created exclusively by native
  // checkout (the claim-then-charge flow). This sweep still has to run
  // unconditionally though: a pending hold can leak from an abandoned
  // native checkout regardless of whether the flag is currently on.
  const { data: swept } = await db.rpc("sweep_expired_booking_holds");
  if (!nativeCalendarEnabled()) {
    return NextResponse.json({ swept: swept ?? 0, reminders: 0, disabled: true });
  }

  const now = new Date();
  const in42h = new Date(now.getTime() + 42 * 3600000).toISOString();
  const in54h = new Date(now.getTime() + 54 * 3600000).toISOString();

  const { data: candidates, error } = await db
    .from("bookings")
    .select("id, booking_number, product_slug, starts_at, party_size, first_name, email, source")
    .eq("status", "confirmed")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", in54h);
  if (error) {
    console.error("[booking] reminder query failed:", error.message);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }

  // Acuity still sends its own reminders for appointments it booked; ours
  // would double up. This env var dies when the Acuity subscription is
  // cancelled — after that, imported bookings get OUR reminders.
  const eligible =
    process.env.ACUITY_ACTIVE === "true"
      ? (candidates ?? []).filter((b) => b.source !== "acuity_import")
      : (candidates ?? []);

  const today = pacificDateStr(now);
  const pacificHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles", hour: "numeric", hour12: false,
    }).format(now),
  );

  let sent = 0;
  for (const b of eligible as ReminderBooking[]) {
    // Date.parse both sides — Supabase returns "+00:00" offsets, our window
    // strings end in "Z"; comparing those lexicographically is wrong.
    const kind: "48h" | "morning_of" | null =
      Date.parse(b.starts_at) >= Date.parse(in42h)
        ? "48h"
        : pacificDateStr(new Date(b.starts_at)) === today &&
            pacificHour >= 6 && pacificHour < 12
          ? "morning_of"
          : null;
    if (!kind) continue;

    // Stamp BEFORE sending: a crash costs one reminder, never sends two.
    const { error: stampErr } = await db
      .from("booking_reminders")
      .insert({ booking_id: b.id, kind });
    if (stampErr && stampErr.code !== "23505") {
      console.error("[booking] reminder stamp failed", b.booking_number, stampErr.message);
    }
    if (stampErr) continue; // 23505 = already sent, exactly what we want

    try {
      await sendReminder(b, kind);
      sent++;
    } catch (err) {
      console.error(`[booking] reminder send failed ${b.booking_number}:`, err);
    }
  }

  return NextResponse.json({ swept: swept ?? 0, reminders: sent });
}
