import { CONTACT } from "@/lib/constants";
import { FIVE_STAR_COUNT } from "@/lib/reviews";
import { formatCents, formatCentsShort } from "./money";
import { resolveSender, type Sender } from "./cart-senders";
import { DELIVERY_FEE_CENTS, DELIVERY_MINIMUM_CENTS, PICKUP_LOCATION } from "./fulfillment";

/**
 * Cart reminder emails: three competing arguments, three steps each.
 *
 * ⛔ THE ONE COPY RULE THAT APPLIES TO EVERY VARIANT — never normalise
 * abandonment. Cialdini's petrified-forest sign ("many visitors steal wood")
 * TRIPLED theft by making the unwanted behaviour sound normal. So no "we know
 * life gets busy", no "a lot of people leave things behind". Saying "you left
 * this" is fine, because it's about one person. Saying "everyone does this" is
 * the petrified-forest sign. Every norm stated here is the DESIRED one.
 *
 * No discount in any variant. An automatic every-time coupon is a standing
 * discount that repeat customers learn to harvest, and repeat purchase is
 * exactly this business's model.
 *
 * Scarcity appears only where it is TRUE: a live stock count of 3 or fewer.
 *
 * ⛔ TRUTH RULE (truth audit B6, 2026-10-06). State only what the store already
 * commits to in `fulfillment.ts` and `src/data/shop-faq.ts`: free pickup at the
 * farm, "we call you when your order is packed", $15 local delivery on orders
 * of $50 or more inside the ZIP list, no shipping, pay on the site. No pickup
 * days, cutoffs, delivery days, "frozen", batch or cutting cadence, pig
 * sourcing or taste claims, and no guarantee (none is approved; D9). A saved
 * cart does NOT hold stock (stock is claimed only at checkout), so never say
 * "set aside" or "held". Reviews: FIVE_STAR_COUNT only, never a literal, and
 * quotes only verbatim from google-reviews.json. The phone is "Call", never
 * "call or text". These go out from notifications@ with no reply-to, so do not
 * invite replies until a monitored reply-to exists.
 */

const SITE = "https://highlandfarmsoregon.com";

const CREAM = "#EFEDE6";
const FOREST = "#4A6741";
const CHARCOAL = "#3A3A3A";
const MUTED = "#6f6f68";
const LINE = "#E6E3DA";
const SAND = "#F6F4EF";

export type CartVariant = "A" | "B" | "C";
/** 1 = ~1h, 2 = ~24h, 3 = ~48–72h closer. */
export type CartStep = 1 | 2 | 3;

export interface ReminderLine {
  name: string;
  variantLabel?: string;
  image: string;
  quantity: number;
  unitPriceCents: number;
  /** Units left when genuinely low; null when plentiful or untracked. */
  stockLeft: number | null;
}

export interface ReminderEmail {
  firstName: string;
  recoveryToken: string;
  lines: ReminderLine[];
  subtotalCents: number;
  step: CartStep;
  variant: CartVariant;
  senderKey: string;
}

/**
 * Email images must point at a pre-sized derivative, never the catalogue original.
 *
 * `next/image` only optimises what the SITE renders. An <img> in an email is a
 * plain URL, so a 64px thumbnail was downloading the full-resolution file —
 * mangalitsa-tenderloin.jpg alone is 1.4 MB for a 64x64 slot. The derivatives in
 * /images/shop/email are 128px (2x the slot) and average ~8 KB.
 */
function emailThumb(image: string): string {
  return image
    .replace("/images/shop/", "/images/shop/email/")
    .replace(/\.(png|jpe?g)$/i, ".jpg");
}

const FEE = formatCentsShort(DELIVERY_FEE_CENTS);
const MINIMUM = formatCentsShort(DELIVERY_MINIMUM_CENTS);
const PICKUP_PLACE = PICKUP_LOCATION.address.replace(/, OR \d{5}$/, "");

/** Catalog names carry an em dash ("Pork Chop — Boneless"); emails show a comma. */
function displayName(name: string): string {
  return name.replace(/\s+—\s+/g, ", ");
}

