import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { getAppointments } from "@/lib/acuity";
import type { AcuityAppointment } from "@/lib/acuity";
import { getWeddingGA4Data, type GA4WeddingData } from "@/lib/ga4-data";

// ── Config ───────────────────────────────────────────────────────────────────

const RECIPIENTS = [
  "hayden.laverty@gmail.com",
  "Jalene@highlandfarms-oregon.com",
  "mcwilliamscc2@gmail.com",
  "egbert.jordan@gmail.com",
  "events@highlandfarms-oregon.com",
  "mckenna@highlandfarms-oregon.com",
];

const WEDDING_EVENT_TYPES = ["wedding", "elopement", "engagement-party", "rehearsal-dinner"];
const WEDDING_CALL_CALENDAR_ID = 12109481;

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding",
  elopement: "Elopement",
  "engagement-party": "Engagement Party",
  "rehearsal-dinner": "Rehearsal Dinner",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── Types ────────────────────────────────────────────────────────────────────

interface WeddingInquiry {
  name: string;
  email: string;
  phone: string | null;
  event_type: string;
  guest_count: string | null;
  preferred_date: string | null;
  referral_source: string | null;
  message: string | null;
  created_at: string;
}

interface MetaLead {
  leadgen_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  wedding_date_range: string | null;
  wedding_budget: string | null;
  ad_name: string | null;
  disqualified: boolean;
  created_at: string;
}

interface ReportData {
  periodStart: Date;
  periodEnd: Date;
  prevStart: Date;
  prevEnd: Date;
  inquiries: WeddingInquiry[];
  prevInquiries: WeddingInquiry[];
  metaLeads: MetaLead[];
  prevMetaLeads: MetaLead[];
  weddingCalls: AcuityAppointment[];
  prevWeddingCalls: AcuityAppointment[];
  ytdInquiries: WeddingInquiry[];
  ytdMetaLeads: MetaLead[];
  ytdWeddingCalls: AcuityAppointment[];
  ga4: GA4WeddingData | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function pacific(date: Date): Date {
  return new Date(date.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

function fmtDateFull(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function pctChange(current: number, previous: number): { text: string; color: string } {
  if (previous === 0 && current === 0) return { text: "—", color: "#888" };
  if (previous === 0) return { text: "+100%", color: "#3B8344" };
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct >= 0 ? "+" : "";
  return {
    text: `${sign}${pct}%`,
    color: pct >= 0 ? "#3B8344" : "#c41e1e",
  };
}

// ── Data Gathering ───────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function fetchInquiries(start: string, end: string): Promise<WeddingInquiry[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("event_inquiries")
    .select("name, email, phone, event_type, guest_count, preferred_date, referral_source, message, created_at")
    .in("event_type", WEDDING_EVENT_TYPES)
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase inquiries error:", error);
    return [];
  }
  return data ?? [];
}

async function fetchMetaLeads(start: string, end: string): Promise<MetaLead[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("meta_leads")
    .select("leadgen_id, name, email, phone, wedding_date_range, wedding_budget, ad_name, disqualified, created_at")
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase meta_leads error:", error);
    return [];
  }
  return data ?? [];
}

function filterWeddingCalls(appointments: AcuityAppointment[], start: string, end: string): AcuityAppointment[] {
  return appointments.filter(
    (a) =>
      a.calendarID === WEDDING_CALL_CALENDAR_ID &&
      a.datetimeCreated.slice(0, 10) >= start &&
      a.datetimeCreated.slice(0, 10) <= end
  );
}

async function gatherData(): Promise<ReportData> {
  const now = pacific(new Date());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 7-day period ending yesterday
  const periodEnd = new Date(today);
  periodEnd.setDate(periodEnd.getDate() - 1);
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 6);

