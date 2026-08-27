"use client";

import { getClientAttribution } from "@/lib/attribution";

export interface UiSlot { startsAt: string; time: string; capacity: number; remainingUnits: number }
export interface UiDay { date: string; slots: UiSlot[] }
export interface UiComboDay { date: string; pairs: { tour: UiSlot; spa: UiSlot }[] }

/** Today's date, Pacific wall clock, as 'YYYY-MM-DD'. Shared by DatePicker and ComboPicker. */
export function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
}
/** `dateStr` shifted by `n` days (may be negative). */
export function plusDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export async function fetchAvailability(
  product: string, from: string, to: string, party: number,
): Promise<UiDay[]> {
  const res = await fetch(
    `/api/booking/availability?product=${product}&from=${from}&to=${to}&party=${party}`,
  );
  if (!res.ok) throw new Error("availability unavailable");
  return (await res.json()).days as UiDay[];
}

export async function fetchComboAvailability(
  from: string, to: string, party: number,
): Promise<UiComboDay[]> {
  const res = await fetch(
    `/api/booking/availability?product=combo&from=${from}&to=${to}&party=${party}`,
  );
  if (!res.ok) throw new Error("availability unavailable");
  return (await res.json()).days as UiComboDay[];
}

export interface BookingSubmission {
  product: string;
  date: string;
  time: string;
  spaTime?: string;
  partySize: number;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  referralSource: string;
  policyAgreed: true;
  locationChoice?: "meet" | "in_person";
  giftCode?: string;
  sourceId?: string;
}

let idempotencyKey: string | null = null;
let reuseKey = false;

export async function submitBooking(payload: BookingSubmission): Promise<
  { ok: true; bookingNumber: string; amountCents: number } | { ok: false; status: number; error: string }
> {
  if (!idempotencyKey || !reuseKey) idempotencyKey = crypto.randomUUID();
  reuseKey = false;

  const attribution = getClientAttribution();
  const cookies = typeof document === "undefined" ? "" : document.cookie;
  const fbp = cookies.match(/_fbp=([^;]+)/)?.[1];
  const fbc = cookies.match(/_fbc=([^;]+)/)?.[1];
  const gaCookie = cookies.match(/_ga=GA\d+\.\d+\.(.+?)(;|$)/)?.[1];

  let res: Response;
  let data: Record<string, unknown> & { success?: boolean; bookingNumber?: string; amountCents?: number; reuseIdempotencyKey?: boolean; error?: string };
  try {
    res = await fetch("/api/booking/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        idempotencyKey,
        attribution,
        clientId: gaCookie,
        fbp,
        fbc,
      }),
    });
    data = await res.json().catch(() => ({}));
  } catch {
    // The request may have reached the server; the charge outcome is unknown.
    // Keep the SAME idempotency key so a retry can never double-charge.
    reuseKey = true;
    return { ok: false, status: 0, error: "Connection hiccup. Check your connection and try again." };
  }
  if (res.ok && data.success) {
    idempotencyKey = null;
    return { ok: true, bookingNumber: data.bookingNumber as string, amountCents: data.amountCents as number };
  }
  // 402 with reuseIdempotencyKey means Square's outcome is unknown: the SAME
  // key must be replayed so Square returns the original payment, never a
  // second charge. Any other failure rotates.
  reuseKey = res.status === 402 && data.reuseIdempotencyKey === true;
  return { ok: false, status: res.status, error: data.error ?? "Something went wrong. Please try again." };
}

export function formatSlotTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}:00 ${period}` : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