/** The near-CTA review line, from the live snapshot. */
const FIVE_STARS = `${FIVE_STAR_COUNT} five-star reviews on Google.`;

function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function recoveryUrl(e: ReminderEmail): string {
  return (
    `${SITE}/shop/cart?recover=${encodeURIComponent(e.recoveryToken)}` +
    `&utm_source=email&utm_medium=lifecycle&utm_campaign=abandoned_cart` +
    `&utm_content=${e.variant.toLowerCase()}_${e.senderKey}_step${e.step}`
  );
}

function unsubUrl(e: ReminderEmail): string {
  return `${SITE}/shop/unsubscribe?token=${encodeURIComponent(e.recoveryToken)}`;
}

/** The scarcest genuinely-low line, if any. Drives honest urgency copy. */
function scarcest(e: ReminderEmail): ReminderLine | null {
  const low = e.lines
    .filter((l) => l.stockLeft !== null && l.stockLeft <= 3)
    .sort((a, b) => (a.stockLeft ?? 99) - (b.stockLeft ?? 99));
  return low[0] ?? null;
}

// ── subjects ────────────────────────────────────────────────────────────────

export function subjectFor(e: ReminderEmail): string {
  const first = e.lines[0]?.name ?? "your order";
  const short = first.split("—")[0].trim();
  const scarce = scarcest(e);

  if (e.variant === "A") {
    if (e.step === 1) return `I saved your ${short}`;
    if (e.step === 2) return `Your ${short} is still in your cart`;
    return `Last note about your ${short}`;
  }
  if (e.variant === "B") {
    if (e.step === 1) return `Your order: free pickup at the farm`;
    if (e.step === 2) return `Free pickup at the farm, or ${FEE} local delivery`;
    return `Your ${short} is still in your cart`;
  }
  // C leads with the real constraint when there is one.
  if (scarce) return scarceHeadline(scarce);
  if (e.step === 3) return `Last note about your cart`;
  return `Still in your cart, ${e.firstName}`;
}

/** "Only one Bacon left" / "Only 3 Bacon left", from the live stock count. */
function scarceHeadline(l: ReminderLine): string {
  const short = l.name.split("—")[0].trim();
  return l.stockLeft === 1 ? `Only one ${short} left` : `Only ${l.stockLeft} ${short} left`;
}

export function preheaderFor(e: ReminderEmail): string {
  if (e.variant === "A") return "It's still saved, and nothing has been charged.";
  if (e.variant === "B")
    return `Free pickup at the farm, or local delivery for ${FEE} on orders of ${MINIMUM} or more.`;
  return scarcest(e)
    ? "A saved cart doesn't hold stock. Nothing has been charged."
    : "It's still saved, and nothing has been charged.";
}

// ── shared pieces ───────────────────────────────────────────────────────────

