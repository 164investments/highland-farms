import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getAllAppointments, getOrders } from "@/lib/acuity";
import {
  buildDailyReport,
  getDailyReportDateLabel,
  getDailyReportDateRanges,
} from "@/lib/daily-report";

const RECIPIENTS = [
  "hayden.laverty@gmail.com",
  "Jalene@highlandfarms-oregon.com",
  "mcwilliamscc2@gmail.com",
  "egbert.jordan@gmail.com",
];

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const ranges = getDailyReportDateRanges(now);

    // Current-year and next-year reads are independent. `showall=true` gives us
    // both active and canceled records in one pass for each year, which keeps
    // the wider new-booking window from increasing Acuity request latency.
    const [reportYearAppointments, nextYearAppointments, priorMonthAppointments, orders] = await Promise.all([
      getAllAppointments(ranges.reportYear.start, ranges.reportYear.end),
      getAllAppointments(ranges.nextYear.start, ranges.nextYear.end),
      ranges.fetchPriorMonthSeparately
        ? getAllAppointments(ranges.priorMonth.start, ranges.priorMonth.end)
        : Promise.resolve([]),
      getOrders(),
    ]);

    const active = reportYearAppointments.filter((appointment) => !appointment.canceled);
    const canceled = reportYearAppointments.filter((appointment) => appointment.canceled);
    const analysisCandidates = [
      ...reportYearAppointments,
      ...priorMonthAppointments,
    ].filter((appointment) => !appointment.canceled);
    const html = buildDailyReport({
      now,
      active,
      canceled,
      yesterdayCandidates: analysisCandidates,
      pacingCandidates: analysisCandidates,
      bookingCandidates: [
        ...reportYearAppointments,
        ...nextYearAppointments,
        ...priorMonthAppointments,
      ],
      orders,
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
