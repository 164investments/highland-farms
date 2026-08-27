import { Resend } from "resend";
import { escapeHtml } from "../html.ts";
import { formatCents } from "../shop/money.ts";
import { getBookingProduct } from "./products.ts";
import { buildIcs } from "./ics.ts";

/**
 * Booking confirmation (customer) + notification (farm).
 *
 * Copy rules: the strict policy is restated in full — this email is the
 * point-of-sale disclosure's receipt-side twin — and NOTHING in here may
 * promise a refund, reschedule, credit, or transfer. The one promise we DO
 * make: if the FARM cancels for weather or animal/guest safety, full refund
 * or first pick of new dates.
 */

let resend: Resend | undefined;
function getResend(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

/**
 * The Resend SDK resolves `{ data: null, error }` on an API-level failure —
 * it does NOT reject. Awaiting `send()` directly would make a bad key or a
 * 4xx/5xx from Resend look identical to success, and `Promise.allSettled`
 * would never see a rejection to log. This throws so the caller's rejection
 * handling actually engages.
 */
async function sendOrThrow(
  params: Parameters<Resend["emails"]["send"]>[0],
): Promise<void> {
  const result = await getResend().emails.send(params);
  if (result.error) {
    throw new Error(result.error.message);
  }
}

const FROM = "Highland Farms <notifications@highlandfarmsoregon.com>";
const FARM_RECIPIENTS = ["info@highlandfarms-oregon.com"];
const TZ = "America/Los_Angeles";

export interface BookingEmailData {
  bookingNumber: string;
  product: string;
  legs: { productSlug: string; startsAt: string; durationMin: number }[];
  partySize: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalCents: number;
  giftAppliedCents: number;
  paidCents: number;
  locationChoice: "meet" | "in_person" | null;
  /** Google Meet link for a wedding call. Null when in-person, not yet
   *  created, or calendar integration isn't configured/failed. */
  meetLink?: string | null;
}

/** True when this booking is a consult that chose Meet but has no link yet
 *  (creation failed, or the calendar integration isn't configured). Both
 *  the customer's "we'll email it" promise and the farm's "MEET LINK
 *  NEEDED" flag key off this exact condition. */
function needsMeetLinkFollowUp(data: BookingEmailData): boolean {
  return data.product === "wedding-call" && data.locationChoice === "meet" && !data.meetLink;
}

function legLine(leg: BookingEmailData["legs"][number]): string {
  const product = getBookingProduct(leg.productSlug);
  const when = new Date(leg.startsAt);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(when);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour: "numeric", minute: "2-digit",
  }).format(when);
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #eee"><strong>${escapeHtml(product?.name ?? leg.productSlug)}</strong></td>
    <td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(day)} · ${escapeHtml(time)} (${leg.durationMin} min)</td>
  </tr>`;
}

function meetLinkSection(data: BookingEmailData): string {
  if (data.meetLink) {
    return `<p style="margin-top:16px"><strong>Join on Google Meet:</strong>
      <a href="${escapeHtml(data.meetLink)}">${escapeHtml(data.meetLink)}</a></p>`;
  }
  if (needsMeetLinkFollowUp(data)) {
    return `<p style="margin-top:16px">We'll email your Google Meet link before the call.</p>`;
  }
  return "";
}