function signature(sender: Sender): string {
  const photo = sender.photo
    ? `<td width="46" style="padding-right:12px;vertical-align:middle">
         <img src="${sender.photo}" width="46" height="46" alt="${esc(sender.name)}"
              style="display:block;width:46px;height:46px;border-radius:23px;object-fit:cover" />
       </td>`
    : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px">
    <tr>${photo}
      <td style="vertical-align:middle;font-size:14.5px;line-height:1.5;color:${CHARCOAL}">
        ${esc(sender.name)}<br />
        <span style="color:${MUTED};font-size:13px">${esc(sender.role)}<br />
        ${esc(CONTACT.phone)}</span>
      </td>
    </tr></table>`;
}

function cartTable(e: ReminderEmail): string {
  const rows = e.lines
    .map((l) => {
      const label = l.variantLabel
        ? ` <span style="color:${MUTED}">· ${esc(l.variantLabel)}</span>`
        : "";
      const scar =
        l.stockLeft !== null && l.stockLeft <= 3
          ? `<div style="margin-top:3px;font-size:12px;color:${FOREST}">Only ${l.stockLeft} left</div>`
          : "";
      return `<tr>
        <td width="64" style="padding:9px 13px 9px 0;vertical-align:top">
          <img src="${SITE}${esc(emailThumb(l.image))}" width="64" height="64" alt="${esc(displayName(l.name))}"
               style="display:block;width:64px;height:64px;object-fit:cover;border-radius:9px;background:${CREAM}" />
        </td>
        <td style="padding:9px 0;vertical-align:top;font-size:14.5px;color:${CHARCOAL};line-height:1.4">
          ${esc(displayName(l.name))}${label}
          <div style="margin-top:2px;font-size:12.5px;color:${MUTED}">Qty ${l.quantity}</div>${scar}
        </td>
        <td align="right" style="padding:9px 0;vertical-align:top;font-size:14.5px;color:${CHARCOAL};white-space:nowrap">
          ${formatCents(l.unitPriceCents * l.quantity)}
        </td>
      </tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="border-collapse:collapse;border-top:1px solid ${LINE};margin-top:15px">${rows}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${LINE}">
      <tr><td style="padding:11px 0;font-size:14.5px;color:${CHARCOAL}">Subtotal</td>
      <td align="right" style="padding:11px 0;font-size:15.5px;font-weight:600;color:${FOREST}">
        ${formatCents(e.subtotalCents)}</td></tr>
    </table>`;
}

function button(e: ReminderEmail, label: string): string {
  return `<tr><td align="center" style="padding:6px 24px 2px">
    <a href="${recoveryUrl(e)}" style="display:block;background:${FOREST};color:#ffffff;
       text-decoration:none;padding:15px 22px;border-radius:999px;font-size:13.5px;
       letter-spacing:.11em;text-transform:uppercase;font-weight:500">${esc(label)}</a>
  </td></tr>`;
}

function shell(e: ReminderEmail, body: string): string {
  const lastNote =
    e.step === 3
      ? "Last note about this cart. You started an order at highlandfarmsoregon.com."
      : "You're getting this because you started an order at highlandfarmsoregon.com.";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(subjectFor(e))}</title></head>
<body style="margin:0;padding:0;background:${CREAM}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheaderFor(e))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM}">
<tr><td align="center" style="padding:24px 14px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
   style="max-width:544px;background:#ffffff;border-radius:16px;overflow:hidden;
          font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">${body}</table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:544px">
   <tr><td align="center" style="padding:16px 14px 0;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
     <p style="margin:0;font-size:11.5px;line-height:1.6;color:${MUTED}">${lastNote}<br />
       <a href="${unsubUrl(e)}" style="color:${MUTED};text-decoration:underline">Unsubscribe from cart reminders</a>
     </p>
     <p style="margin:9px 0 0;font-size:11.5px;color:#8a8a84">
       Highland Farms Oregon LLC · ${esc(CONTACT.fullAddress)}</p>
   </td></tr></table>
</td></tr></table></body></html>`;
}

// ── Variant A · the note from the farm ──────────────────────────────────────
// Liking + Authority + Unity. Blemish-first: naming the real drawbacks makes
// everything after them read as honest rather than as marketing. Replies are
// the strongest Primary-tab signal, but nothing reads them yet (sent from
// notifications@, no reply-to), so the note asks for a call instead.

