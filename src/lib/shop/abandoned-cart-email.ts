import { CONTACT } from "@/lib/constants";
import { formatCents } from "./money";

/**
 * The cart reminder email.
 *
 * Deliberately plain. A farm store's advantage is that it sounds like people,
 * so this reads like the farm noticed, not like a retargeting sequence. No
 * countdown, no manufactured urgency, no discount on the first touch (a shopper
 * who learns that leaving earns a coupon will leave every time).
 *
 * Real scarcity IS used when it exists: if something in the cart is genuinely
 * down to the last few, the email says so, because that is true and useful.
 *
 * CAN-SPAM: every send carries a working one-click unsubscribe and the farm's
 * physical address. Both are built into the shell so a future template can't
 * quietly omit them.
 */

const SITE = "https://highlandfarmsoregon.com";

export interface ReminderLine {
  name: string;
  variantLabel?: string;
  image: string;
  quantity: number;
  unitPriceCents: number;
  /** Units left, when the farm is genuinely low. Null when plentiful/untracked. */
  stockLeft: number | null;
}

export interface ReminderEmail {
  firstName: string;
  recoveryToken: string;
  lines: ReminderLine[];
  subtotalCents: number;
  /** 1 = the nudge an hour later, 2 = the one the next day. */
  step: 1 | 2;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** utm so recovered revenue is attributable instead of landing in direct. */
export function recoveryUrl(token: string, step: 1 | 2): string {
  return `${SITE}/shop/cart?recover=${encodeURIComponent(token)}&utm_source=email&utm_medium=lifecycle&utm_campaign=abandoned_cart&utm_content=step_${step}`;
}

export function subjectFor(email: ReminderEmail): string {
  const first = email.lines[0]?.name ?? "your order";
  if (email.step === 1) {
    return email.lines.length === 1
      ? `You left the ${first} behind`
      : `You left a few things in your cart`;
  }
  // Step 2 leads with the real constraint when there is one.
  const scarce = email.lines.find((l) => l.stockLeft !== null && l.stockLeft <= 3);
  if (scarce) {
    return scarce.stockLeft === 1
      ? `Only one ${scarce.name} left`
      : `Only ${scarce.stockLeft} ${scarce.name} left`;
  }
  return `Still want the ${first}?`;
}

function lineRow(line: ReminderLine): string {
  const label = line.variantLabel
    ? ` <span style="color:#6f6f68">· ${escapeHtml(line.variantLabel)}</span>`
    : "";
  const scarcity =
    line.stockLeft !== null && line.stockLeft <= 3
      ? `<div style="margin-top:2px;font-size:12px;color:#4A6741">Only ${line.stockLeft} left</div>`
      : "";
  return `
  <tr>
    <td width="72" style="padding:10px 14px 10px 0;vertical-align:top">
      <img src="${SITE}${escapeHtml(line.image)}" width="72" height="72" alt=""
           style="display:block;width:72px;height:72px;object-fit:cover;border-radius:10px;background:#EFEDE6" />
    </td>
    <td style="padding:10px 0;vertical-align:top;font-size:15px;color:#3A3A3A">
      ${escapeHtml(line.name)}${label}
      <div style="margin-top:2px;font-size:13px;color:#6f6f68">Qty ${line.quantity}</div>
      ${scarcity}
    </td>
    <td align="right" style="padding:10px 0;vertical-align:top;font-size:15px;color:#3A3A3A;white-space:nowrap">
      ${formatCents(line.unitPriceCents * line.quantity)}
    </td>
  </tr>`;
}

export function renderReminder(email: ReminderEmail): string {
  const url = recoveryUrl(email.recoveryToken, email.step);
  const unsubscribe = `${SITE}/shop/unsubscribe?token=${encodeURIComponent(email.recoveryToken)}`;

  const opening =
    email.step === 1
      ? `Your cart is still here whenever you want it. Nothing's been charged.`
      : `Just a last note about this one. We'll leave it alone after today.`;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(subjectFor(email))}</title>
</head>
<body style="margin:0;padding:0;background:#EFEDE6">
<!-- Preheader: the line inboxes show next to the subject. Hidden in the body. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0">
  ${escapeHtml(opening)} Free pickup at the farm in Brightwood.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFEDE6">
<tr><td align="center" style="padding:28px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">

