"use client";

import { getClientAttribution } from "@/lib/attribution";

export interface UiSlot { startsAt: string; time: string; capacity: number; remainingUnits: number }
export interface UiDay { date: string; slots: UiSlot[] }
export interface UiComboDay { date: string; pairs: { tour: UiSlot; spa: UiSlot }[] }

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

  const res = await fetch("/api/booking/checkout", {
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
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.success) {
    idempotencyKey = null;
    return { ok: true, bookingNumber: data.bookingNumber, amountCents: data.amountCents };
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
