import { Resend } from "resend";
import { escapeHtml } from "@/lib/html";
import { getBookingProduct } from "./products";

let resend: Resend | undefined;
function getResend(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}
const FROM = "Highland Farms <notifications@highlandfarmsoregon.com>";
const TZ = "America/Los_Angeles";

export interface ReminderBooking {
  id: string;
  booking_number: string;
  product_slug: string;
  starts_at: string;
  party_size: number;
  first_name: string;
  email: string;
}

export async function sendReminder(
  b: ReminderBooking,
  kind: "48h" | "morning_of",
): Promise<void> {
  const product = getBookingProduct(b.product_slug);
  const when = new Date(b.starts_at);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, weekday: "long", month: "long", day: "numeric",
  }).format(when);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour: "numeric", minute: "2-digit",
  }).format(when);
  const subject =
    kind === "48h"
      ? `See you ${day} — ${product?.name ?? b.product_slug}`
      : `Today at ${time} — ${product?.name ?? b.product_slug}`;
  await getResend().emails.send({
    from: FROM,
    to: b.email,
    subject,
    html: `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2d2a26">
      <p>Hi ${escapeHtml(b.first_name)},</p>
      <p>Your ${escapeHtml(product?.name ?? b.product_slug)} for ${b.party_size}
      is ${kind === "48h" ? `coming up ${escapeHtml(day)}` : "today"} at
      <strong>${escapeHtml(time)}</strong> (booking ${escapeHtml(b.booking_number)}).</p>
      <p>We're in Brightwood at the base of Mt. Hood — about 50 minutes from
      Portland. Leave an hour before your time. Closed-toe shoes; dress for the
      weather.</p>
      <p>Questions? Reply here or call (971) 563-1921.</p>
    </div>`,
  });
}
