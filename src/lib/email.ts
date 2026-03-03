import { Resend } from "resend";

let resend: Resend;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const EVENT_RECIPIENT_MAP: Record<string, string> = {
  wedding: "events@highlandfarms-oregon.com",
  elopement: "events@highlandfarms-oregon.com",
  "engagement-party": "events@highlandfarms-oregon.com",
  "rehearsal-dinner": "events@highlandfarms-oregon.com",
  celebration: "events@highlandfarms-oregon.com",
  retreat: "events@highlandfarms-oregon.com",
};

const DEFAULT_RECIPIENT = "info@highlandfarms-oregon.com";

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding",
  elopement: "Elopement",
  "engagement-party": "Engagement Party",
  "rehearsal-dinner": "Rehearsal Dinner",
  celebration: "Birthday / Anniversary",
  retreat: "Retreat / Reunion",
  photoshoot: "Photoshoot",
  "farm-stay": "Farm Stay",
  other: "Other",
};

interface InquiryEmailData {
  name: string;
  email: string;
  phone?: string | null;
  event_type: string;
  guest_count?: string | null;
  preferred_date?: string | null;
  message?: string | null;
  referral_source?: string | null;
}

export async function sendInquiryNotification(data: InquiryEmailData) {
  const to = EVENT_RECIPIENT_MAP[data.event_type] || DEFAULT_RECIPIENT;
  const eventLabel = EVENT_TYPE_LABELS[data.event_type] || data.event_type;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1c1d1d;">
      <h2 style="color: #2d4a3e; margin-bottom: 4px;">New ${eventLabel} Inquiry</h2>
      <p style="color: #666; margin-top: 0;">Submitted via highlandfarmsoregon.com</p>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 12px; font-weight: 600; width: 140px; vertical-align: top;">Name</td>
          <td style="padding: 8px 12px;">${escapeHtml(data.name)}</td>
        </tr>
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Email</td>
          <td style="padding: 8px 12px;"><a href="mailto:${escapeHtml(data.email)}" style="color: #2d4a3e;">${escapeHtml(data.email)}</a></td>
        </tr>
        ${data.phone ? `
        <tr>
          <td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Phone</td>
          <td style="padding: 8px 12px;"><a href="tel:${escapeHtml(data.phone)}" style="color: #2d4a3e;">${escapeHtml(data.phone)}</a></td>
        </tr>` : ""}
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Event Type</td>
          <td style="padding: 8px 12px;">${escapeHtml(eventLabel)}</td>
        </tr>
        ${data.guest_count ? `
        <tr>
          <td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Guest Count</td>
          <td style="padding: 8px 12px;">${escapeHtml(data.guest_count)}</td>
        </tr>` : ""}
        ${data.preferred_date ? `
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Preferred Date</td>
          <td style="padding: 8px 12px;">${escapeHtml(data.preferred_date)}</td>
        </tr>` : ""}
        ${data.referral_source ? `
        <tr>
          <td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Referral</td>
          <td style="padding: 8px 12px;">${escapeHtml(data.referral_source)}</td>
        </tr>` : ""}
        ${data.message ? `
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Message</td>
          <td style="padding: 8px 12px; white-space: pre-wrap;">${escapeHtml(data.message)}</td>
        </tr>` : ""}
      </table>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">Reply directly to this email to respond to ${escapeHtml(data.name)}.</p>
    </div>
  `;

  return getResend().emails.send({
    from: "Highland Farms <notifications@highlandfarmsoregon.com>",
    to,
    replyTo: data.email,
    subject: `New ${eventLabel} Inquiry from ${data.name}`,
    html,
  });
}

export async function sendMetaLeadNotification(lead: import("@/lib/meta-leads").MetaLeadData) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1c1d1d;">
      <h2 style="color: #2d4a3e; margin-bottom: 4px;">New Meta Lead — Wedding Inquiry</h2>
      <p style="color: #666; margin-top: 0;">Captured via Meta instant form (in-ad lead gen)</p>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 12px; font-weight: 600; width: 160px; vertical-align: top;">Name</td>
          <td style="padding: 8px 12px;">${escapeHtml(lead.name)}</td>
        </tr>
        ${lead.email ? `
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Email</td>
          <td style="padding: 8px 12px;"><a href="mailto:${escapeHtml(lead.email)}" style="color: #2d4a3e;">${escapeHtml(lead.email)}</a></td>
        </tr>` : ""}
        ${lead.phone ? `
        <tr>
          <td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Phone</td>
          <td style="padding: 8px 12px;"><a href="tel:${escapeHtml(lead.phone)}" style="color: #2d4a3e;">${escapeHtml(lead.phone)}</a></td>
        </tr>` : ""}
        ${lead.weddingDateRange ? `
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Wedding Date</td>
          <td style="padding: 8px 12px;">${escapeHtml(lead.weddingDateRange)}</td>
        </tr>` : ""}
        ${lead.weddingBudget ? `
        <tr>
          <td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Budget</td>
          <td style="padding: 8px 12px;">${escapeHtml(lead.weddingBudget)}</td>
        </tr>` : ""}
        ${lead.venuePriorities?.length ? `
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Venue Priorities</td>
          <td style="padding: 8px 12px;">${lead.venuePriorities.map(escapeHtml).join("<br>")}</td>
        </tr>` : ""}
        ${lead.inboxUrl ? `
        <tr>
          <td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Messenger</td>
          <td style="padding: 8px 12px;"><a href="${escapeHtml(lead.inboxUrl)}" style="color: #2d4a3e;">Open conversation</a></td>
        </tr>` : ""}
        ${lead.adName ? `
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Ad</td>
          <td style="padding: 8px 12px;">${escapeHtml(lead.adName)}</td>
        </tr>` : ""}
        ${lead.campaignId ? `
        <tr>
          <td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Campaign ID</td>
          <td style="padding: 8px 12px;">${escapeHtml(lead.campaignId)}</td>
        </tr>` : ""}
      </table>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">Lead captured from Meta instant form — respond promptly for best conversion.</p>
    </div>
  `;

  return getResend().emails.send({
    from: "Highland Farms <notifications@highlandfarmsoregon.com>",
    to: "events@highlandfarms-oregon.com",
    ...(lead.email && { replyTo: lead.email }),
    subject: `New Meta Lead — ${lead.name}${lead.weddingBudget ? ` — ${lead.weddingBudget}` : ""}`,
    html,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
