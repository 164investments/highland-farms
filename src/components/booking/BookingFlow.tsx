"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatCents, formatCentsShort } from "@/lib/shop/money";
import { submitBooking, formatSlotTime, type UiSlot } from "@/lib/booking/client";
import { BOOKING_PRODUCTS, type BookingSlug } from "@/lib/booking/products";
import { DatePicker } from "./DatePicker";
import { ComboPicker } from "./ComboPicker";
import { BookingPayment } from "./BookingPayment";

// Prices and party ranges come from the single price authority
// (`BOOKING_PRODUCTS`) for the three real booking products. `combo` isn't a
// `BookingProduct` (it's two products booked together), so it stays literal
// here — same numbers the engine derives (2 x $75).
const PRICES: Record<string, number> = {
  ...Object.fromEntries(
    (Object.keys(BOOKING_PRODUCTS) as BookingSlug[]).map((slug) => [
      slug,
      BOOKING_PRODUCTS[slug].pricePerPersonCents,
    ]),
  ),
  combo: 15000,
};
const PARTY: Record<string, [number, number]> = {
  ...Object.fromEntries(
    (Object.keys(BOOKING_PRODUCTS) as BookingSlug[]).map((slug) => [
      slug,
      [BOOKING_PRODUCTS[slug].minParty, BOOKING_PRODUCTS[slug].maxParty] as [number, number],
    ]),
  ),
  combo: [2, 6],
};
const TITLES: Record<string, string> = {
  "farm-tour": "Book your private tour",
  "nordic-spa": "Reserve your spa session",
  combo: "Book a Full Farm Day",
  "wedding-call": "Schedule your wedding call",
};
const REFERRALS = ["Instagram", "TikTok", "Facebook", "Google", "Friend or word of mouth", "Airbnb", "Other"];

