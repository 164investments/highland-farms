/**
 * Who signs the cart reminders.
 *
 * A named, accountable human outperforms "The Team" — and it's also the thing
 * that gives an email a chance at Gmail's Primary tab rather than Promotions.
 *
 * ⛔ `photo` is OPTIONAL and must only ever point at a REAL photograph of that
 * person. Never generate a likeness: a fabricated headshot of a real employee is
 * a worse version of the fake-provenance-imagery problem, because it puts words
 * and a face on someone who didn't consent to either. A sender with no photo
 * simply signs without one, which reads fine.
 */

export type SenderKey = "jalene" | "connor";

export interface Sender {
  key: SenderKey;
  /** First name only — this is a note from a person, not a title block. */
  name: string;
  role: string;
  /** Absolute URL to a real photo, or null. Email clients need absolute. */
  photo: string | null;
}

const SITE = "https://highlandfarmsoregon.com";

export const SENDERS: Record<SenderKey, Sender> = {
  jalene: {
    key: "jalene",
    name: "Jalene",
    role: "Highland Farms · Brightwood",
    // No real headshot on file yet. Deliberately null rather than generated.
    photo: null,
  },
  connor: {
    key: "connor",
    name: "Connor",
    role: "Highland Farms · Brightwood",
    photo: `${SITE}/images/team/connor-mcwilliams.jpg`,
  },
};

export function resolveSender(key: string | null | undefined): Sender {
  return key === "connor" ? SENDERS.connor : SENDERS.jalene;
}