export function renderBookingConfirmation(data: BookingEmailData): string {
  const giftRow = data.giftAppliedCents > 0
    ? `<tr><td style="padding:4px 0">Gift certificate</td>
         <td style="padding:4px 0;text-align:right">−${formatCents(data.giftAppliedCents)}</td></tr>`
    : "";
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2d2a26">
    <h1 style="font-size:22px">You're booked, ${escapeHtml(data.customerName.split(" ")[0])}.</h1>
    <p>Booking <strong>${escapeHtml(data.bookingNumber)}</strong> · ${data.partySize} ${data.partySize === 1 ? "guest" : "guests"}</p>
    <table style="width:100%;border-collapse:collapse">${data.legs.map(legLine).join("")}</table>
    <table style="width:100%;border-collapse:collapse;margin-top:12px">
      <tr><td style="padding:4px 0">Total</td>
          <td style="padding:4px 0;text-align:right">${formatCents(data.totalCents)}</td></tr>
      ${giftRow}
      <tr><td style="padding:4px 0"><strong>Paid</strong></td>
          <td style="padding:4px 0;text-align:right"><strong>${formatCents(data.paidCents)}</strong></td></tr>
    </table>
    ${meetLinkSection(data)}
    <h2 style="font-size:16px;margin-top:24px">Getting here</h2>
    <p>Highland Farms, Brightwood, OR, at the base of Mt. Hood, about 50 minutes
    from Portland. Leave Portland an hour before your time and you'll arrive with
    ten minutes to spare. Wear closed-toe shoes; dress for the weather.</p>
    <h2 style="font-size:16px;margin-top:24px">Our booking policy</h2>
    <p>All bookings are final: no refunds, credits, or transfers, including
    no-shows. Please double-check your date, time, and guest count now.
    The one exception is ours: if we cancel for weather or animal/guest
    safety, you get a full refund or first pick of new dates. Your call.</p>
    <p style="margin-top:24px">Questions? Reply to this email or call (971) 563-1921.</p>
    <p style="color:#8a8378;font-size:12px;margin-top:24px">Highland Farms · Brightwood, Oregon</p>
  </div>`;
}

/**
 * One VEVENT covering the whole booking. For a combo, that's the span from
 * the earliest leg's start to the latest leg's end — a single calendar
 * block for the day rather than two separate invites.
 */
function icsForBooking(data: BookingEmailData): string {
  const sorted = [...data.legs].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const startMs = Date.parse(first.startsAt);
  const endMs = Date.parse(last.startsAt) + last.durationMin * 60000;
  const summary = `${data.legs
    .map((l) => getBookingProduct(l.productSlug)?.name ?? l.productSlug)
    .join(" + ")} at Highland Farms`;
  const location = data.meetLink
    ? data.meetLink
    : data.locationChoice === "meet"
      ? "Google Meet (link to follow by email)"
      : "Highland Farms, Brightwood, OR";
  return buildIcs({
    uid: data.bookingNumber,
    startIso: first.startsAt,
    durationMin: Math.round((endMs - startMs) / 60000),
    summary,
    description: `Booking ${data.bookingNumber}. All Highland Farms bookings are final: no refunds, credits, or transfers.`,
    location,
  });
}

/** Prominent banner on the farm notification when a consult chose Meet but
 *  has no link yet — empty string otherwise. Exported so the exact copy
 *  is locked down by a test, not just eyeballed in a browser. */
export function renderMeetLinkNeededBanner(data: BookingEmailData): string {
  if (!needsMeetLinkFollowUp(data)) return "";
  return `<p style="background:#fff3cd;border:1px solid #e0a800;padding:10px 14px;
       font-weight:bold;color:#7a5b00">MEET LINK NEEDED: this consult chose
       Google Meet but no link was created. Set one up and send it to
       ${escapeHtml(data.customerEmail)} before the call.</p>`;
}

export async function sendBookingEmails(data: BookingEmailData): Promise<void> {
  const icsAttachment = {
    filename: "highland-farms.ics",
    content: Buffer.from(icsForBooking(data)).toString("base64"),
  };

  // Independent sends: a bounced/rejected customer email must never stop the
  // farm from learning about a PAID booking, and vice versa.
  const results = await Promise.allSettled([
    sendOrThrow({
      from: FROM,
      to: data.customerEmail,
      subject: `You're booked: ${data.bookingNumber}`,
      html: renderBookingConfirmation(data),
      attachments: [icsAttachment],
    }),
    sendOrThrow({
      from: FROM,
      to: FARM_RECIPIENTS,
      subject: `New booking: ${data.legs.map((l) => l.productSlug).join(" + ")} · ${data.bookingNumber}`,
      html: `${renderMeetLinkNeededBanner(data)}<p>${escapeHtml(data.customerName)} (${escapeHtml(data.customerEmail)},
        ${escapeHtml(data.customerPhone)}) booked ${escapeHtml(data.bookingNumber)}:
        ${data.partySize} guests, paid ${formatCents(data.paidCents)}.</p>
        ${renderBookingConfirmation(data)}`,
    }),
  ]);

  const [customerResult, farmResult] = results;
  if (customerResult.status === "rejected") {
    console.error(
      `[booking] customer confirmation email failed ${data.bookingNumber}:`,
      customerResult.reason,
    );
  }
  if (farmResult.status === "rejected") {
    console.error(
      `[booking] farm notification email failed ${data.bookingNumber}:`,
      farmResult.reason,
    );
  }
}
