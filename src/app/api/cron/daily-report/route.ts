import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getAppointments, getOrders } from "@/lib/acuity";
import type { AcuityAppointment, AcuityOrder } from "@/lib/acuity";

const RECIPIENTS = [
  "hayden.laverty@gmail.com",
  "Jalene@highlandfarms-oregon.com",
  "mcwilliamscc2@gmail.com",
  "egbert.jordan@gmail.com",
];

const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pacific(date: Date): Date {
  return new Date(date.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function paid(a: AcuityAppointment): number {
  return parseFloat(a.amountPaid || a.priceSold || a.price || "0");
}

interface ReportData {
  today: Date;
  yesterday: Date;
  yearStart: string;
  yearEnd: string;
  active: AcuityAppointment[];
  canceled: AcuityAppointment[];
  orders: AcuityOrder[];
}

async function gatherData(): Promise<ReportData> {
  const now = pacific(new Date());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const year = today.getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [active, canceled, orders] = await Promise.all([
    getAppointments(yearStart, yearEnd),
    getAppointments(yearStart, yearEnd, true),
    getOrders(),
  ]);

  return { today, yesterday, yearStart, yearEnd, active, canceled, orders };
}

function buildReport(data: ReportData) {
  const { today, yesterday, active, canceled, orders } = data;
  const year = today.getFullYear();
  const yesterdayStr = fmtDate(yesterday);
  const todayStr = fmtDate(today);

  // Yesterday's delivered appointments
  const deliveredYesterday = active.filter((a) => a.datetime.slice(0, 10) === yesterdayStr);
  const deliveredRev = deliveredYesterday.reduce((s, a) => s + paid(a), 0);

  // New bookings created yesterday
  const bookedYesterday = active.filter((a) => a.datetimeCreated.slice(0, 10) === yesterdayStr);
  const bookedRev = bookedYesterday.reduce((s, a) => s + paid(a), 0);

  // Monthly breakdown (by appointment month)
  const monthlyAppts: Record<string, { count: number; revenue: number }> = {};
  for (const a of active) {
    const m = a.datetime.slice(0, 7);
    if (!monthlyAppts[m]) monthlyAppts[m] = { count: 0, revenue: 0 };
    monthlyAppts[m].count++;
    monthlyAppts[m].revenue += paid(a);
  }

  // Canceled revenue
  const canceledRev = canceled.reduce((s, a) => s + paid(a), 0);

  // Gift cert / product orders for this year
  const yearOrders = orders.filter((o) => o.time.startsWith(String(year)) && o.status === "paid");
  const ordersRev = yearOrders.reduce((s, o) => s + o.total, 0);
  const ordersByMonth: Record<string, number> = {};
  for (const o of yearOrders) {
    const m = o.time.slice(0, 7);
    ordersByMonth[m] = (ordersByMonth[m] || 0) + o.total;
  }

  // Grand total
  const totalApptRev = active.reduce((s, a) => s + paid(a), 0);
  const grandTotal = totalApptRev + canceledRev + ordersRev;
  const totalAppts = active.length;

  // By service type
  const byType: Record<string, { count: number; revenue: number }> = {};
  for (const a of active) {
    const t = a.type;
    if (!byType[t]) byType[t] = { count: 0, revenue: 0 };
    byType[t].count++;
    byType[t].revenue += paid(a);
  }
  const topTypes = Object.entries(byType).sort((a, b) => b[1].revenue - a[1].revenue);

  // Day of week
  const dowRev: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (const a of active) {
    const d = new Date(a.datetime);
    dowRev[d.getDay()] += paid(a);
  }
  const maxDow = Math.max(...dowRev);

  // Referral sources
  const refs: Record<string, number> = {};
  for (const a of [...active, ...canceled]) {
    for (const f of a.forms || []) {
      for (const v of f.values || []) {
        if (v.name.toLowerCase().includes("hear")) {
          const src = v.value.trim();
          if (src) refs[src] = (refs[src] || 0) + 1;
        }
      }
    }
  }
  const topRefs = Object.entries(refs).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const totalRefs = Object.values(refs).reduce((s, n) => s + n, 0);

  // Avg metrics
  const paidAppts = active.filter((a) => paid(a) > 0);
  const avgTicket = paidAppts.length ? totalApptRev / paidAppts.length : 0;
  const cancelRate = active.length + canceled.length > 0
    ? (canceled.length / (active.length + canceled.length)) * 100
    : 0;

  // Lead time
  let totalLead = 0;
  let leadCount = 0;
  for (const a of active) {
    const created = new Date(a.datetimeCreated.slice(0, 10));
    const appt = new Date(a.datetime.slice(0, 10));
    const days = (appt.getTime() - created.getTime()) / 86400000;
    if (days >= 0) { totalLead += days; leadCount++; }
  }
  const avgLead = leadCount ? Math.round(totalLead / leadCount) : 0;

  // Next 7 days
  const next7: { label: string; count: number; revenue: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const ds = fmtDate(d);
    const dayAppts = active.filter((a) => a.datetime.slice(0, 10) === ds);
    const dayRev = dayAppts.reduce((s, a) => s + paid(a), 0);
    next7.push({
      label: `${DOW_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`,
      count: dayAppts.length,
      revenue: dayRev,
    });
  }

  // Current month vs previous month pacing
  const curMonth = `${year}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const prevMonth = today.getMonth() === 0
    ? `${year - 1}-12`
    : `${year}-${String(today.getMonth()).padStart(2, "0")}`;
  const curRev = (monthlyAppts[curMonth]?.revenue || 0);
  const prevRev = (monthlyAppts[prevMonth]?.revenue || 0);
  const pacing = prevRev > 0 ? Math.round(((curRev - prevRev) / prevRev) * 100) : 0;
  const pacingSign = pacing >= 0 ? "+" : "";
  const pacingColor = pacing >= 0 ? "#3B8344" : "#c41e1e";

  // Build HTML
  const yesterdayDow = DOW_NAMES[yesterday.getDay()];
  const yesterdayLabel = `${MONTH_NAMES[yesterday.getMonth()].slice(0, 3)} ${yesterday.getDate()}`;
  const todayLabel = `${MONTH_NAMES[today.getMonth()].slice(0, 3)} ${today.getDate()}, ${year}`;
  const todayDow = DOW_NAMES[today.getDay()];

  // Delivered rows
  const deliveredRows = deliveredYesterday
    .sort((a, b) => a.datetime.localeCompare(b.datetime))
    .map(
      (a) =>
        `<tr><td height='4'></td></tr><tr><td style='padding:10px 14px;background:#f8f7f4;border-radius:6px;'><table width='100%'><tr><td width='60px' style='font-size:13px;color:#888;font-weight:600;'>${a.time.replace(/:00/g, "").toLowerCase()}</td><td style='font-size:14px;color:#1c1d1d;'>${a.type} — ${a.firstName} ${a.lastName[0]}.</td><td align='right' style='font-size:14px;font-weight:600;color:#1c1d1d;'>${fmtMoney(paid(a))}</td></tr></table></td></tr>`
    )
    .join("");

  // Booked rows
  const bookedRows = bookedYesterday
    .map((a) => {
      const apptDate = new Date(a.datetime);
      const apptLabel = `${MONTH_NAMES[apptDate.getMonth()].slice(0, 3)} ${apptDate.getDate()}`;
      return `<tr><td height='4'></td></tr><tr><td style='padding:10px 14px;background:#eaf7ec;border-radius:6px;'><table width='100%'><tr><td style='font-size:14px;color:#1c1d1d;'>${a.firstName} ${a.lastName[0]}. — ${a.type}</td><td align='right' style='font-size:13px;color:#888;'>${apptLabel}</td><td align='right' width='70' style='font-size:14px;font-weight:600;color:#3B8344;'>${fmtMoney(paid(a))}</td></tr></table></td></tr>`;
    })
    .join("");

  // Monthly pacing rows
  const months = Object.keys(monthlyAppts).sort();
  const monthRows = months.map((m) => {
    const d = monthlyAppts[m];
    const mo = parseInt(m.split("-")[1]) - 1;
    const isCurrent = m === curMonth;
    const isFuture = m > curMonth;
    const orderRev = ordersByMonth[m] || 0;
    const monthTotal = d.revenue + orderRev;
    const textColor = isFuture ? "#999" : "#1c1d1d";
    const bg = isCurrent ? "background:#fffbf0;" : "";
    const weight = isCurrent ? "font-weight:600;" : "";
    const pacingBadge = isCurrent && prevRev > 0
      ? ` <span style="font-size:11px;color:${pacingColor};font-weight:700;">&#${pacing >= 0 ? "9650" : "9660"}; ${pacingSign}${pacing}% vs ${MONTH_NAMES[parseInt(prevMonth.split("-")[1]) - 1]}</span>`
      : "";

    return `<tr style='border-bottom:1px solid #f0f0f0;${bg}'><td style='padding:10px 0;font-size:14px;color:${textColor};${weight}'>${MONTH_NAMES[mo]}${pacingBadge}</td><td align='center' style='font-size:14px;color:${textColor};${weight}'>${d.count}</td><td align='right' style='font-size:14px;color:${textColor};${weight}'>${fmtMoney(d.revenue)}</td><td align='right' style='font-size:14px;color:${textColor};'>${orderRev ? fmtMoney(orderRev) : "—"}</td><td align='right' style='font-size:14px;font-weight:600;color:${isCurrent ? pacingColor : textColor};'>${fmtMoney(monthTotal)}</td></tr>`;
  }).join("");

  // Next 7 rows
  const next7Rows = next7.map((d) => {
    const hasAppts = d.count > 0;
    const color = hasAppts ? "#1c1d1d" : "#999";
    return `<tr style='border-bottom:1px solid #f0f0f0;'><td style='padding:8px 0;font-size:14px;color:${color};'>${d.label}</td><td align='center' style='font-size:14px;color:${color};'>${hasAppts ? `${d.count} appts` : "—"}</td><td align='right' style='font-size:14px;font-weight:600;color:${color};'>${hasAppts ? fmtMoney(d.revenue) : "—"}</td></tr>`;
  }).join("");

  // Type rows (top 5 + "Other")
  const mainTypes = topTypes.slice(0, 5);
  const otherTypes = topTypes.slice(5);
  const otherRev = otherTypes.reduce((s, [, d]) => s + d.revenue, 0);
  const otherCount = otherTypes.reduce((s, [, d]) => s + d.count, 0);
  const typeRows = mainTypes
    .map(([name, d]) => `<tr style='border-bottom:1px solid #f0f0f0;'><td style='padding:8px 0;font-size:14px;color:#1c1d1d;'>${name}</td><td align='center' style='font-size:13px;color:#888;'>${d.count}</td><td align='right' style='font-size:14px;font-weight:600;color:#1c1d1d;'>${fmtMoney(d.revenue)}</td></tr>`)
    .join("");
  const giftCertRow = yearOrders.length
    ? `<tr style='border-bottom:1px solid #f0f0f0;'><td style='padding:8px 0;font-size:14px;color:#1c1d1d;'>Gift Certificates</td><td align='center' style='font-size:13px;color:#888;'>${yearOrders.length}</td><td align='right' style='font-size:14px;font-weight:600;color:#1c1d1d;'>${fmtMoney(ordersRev)}</td></tr>`
    : "";
  const otherRow = otherCount
    ? `<tr><td style='padding:8px 0;font-size:14px;color:#1c1d1d;'>Other</td><td align='center' style='font-size:13px;color:#888;'>${otherCount}</td><td align='right' style='font-size:14px;font-weight:600;color:#1c1d1d;'>${fmtMoney(otherRev)}</td></tr>`
    : "";

  // DOW bars
  const dowOrder = [6, 0, 5, 4, 3, 2, 1]; // Sat Sun Fri Thu Wed Tue Mon
  const dowRows = dowOrder
    .filter((i) => dowRev[i] > 0)
    .map((i) => {
      const pct = maxDow ? Math.max(2, Math.round((dowRev[i] / maxDow) * 100)) : 0;
      return `<tr><td style='padding:4px 0;font-size:13px;color:#888;width:40px;'>${DOW_NAMES[i]}</td><td style='padding:4px 0;'><table cellspacing='0' cellpadding='0' width='100%'><tr><td style='background:#f2c070;height:18px;border-radius:4px;width:${pct}%;'></td><td></td></tr></table></td><td align='right' style='padding:4px 0 4px 8px;font-size:13px;font-weight:600;color:#1c1d1d;width:60px;'>${fmtMoney(dowRev[i])}</td></tr>`;
    })
    .join("");

  // Referral rows
  const refRows = topRefs
    .map(([name, count]) => {
      const pct = totalRefs ? Math.round((count / totalRefs) * 100) : 0;
      return `<tr style='border-bottom:1px solid #f0f0f0;'><td style='padding:8px 0;font-size:14px;color:#1c1d1d;'>${name}</td><td align='right' style='font-size:14px;font-weight:600;color:#1c1d1d;'>${count} <span style='color:#888;font-weight:400;font-size:12px;'>(${pct}%)</span></td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset='utf-8'></head><body style='margin:0;padding:0;background:#f8f7f4;font-family:Helvetica Neue,Arial,sans-serif;'><table width='100%' cellpadding='0' cellspacing='0' style='background:#f8f7f4;'><tr><td align='center' style='padding:32px 16px;'><table width='600' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);'>` +
    // Header
    `<tr><td style='background:#1c1d1d;padding:24px 32px;'><table width='100%'><tr><td><span style='font-size:22px;font-weight:700;color:#f2c070;letter-spacing:0.5px;'>Highland Farms</span><br><span style='font-size:13px;color:#aaa;'>Daily Revenue Report</span></td><td align='right'><span style='font-size:14px;color:#f2c070;font-weight:600;'>${todayLabel}</span><br><span style='font-size:12px;color:#888;'>${todayDow}</span></td></tr></table></td></tr>` +
    // Yesterday summary cards
    `<tr><td style='padding:28px 32px 0;'><table width='100%' cellspacing='0'><tr><td style='padding-bottom:20px;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Yesterday — ${yesterdayDow}, ${yesterdayLabel}</span></td></tr><tr><td><table width='100%' cellspacing='0'><tr><td width='33%' style='padding:16px;background:#f8f7f4;border-radius:8px;text-align:center;'><span style='font-size:28px;font-weight:700;color:#1c1d1d;'>${fmtMoney(deliveredRev)}</span><br><span style='font-size:11px;color:#888;font-weight:600;'>DELIVERED</span></td><td width='4%'></td><td width='29%' style='padding:16px;background:#f8f7f4;border-radius:8px;text-align:center;'><span style='font-size:28px;font-weight:700;color:#1c1d1d;'>${deliveredYesterday.length}</span><br><span style='font-size:11px;color:#888;font-weight:600;'>APPOINTMENTS</span></td><td width='4%'></td><td width='30%' style='padding:16px;background:#f8f7f4;border-radius:8px;text-align:center;'><span style='font-size:28px;font-weight:700;color:#3B8344;'>${fmtMoney(bookedRev)}</span><br><span style='font-size:11px;color:#888;font-weight:600;'>NEW BOOKINGS</span></td></tr></table></td></tr></table></td></tr>` +
    // Yesterday appointments
    (deliveredYesterday.length
      ? `<tr><td style='padding:24px 32px 0;'><table width='100%' cellspacing='0'><tr><td style='padding-bottom:12px;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Yesterday's Appointments</span></td></tr>${deliveredRows}</table></td></tr>`
      : `<tr><td style='padding:24px 32px 0;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Yesterday's Appointments</span><p style='font-size:14px;color:#999;margin:12px 0 0;'>No appointments yesterday</p></td></tr>`) +
    // New bookings
    (bookedYesterday.length
      ? `<tr><td style='padding:28px 32px 0;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>New Bookings Yesterday</span><table width='100%' cellspacing='0' style='margin-top:12px;'>${bookedRows}</table></td></tr>`
      : "") +
    // Monthly pacing
    `<tr><td style='padding:28px 32px 0;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>${year} Revenue Pacing</span><table width='100%' cellspacing='0' style='margin-top:12px;border-collapse:collapse;'><tr style='border-bottom:2px solid #eee;'><td style='padding:8px 0;font-size:12px;font-weight:600;color:#888;'>MONTH</td><td align='center' style='padding:8px 0;font-size:12px;font-weight:600;color:#888;'>APPTS</td><td align='right' style='padding:8px 0;font-size:12px;font-weight:600;color:#888;'>SERVICES</td><td align='right' style='padding:8px 0;font-size:12px;font-weight:600;color:#888;'>GIFT CERTS</td><td align='right' style='padding:8px 0;font-size:12px;font-weight:600;color:#888;'>TOTAL</td></tr>${monthRows}` +
    (canceledRev ? `<tr style='border-bottom:1px solid #f0f0f0;'><td style='padding:10px 0;font-size:13px;color:#888;font-style:italic;' colspan='3'>Cancellations (revenue collected)</td><td align='right' colspan='2' style='font-size:14px;font-weight:600;color:#888;'>${fmtMoney(canceledRev)}</td></tr>` : "") +
    `<tr style='background:#1c1d1d;'><td style='padding:14px 10px;font-size:15px;font-weight:700;color:#f2c070;border-radius:6px 0 0 6px;'>${year} YTD</td><td align='center' style='padding:14px 0;font-size:15px;font-weight:700;color:#f2c070;'>${totalAppts}</td><td align='right' style='padding:14px 0;font-size:15px;font-weight:700;color:#f2c070;'>${fmtMoney(totalApptRev)}</td><td align='right' style='padding:14px 0;font-size:15px;font-weight:700;color:#f2c070;'>${fmtMoney(ordersRev)}</td><td align='right' style='padding:14px 10px;font-size:15px;font-weight:700;color:#f2c070;border-radius:0 6px 6px 0;'>${fmtMoney(grandTotal)}</td></tr></table></td></tr>` +
    // Next 7 days
    `<tr><td style='padding:28px 32px 0;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Next 7 Days</span><table width='100%' cellspacing='0' style='margin-top:12px;border-collapse:collapse;'>${next7Rows}</table></td></tr>` +
    // Revenue by type
    `<tr><td style='padding:28px 32px 0;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Revenue by Service Type (${year} YTD)</span><table width='100%' cellspacing='0' style='margin-top:12px;border-collapse:collapse;'>${typeRows}${giftCertRow}${otherRow}</table></td></tr>` +
    // Key metrics
    `<tr><td style='padding:28px 32px 0;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Key Metrics</span><table width='100%' cellspacing='0' style='margin-top:12px;'><tr><td width='32%' style='padding:14px;background:#f8f7f4;border-radius:8px;text-align:center;'><span style='font-size:12px;color:#888;font-weight:600;'>AVG TICKET</span><br><span style='font-size:22px;font-weight:700;color:#1c1d1d;'>${fmtMoney(avgTicket)}</span></td><td width='2%'></td><td width='32%' style='padding:14px;background:#f8f7f4;border-radius:8px;text-align:center;'><span style='font-size:12px;color:#888;font-weight:600;'>LEAD TIME</span><br><span style='font-size:22px;font-weight:700;color:#1c1d1d;'>${avgLead} days</span></td><td width='2%'></td><td width='32%' style='padding:14px;background:#f8f7f4;border-radius:8px;text-align:center;'><span style='font-size:12px;color:#888;font-weight:600;'>CANCEL RATE</span><br><span style='font-size:22px;font-weight:700;color:#1c1d1d;'>${cancelRate.toFixed(1)}%</span></td></tr></table></td></tr>` +
    // DOW chart
    `<tr><td style='padding:28px 32px 0;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Revenue by Day of Week</span><table width='100%' cellspacing='0' style='margin-top:12px;'>${dowRows}</table></td></tr>` +
    // Referral sources
    `<tr><td style='padding:28px 32px;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Top Referral Sources (${year})</span><table width='100%' cellspacing='0' style='margin-top:12px;border-collapse:collapse;'>${refRows}</table></td></tr>` +
    // Footer
    `<tr><td style='background:#f8f7f4;padding:16px 32px;text-align:center;'><span style='font-size:11px;color:#bbb;'>Highland Farms Daily Report — Auto-generated from Acuity Scheduling data</span></td></tr></table></td></tr></table></body></html>`;
}

export async function GET(request: Request) {
  // Verify cron secret (Vercel sends this automatically)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await gatherData();
    const html = buildReport(data);

    const today = pacific(new Date());
    const dateLabel = `${MONTH_NAMES[today.getMonth()].slice(0, 3)} ${today.getDate()}, ${today.getFullYear()}`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "Highland Farms <notifications@highlandfarmsoregon.com>",
      to: RECIPIENTS,
      subject: `Highland Farms Daily Report — ${dateLabel}`,
      html,
    });

    if (error) {
      console.error("Email send error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, recipients: RECIPIENTS.length });
  } catch (err) {
    console.error("Daily report error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
