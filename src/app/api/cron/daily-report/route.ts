import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAllAppointments, getOrders, type AcuityAppointment, type AcuityOrder } from "@/lib/acuity";
import {
  buildDailyReport,
  getDailyReportDateLabel,
  getDailyReportDateRanges,
  mapArchiveToAppointment,
  mapBookingToAppointment,
  mergeArchiveWithCurrent,
  resolveGiftCertValueCents,
  toPacificDateKey,
} from "@/lib/daily-report";
import { fetchAllPages, fetchNativeAdditionsSafely } from "@/lib/daily-report-fetch";
import { getBookingProduct } from "@/lib/booking/products";
import { GIFT_PRODUCTS } from "@/lib/booking/gift";

const RECIPIENTS = [
  "hayden.laverty@gmail.com",
  "Jalene@highlandfarms-oregon.com",
  "mcwilliamscc2@gmail.com",
  "egbert.jordan@gmail.com",
];

const GIFT_CATALOG = GIFT_PRODUCTS.map((product) => ({
  kind: product.kind,
  productScope: product.productScope,
  units: product.units,
  amountCents: product.amountCents,
}));

// PostgREST's default row cap — the archive table page size for
// `fetchAllPages` (see IMPORTANT-3 fix note below).
const ARCHIVE_PAGE_SIZE = 1000;

type DateRange = { start: string; end: string };

function inWindow(dateKey: string, range: DateRange): boolean {
  return dateKey >= range.start && dateKey <= range.end;
}

