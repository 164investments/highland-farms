import { Resend } from "resend";
import { CONTACT } from "@/lib/constants";
import { escapeHtml } from "@/lib/html";
import { formatCents } from "./money";
import { PICKUP_LOCATION, type Fulfillment } from "./fulfillment";
import type { PricedLine } from "./orders";

/**
 * Order emails: a receipt for the customer and a pick list for the farm.
 *
 * Both are fire-and-forget — the money is already taken by the time these run,
 * so a mail failure must never fail the checkout. It's logged instead.
 */

let resend: Resend | undefined;
function getResend(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

const FROM = "Highland Farms <notifications@highlandfarmsoregon.com>";
const FARM_RECIPIENTS = ["info@highlandfarms-oregon.com"];

export interface OrderEmailData {
  orderNumber: string;
  fulfillment: Fulfillment;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryZip?: string;
  notes?: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  lines: PricedLine[];
}

function lineRows(lines: PricedLine[]): string {
  return lines
    .map((l) => {
      const name = escapeHtml(l.productName) + (l.variantLabel ? ` <span style="color:#6b6b6b">(${escapeHtml(l.variantLabel)})</span>` : "");
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee">${name}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center">${l.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${formatCents(l.unitPriceCents * l.quantity)}</td>
      </tr>`;
    })
    .join("");
}

function totalsBlock(d: OrderEmailData): string {
  const delivery =
    d.fulfillment === "delivery"
      ? `<tr><td colspan="2" style="padding:4px 0">Local delivery</td><td style="padding:4px 0;text-align:right">${formatCents(d.deliveryFeeCents)}</td></tr>`
      : `<tr><td colspan="2" style="padding:4px 0">Farm pickup</td><td style="padding:4px 0;text-align:right">Free</td></tr>`;
  return `
    <tr><td colspan="2" style="padding:4px 0">Subtotal</td><td style="padding:4px 0;text-align:right">${formatCents(d.subtotalCents)}</td></tr>
    ${delivery}
    <tr><td colspan="2" style="padding:10px 0 0;font-weight:600">Total</td><td style="padding:10px 0 0;text-align:right;font-weight:600">${formatCents(d.totalCents)}</td></tr>`;
}

function fulfillmentBlock(d: OrderEmailData): string {
  if (d.fulfillment === "delivery") {
    return `<p style="margin:0 0 4px"><strong>Local delivery to:</strong></p>
      <p style="margin:0;color:#4a4a4a">${escapeHtml(d.deliveryAddress ?? "")}<br>${escapeHtml(d.deliveryCity ?? "")} ${escapeHtml(d.deliveryZip ?? "")}</p>
      <p style="margin:12px 0 0;color:#4a4a4a">We'll call you at ${escapeHtml(d.customerPhone)} to arrange a delivery window.</p>`;
  }
  return `<p style="margin:0 0 4px"><strong>Pick up at the farm:</strong></p>
    <p style="margin:0;color:#4a4a4a">${escapeHtml(PICKUP_LOCATION.address)}</p>
    <p style="margin:12px 0 0;color:#4a4a4a">We'll call you at ${escapeHtml(d.customerPhone)} when your order is packed and ready.</p>`;
}

export async function sendOrderEmails(d: OrderEmailData): Promise<void> {
  const shell = (inner: string) =>
    `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#2b2b2b;line-height:1.5">${inner}</div>`;

  const itemsTable = `<table style="width:100%;border-collapse:collapse;margin:16px 0 8px">
      <tbody>${lineRows(d.lines)}</tbody>
      <tfoot>${totalsBlock(d)}</tfoot>
    </table>`;

  const customerHtml = shell(`
    <h1 style="font-size:22px;font-weight:500;margin:0 0 4px">Thank you — we've got your order</h1>
    <p style="margin:0 0 20px;color:#6b6b6b">Order ${escapeHtml(d.orderNumber)}</p>
    <p style="margin:0 0 4px">Hi ${escapeHtml(d.customerName.split(" ")[0] ?? d.customerName)},</p>
    <p style="margin:0 0 16px;color:#4a4a4a">Your order is paid and we're packing it up here in Brightwood.</p>
    ${itemsTable}
    <div style="background:#f6f4ef;padding:16px;border-radius:12px;margin:20px 0">${fulfillmentBlock(d)}</div>
    <p style="margin:0 0 16px;color:#4a4a4a">Questions? Call or text ${escapeHtml(CONTACT.phone)}.</p>
    <p style="margin:0;color:#6b6b6b">— The Highland Farms family</p>
  `);

  const farmHtml = shell(`
    <h1 style="font-size:20px;font-weight:500;margin:0 0 4px">New farm store order</h1>
    <p style="margin:0 0 16px;color:#6b6b6b">${escapeHtml(d.orderNumber)} · ${d.fulfillment === "delivery" ? "LOCAL DELIVERY" : "FARM PICKUP"}</p>
    <p style="margin:0 0 2px"><strong>${escapeHtml(d.customerName)}</strong></p>
    <p style="margin:0 0 16px;color:#4a4a4a">${escapeHtml(d.customerEmail)} · ${escapeHtml(d.customerPhone)}</p>
    ${itemsTable}
    <div style="background:#f6f4ef;padding:16px;border-radius:12px;margin:20px 0">${fulfillmentBlock(d)}</div>
    ${d.notes ? `<p style="margin:0 0 8px"><strong>Customer notes:</strong></p><p style="margin:0;color:#4a4a4a">${escapeHtml(d.notes)}</p>` : ""}
  `);

  const results = await Promise.allSettled([
    getResend().emails.send({
      from: FROM,
      to: [d.customerEmail],
      subject: `Your Highland Farms order ${d.orderNumber}`,
      html: customerHtml,
    }),
    getResend().emails.send({
      from: FROM,
      to: FARM_RECIPIENTS,
      replyTo: d.customerEmail,
      subject: `New order ${d.orderNumber} — ${d.fulfillment === "delivery" ? "delivery" : "pickup"} — ${formatCents(d.totalCents)}`,
      html: farmHtml,
    }),
  ]);

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[shop] order email ${i === 0 ? "to customer" : "to farm"} failed:`, r.reason);
    }
  });
}
