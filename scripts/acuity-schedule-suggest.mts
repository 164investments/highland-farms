#!/usr/bin/env npx tsx
/**
 * Reads acuity_archive_appointments (last 12 months, canceled=false),
 * groups by product and Pacific weekday, and outputs a markdown table
 * per product with observed start times and counts for Jalene's use.
 *
 * Usage: npx tsx --env-file .env.local scripts/acuity-schedule-suggest.mts
 */

import { writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { ACUITY_TYPE_MAP } from "@/lib/booking/acuity-import";
import { pacificWeekday, pacificTimeStr, pacificDateStr } from "@/lib/booking/time";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supa = createClient(url, key, { auth: { persistSession: false } });

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface AppointmentRow {
  datetime: string;
  appointment_type_id: number;
}

interface TimeCount {
  time: string;
  count: number;
}

interface ProductData {
  weekdayTimes: Map<number, Map<string, number>>;
  monthCounts: Map<string, number>;
}

async function main() {
  // Calculate 12 months ago from today (UTC)
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 12);
  const fromIso = twelveMonthsAgo.toISOString();

  console.log(`[acuity-schedule-suggest] Fetching appointments from ${fromIso} to now...`);

  // Fetch all non-canceled appointments from the last 12 months
  const { data: appointments, error } = await supa
    .from("acuity_archive_appointments")
    .select("datetime, appointment_type_id")
    .eq("canceled", false)
    .gte("datetime", fromIso)
    .order("datetime", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch appointments: ${error.message}`);
  }

  if (!appointments || appointments.length === 0) {
    console.log("[acuity-schedule-suggest] No appointments found in the last 12 months");
    return;
  }

  console.log(`[acuity-schedule-suggest] Found ${appointments.length} appointments`);

  // Group by product, then weekday, then time
  const productData = new Map<string, ProductData>();

  for (const appt of appointments as AppointmentRow[]) {
    const mapped = ACUITY_TYPE_MAP[appt.appointment_type_id];
    const productSlug = mapped ? mapped.slug : "other";

    if (!productData.has(productSlug)) {
      productData.set(productSlug, {
        weekdayTimes: new Map(),
        monthCounts: new Map(),
      });
    }

    const data = productData.get(productSlug)!;
    const utcDate = new Date(appt.datetime);
    const pacificDate = pacificDateStr(utcDate);
    const pacificTime = pacificTimeStr(utcDate);
    const weekday = pacificWeekday(pacificDate);

    // Track weekday + time
    if (!data.weekdayTimes.has(weekday)) {
      data.weekdayTimes.set(weekday, new Map());
    }
    const timeCounts = data.weekdayTimes.get(weekday)!;
    timeCounts.set(pacificTime, (timeCounts.get(pacificTime) ?? 0) + 1);

    // Track month for busiest month line
    const month = pacificDate.slice(0, 7); // YYYY-MM
    data.monthCounts.set(month, (data.monthCounts.get(month) ?? 0) + 1);
  }

  // Generate markdown output
  let markdown = "";

  for (const [productSlug, data] of productData) {
    // Sort times for each weekday
    const sortedWeekdayTimes: Map<number, TimeCount[]> = new Map();
    for (const [weekday, timeCounts] of data.weekdayTimes) {
      const times = Array.from(timeCounts.entries())
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => a.time.localeCompare(b.time));
      sortedWeekdayTimes.set(weekday, times);
    }

    // Find busiest month
    let busiestMonth = "";
    let maxCount = 0;
    for (const [month, count] of data.monthCounts) {
      if (count > maxCount) {
        maxCount = count;
        busiestMonth = month;
      }
    }

    // Build markdown table
    markdown += `## ${productSlug}\n\n`;
    markdown += "Observed from 12 months of real bookings. SOLD OUT and CLOSED look identical in this data. Jalene's entries in the admin are the source of truth; this is a cross-check.\n\n";
    markdown += "| Weekday | Start Times |\n";
    markdown += "|---------|-------------|\n";

    for (let wd = 0; wd < 7; wd++) {
      const times = sortedWeekdayTimes.get(wd) ?? [];
      const timeStr = times.length > 0
        ? times.map((t) => `${t.time} (${t.count})`).join(", ")
        : "-";
      markdown += `| ${WEEKDAY_NAMES[wd]} | ${timeStr} |\n`;
    }

    markdown += `\n**Busiest month:** ${busiestMonth} (${maxCount} bookings)\n\n`;
  }

  // Write output file
  const outputPath = "docs/schedule-suggestions-2026-08.md";
  console.log(`[acuity-schedule-suggest] Writing to ${outputPath}...`);
  writeFileSync(outputPath, markdown, "utf-8");
  console.log("[acuity-schedule-suggest] Done!");

  // Print summary
  console.log("\nSummary:");
  for (const [productSlug, data] of productData) {
    const totalBookings = Array.from(data.monthCounts.values()).reduce((a, b) => a + b, 0);
    console.log(`  ${productSlug}: ${totalBookings} bookings`);
  }
}

main().catch((err) => {
  console.error("[acuity-schedule-suggest] Error:", err);
  process.exit(1);
});