function bookingDb(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

interface BookingRow {
  id: string;
  acuity_id: number | null;
  starts_at: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  amount_cents: number | null;
  status: string;
  product_slug: string;
  source: string;
}

function bookingRowToAppointment(row: BookingRow): AcuityAppointment {
  return mapBookingToAppointment({
    id: row.id,
    acuityId: row.acuity_id,
    startsAt: row.starts_at,
    createdAt: row.created_at,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    amountCents: row.amount_cents ?? 0,
    canceled: row.status === "cancelled" || row.status === "no_show",
    type: getBookingProduct(row.product_slug)?.name ?? row.product_slug,
  });
}

interface ArchiveRow {
  id: number;
  datetime: string;
  datetime_created: string | null;
  first_name: string | null;
  last_name: string | null;
  amount_paid_cents: number | null;
  price_cents: number | null;
  canceled: boolean | null;
  type: string | null;
}

function archiveRowToAppointment(row: ArchiveRow): AcuityAppointment {
  return mapArchiveToAppointment({
    id: row.id,
    datetime: row.datetime,
    datetimeCreated: row.datetime_created ?? row.datetime,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    amountPaidCents: row.amount_paid_cents ?? 0,
    priceCents: row.price_cents ?? row.amount_paid_cents ?? 0,
    canceled: false,
    type: row.type ?? "",
  });
}

interface GiftCertRow {
  kind: "value" | "visits";
  product_scope: string | null;
  initial_units: number;
  square_payment_id: string | null;
}

/** Native gift-cert sales (`square_payment_id is not null`), scoped to the
 *  report year (purchase date) — same convention as `yearOrders`. */
async function fetchNativeGiftCertValueCents(
  db: SupabaseClient,
  range: DateRange,
): Promise<number[]> {
  const { data, error } = await db
    .from("gift_certificates")
    .select("kind, product_scope, initial_units, square_payment_id")
    .not("square_payment_id", "is", null)
    .gte("created_at", `${range.start}T00:00:00Z`)
    .lte("created_at", `${range.end}T23:59:59Z`);
  if (error) throw new Error(`gift_certificates fetch failed: ${error.message}`);
  return ((data ?? []) as GiftCertRow[]).map((row) =>
    resolveGiftCertValueCents(
      { kind: row.kind, productScope: row.product_scope ?? "", units: row.initial_units },
      GIFT_CATALOG,
    ),
  );
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const ranges = getDailyReportDateRanges(now);
    const db = bookingDb();

    // MODE B: Acuity is cancelled (flag on, ACUITY_ACTIVE not "true"). The
    // live Acuity API is dead — history/YTD comes from the frozen
    // `acuity_archive_appointments` snapshot, current activity from
    // `bookings` (both 'native' and 'acuity_import' rows). MODE A (today,
    // and post-flip while Acuity is still live) is everything else.
    const modeB =
      process.env.NEXT_PUBLIC_NATIVE_CALENDAR === "true" &&
      process.env.ACUITY_ACTIVE !== "true";

    let active: AcuityAppointment[];
    let canceled: AcuityAppointment[];
    let analysisCandidates: AcuityAppointment[];
    let scheduleCandidates: AcuityAppointment[];
    let bookingCandidates: AcuityAppointment[];
    let orders: AcuityOrder[];
    let nativeBookings: AcuityAppointment[] = [];

    if (modeB) {
      // Mode B's own reads (the archive snapshot + current bookings) ARE
      // this mode's core data, unlike the "native additions" reads above
      // Mode A and below (shared) — there is no honest fallback if these
      // fail, so unlike the native-additions reads they are NOT wrapped to
      // degrade silently; a failure here still throws to the outer catch.
      // Mode B is inert today: `modeB` is only ever true once
      // `ACUITY_ACTIVE` is unset/false AFTER the real cutover, so this path
      // has zero live blast radius in production right now.
      const [archiveRows, bookingsResult] = await Promise.all([
        // IMPORTANT: PostgREST silently caps an unbounded select at its
        // default page size — pages explicitly so a growing archive is
        // never truncated without an error (see `fetchAllPages`).
        fetchAllPages<ArchiveRow>(ARCHIVE_PAGE_SIZE, async (from, to) => {
          const { data, error } = await db
            .from("acuity_archive_appointments")
            .select(
              "id, datetime, datetime_created, first_name, last_name, amount_paid_cents, price_cents, canceled, type",
            )
            .eq("canceled", false)
            .order("id", { ascending: true })
            .range(from, to);
          if (error) throw new Error(`acuity_archive_appointments fetch failed: ${error.message}`);
          return (data ?? []) as ArchiveRow[];
        }),
        db
          .from("bookings")
          .select("id, acuity_id, starts_at, created_at, first_name, last_name, amount_cents, status, product_slug, source")
          .in("source", ["native", "acuity_import"]),
      ]);
      if (bookingsResult.error) {
        throw new Error(`bookings fetch failed: ${bookingsResult.error.message}`);
      }

      const archiveActive = archiveRows.map(archiveRowToAppointment);

      // Every non-pending row — any source, any of
      // confirmed/completed/cancelled/no_show — has to enter the merge.
      // Excluding cancelled/no_show rows (an earlier version of this fix
      // filtered to confirmed/completed only) undercounts: a NATIVE row
      // that's cancelled/no_show has no archive twin to fall back to, so
      // dropping it here makes it vanish from the report entirely instead
      // of landing in `canceled`. And for an acuity_import row specifically,
      // excluding it would let its STALE archive twin survive as "active"
      // while the real (cancelled) status is thrown away — the double
      // count the first fix round closed. Only 'pending' is excluded: a
      // native checkout hold that was never actually completed isn't a
      // real booking yet. `bookingRowToAppointment` maps status='no_show'
      // to `canceled: true` too — for report purposes a no-show is a
      // non-completed appointment, same bucket as a cancellation.
      const allBookingRows = (bookingsResult.data ?? []) as BookingRow[];
      const currentForMerge = allBookingRows
        .filter((row) => row.status !== "pending")
        .map(bookingRowToAppointment);

      // The merged result is the SINGLE source of truth for both active
      // and canceled — never derive `canceled` from a separately
      // (raw-status) filtered array; that's exactly what reintroduces the
      // double count above.
      const merged = mergeArchiveWithCurrent(archiveActive, currentForMerge);

      active = merged.filter(
        (a) => !a.canceled && inWindow(toPacificDateKey(a.datetime), ranges.reportYear),
      );
      canceled = merged.filter(
        (a) => a.canceled && inWindow(toPacificDateKey(a.datetime), ranges.reportYear),
      );
      analysisCandidates = merged.filter((a) => {
        if (a.canceled) return false;
        const key = toPacificDateKey(a.datetime);
        return (
          inWindow(key, ranges.reportYear) ||
          (ranges.fetchPriorMonthSeparately && inWindow(key, ranges.priorMonth))
        );
      });
      scheduleCandidates = merged.filter((a) => {
        if (a.canceled) return false;
        const key = toPacificDateKey(a.datetime);
        return inWindow(key, ranges.reportYear) || inWindow(key, ranges.nextYear);
      });
      bookingCandidates = merged.filter((a) => {
        const key = toPacificDateKey(a.datetimeCreated);
        return (
          inWindow(key, ranges.reportYear) ||
          inWindow(key, ranges.nextYear) ||
          (ranges.fetchPriorMonthSeparately && inWindow(key, ranges.priorMonth))
        );
      });
      // No live order source once Acuity is cancelled — the archive's order
      // snapshot only ever went to the repo's gzipped artifacts, not a
      // Supabase table (see docs/acuity-archive/orders-*.json.gz).
      orders = [];
    } else {
      // MODE A: unchanged from the single-source report — Acuity live API
      // exactly as today.
      // Current-year and next-year reads are independent. `showall=true`
      // gives us both active and canceled records in one pass for each
      // year, which keeps the wider new-booking window from increasing
      // Acuity request latency.
      const [reportYearAppointments, nextYearAppointments, priorMonthAppointments, acuityOrders] =
        await Promise.all([
          getAllAppointments(ranges.reportYear.start, ranges.reportYear.end),
          getAllAppointments(ranges.nextYear.start, ranges.nextYear.end),
          ranges.fetchPriorMonthSeparately
            ? getAllAppointments(ranges.priorMonth.start, ranges.priorMonth.end)
            : Promise.resolve([]),
          getOrders(),
        ]);

      active = reportYearAppointments.filter((appointment) => !appointment.canceled);
      canceled = reportYearAppointments.filter((appointment) => appointment.canceled);
      analysisCandidates = [...reportYearAppointments, ...priorMonthAppointments].filter(
        (appointment) => !appointment.canceled,
      );
      scheduleCandidates = [...reportYearAppointments, ...nextYearAppointments].filter(
        (appointment) => !appointment.canceled,
      );
      bookingCandidates = [...reportYearAppointments, ...nextYearAppointments, ...priorMonthAppointments];
      orders = acuityOrders;

      // Native additions: bookings with source='native' (they have no
      // Acuity mirror), confirmed/completed, scoped to the report year —
      // rendered as their own labeled line, never merged into the numbers
      // above, so the existing Acuity numbers stay byte-identical when
      // there's no native activity. Wrapped so a Supabase failure here
      // degrades to "no native activity today" instead of failing the
      // entire (otherwise-healthy) Acuity-sourced email — see
      // `fetchNativeAdditionsSafely`.
      nativeBookings = await fetchNativeAdditionsSafely("native bookings", async () => {
        const { data, error } = await db
          .from("bookings")
          .select("id, acuity_id, starts_at, created_at, first_name, last_name, amount_cents, status, product_slug, source")
          .eq("source", "native")
          .in("status", ["confirmed", "completed"])
          .gte("starts_at", `${ranges.reportYear.start}T00:00:00Z`)
          .lte("starts_at", `${ranges.reportYear.end}T23:59:59Z`);
        if (error) throw new Error(`native bookings fetch failed: ${error.message}`);
        return ((data ?? []) as BookingRow[]).map(bookingRowToAppointment);
      });
    }

    // Shared by both modes, and just as additive/non-load-bearing in
    // either one — same degrade-on-failure treatment as native bookings
    // above.
    const nativeGiftCertValueCents = await fetchNativeAdditionsSafely("native gift certs", () =>
      fetchNativeGiftCertValueCents(db, ranges.reportYear),
    );

    const html = buildDailyReport({
      now,
      active,
      canceled,
      yesterdayCandidates: analysisCandidates,
      pacingCandidates: analysisCandidates,
      scheduleCandidates,
      bookingCandidates,
      orders,
      nativeBookings,
      nativeGiftCertValueCents,
    });

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "Highland Farms <notifications@highlandfarmsoregon.com>",
      to: RECIPIENTS,
      subject: `Highland Farms Daily Report — ${getDailyReportDateLabel(now)}`,
      html,
    });

    if (error) {
      console.error("Email send error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, recipients: RECIPIENTS.length });
  } catch (error) {
    console.error("Daily report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
