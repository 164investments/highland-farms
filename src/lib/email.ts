import { Resend } from "resend";
import { escapeHtml } from "./html";
import { buildInquiryEmail, type InquiryInput } from "./inquiry-mapping";

let resend: Resend;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/**
 * Farm notification for a website inquiry. Recipients, subject and every row
 * (month + year, flexible, guest band, how they heard) come from
 * buildInquiryEmail in src/lib/inquiry-mapping.ts.
 */
export async function sendInquiryNotification(data: InquiryInput) {
  const mail = buildInquiryEmail(data);

  const rows = mail.rows
    .map((row, i) => {
      const value = row.href
        ? `<a href="${escapeHtml(row.href)}" style="color: #2d4a3e;">${escapeHtml(row.value)}</a>`
        : escapeHtml(row.value);
      return `
        <tr${i % 2 === 1 ? ' style="background: #f9f9f9;"' : ""}>
          <td style="padding: 8px 12px; font-weight: 600; width: 140px; vertical-align: top;">${escapeHtml(row.label)}</td>
          <td style="padding: 8px 12px;${row.multiline ? " white-space: pre-wrap;" : ""}">${value}</td>
        </tr>`;
    })
    .join("");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1c1d1d;">
      <h2 style="color: #2d4a3e; margin-bottom: 4px;">New ${escapeHtml(mail.eventLabel)} Inquiry</h2>
      <p style="color: #666; margin-top: 0;">Submitted via highlandfarmsoregon.com</p>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
      <table style="width: 100%; border-collapse: collapse;">${rows}
      </table>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://app-na2.hubspot.com/contacts/241936089?query=${encodeURIComponent(mail.replyTo)}"
           style="display: inline-block; background: #2d4a3e; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
          View in HubSpot
        </a>
      </div>
      <p style="color: #999; font-size: 12px;">Reply directly to this email to respond to ${escapeHtml(data.name)}.</p>
    </div>
  `;

  return getResend().emails.send({
    from: "Highland Farms <notifications@highlandfarmsoregon.com>",
    to: mail.to,
    replyTo: mail.replyTo,
    subject: mail.subject,
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
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://app-na2.hubspot.com/contacts/241936089?query=${encodeURIComponent(lead.email || lead.name)}"
           style="display: inline-block; background: #2d4a3e; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
          View in HubSpot
        </a>
      </div>
      <p style="color: #999; font-size: 12px;">Lead captured from Meta instant form — respond promptly for best conversion.</p>
    </div>
  `;

  return getResend().emails.send({
    from: "Highland Farms <notifications@highlandfarmsoregon.com>",
    to: ["events@highlandfarms-oregon.com"],
    ...(lead.email && { replyTo: lead.email }),
    subject: `New Meta Lead — ${lead.name}${lead.weddingBudget ? ` — ${lead.weddingBudget}` : ""}`,
    html,
  });
}