declare global { interface Window { dataLayer?: Record<string, unknown>[] } }
function push(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

export function BookingFlow({
  product,
  locationToggle = false,
}: {
  product: "farm-tour" | "nordic-spa" | "combo" | "wedding-call";
  locationToggle?: boolean;
}) {
  const isCombo = product === "combo";
  const [slot, setSlot] = useState<UiSlot | null>(null);
  const [date, setDate] = useState<string>("");
  const [spaTime, setSpaTime] = useState<string>("");
  const [party, setParty] = useState(PARTY[product][0] === 2 ? 2 : PARTY[product][0]);
  const [first, setFirst] = useState(""); const [last, setLast] = useState("");
  const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
  const [referral, setReferral] = useState("");
  const [policy, setPolicy] = useState(false);
  const [location, setLocation] = useState<"meet" | "in_person">("meet");
  const [giftCode, setGiftCode] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ bookingNumber: string; amountCents: number } | null>(null);

  const totalCents = PRICES[product] * party;
  const isFree = totalCents === 0;
  const [min, max] = PARTY[product];
  const detailsComplete = Boolean(
    slot && (!isCombo || spaTime) && first.trim() && last.trim() &&
      /.+@.+\..+/.test(email) && phone.trim().length >= 7 && referral && policy,
  );

  useEffect(() => push("booking_view_item", { booking_product: product }), [product]);

  async function submit(sourceId?: string) {
    if (!slot || submitting) return;
    setSubmitting(true);
    setError("");
    push("booking_begin_checkout", { booking_product: product, value: totalCents / 100 });
    const result = await submitBooking({
      product, date, time: slot.time, partySize: party,
      spaTime: isCombo ? spaTime : undefined,
      customer: { firstName: first.trim(), lastName: last.trim(), email: email.trim(), phone: phone.trim() },
      referralSource: referral, policyAgreed: true,
      locationChoice: locationToggle ? location : undefined,
      giftCode: giftCode.trim() || undefined,
      sourceId,
    });
    setSubmitting(false);
    if (result.ok) {
      push("booking_purchase", {
        booking_product: product, value: result.amountCents / 100,
        transaction_id: result.bookingNumber, event_id: `native_${result.bookingNumber}`,
      });
      setDone(result);
    } else {
      setError(result.error);
      if (result.status === 409) {
        setSlot(null); // slot gone: back to the calendar
        setSpaTime("");
        setRefreshNonce((n) => n + 1); // trigger availability refetch
      }
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-forest/20 bg-sage/10 p-6 text-center">
        <h3 className="text-2xl text-forest">You&apos;re booked.</h3>
        <p className="mt-2 font-sans text-sm text-stone-700">
          Booking <strong>{done.bookingNumber}</strong>. A confirmation is on its way to {email}.
        </p>
        <p className="mt-2 font-sans text-sm text-stone-700">
          We&apos;re in Brightwood at the base of Mt. Hood, about 50 minutes from Portland.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-forest/15 p-5 sm:p-7">
      <h3 className="text-2xl text-forest">{TITLES[product]}</h3>
      <p className="mt-1 font-sans text-sm text-stone-600">
        {isFree ? "Free. 45 minutes with our events team." : `No fees. ${formatCentsShort(PRICES[product])} per person. That's it.`}
      </p>

      <div className="mt-5">
        {isCombo ? (
          <ComboPicker party={party}
            selected={slot && spaTime ? { date, tourTime: slot.time, spaTime } : null}
            onSelect={(tourSlot, spaSlot, d) => {
              setSlot(tourSlot); setDate(d); setSpaTime(spaSlot.time);
              push("booking_select_time", {
                booking_product: product, slot: tourSlot.time, spa_slot: spaSlot.time, date: d,
              });
            }}
            refreshNonce={refreshNonce} />
        ) : (
          <DatePicker product={product} party={party}
            selected={slot}
            onSelect={(s, d) => { setSlot(s); setDate(d); push("booking_select_time", { booking_product: product, slot: s.time, date: d }); }}
            refreshNonce={refreshNonce} />
        )}
      </div>

      {slot && max > 1 && (
        <div className="mt-5 flex items-center gap-4">
          <span className="font-sans text-sm text-stone-700">Guests</span>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Fewer guests" onClick={() => setParty(Math.max(min, party - 1))}
              className="h-9 w-9 rounded-full border border-forest/30 text-forest">−</button>
            <span className="w-6 text-center font-sans">{party}</span>
            <button type="button" aria-label="More guests" onClick={() => setParty(Math.min(max, party + 1))}
              className="h-9 w-9 rounded-full border border-forest/30 text-forest">+</button>
          </div>
          {!isFree && <span className="ml-auto font-sans text-sm text-stone-700">Total <strong>{formatCents(totalCents)}</strong></span>}
        </div>
      )}

      {slot && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className="rounded-lg border border-stone-300 px-3 py-2.5 font-sans text-sm" placeholder="First name"
            autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} />
          <input className="rounded-lg border border-stone-300 px-3 py-2.5 font-sans text-sm" placeholder="Last name"
            autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)} />
          <input className="rounded-lg border border-stone-300 px-3 py-2.5 font-sans text-sm" placeholder="Email" type="email"
            autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="rounded-lg border border-stone-300 px-3 py-2.5 font-sans text-sm" placeholder="Phone" type="tel"
            autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <select className="rounded-lg border border-stone-300 px-3 py-2.5 font-sans text-sm sm:col-span-2"
            value={referral} onChange={(e) => setReferral(e.target.value)}>
            <option value="">How did you hear about us?</option>
            {REFERRALS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {locationToggle && (
            <div className="flex gap-2 sm:col-span-2">
              {([["meet", "Google Meet video call"], ["in_person", "In person at the farm"]] as const).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setLocation(v)}
                  className={`flex-1 rounded-lg border px-3 py-2.5 font-sans text-sm ${location === v ? "border-forest bg-forest text-white" : "border-forest/30 text-forest"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {!isFree && (
            <input className="rounded-lg border border-stone-300 px-3 py-2.5 font-sans text-sm sm:col-span-2"
              placeholder="Gift certificate code (optional)" value={giftCode} onChange={(e) => setGiftCode(e.target.value)} />
          )}
          <label className="flex items-start gap-2.5 font-sans text-xs text-stone-600 sm:col-span-2">
            <input type="checkbox" className="mt-0.5" checked={policy} onChange={(e) => setPolicy(e.target.checked)} />
            <span>
              I understand all bookings are final: no refunds, credits, or transfers, including no-shows.
              If Highland Farms cancels for weather or animal safety, I get a full refund or first pick of new dates.
            </span>
          </label>
        </div>
      )}

      {error && <p className="mt-4 font-sans text-sm text-red-700">{error}</p>}

      {slot && isFree && (
        <Button className="mt-5 w-full" onClick={() => detailsComplete && submit()} type="button">
          {submitting ? "Booking…" : `Book ${formatSlotTime(slot.time)}`}
        </Button>
      )}
      {slot && !isFree && detailsComplete && (
        <div className="mt-5">
          <BookingPayment totalCents={totalCents} disabled={submitting}
            onToken={(sourceId) => submit(sourceId)} onError={(m) => setError(m)} />
        </div>
      )}
    </div>
  );
}
