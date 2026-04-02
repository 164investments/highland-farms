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

// Design: editorial luxury — Georgia serif headings, gold accent motifs,
// color-coded channel borders, warm earthy palette. Email-safe tables + inline CSS.

const SERIF = "Georgia,'Times New Roman',Times,serif";
const SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif";

// Section heading helper — gold left bar + serif title
function sectionHead(title: string): string {
  return `<tr><td style="padding:32px 36px 0;"><table cellspacing="0" cellpadding="0"><tr><td style="border-left:3px solid #f2c070;padding-left:14px;"><span style="font-family:${SERIF};font-size:17px;font-weight:400;color:#2d4a3e;letter-spacing:0.3px;">${title}</span></td></tr></table></td></tr>`;
}

// Thin gold divider
function goldRule(): string {
  return `<tr><td style="padding:28px 36px 0;"><table width="100%" cellspacing="0"><tr><td style="border-top:1px solid #e8d5b0;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>`;
}

function buildReport(data: ReportData): string {
  const {
    periodStart, periodEnd,
    inquiries, prevInquiries,
    metaLeads, prevMetaLeads,
    weddingCalls, prevWeddingCalls,
    ytdInquiries, ytdMetaLeads, ytdWeddingCalls,
    ga4,
  } = data;

  const periodLabel = `${fmtDateShort(periodStart.toISOString())} &ndash; ${fmtDateShort(periodEnd.toISOString())}`;
  const year = periodEnd.getFullYear();

  const totalCurrent = inquiries.length + metaLeads.length + weddingCalls.length;
  const totalPrev = prevInquiries.length + prevMetaLeads.length + prevWeddingCalls.length;
  const totalChange = pctChange(totalCurrent, totalPrev);
  const qualifiedMeta = metaLeads.filter((l) => !l.disqualified).length;

  // ── Hero Summary ───────────────────────────────────────────────────────────
  const heroSection = `
    <tr><td style="padding:32px 36px 0;">
      <table width="100%" cellspacing="0"><tr>
        <!-- Hero number -->
        <td width="140" style="padding:20px 24px;background:#2d4a3e;border-radius:10px;text-align:center;vertical-align:top;">
          <span style="font-family:${SERIF};font-size:48px;font-weight:700;color:#f2c070;line-height:1;">${totalCurrent}</span><br>
          <span style="font-family:${SANS};font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1.5px;">New Leads</span><br>
          <span style="font-family:${SANS};font-size:12px;font-weight:600;color:${totalChange.color === "#3B8344" ? "#a8d5b0" : "#f5a0a0"};">${totalChange.text}</span>
        </td>
        <td width="16"></td>
        <!-- Channel breakdown -->
        <td style="vertical-align:top;">
          <table width="100%" cellspacing="0">
            <tr>
              <td style="padding:14px 16px;background:#faf8f5;border-left:3px solid #2d4a3e;border-radius:0 8px 8px 0;">
                <span style="font-family:${SANS};font-size:24px;font-weight:700;color:#2d4a3e;">${inquiries.length}</span>
                <span style="font-family:${SANS};font-size:12px;color:#888;padding-left:6px;">Website Forms</span>
              </td>
            </tr>
            <tr><td height="6"></td></tr>
            <tr>
              <td style="padding:14px 16px;background:#faf8f5;border-left:3px solid #f4d7c3;border-radius:0 8px 8px 0;">
                <span style="font-family:${SANS};font-size:24px;font-weight:700;color:#2d4a3e;">${metaLeads.length}</span>
                <span style="font-family:${SANS};font-size:12px;color:#888;padding-left:6px;">Meta Leads${qualifiedMeta < metaLeads.length ? ` <span style="color:#aaa;">(${qualifiedMeta} qual.)</span>` : ""}</span>
              </td>
            </tr>
            <tr><td height="6"></td></tr>
            <tr>
              <td style="padding:14px 16px;background:#faf8f5;border-left:3px solid #f2c070;border-radius:0 8px 8px 0;">
                <span style="font-family:${SANS};font-size:24px;font-weight:700;color:#2d4a3e;">${weddingCalls.length}</span>
                <span style="font-family:${SANS};font-size:12px;color:#888;padding-left:6px;">Calls Booked</span>
              </td>
            </tr>
          </table>
        </td>
      </tr></table>
    </td></tr>`;

  // ── Website Form Inquiries ─────────────────────────────────────────────────
  const inquiryRows = inquiries.length
    ? inquiries.map((inq) => {
        const typeLabel = EVENT_TYPE_LABELS[inq.event_type] || inq.event_type;
        const dateStr = fmtDateShort(inq.created_at);
        return `
        <tr><td height="8"></td></tr>
        <tr><td>
          <table width="100%" cellspacing="0" cellpadding="0"><tr>
            <td width="3" style="background:#2d4a3e;border-radius:2px;"></td>
            <td style="padding:14px 16px;">
              <table width="100%"><tr>
                <td style="font-family:${SERIF};font-size:16px;color:#1c1d1d;">${escapeHtml(inq.name)}</td>
                <td align="right" style="font-family:${SANS};font-size:11px;color:#aaa;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${dateStr}</td>
              </tr></table>
              <table width="100%" style="margin-top:6px;"><tr>
                <td style="font-family:${SANS};font-size:13px;color:#404f52;">
                  <span style="font-weight:600;">${escapeHtml(typeLabel)}</span>${inq.guest_count ? ` &middot; ${escapeHtml(inq.guest_count)} guests` : ""}${inq.preferred_date ? ` &middot; ${escapeHtml(inq.preferred_date)}` : ""}
                </td>
              </tr></table>
              <table width="100%" style="margin-top:4px;"><tr>
                <td style="font-family:${SANS};font-size:12px;color:#999;">
                  ${inq.email ? `<a href="mailto:${escapeHtml(inq.email)}" style="color:#2d4a3e;text-decoration:none;">${escapeHtml(inq.email)}</a>` : ""}${inq.phone ? ` &middot; <a href="tel:${escapeHtml(inq.phone)}" style="color:#2d4a3e;text-decoration:none;">${escapeHtml(inq.phone)}</a>` : ""}${inq.referral_source ? ` &middot; <span style="color:#c4a265;">via ${escapeHtml(inq.referral_source)}</span>` : ""}
                </td>
              </tr></table>
              ${inq.message ? `<table width="100%" style="margin-top:8px;"><tr><td style="font-family:${SERIF};font-size:12px;color:#aaa;font-style:italic;line-height:1.5;">&ldquo;${escapeHtml(inq.message.slice(0, 180))}${inq.message.length > 180 ? "&hellip;" : ""}&rdquo;</td></tr></table>` : ""}
            </td>
          </tr></table>
        </td></tr>`;
      }).join("")
    : `<tr><td style="padding:16px 0;font-family:${SANS};font-size:14px;color:#bbb;font-style:italic;">No website form inquiries this period</td></tr>`;

  const inquirySection = `${sectionHead("Website Form Inquiries")}<tr><td style="padding:8px 36px 0;"><table width="100%" cellspacing="0">${inquiryRows}</table></td></tr>`;

  // ── Meta Ad Leads ──────────────────────────────────────────────────────────
  const metaRows = metaLeads.length
    ? metaLeads.map((lead) => {
        const dateStr = fmtDateShort(lead.created_at);
        const borderColor = lead.disqualified ? "#e8c0c0" : "#c4d8b0";
        const badge = lead.disqualified
          ? `<span style="font-family:${SANS};font-size:10px;padding:2px 7px;background:#fde8e8;color:#b04040;border-radius:3px;font-weight:700;letter-spacing:0.5px;">DQ</span>`
          : `<span style="font-family:${SANS};font-size:10px;padding:2px 7px;background:#e4f2da;color:#3B7034;border-radius:3px;font-weight:700;letter-spacing:0.5px;">QUALIFIED</span>`;
        return `
        <tr><td height="8"></td></tr>
        <tr><td>
          <table width="100%" cellspacing="0" cellpadding="0"><tr>
            <td width="3" style="background:${borderColor};border-radius:2px;"></td>
            <td style="padding:14px 16px;">
              <table width="100%"><tr>
                <td style="font-family:${SERIF};font-size:16px;color:#1c1d1d;">${escapeHtml(lead.name)} &nbsp;${badge}</td>
                <td align="right" style="font-family:${SANS};font-size:11px;color:#aaa;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${dateStr}</td>
              </tr></table>
              <table width="100%" style="margin-top:6px;"><tr>
                <td style="font-family:${SANS};font-size:13px;color:#404f52;">
                  ${lead.wedding_budget ? `<strong>${escapeHtml(lead.wedding_budget)}</strong>` : ""}${lead.wedding_date_range ? ` &middot; ${escapeHtml(lead.wedding_date_range)}` : ""}
                </td>
              </tr></table>
              <table width="100%" style="margin-top:4px;"><tr>
                <td style="font-family:${SANS};font-size:12px;color:#999;">
                  ${lead.email ? `<a href="mailto:${escapeHtml(lead.email)}" style="color:#2d4a3e;text-decoration:none;">${escapeHtml(lead.email)}</a>` : ""}${lead.phone ? ` &middot; <a href="tel:${escapeHtml(lead.phone)}" style="color:#2d4a3e;text-decoration:none;">${escapeHtml(lead.phone)}</a>` : ""}${lead.ad_name ? ` &middot; <span style="color:#c4a265;">${escapeHtml(lead.ad_name)}</span>` : ""}
                </td>
              </tr></table>
            </td>
          </tr></table>
        </td></tr>`;
      }).join("")
    : `<tr><td style="padding:16px 0;font-family:${SANS};font-size:14px;color:#bbb;font-style:italic;">No Meta ad leads this period</td></tr>`;

  const metaSection = `${goldRule()}${sectionHead("Meta Ad Leads")}<tr><td style="padding:8px 36px 0;"><table width="100%" cellspacing="0">${metaRows}</table></td></tr>`;

  // ── Wedding Calls Booked ───────────────────────────────────────────────────
  const callRows = weddingCalls.length
    ? weddingCalls.map((a) => {
        const apptDate = new Date(a.datetime);
        const apptLabel = `${MONTH_NAMES[apptDate.getMonth()].slice(0, 3)} ${apptDate.getDate()}`;
        const timeLabel = a.time.replace(/:00/g, "").toLowerCase();
        return `
        <tr><td height="8"></td></tr>
        <tr><td>
          <table width="100%" cellspacing="0" cellpadding="0"><tr>
            <td width="3" style="background:#f2c070;border-radius:2px;"></td>
            <td style="padding:12px 16px;">
              <table width="100%"><tr>
                <td style="font-family:${SERIF};font-size:15px;color:#1c1d1d;">${escapeHtml(a.firstName)}${a.lastName ? ` ${escapeHtml(a.lastName[0])}.` : ""}</td>
                <td align="right" style="font-family:${SANS};font-size:12px;color:#c4a265;font-weight:600;">${apptLabel} &middot; ${timeLabel}</td>
              </tr></table>
              <table width="100%" style="margin-top:4px;"><tr>
                <td style="font-family:${SANS};font-size:12px;color:#999;">
                  ${a.email ? `<a href="mailto:${escapeHtml(a.email)}" style="color:#2d4a3e;text-decoration:none;">${escapeHtml(a.email)}</a>` : ""}${a.phone ? ` &middot; <a href="tel:${escapeHtml(a.phone)}" style="color:#2d4a3e;text-decoration:none;">${escapeHtml(a.phone)}</a>` : ""}
                </td>
              </tr></table>
            </td>
          </tr></table>
        </td></tr>`;
      }).join("")
    : `<tr><td style="padding:16px 0;font-family:${SANS};font-size:14px;color:#bbb;font-style:italic;">No consultation calls booked this period</td></tr>`;

  const callsSection = `${goldRule()}${sectionHead("Consultation Calls Booked")}<tr><td style="padding:8px 36px 0;"><table width="100%" cellspacing="0">${callRows}</table></td></tr>`;

  // ── GA4 Traffic + Click-to-Call (optional) ─────────────────────────────────
  let ga4Section = "";
  if (ga4) {
    const trafficChange = pctChange(ga4.totalSessions, ga4.prevPeriodSessions);
    const ctcChange = pctChange(ga4.totalClickToCalls, ga4.prevClickToCalls);

    const pageRows = ga4.pages.map((p, i) =>
      `<tr><td style="padding:9px 12px;font-family:${SANS};font-size:13px;color:#1c1d1d;${i % 2 ? "background:#faf8f5;" : ""}">${escapeHtml(p.pagePath)}</td><td align="center" style="padding:9px 8px;font-family:${SANS};font-size:13px;color:#404f52;${i % 2 ? "background:#faf8f5;" : ""}">${p.sessions}</td><td align="right" style="padding:9px 12px;font-family:${SANS};font-size:13px;color:#404f52;${i % 2 ? "background:#faf8f5;" : ""}">${p.users}</td></tr>`
    ).join("");

    const sourceRows = ga4.sources.map((s, i) =>
      `<tr><td style="padding:9px 12px;font-family:${SANS};font-size:13px;color:#1c1d1d;${i % 2 ? "background:#faf8f5;" : ""}">${escapeHtml(s.source)} / ${escapeHtml(s.medium)}</td><td align="right" style="padding:9px 12px;font-family:${SANS};font-size:13px;font-weight:600;color:#2d4a3e;${i % 2 ? "background:#faf8f5;" : ""}">${s.sessions}</td></tr>`
    ).join("");

    const ctcRows = ga4.clickToCalls.length ? ga4.clickToCalls.map((c, i) => {
      const phone = c.phoneNumber.replace("tel:", "");
      const page = c.pagePath || "(unknown)";
      return `<tr><td style="padding:9px 12px;font-family:${SANS};font-size:13px;color:#1c1d1d;${i % 2 ? "background:#faf8f5;" : ""}">${escapeHtml(phone)}</td><td style="padding:9px 8px;font-family:${SANS};font-size:12px;color:#999;${i % 2 ? "background:#faf8f5;" : ""}">${escapeHtml(page)}</td><td align="right" style="padding:9px 12px;font-family:${SANS};font-size:13px;font-weight:600;color:#2d4a3e;${i % 2 ? "background:#faf8f5;" : ""}">${c.count}</td></tr>`;
    }).join("") : "";

    const ctcBlock = (ga4.totalClickToCalls > 0 || ga4.prevClickToCalls > 0)
      ? `<!-- Click-to-Call -->
      <tr><td height="20"></td></tr>
      <tr><td>
        <table cellspacing="0" cellpadding="0"><tr><td style="border-left:3px solid #f2c070;padding-left:14px;"><span style="font-family:${SERIF};font-size:15px;color:#2d4a3e;">Click-to-Call</span></td></tr></table>
      </td></tr>
      <tr><td height="10"></td></tr>
      <tr><td>
        <table cellspacing="0" cellpadding="0"><tr>
          <td style="padding:12px 18px;background:#faf8f5;border-radius:8px;">
            <span style="font-family:${SANS};font-size:28px;font-weight:700;color:#2d4a3e;">${ga4.totalClickToCalls}</span>
            <span style="font-family:${SANS};font-size:12px;color:#888;padding-left:8px;">phone clicks</span>
            <span style="font-family:${SANS};font-size:12px;font-weight:600;color:${ctcChange.color};padding-left:4px;">${ctcChange.text}</span>
          </td>
        </tr></table>
      </td></tr>
      ${ctcRows ? `<tr><td height="8"></td></tr>
      <tr><td>
        <table width="100%" cellspacing="0" style="border-collapse:collapse;">
          <tr><td style="padding:7px 12px;font-family:${SANS};font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e8d5b0;">Number</td><td style="padding:7px 8px;font-family:${SANS};font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e8d5b0;">Page</td><td align="right" style="padding:7px 12px;font-family:${SANS};font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e8d5b0;">Clicks</td></tr>
          ${ctcRows}
        </table>
      </td></tr>` : ""}` : "";

    ga4Section = `${goldRule()}${sectionHead("Website Traffic")}
    <tr><td style="padding:12px 36px 0;">
      <!-- Traffic metrics -->
      <table width="100%" cellspacing="0"><tr>
        <td width="48%" style="padding:16px 20px;background:#2d4a3e;border-radius:8px;">
          <span style="font-family:${SANS};font-size:10px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1.5px;">Sessions</span><br>
          <span style="font-family:${SERIF};font-size:30px;font-weight:700;color:#f2c070;">${ga4.totalSessions}</span>
          <span style="font-family:${SANS};font-size:12px;font-weight:600;color:${trafficChange.color === "#3B8344" ? "#a8d5b0" : "#f5a0a0"};padding-left:6px;">${trafficChange.text}</span>
        </td>
        <td width="4%"></td>
        <td width="48%" style="padding:16px 20px;background:#faf8f5;border-radius:8px;">
          <span style="font-family:${SANS};font-size:10px;font-weight:700;color:#bbb;text-transform:uppercase;letter-spacing:1.5px;">Users</span><br>
          <span style="font-family:${SERIF};font-size:30px;font-weight:700;color:#2d4a3e;">${ga4.totalUsers}</span>
        </td>
      </tr></table>

      <!-- Page breakdown -->
      <table width="100%" cellspacing="0" style="margin-top:16px;border-collapse:collapse;">
        <tr><td style="padding:7px 12px;font-family:${SANS};font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e8d5b0;">Page</td><td align="center" style="padding:7px 8px;font-family:${SANS};font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e8d5b0;">Sessions</td><td align="right" style="padding:7px 12px;font-family:${SANS};font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e8d5b0;">Users</td></tr>
        ${pageRows}
      </table>

      <!-- Sources -->
      <tr><td height="20"></td></tr>
      <tr><td>
        <table cellspacing="0" cellpadding="0"><tr><td style="border-left:3px solid #f4d7c3;padding-left:14px;"><span style="font-family:${SERIF};font-size:15px;color:#2d4a3e;">Traffic Sources</span></td></tr></table>
      </td></tr>
      <tr><td height="8"></td></tr>
      <tr><td>
        <table width="100%" cellspacing="0" style="border-collapse:collapse;">
          <tr><td style="padding:7px 12px;font-family:${SANS};font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e8d5b0;">Source / Medium</td><td align="right" style="padding:7px 12px;font-family:${SANS};font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e8d5b0;">Sessions</td></tr>
          ${sourceRows}
        </table>
      </td></tr>

      ${ctcBlock}
    </td></tr>`;
  }

  // ── Referral Sources ───────────────────────────────────────────────────────
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
    ? topRefs.map(([name, count], i) => {
        const pct = totalRefs ? Math.round((count / totalRefs) * 100) : 0;
        const barWidth = Math.max(4, pct);
        return `<tr><td style="padding:6px 0;"><table width="100%" cellspacing="0"><tr><td style="font-family:${SANS};font-size:13px;color:#1c1d1d;padding-bottom:3px;">${escapeHtml(name)} <span style="color:#bbb;">&middot; ${count}</span></td><td align="right" style="font-family:${SANS};font-size:12px;color:#aaa;font-weight:600;">${pct}%</td></tr><tr><td colspan="2"><table width="100%" cellspacing="0"><tr><td style="background:#f2c070;height:4px;border-radius:2px;width:${barWidth}%;"></td><td style="background:#f0ece4;height:4px;border-radius:2px;${i < topRefs.length - 1 ? "" : ""}"></td></tr></table></td></tr></table></td></tr>`;
      }).join("")
    : `<tr><td style="padding:12px 0;font-family:${SANS};font-size:14px;color:#bbb;font-style:italic;">No referral data yet</td></tr>`;

  const referralSection = `${goldRule()}${sectionHead(`How They Found Us &mdash; ${year} YTD`)}<tr><td style="padding:12px 36px 0;"><table width="100%" cellspacing="0">${refRows}</table></td></tr>`;

  // ── YTD Pipeline Summary ───────────────────────────────────────────────────
  const ytdTotal = ytdInquiries.length + ytdMetaLeads.length + ytdWeddingCalls.length;
  const ytdQualifiedMeta = ytdMetaLeads.filter((l) => !l.disqualified).length;

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
  const monthlyRows = months.map((m, i) => {
    const d = monthlyData[m];
    const mo = parseInt(m.split("-")[1]) - 1;
    const total = d.forms + d.meta + d.calls;
    const bg = i % 2 ? "background:#faf8f5;" : "";
    return `<tr><td style="padding:9px 12px;font-family:${SANS};font-size:13px;color:#1c1d1d;${bg}">${MONTH_NAMES[mo]}</td><td align="center" style="padding:9px 8px;font-family:${SANS};font-size:13px;color:#404f52;${bg}">${d.forms}</td><td align="center" style="padding:9px 8px;font-family:${SANS};font-size:13px;color:#404f52;${bg}">${d.meta}</td><td align="center" style="padding:9px 8px;font-family:${SANS};font-size:13px;color:#404f52;${bg}">${d.calls}</td><td align="right" style="padding:9px 12px;font-family:${SANS};font-size:13px;font-weight:700;color:#1c1d1d;${bg}">${total}</td></tr>`;
  }).join("");

  const ytdSection = `${goldRule()}${sectionHead(`${year} Pipeline`)}
    <tr><td style="padding:12px 36px 0;">
      <!-- YTD summary cards -->
      <table width="100%" cellspacing="0"><tr>
        <td width="24%" style="padding:12px 10px;background:#faf8f5;border-radius:8px;text-align:center;">
          <span style="font-family:${SERIF};font-size:26px;font-weight:700;color:#1c1d1d;">${ytdTotal}</span><br>
          <span style="font-family:${SANS};font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Total</span>
        </td>
        <td width="1%"></td>
        <td width="24%" style="padding:12px 10px;background:#faf8f5;border-radius:8px;text-align:center;">
          <span style="font-family:${SERIF};font-size:22px;font-weight:700;color:#2d4a3e;">${ytdInquiries.length}</span><br>
          <span style="font-family:${SANS};font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Forms</span>
        </td>
        <td width="1%"></td>
        <td width="24%" style="padding:12px 10px;background:#faf8f5;border-radius:8px;text-align:center;">
          <span style="font-family:${SERIF};font-size:22px;font-weight:700;color:#2d4a3e;">${ytdQualifiedMeta}<span style="font-size:14px;color:#bbb;">/${ytdMetaLeads.length}</span></span><br>
          <span style="font-family:${SANS};font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Meta</span>
        </td>
        <td width="1%"></td>
        <td width="24%" style="padding:12px 10px;background:#faf8f5;border-radius:8px;text-align:center;">
          <span style="font-family:${SERIF};font-size:22px;font-weight:700;color:#2d4a3e;">${ytdWeddingCalls.length}</span><br>
          <span style="font-family:${SANS};font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Calls</span>
        </td>
      </tr></table>

      <!-- Monthly table -->
      <table width="100%" cellspacing="0" style="margin-top:16px;border-collapse:collapse;">
        <tr><td style="padding:7px 12px;font-family:${SANS};font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e8d5b0;">Month</td><td align="center" style="padding:7px 8px;font-family:${SANS};font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e8d5b0;">Forms</td><td align="center" style="padding:7px 8px;font-family:${SANS};font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e8d5b0;">Meta</td><td align="center" style="padding:7px 8px;font-family:${SANS};font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e8d5b0;">Calls</td><td align="right" style="padding:7px 12px;font-family:${SANS};font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e8d5b0;">Total</td></tr>
        ${monthlyRows}
        <tr><td style="padding:12px 12px;font-family:${SANS};font-size:13px;font-weight:700;color:#faf8f5;background:#2d4a3e;border-radius:6px 0 0 6px;">${year} Total</td><td align="center" style="padding:12px 8px;font-family:${SANS};font-size:13px;font-weight:700;color:#f2c070;background:#2d4a3e;">${ytdInquiries.length}</td><td align="center" style="padding:12px 8px;font-family:${SANS};font-size:13px;font-weight:700;color:#f2c070;background:#2d4a3e;">${ytdMetaLeads.length}</td><td align="center" style="padding:12px 8px;font-family:${SANS};font-size:13px;font-weight:700;color:#f2c070;background:#2d4a3e;">${ytdWeddingCalls.length}</td><td align="right" style="padding:12px 12px;font-family:${SANS};font-size:13px;font-weight:700;color:#f2c070;background:#2d4a3e;border-radius:0 6px 6px 0;">${ytdTotal}</td></tr>
      </table>
    </td></tr>`;

  // ── Assemble Email ─────────────────────────────────────────────────────────
  const todayLabel = fmtDateFull(pacific(new Date()));

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#e8e4dd;font-family:${SANS};">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e4dd;">
      <tr><td align="center" style="padding:40px 16px;">
        <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header bar -->
          <tr><td style="background:#2d4a3e;padding:28px 36px;">
            <table width="100%"><tr>
              <td>
                <span style="font-family:${SERIF};font-size:26px;font-weight:400;color:#f2c070;letter-spacing:0.5px;">Highland Farms</span><br>
                <span style="font-family:${SANS};font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:2px;font-weight:600;">Wedding Pipeline</span>
              </td>
              <td align="right" style="vertical-align:bottom;">
                <span style="font-family:${SANS};font-size:13px;color:#f2c070;font-weight:600;">${todayLabel}</span><br>
                <span style="font-family:${SANS};font-size:11px;color:rgba(255,255,255,0.4);">Week of ${periodLabel}</span>
              </td>
            </tr></table>
          </td></tr>
          <!-- Gold accent stripe -->
          <tr><td style="background:#f2c070;height:3px;font-size:1px;line-height:1px;">&nbsp;</td></tr>

          ${heroSection}
          ${goldRule()}
          ${inquirySection}
          ${metaSection}
          ${callsSection}
          ${ga4Section}
          ${referralSection}
          ${ytdSection}

          <!-- HubSpot CTA -->
          <tr><td style="padding:36px 36px 0;text-align:center;">
            <a href="https://app-na2.hubspot.com/contacts/241936089" style="display:inline-block;background:#f2c070;color:#1c1d1d;padding:14px 32px;border-radius:6px;text-decoration:none;font-family:${SANS};font-weight:700;font-size:13px;letter-spacing:0.5px;">View All Contacts in HubSpot</a>
          </td></tr>

          <!-- Footer -->
          <tr><td style="padding:28px 36px 32px;">
            <table width="100%" cellspacing="0"><tr><td style="border-top:1px solid #e8d5b0;padding-top:16px;text-align:center;">
              <span style="font-family:${SANS};font-size:11px;color:#c0b8a8;">Highland Farms &middot; Brightwood, Oregon</span><br>
              <span style="font-family:${SANS};font-size:10px;color:#d0c8b8;">Auto-generated from Supabase, Acuity${ga4 ? ", &amp; GA4" : ""}</span>
            </td></tr></table>
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