  // Previous 7-day period
  const prevEnd = new Date(periodStart);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - 6);

  // YTD
  const year = today.getFullYear();
  const ytdStart = `${year}-01-01`;
  const ytdEnd = fmtDate(periodEnd);

  const startStr = fmtDate(periodStart);
  const endStr = fmtDate(periodEnd);
  const prevStartStr = fmtDate(prevStart);
  const prevEndStr = fmtDate(prevEnd);

  // Fetch Acuity appointments for YTD (we'll filter periods in memory)
  const acuityPromise = getAppointments(ytdStart, `${year}-12-31`);

  const [
    inquiries,
    prevInquiries,
    ytdInquiries,
    metaLeads,
    prevMetaLeads,
    ytdMetaLeads,
    allAppointments,
    ga4,
  ] = await Promise.all([
    fetchInquiries(`${startStr}T00:00:00`, `${endStr}T23:59:59`),
    fetchInquiries(`${prevStartStr}T00:00:00`, `${prevEndStr}T23:59:59`),
    fetchInquiries(`${ytdStart}T00:00:00`, `${ytdEnd}T23:59:59`),
    fetchMetaLeads(`${startStr}T00:00:00`, `${endStr}T23:59:59`),
    fetchMetaLeads(`${prevStartStr}T00:00:00`, `${prevEndStr}T23:59:59`),
    fetchMetaLeads(`${ytdStart}T00:00:00`, `${ytdEnd}T23:59:59`),
    acuityPromise,
    getWeddingGA4Data(startStr, endStr, prevStartStr, prevEndStr).catch((err) => {
      console.error("GA4 wedding data error:", err);
      return null;
    }),
  ]);

  const weddingCalls = filterWeddingCalls(allAppointments, startStr, endStr);
  const prevWeddingCalls = filterWeddingCalls(allAppointments, prevStartStr, prevEndStr);
  const ytdWeddingCalls = filterWeddingCalls(allAppointments, ytdStart, ytdEnd);

  return {
    periodStart,
    periodEnd,
    prevStart,
    prevEnd,
    inquiries,
    prevInquiries,
    metaLeads,
    prevMetaLeads,
    weddingCalls,
    prevWeddingCalls,
    ytdInquiries,
    ytdMetaLeads,
    ytdWeddingCalls,
    ga4,
  };
}

// ── HTML Builder ─────────────────────────────────────────────────────────────