    <tr><td style="padding:26px 26px 0">
      <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8BA888">Highland Farms</div>
      <h1 style="margin:10px 0 0;font-size:22px;font-weight:500;color:#3A3A3A;line-height:1.3">
        Hi ${escapeHtml(email.firstName)}, you left this behind
      </h1>
      <p style="margin:10px 0 0;font-size:15px;line-height:1.55;color:#4a4a4a">${escapeHtml(opening)}</p>
    </td></tr>

    <tr><td style="padding:6px 26px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="border-collapse:collapse;border-top:1px solid #E6E3DA;margin-top:18px">
        ${email.lines.map(lineRow).join("")}
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="border-top:1px solid #E6E3DA;margin-top:4px">
        <tr>
          <td style="padding:12px 0;font-size:15px;color:#3A3A3A">Subtotal</td>
          <td align="right" style="padding:12px 0;font-size:16px;font-weight:600;color:#4A6741">
            ${formatCents(email.subtotalCents)}
          </td>
        </tr>
      </table>
    </td></tr>

    <tr><td align="center" style="padding:8px 26px 4px">
      <a href="${url}"
         style="display:block;background:#4A6741;color:#ffffff;text-decoration:none;
                padding:16px 24px;border-radius:999px;font-size:14px;letter-spacing:.12em;
                text-transform:uppercase;font-weight:500">
        Finish your order
      </a>
      <p style="margin:12px 0 0;font-size:12px;color:#6f6f68">
        Free pickup at the farm · $15 local delivery · We don't ship
      </p>
    </td></tr>

    <tr><td style="padding:20px 26px 26px">
      <div style="background:#F6F4EF;border-radius:12px;padding:16px;font-size:13px;line-height:1.6;color:#4a4a4a">
        Everything is raised here in Brightwood, at the base of Mt. Hood.
        Questions about a cut, or want to change the order? Call or text
        <a href="tel:${CONTACT.phone.replace(/[^\d]/g, "")}" style="color:#4A6741">${escapeHtml(CONTACT.phone)}</a>
        and you'll get one of us.
      </div>
    </td></tr>

  </table>

  <!-- CAN-SPAM: working opt-out + physical address on every send. -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td align="center" style="padding:18px 16px 0;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#6f6f68">
        You're getting this because you started an order at highlandfarmsoregon.com.<br />
        <a href="${unsubscribe}" style="color:#6f6f68;text-decoration:underline">Unsubscribe from cart reminders</a>
      </p>
      <p style="margin:10px 0 0;font-size:12px;color:#8a8a84">
        Highland Farms Oregon LLC · ${escapeHtml(CONTACT.fullAddress)}
      </p>
    </td></tr>
  </table>

</td></tr>
</table>
</body></html>`;
}

/** Plain-text alternative. A multipart send lands in the inbox far more reliably. */
export function renderReminderText(email: ReminderEmail): string {
  const url = recoveryUrl(email.recoveryToken, email.step);
  const lines = email.lines
    .map(
      (l) =>
        `  ${l.quantity} x ${l.name}${l.variantLabel ? ` (${l.variantLabel})` : ""} — ${formatCents(
          l.unitPriceCents * l.quantity,
        )}${l.stockLeft !== null && l.stockLeft <= 3 ? `  [only ${l.stockLeft} left]` : ""}`,
    )
    .join("\n");

  return `Hi ${email.firstName}, you left this behind.

${email.step === 1 ? "Your cart is still here whenever you want it. Nothing's been charged." : "Just a last note about this one. We'll leave it alone after today."}

${lines}

Subtotal: ${formatCents(email.subtotalCents)}

Finish your order: ${url}

Free pickup at the farm. $15 local delivery. We don't ship.
Questions? Call or text ${CONTACT.phone}.

—
You're getting this because you started an order at highlandfarmsoregon.com.
Unsubscribe: ${SITE}/shop/unsubscribe?token=${encodeURIComponent(email.recoveryToken)}
Highland Farms Oregon LLC, ${CONTACT.fullAddress}
`;
}
