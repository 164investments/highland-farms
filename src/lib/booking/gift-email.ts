import { Resend } from "resend";
import { escapeHtml } from "@/lib/html";
import { formatCents } from "@/lib/shop/money";
import type { GiftProduct } from "./gift";

/**
 * Gift certificate purchase confirmation + delivery.
 *
 * Copy rules: use the persisted expiry for visit packs; ordinary face-value
 * gifts have no expiry. Plain warm voice, physical address footer. Mirrors the
 * `sendOrThrow` pattern in `confirmation-email.ts` — the Resend SDK resolves
 * `{ data: null, error }` on an API-level failure instead of rejecting, so a
 * bad key or a 4xx/5xx would look identical to success unless we throw here.
 */

let resend: Resend | undefined;
function getResend(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

async function sendOrThrow(
  params: Parameters<Resend["emails"]["send"]>[0],
  idempotencyKey?: string,
): Promise<void> {
  const result = await getResend().emails.send(params, idempotencyKey ? { idempotencyKey } : undefined);
  if (result.error) {
    throw new Error(result.error.message);
  }
}

const FROM = "Highland Farms <notifications@highlandfarmsoregon.com>";
const FARM_RECIPIENTS = ["info@highlandfarms-oregon.com"];
const ADDRESS = `<p style="color:#8a8378;font-size:12px;margin-top:24px">Highland Farms · Brightwood, Oregon</p>`;

export interface GiftEmailData {
  code: string;
  product: GiftProduct;
  purchaserName: string;
  purchaserEmail: string;
  recipientEmail: string | null;
  message: string | null;
  expiresAt?: string | null;
}

function expiryNotice(data: GiftEmailData): string {
  if (!data.expiresAt) return "";
  const date = new Date(data.expiresAt).toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "long", day: "numeric",
  });
  return `<p>Use your visits by ${escapeHtml(date)} (180 days from purchase).</p>`;
}

function codeBlock(code: string): string {
  return `<p style="margin-top:20px;margin-bottom:4px">Your code:</p>
  <p style="font-size:24px;letter-spacing:1px;font-weight:bold;color:#2f4a3a">${escapeHtml(code)}</p>`;
}

function howToRedeem(): string {
  return `<h2 style="font-size:16px;margin-top:24px">How to use it</h2>
  <p>Book at <strong>highlandfarmsoregon.com</strong> and enter the code at checkout to
  cover the cost, in part or in full.</p>`;
}

/** The recipient's copy: framed as a gift, from the purchaser. */
function renderRecipientEmail(data: GiftEmailData): string {
  const messageBlock = data.message
    ? `<p style="font-style:italic;margin-top:16px">"${escapeHtml(data.message)}"</p>`
    : "";
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2d2a26">
    <h1 style="font-size:22px">A gift from ${escapeHtml(data.purchaserName)}.</h1>
    <p>${escapeHtml(data.product.name)}, ${formatCents(data.product.amountCents)}</p>
    ${messageBlock}
    ${codeBlock(data.code)}
    ${howToRedeem()}
    ${expiryNotice(data)}
    <p style="margin-top:24px">Questions? Reply to this email or call (971) 563-1921.</p>
    ${ADDRESS}
  </div>`;
}

/** The purchaser's copy when they bought it for themselves. */
function renderSelfEmail(data: GiftEmailData): string {
  const firstName = data.purchaserName.split(" ")[0];
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2d2a26">
    <h1 style="font-size:22px">Thanks, ${escapeHtml(firstName)}.</h1>
    <p>${escapeHtml(data.product.name)}, ${formatCents(data.product.amountCents)}</p>
    ${codeBlock(data.code)}
    ${howToRedeem()}
    ${expiryNotice(data)}
    <p style="margin-top:24px">Questions? Reply to this email or call (971) 563-1921.</p>
    ${ADDRESS}
  </div>`;
}

/** The purchaser's receipt copy when the certificate was sent to someone else. */
function renderPurchaserReceiptEmail(data: GiftEmailData): string {
  const firstName = data.purchaserName.split(" ")[0];
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2d2a26">
    <h1 style="font-size:22px">Thanks, ${escapeHtml(firstName)}.</h1>
    <p>Your ${escapeHtml(data.product.name)} gift certificate, ${formatCents(data.product.amountCents)},
    is on its way to ${escapeHtml(data.recipientEmail ?? "")}.</p>
    <p style="margin-top:16px">This is your receipt copy. The code, for your records:</p>
    ${codeBlock(data.code)}
    ${expiryNotice(data)}
    <p style="margin-top:24px">Questions? Reply to this email or call (971) 563-1921.</p>
    ${ADDRESS}
  </div>`;
}

export async function sendGiftEmails(data: GiftEmailData, options?: { strict?: boolean; idempotencyKey?: string }): Promise<void> {
  const hasRecipient = Boolean(data.recipientEmail);

  // Independent sends: one bounced address must never hide the others, and
  // the farm should always learn a certificate sold even if every customer
  // email fails.
  const sends: { label: string; promise: Promise<void> }[] = [];

  if (hasRecipient) {
    sends.push({
      label: "recipient",
      promise: sendOrThrow({
        from: FROM,
        to: data.recipientEmail as string,
        subject: `A gift from ${data.purchaserName}: Highland Farms`,
        html: renderRecipientEmail(data),
      }, options?.idempotencyKey ? `${options.idempotencyKey}-recipient` : undefined),
    });
    sends.push({
      label: "purchaser receipt",
      promise: sendOrThrow({
        from: FROM,
        to: data.purchaserEmail,
        subject: "Your Highland Farms gift certificate receipt",
        html: renderPurchaserReceiptEmail(data),
      }, options?.idempotencyKey ? `${options.idempotencyKey}-purchaser` : undefined),
    });
  } else {
    sends.push({
      label: "purchaser",
      promise: sendOrThrow({
        from: FROM,
        to: data.purchaserEmail,
        subject: `Your Highland Farms gift certificate: ${data.code}`,
        html: renderSelfEmail(data),
      }, options?.idempotencyKey ? `${options.idempotencyKey}-purchaser` : undefined),
    });
  }

  sends.push({
    label: "farm notification",
    promise: sendOrThrow({
      from: FROM,
      to: FARM_RECIPIENTS,
      subject: `New gift certificate sold: ${data.product.name}`,
      html: `<p>${escapeHtml(data.purchaserName)} (${escapeHtml(data.purchaserEmail)}) bought
        ${escapeHtml(data.product.name)}, ${formatCents(data.product.amountCents)}.
        Code ${escapeHtml(data.code)}.${hasRecipient ? ` Sent to ${escapeHtml(data.recipientEmail as string)}.` : ""}</p>`,
    }, options?.idempotencyKey ? `${options.idempotencyKey}-farm` : undefined),
  });

  const results = await Promise.allSettled(sends.map((s) => s.promise));
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`[gift] ${sends[i].label} email failed for ${data.code}:`, result.reason);
    }
  });
  if (options?.strict && results.some((r) => r.status === "rejected")) {
    throw new Error(`Gift confirmation delivery failed: ${data.code}`);
  }
}