function variantA(e: ReminderEmail, sender: Sender): string {
  // Keep each product's own capitalisation: "Princess Fiona" is a name, and
  // lower-casing it reads as a typo rather than as casual.
  const items = e.lines.map((l) => l.name.split("—")[0].trim());
  const itemPhrase =
    items.length === 1 ? items[0] : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

  const openers: Record<CartStep, string> = {
    1: `${esc(sender.name)} here from Highland Farms. I saw ${esc(itemPhrase)} still sitting in
        your cart. I've saved everything, and nothing has been charged.`,
    2: `Me again. Your cart is still saved with ${esc(itemPhrase)} in it, so I wanted to check
        in once before the week gets away from us.`,
    3: `Last note from me on this one. Your cart still has ${esc(itemPhrase)} in it if you want
        it, and I'll stop filling your inbox after today.`,
  };

  const middle =
    e.step === 1
      ? `<p style="margin:13px 0 0;font-size:15px;line-height:1.62;color:${CHARCOAL}">
           I'll be straight with you about us: we're about an hour from Portland, we don't
           ship, and cuts do sell out. Pickup at the farm is free, and we call you when your
           order is packed. On orders of ${MINIMUM} or more we can deliver for ${FEE}, from the
           Mt. Hood corridor down through Sandy and Gresham into east Portland.
         </p>
         <p style="margin:13px 0 0;font-size:15px;line-height:1.62;color:${CHARCOAL}">
           ${FIVE_STARS}
         </p>`
      : `<p style="margin:13px 0 0;font-size:15px;line-height:1.62;color:${CHARCOAL}">
           Pickup at the farm is free, and we call you when your order is packed.
           ${FIVE_STARS}
         </p>`;

  return shell(
    e,
    `<tr><td style="padding:26px 24px 26px">
      <p style="margin:0;font-size:15px;line-height:1.62;color:${CHARCOAL}">Hi ${esc(e.firstName)},</p>
      <p style="margin:13px 0 0;font-size:15px;line-height:1.62;color:${CHARCOAL}">${openers[e.step]}</p>
      ${middle}
      <p style="margin:15px 0 0;font-size:15px;line-height:1.62;color:${CHARCOAL}">
        Here's your cart whenever you want it:<br />
        <a href="${recoveryUrl(e)}" style="color:${FOREST};font-weight:600">
          highlandfarmsoregon.com/shop/cart</a>
      </p>
      <p style="margin:13px 0 0;font-size:15px;line-height:1.62;color:${CHARCOAL}">
        Questions about a cut? Call ${esc(CONTACT.phone)}.
      </p>
      ${signature(sender)}
    </td></tr>`,
  );
}

// ── Variant B · your pickup, handled ────────────────────────────────────────
// Hormozi's value equation attacked from the denominator: time delay and
// effort, not desire. The cart echo is the commitment device; the rest is the
// store's real logistics. No guarantee: none is approved (D9).

function variantB(e: ReminderEmail, sender: Sender): string {
  const heads: Record<CartStep, string> = {
    1: "Your order is almost done",
    2: "Two ways to get it, both easy",
    3: "Still saved for you",
  };

  return shell(
    e,
    `<tr><td style="padding:26px 24px 0">
      <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8BA888">
        Highland Farms · Brightwood</div>
      <h1 style="margin:9px 0 0;font-size:21px;font-weight:500;color:${CHARCOAL};line-height:1.3">
        ${esc(heads[e.step])}</h1>
      <p style="margin:9px 0 0;font-size:14.5px;line-height:1.55;color:#4a4a4a">
        Still saved, nothing charged. Here is exactly what happens once you finish.</p>
      ${cartTable(e)}
    </td></tr>
    ${button(e, "Finish your order")}
    <tr><td style="padding:16px 24px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="background:${SAND};border-radius:12px">
        <tr><td style="padding:16px 16px 6px">
          <div style="font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:${MUTED};font-weight:600">
            What happens next</div></td></tr>
        <tr><td style="padding:0 16px 4px;font-size:14px;line-height:1.55;color:#4a4a4a">
          <b style="color:${CHARCOAL}">1.</b> You pay on the site, and the receipt comes by email.</td></tr>
        <tr><td style="padding:0 16px 4px;font-size:14px;line-height:1.55;color:#4a4a4a">
          <b style="color:${CHARCOAL}">2.</b> We call you when your order is packed. Pickup at the
          farm is free, at ${esc(PICKUP_PLACE)}.</td></tr>
        <tr><td style="padding:0 16px 16px;font-size:14px;line-height:1.55;color:#4a4a4a">
          <b style="color:${CHARCOAL}">3.</b> Or, on orders of ${MINIMUM} or more, local delivery is
          ${FEE} from the Mt. Hood corridor down through Sandy and Gresham into east Portland.
          Checkout checks your ZIP.</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:14px 24px 26px">
      <p style="margin:0;font-size:13px;line-height:1.55;color:${MUTED}">
        Questions about a cut, or want to change the order? Call ${esc(CONTACT.phone)}.</p>
      ${signature(sender)}
    </td></tr>`,
  );
}