function buildReport(data: ReportData): string {
  const {
    periodStart, periodEnd,
    inquiries, prevInquiries,
    metaLeads, prevMetaLeads,
    weddingCalls, prevWeddingCalls,
    ytdInquiries, ytdMetaLeads, ytdWeddingCalls,
    ga4,
  } = data;

  const periodLabel = `${fmtDateShort(periodStart.toISOString())} – ${fmtDateShort(periodEnd.toISOString())}`;
  const year = periodEnd.getFullYear();

  // Totals
  const totalCurrent = inquiries.length + metaLeads.length + weddingCalls.length;
  const totalPrev = prevInquiries.length + prevMetaLeads.length + prevWeddingCalls.length;
  const totalChange = pctChange(totalCurrent, totalPrev);
  const qualifiedMeta = metaLeads.filter((l) => !l.disqualified).length;

  // ── Summary Cards ──────────────────────────────────────────────────────────
  const summaryCards = `
    <tr><td style="padding:28px 32px 0;">
      <table width="100%" cellspacing="0">
        <tr><td style="padding-bottom:20px;">
          <span style="font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;">${periodLabel}</span>
        </td></tr>
        <tr><td>
          <table width="100%" cellspacing="0">
            <tr>
              <td width="24%" style="padding:16px 12px;background:#f8f7f4;border-radius:8px;text-align:center;">
                <span style="font-size:32px;font-weight:700;color:#1c1d1d;">${totalCurrent}</span>
                <br><span style="font-size:11px;color:#888;font-weight:600;">TOTAL LEADS</span>
                <br><span style="font-size:12px;font-weight:600;color:${totalChange.color};">${totalChange.text} vs prev wk</span>
              </td>
              <td width="1%"></td>
              <td width="24%" style="padding:16px 12px;background:#f8f7f4;border-radius:8px;text-align:center;">
                <span style="font-size:28px;font-weight:700;color:#2d4a3e;">${inquiries.length}</span>
                <br><span style="font-size:11px;color:#888;font-weight:600;">WEBSITE FORMS</span>
              </td>
              <td width="1%"></td>
              <td width="24%" style="padding:16px 12px;background:#f8f7f4;border-radius:8px;text-align:center;">
                <span style="font-size:28px;font-weight:700;color:#2d4a3e;">${metaLeads.length}</span>
                <br><span style="font-size:11px;color:#888;font-weight:600;">META AD LEADS</span>
                ${qualifiedMeta < metaLeads.length ? `<br><span style="font-size:11px;color:#888;">${qualifiedMeta} qualified</span>` : ""}
              </td>
              <td width="1%"></td>
              <td width="24%" style="padding:16px 12px;background:#f8f7f4;border-radius:8px;text-align:center;">
                <span style="font-size:28px;font-weight:700;color:#2d4a3e;">${weddingCalls.length}</span>
                <br><span style="font-size:11px;color:#888;font-weight:600;">CALLS BOOKED</span>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>`;

  // ── Website Form Inquiries ─────────────────────────────────────────────────
  const inquiryRows = inquiries.length
    ? inquiries
        .map((inq) => {
          const typeLabel = EVENT_TYPE_LABELS[inq.event_type] || inq.event_type;
          const dateStr = fmtDateShort(inq.created_at);
          return `
          <tr><td height="4"></td></tr>
          <tr><td style="padding:12px 14px;background:#f8f7f4;border-radius:6px;">
            <table width="100%">
              <tr>
                <td style="font-size:15px;font-weight:600;color:#1c1d1d;">${escapeHtml(inq.name)}</td>
                <td align="right" style="font-size:12px;color:#888;">${dateStr}</td>
              </tr>
              <tr><td colspan="2" style="padding-top:6px;font-size:13px;color:#555;">
                <span style="color:#2d4a3e;font-weight:600;">${escapeHtml(typeLabel)}</span>
                ${inq.guest_count ? ` &middot; ${escapeHtml(inq.guest_count)} guests` : ""}
                ${inq.preferred_date ? ` &middot; ${escapeHtml(inq.preferred_date)}` : ""}
              </td></tr>
              <tr><td colspan="2" style="padding-top:4px;font-size:13px;color:#888;">
                ${inq.email ? `<a href="mailto:${escapeHtml(inq.email)}" style="color:#2d4a3e;">${escapeHtml(inq.email)}</a>` : ""}
                ${inq.phone ? ` &middot; <a href="tel:${escapeHtml(inq.phone)}" style="color:#2d4a3e;">${escapeHtml(inq.phone)}</a>` : ""}
                ${inq.referral_source ? ` &middot; via ${escapeHtml(inq.referral_source)}` : ""}
              </td></tr>
              ${inq.message ? `<tr><td colspan="2" style="padding-top:6px;font-size:12px;color:#999;font-style:italic;white-space:pre-wrap;max-width:500px;overflow:hidden;text-overflow:ellipsis;">&ldquo;${escapeHtml(inq.message.slice(0, 200))}${inq.message.length > 200 ? "..." : ""}&rdquo;</td></tr>` : ""}
            </table>
          </td></tr>`;
        })
        .join("")
    : `<tr><td style="padding:12px 0;font-size:14px;color:#999;">No website form inquiries this period</td></tr>`;

  const inquirySection = `
    <tr><td style="padding:28px 32px 0;">
      <span style="font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;">Website Form Inquiries</span>
      <table width="100%" cellspacing="0" style="margin-top:8px;">${inquiryRows}</table>
    </td></tr>`;

  // ── Meta Ad Leads ──────────────────────────────────────────────────────────
  const metaRows = metaLeads.length
    ? metaLeads
        .map((lead) => {
          const dateStr = fmtDateShort(lead.created_at);
          const bgColor = lead.disqualified ? "#fff5f5" : "#f0faf0";
          const statusBadge = lead.disqualified
            ? `<span style="font-size:11px;padding:2px 8px;background:#fde8e8;color:#c41e1e;border-radius:3px;font-weight:600;">DQ</span>`
            : `<span style="font-size:11px;padding:2px 8px;background:#d4edda;color:#3B8344;border-radius:3px;font-weight:600;">Qualified</span>`;
          return `
          <tr><td height="4"></td></tr>
          <tr><td style="padding:12px 14px;background:${bgColor};border-radius:6px;">
            <table width="100%">
              <tr>
                <td style="font-size:15px;font-weight:600;color:#1c1d1d;">${escapeHtml(lead.name)} ${statusBadge}</td>
                <td align="right" style="font-size:12px;color:#888;">${dateStr}</td>
              </tr>
              <tr><td colspan="2" style="padding-top:6px;font-size:13px;color:#555;">
                ${lead.wedding_budget ? `Budget: <strong>${escapeHtml(lead.wedding_budget)}</strong>` : ""}
                ${lead.wedding_date_range ? ` &middot; ${escapeHtml(lead.wedding_date_range)}` : ""}
              </td></tr>
              <tr><td colspan="2" style="padding-top:4px;font-size:13px;color:#888;">
                ${lead.email ? `<a href="mailto:${escapeHtml(lead.email)}" style="color:#2d4a3e;">${escapeHtml(lead.email)}</a>` : ""}
                ${lead.phone ? ` &middot; <a href="tel:${escapeHtml(lead.phone)}" style="color:#2d4a3e;">${escapeHtml(lead.phone)}</a>` : ""}
                ${lead.ad_name ? ` &middot; Ad: ${escapeHtml(lead.ad_name)}` : ""}
              </td></tr>
            </table>
          </td></tr>`;
        })
        .join("")
    : `<tr><td style="padding:12px 0;font-size:14px;color:#999;">No Meta ad leads this period</td></tr>`;

  const metaSection = `
    <tr><td style="padding:28px 32px 0;">
      <span style="font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;">Meta Ad Leads</span>
      <table width="100%" cellspacing="0" style="margin-top:8px;">${metaRows}</table>
    </td></tr>`;

  // ── Wedding Calls Booked ───────────────────────────────────────────────────
  const callRows = weddingCalls.length
    ? weddingCalls
        .map((a) => {
          const apptDate = new Date(a.datetime);
          const apptLabel = `${MONTH_NAMES[apptDate.getMonth()].slice(0, 3)} ${apptDate.getDate()}`;
          const timeLabel = a.time.replace(/:00/g, "").toLowerCase();
          return `
          <tr><td height="4"></td></tr>
          <tr><td style="padding:10px 14px;background:#f0f4ff;border-radius:6px;">
            <table width="100%">
              <tr>
                <td style="font-size:14px;color:#1c1d1d;font-weight:600;">${escapeHtml(a.firstName)}${a.lastName ? ` ${escapeHtml(a.lastName[0])}.` : ""}</td>
                <td align="right" style="font-size:13px;color:#888;">${apptLabel} at ${timeLabel}</td>
              </tr>
              <tr><td colspan="2" style="padding-top:4px;font-size:13px;color:#888;">
                ${a.email ? `<a href="mailto:${escapeHtml(a.email)}" style="color:#2d4a3e;">${escapeHtml(a.email)}</a>` : ""}
                ${a.phone ? ` &middot; <a href="tel:${escapeHtml(a.phone)}" style="color:#2d4a3e;">${escapeHtml(a.phone)}</a>` : ""}
              </td></tr>
            </table>
          </td></tr>`;
        })
        .join("")
    : `<tr><td style="padding:12px 0;font-size:14px;color:#999;">No wedding calls booked this period</td></tr>`;

  const callsSection = `
    <tr><td style="padding:28px 32px 0;">
      <span style="font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;">Wedding Consultation Calls Booked</span>
      <table width="100%" cellspacing="0" style="margin-top:8px;">${callRows}</table>
    </td></tr>`;

  // ── GA4 Traffic (optional) ─────────────────────────────────────────────────
  let ga4Section = "";
  if (ga4) {
    const trafficChange = pctChange(ga4.totalSessions, ga4.prevPeriodSessions);

    const pageRows = ga4.pages
      .map(
        (p) =>
          `<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px 0;font-size:14px;color:#1c1d1d;">${escapeHtml(p.pagePath)}</td><td align="center" style="font-size:14px;color:#1c1d1d;">${p.sessions}</td><td align="right" style="font-size:14px;color:#1c1d1d;">${p.users}</td></tr>`
      )
      .join("");

    const sourceRows = ga4.sources
      .map(
        (s) =>
          `<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px 0;font-size:14px;color:#1c1d1d;">${escapeHtml(s.source)} / ${escapeHtml(s.medium)}</td><td align="right" style="font-size:14px;font-weight:600;color:#1c1d1d;">${s.sessions}</td></tr>`
      )
      .join("");

    const ctcChange = pctChange(ga4.totalClickToCalls, ga4.prevClickToCalls);

    const ctcRows = ga4.clickToCalls.length
      ? ga4.clickToCalls
          .map((c) => {
            const phone = c.phoneNumber.replace("tel:", "");
            const page = c.pagePath || "(unknown)";
            return `<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px 0;font-size:14px;color:#1c1d1d;">${escapeHtml(phone)}</td><td style="font-size:13px;color:#888;">${escapeHtml(page)}</td><td align="right" style="font-size:14px;font-weight:600;color:#1c1d1d;">${c.count}</td></tr>`;
          })
          .join("")
      : "";

    const ctcSection = ga4.totalClickToCalls > 0 || ga4.prevClickToCalls > 0
      ? `
    <tr><td style="padding:20px 32px 0;">
      <span style="font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;">Click-to-Call Activity</span>
      <table width="100%" cellspacing="0" style="margin-top:12px;">
        <tr>
          <td width="32%" style="padding:14px;background:#fff8ef;border-radius:8px;text-align:center;">
            <span style="font-size:12px;color:#888;font-weight:600;">PHONE CLICKS</span><br>
            <span style="font-size:22px;font-weight:700;color:#1c1d1d;">${ga4.totalClickToCalls}</span>
            <br><span style="font-size:12px;font-weight:600;color:${ctcChange.color};">${ctcChange.text} vs prev wk</span>
          </td>
          <td width="68%"></td>
        </tr>
      </table>
      ${ctcRows ? `<table width="100%" cellspacing="0" style="margin-top:12px;border-collapse:collapse;">
        <tr style="border-bottom:2px solid #eee;">
          <td style="padding:8px 0;font-size:12px;font-weight:600;color:#888;">PHONE NUMBER</td>
          <td style="font-size:12px;font-weight:600;color:#888;">PAGE</td>
          <td align="right" style="font-size:12px;font-weight:600;color:#888;">CLICKS</td>
        </tr>
        ${ctcRows}
      </table>` : ""}
    </td></tr>`
      : "";

    ga4Section = `
    <tr><td style="padding:28px 32px 0;">
      <span style="font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;">Wedding Page Traffic (GA4)</span>
      <table width="100%" cellspacing="0" style="margin-top:12px;">
        <tr><td>
          <table width="100%" cellspacing="0">
            <tr>
              <td width="32%" style="padding:14px;background:#f8f7f4;border-radius:8px;text-align:center;">
                <span style="font-size:12px;color:#888;font-weight:600;">SESSIONS</span><br>
                <span style="font-size:22px;font-weight:700;color:#1c1d1d;">${ga4.totalSessions}</span>
                <br><span style="font-size:12px;font-weight:600;color:${trafficChange.color};">${trafficChange.text}</span>
              </td>
              <td width="2%"></td>
              <td width="32%" style="padding:14px;background:#f8f7f4;border-radius:8px;text-align:center;">
                <span style="font-size:12px;color:#888;font-weight:600;">USERS</span><br>
                <span style="font-size:22px;font-weight:700;color:#1c1d1d;">${ga4.totalUsers}</span>
              </td>
              <td width="34%"></td>
            </tr>
          </table>
        </td></tr>
      </table>
      <table width="100%" cellspacing="0" style="margin-top:16px;border-collapse:collapse;">
        <tr style="border-bottom:2px solid #eee;">
          <td style="padding:8px 0;font-size:12px;font-weight:600;color:#888;">PAGE</td>
          <td align="center" style="font-size:12px;font-weight:600;color:#888;">SESSIONS</td>
          <td align="right" style="font-size:12px;font-weight:600;color:#888;">USERS</td>
        </tr>
        ${pageRows}
      </table>
    </td></tr>
    <tr><td style="padding:20px 32px 0;">
      <span style="font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;">Top Traffic Sources (Wedding Pages)</span>
      <table width="100%" cellspacing="0" style="margin-top:12px;border-collapse:collapse;">
        <tr style="border-bottom:2px solid #eee;">
          <td style="padding:8px 0;font-size:12px;font-weight:600;color:#888;">SOURCE / MEDIUM</td>
          <td align="right" style="font-size:12px;font-weight:600;color:#888;">SESSIONS</td>
        </tr>
        ${sourceRows}
      </table>
    </td></tr>
    ${ctcSection}`;
  }

  // ── Referral Sources (from form data) ──────────────────────────────────────
  const refCounts: Record<string, number> = {};
  for (const inq of ytdInquiries) {
    if (inq.referral_source) {
      const src = inq.referral_source.trim();
      refCounts[src] = (refCounts[src] || 0) + 1;
    }
  }
  const topRefs = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const totalRefs = Object.values(refCounts).reduce((s, n) => s + n, 0);

  const refRows = topRefs.length
    ? topRefs
        .map(([name, count]) => {
          const pct = totalRefs ? Math.round((count / totalRefs) * 100) : 0;
          return `<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px 0;font-size:14px;color:#1c1d1d;">${escapeHtml(name)}</td><td align="right" style="font-size:14px;font-weight:600;color:#1c1d1d;">${count} <span style="color:#888;font-weight:400;font-size:12px;">(${pct}%)</span></td></tr>`;
        })
        .join("")
    : `<tr><td style="padding:8px 0;font-size:14px;color:#999;">No referral data yet</td></tr>`;

  const referralSection = `
    <tr><td style="padding:28px 32px 0;">
      <span style="font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;">How They Found Us (${year} YTD — Website Forms)</span>
      <table width="100%" cellspacing="0" style="margin-top:12px;border-collapse:collapse;">${refRows}</table>
    </td></tr>`;

  // ── YTD Pipeline Summary ───────────────────────────────────────────────────
  const ytdTotal = ytdInquiries.length + ytdMetaLeads.length + ytdWeddingCalls.length;
  const ytdQualifiedMeta = ytdMetaLeads.filter((l) => !l.disqualified).length;

  // Monthly breakdown
  const monthlyData: Record<string, { forms: number; meta: number; calls: number }> = {};
  for (const inq of ytdInquiries) {
    const m = inq.created_at.slice(0, 7);
    if (!monthlyData[m]) monthlyData[m] = { forms: 0, meta: 0, calls: 0 };
    monthlyData[m].forms++;
  }
  for (const lead of ytdMetaLeads) {
    const m = lead.created_at.slice(0, 7);
    if (!monthlyData[m]) monthlyData[m] = { forms: 0, meta: 0, calls: 0 };
    monthlyData[m].meta++;
  }
  for (const call of ytdWeddingCalls) {
    const m = call.datetimeCreated.slice(0, 7);
    if (!monthlyData[m]) monthlyData[m] = { forms: 0, meta: 0, calls: 0 };
    monthlyData[m].calls++;
  }

  const months = Object.keys(monthlyData).sort();
  const monthlyRows = months
    .map((m) => {
      const d = monthlyData[m];
      const mo = parseInt(m.split("-")[1]) - 1;
      const total = d.forms + d.meta + d.calls;
      return `<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px 0;font-size:14px;color:#1c1d1d;">${MONTH_NAMES[mo]}</td><td align="center" style="font-size:14px;color:#1c1d1d;">${d.forms}</td><td align="center" style="font-size:14px;color:#1c1d1d;">${d.meta}</td><td align="center" style="font-size:14px;color:#1c1d1d;">${d.calls}</td><td align="right" style="font-size:14px;font-weight:600;color:#1c1d1d;">${total}</td></tr>`;
    })
    .join("");

  const ytdSection = `
    <tr><td style="padding:28px 32px 0;">
      <span style="font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;">${year} YTD Pipeline Summary</span>
      <table width="100%" cellspacing="0" style="margin-top:12px;">
        <tr>
          <td width="24%" style="padding:14px 12px;background:#f8f7f4;border-radius:8px;text-align:center;">
            <span style="font-size:28px;font-weight:700;color:#1c1d1d;">${ytdTotal}</span>
            <br><span style="font-size:11px;color:#888;font-weight:600;">TOTAL LEADS</span>
          </td>
          <td width="1%"></td>
          <td width="24%" style="padding:14px 12px;background:#f8f7f4;border-radius:8px;text-align:center;">
            <span style="font-size:24px;font-weight:700;color:#1c1d1d;">${ytdInquiries.length}</span>
            <br><span style="font-size:11px;color:#888;font-weight:600;">FORMS</span>
          </td>
          <td width="1%"></td>
          <td width="24%" style="padding:14px 12px;background:#f8f7f4;border-radius:8px;text-align:center;">
            <span style="font-size:24px;font-weight:700;color:#1c1d1d;">${ytdQualifiedMeta}/${ytdMetaLeads.length}</span>
            <br><span style="font-size:11px;color:#888;font-weight:600;">META (QUAL/TOTAL)</span>
          </td>
          <td width="1%"></td>
          <td width="24%" style="padding:14px 12px;background:#f8f7f4;border-radius:8px;text-align:center;">
            <span style="font-size:24px;font-weight:700;color:#1c1d1d;">${ytdWeddingCalls.length}</span>
            <br><span style="font-size:11px;color:#888;font-weight:600;">CALLS</span>
          </td>
        </tr>
      </table>
      <table width="100%" cellspacing="0" style="margin-top:16px;border-collapse:collapse;">
        <tr style="border-bottom:2px solid #eee;">
          <td style="padding:8px 0;font-size:12px;font-weight:600;color:#888;">MONTH</td>
          <td align="center" style="font-size:12px;font-weight:600;color:#888;">FORMS</td>
          <td align="center" style="font-size:12px;font-weight:600;color:#888;">META</td>
          <td align="center" style="font-size:12px;font-weight:600;color:#888;">CALLS</td>
          <td align="right" style="font-size:12px;font-weight:600;color:#888;">TOTAL</td>
        </tr>
        ${monthlyRows}
        <tr style="background:#1c1d1d;">
          <td style="padding:12px 10px;font-size:14px;font-weight:700;color:#f2c070;border-radius:6px 0 0 6px;">YTD Total</td>
          <td align="center" style="padding:12px 0;font-size:14px;font-weight:700;color:#f2c070;">${ytdInquiries.length}</td>
          <td align="center" style="padding:12px 0;font-size:14px;font-weight:700;color:#f2c070;">${ytdMetaLeads.length}</td>
          <td align="center" style="padding:12px 0;font-size:14px;font-weight:700;color:#f2c070;">${ytdWeddingCalls.length}</td>
          <td align="right" style="padding:12px 10px;font-size:14px;font-weight:700;color:#f2c070;border-radius:0 6px 6px 0;">${ytdTotal}</td>
        </tr>
      </table>
    </td></tr>`;

  // ── Assemble Email ─────────────────────────────────────────────────────────
  const todayLabel = fmtDateFull(pacific(new Date()));

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8f7f4;font-family:Helvetica Neue,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;">
      <tr><td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr><td style="background:#1c1d1d;padding:24px 32px;">
            <table width="100%"><tr>
              <td>
                <span style="font-size:22px;font-weight:700;color:#f2c070;letter-spacing:0.5px;">Highland Farms</span><br>
                <span style="font-size:13px;color:#aaa;">Wedding Pipeline Report</span>
              </td>
              <td align="right">
                <span style="font-size:14px;color:#f2c070;font-weight:600;">${todayLabel}</span><br>
                <span style="font-size:12px;color:#888;">Week of ${periodLabel}</span>
              </td>
            </tr></table>
          </td></tr>

          ${summaryCards}
          ${inquirySection}
          ${metaSection}
          ${callsSection}
          ${ga4Section}
          ${referralSection}
          ${ytdSection}

          <!-- HubSpot CTA -->
          <tr><td style="padding:28px 32px 0;text-align:center;">
            <a href="https://app-na2.hubspot.com/contacts/241936089" style="display:inline-block;background:#2d4a3e;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">View All Contacts in HubSpot</a>
          </td></tr>

          <!-- Footer -->
          <tr><td style="padding:24px 32px;text-align:center;">
            <span style="font-size:11px;color:#bbb;">Highland Farms Wedding Pipeline Report — Auto-generated from Supabase, Acuity${ga4 ? ", and GA4" : ""} data</span>
          </td></tr>

        </table>
      </td></tr>
    </table>
  </body></html>`;
}

// ── Route Handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await gatherData();
    const html = buildReport(data);

    const today = pacific(new Date());
    const dateLabel = `${MONTH_NAMES[today.getMonth()].slice(0, 3)} ${today.getDate()}, ${today.getFullYear()}`;
    const totalLeads = data.inquiries.length + data.metaLeads.length + data.weddingCalls.length;

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "Highland Farms <notifications@highlandfarmsoregon.com>",
      to: RECIPIENTS,
      subject: `Wedding Pipeline: ${totalLeads} new lead${totalLeads !== 1 ? "s" : ""} this week — ${dateLabel}`,
      html,
    });

    if (error) {
      console.error("Wedding report email error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, recipients: RECIPIENTS.length, leads: totalLeads });
  } catch (err) {
    console.error("Wedding inquiry report error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
