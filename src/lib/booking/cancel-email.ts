import { Resend } from "resend";
import { escapeHtml } from "../html.ts";

/**
 * Farm-initiated cancellation email.
 *
 * STRICT policy: this is the only path that may ever promise a refund,
 * reschedule, credit, or transfer to a guest — because it only fires when the
 * FARM cancels (weather, animal/guest safety), never on a customer request.
 * See the booking policy paragraph in `confirmation-email.ts` for the promise
 * this email is making good on.
 */

let resend: Resend | undefined;
function getResend(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

/**
 * Same reasoning as `confirmation-email.ts`'s `sendOrThrow`: Resend resolves
 * `{ data: null, error }` on an API-level failure rather than rejecting, so
 * this throws to make sure a bad key or a 4xx/5xx actually surfaces.
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

export interface CancelEmailData {
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  refunded: boolean;
  giftRestored: boolean;
}

function moneyLine(data: CancelEmailData): string {
  if (data.giftRestored) {
    return "Your gift certificate has been restored and is ready to use again.";
  }
  if (data.refunded) {
    return "A full refund is on its way.";
  }
  return "";
}

export function renderCancelEmail(data: CancelEmailData): string {
  const firstName = escapeHtml(data.customerName.split(" ")[0]);
  const line = moneyLine(data);
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2d2a26">
    <h1 style="font-size:22px">We had to cancel your booking, ${firstName}.</h1>
    <p>Booking <strong>${escapeHtml(data.bookingNumber)}</strong> at Highland Farms has
    been cancelled on our end.${line ? ` ${line}` : ""}</p>
    <p>First pick of new dates is yours: call the farm at (971) 563-1921 or reply
    to this email and we'll get you booked.</p>
    <p style="color:#8a8378;font-size:12px;margin-top:24px">Highland Farms, Brightwood, Oregon</p>
  </div>`;
}

export async function sendCancelEmail(data: CancelEmailData): Promise<void> {
  await sendOrThrow({
    from: FROM,
    to: data.customerEmail,
    subject: `Your booking ${data.bookingNumber} was cancelled`,
    html: renderCancelEmail(data),
  });
}