// ── Variant C · the stock count ─────────────────────────────────────────────
// True scarcity + loss aversion. Cialdini: "newly scarce" beats always-scarce,
// and scarcity amplifies a desire the cart already proves exists. The count is
// the live stock number, and its mechanism is the true one: a saved cart
// doesn't hold stock. When nothing is genuinely scarce this degrades to a plain
// reminder rather than inventing a deadline.

function variantC(e: ReminderEmail, sender: Sender): string {
  const scarce = scarcest(e);
  const headline = scarce ? esc(scarceHeadline(scarce)) : "Your cart is still saved";

  const reason = scarce
    ? `That was the stock count when this email went out. A saved cart doesn't hold stock,
       so it can sell out before you check out. Nothing has been charged.`
    : `Nothing has been charged. Your cart is here whenever you're ready.`;

  return shell(
    e,
    `<tr><td style="padding:26px 24px 0">
      <h1 style="margin:0;font-size:21px;font-weight:500;color:${CHARCOAL};line-height:1.32;text-align:center">
        ${headline}</h1>
      <p style="margin:10px 0 0;font-size:14.5px;line-height:1.58;color:#4a4a4a;text-align:center">
        ${reason}</p>
      ${cartTable(e)}
    </td></tr>
    <tr><td style="padding:14px 24px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="background:${SAND};border-radius:12px">
        <tr><td style="padding:14px 16px;font-size:14px;line-height:1.55;color:#4a4a4a">
          <b style="color:${CHARCOAL}">Free pickup</b> at the farm in Brightwood, and we call you
          when your order is packed. Or local delivery for ${FEE} on orders of ${MINIMUM} or
          more.</td></tr>
      </table>
    </td></tr>
    ${button(e, "Finish your order")}
    <tr><td style="padding:14px 24px 26px">
      <p style="margin:0;font-size:13px;line-height:1.55;color:${MUTED};text-align:center">
        ${FIVE_STARS}</p>
      ${signature(sender)}
    </td></tr>`,
  );
}

// ── entry points ────────────────────────────────────────────────────────────

export function renderReminder(e: ReminderEmail): string {
  const sender = resolveSender(e.senderKey);
  if (e.variant === "A") return variantA(e, sender);
  if (e.variant === "B") return variantB(e, sender);
  return variantC(e, sender);
}

/** Plain-text alternative. Multipart lands in the inbox far more reliably. */
export function renderReminderText(e: ReminderEmail): string {
  const sender = resolveSender(e.senderKey);
  const lines = e.lines
    .map(
      (l) =>
        `  ${l.quantity} x ${displayName(l.name)}${l.variantLabel ? ` (${l.variantLabel})` : ""}: ` +
        `${formatCents(l.unitPriceCents * l.quantity)}` +
        `${l.stockLeft !== null && l.stockLeft <= 3 ? `  [only ${l.stockLeft} left]` : ""}`,
    )
    .join("\n");

  const opening =
    e.variant === "A"
      ? `${sender.name} here from Highland Farms. I saved your cart. Nothing has been charged.`
      : e.variant === "B"
        ? `Still saved, nothing charged. Pickup at the farm is free, and we call you when your order is packed. Or local delivery for ${FEE} on orders of ${MINIMUM} or more.`
        : `${scarcest(e) ? "A saved cart doesn't hold stock, so a low item can sell out before you check out." : "Your cart is still saved."} Nothing has been charged.`;

  return `Hi ${e.firstName},

${opening}

${lines}

Subtotal: ${formatCents(e.subtotalCents)}

Finish your order: ${recoveryUrl(e)}

Free pickup at the farm. ${FEE} local delivery on orders of ${MINIMUM} or more. We don't ship.
Questions? Call ${CONTACT.phone}.

${sender.name}
${sender.role}

--
${e.step === 3 ? "Last note about this cart." : ""} You started an order at highlandfarmsoregon.com.
Unsubscribe: ${unsubUrl(e)}
Highland Farms Oregon LLC, ${CONTACT.fullAddress}
`;
}
