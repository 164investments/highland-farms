"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Phone, Plus, X } from "lucide-react";
import { formatCents } from "@/lib/shop/money";
import { BOOKING_PRODUCTS, type BookingSlug } from "@/lib/booking/products";
import { addDays, eachDate, pacificDateStr, pacificTimeStr, pacificWeekday } from "@/lib/booking/time";

/**
 * Farm calendar — the week view Jalene lives in. Every mutation goes through
 * the Task 12 admin routes (never a direct Supabase write from the client);
 * cancel is a two-step inline confirm, never `window.confirm` (blocks
 * headless drivers, and Playwright can't dismiss a native dialog cleanly).
 */

const PRODUCT_SLUGS: BookingSlug[] = ["farm-tour", "nordic-spa", "wedding-call"];
const BLACKOUT_KINDS = [
  { value: "wedding", label: "Wedding" },
  { value: "closure", label: "Closure" },
  { value: "private_event", label: "Private event" },
] as const;

interface Booking {
  id: string;
  bookingNumber: string;
  productSlug: string;
  startsAt: string;
  durationMin: number;
  partySize: number;
  units: number;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  amountCents: number;
  squarePaymentId: string | null;
  giftCertificateCode: string | null;
  giftAmountCents: number;
  referralSource: string | null;
  source: string;
  notes: string | null;
  comboGroup: string | null;
  createdAt: string;
}

interface Blackout {
  id: number;
  kind: string;
  startsOn: string;
  endsOn: string;
  productSlugs: string[];
  note: string | null;
}

const DAY_LABEL = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
  month: "short",
  day: "numeric",
});
const RANGE_LABEL = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

function currentWeekStart(): string {
  const today = pacificDateStr(new Date());
  return addDays(today, -pacificWeekday(today));
}

function formatTime12(hhmm: string): string {
  const [hStr, m] = hhmm.split(":");
  let h = Number(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function statusChipClass(status: string): string {
  if (status === "confirmed") return "bg-forest/10 text-forest";
  if (status === "cancelled") return "bg-cream-dark text-muted line-through";
  return "bg-amber-100 text-amber-800";
}

/**
 * Refund owed if this booking (or its whole combo group) is cancelled now —
 * cash only, never the pre-gift total. Mirrors the cancel route's own gate
 * (`refund && paymentId && refundCents > 0`): a phone booking has no
 * `squarePaymentId` (nothing was ever charged), so it's never owed a refund
 * even though `amountCents` is set from the same server pricing as checkout.
 */
function refundCentsFor(b: Booking, all: Booking[]): number {
  const group = b.comboGroup
    ? all.filter((x) => x.comboGroup === b.comboGroup && x.status === "confirmed")
    : [b];
  if (!group.some((x) => x.squarePaymentId)) return 0;
  return group.reduce((sum, x) => sum + x.amountCents - x.giftAmountCents, 0);
}

export function CalendarTab({ token }: { token: string }) {
  const [weekStart, setWeekStart] = useState<string>(currentWeekStart);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

  const weekEnd = addDays(weekStart, 6);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/shop/admin/booking?from=${weekStart}&to=${weekEnd}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setSessionExpired(true);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as {
        bookings?: Booking[];
        blackouts?: Blackout[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(body.error ?? "Could not load the calendar.");
        return;
      }
      setBookings(body.bookings ?? []);
      setBlackouts(body.blackouts ?? []);
    } catch {
      setLoadError("Could not load the calendar.");
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd, token]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(() => eachDate(weekStart, weekEnd), [weekStart, weekEnd]);
  const byDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const d of days) map.set(d, []);
    for (const b of bookings) {
      const d = pacificDateStr(new Date(b.startsAt));
      map.get(d)?.push(b);
    }
    for (const list of map.values()) list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return map;
  }, [days, bookings]);

  const blackoutsFor = useCallback(
    (date: string) => blackouts.filter((bo) => bo.startsOn <= date && bo.endsOn >= date),
    [blackouts],
  );

  if (sessionExpired) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-sm text-charcoal shadow-sm font-sans">
        Session expired — reload with your admin link.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cream-dark text-charcoal hover:border-forest/40"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(currentWeekStart())}
            className="rounded-full border border-cream-dark px-3 py-1.5 text-xs uppercase tracking-[0.1em] text-charcoal hover:border-forest/40 font-sans"
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cream-dark text-charcoal hover:border-forest/40"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-charcoal font-sans">
          {RANGE_LABEL.format(new Date(`${weekStart}T12:00:00Z`))} –{" "}
          {RANGE_LABEL.format(new Date(`${weekEnd}T12:00:00Z`))}
        </p>
        <button
          type="button"
          onClick={() => setShowManualForm((v) => !v)}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-forest px-4 text-xs uppercase tracking-[0.1em] text-white shadow-sm hover:shadow-md font-sans"
        >
          <Phone className="h-3.5 w-3.5" />
          Phone booking
        </button>
      </div>

      {showManualForm && (
        <ManualBookingForm
          token={token}
          defaultDate={weekStart}
          onClose={() => setShowManualForm(false)}
          onBooked={() => {
            setShowManualForm(false);
            load();
          }}
        />
      )}

      <BlackoutBar token={token} weekStart={weekStart} blackouts={blackouts} onChanged={load} />

      {loadError && (
        <p role="alert" className="rounded-2xl bg-white px-4 py-3 text-sm text-red-700 shadow-sm font-sans">
          {loadError}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-8 text-sm text-muted shadow-sm font-sans">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading the calendar…
        </div>
      ) : (
        <div className="space-y-3">
          {days.map((date) => (
            <DayCard
              key={date}
              date={date}
              bookings={byDay.get(date) ?? []}
              allBookings={bookings}
              blackouts={blackoutsFor(date)}
              token={token}
              onChanged={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DayCard({
  date, bookings, allBookings, blackouts, token, onChanged,
}: {
  date: string;
  bookings: Booking[];
  allBookings: Booking[];
  blackouts: Blackout[];
  token: string;
  onChanged: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-dark px-4 py-2.5">
        <p className="text-sm font-medium text-charcoal font-sans">
          {DAY_LABEL.format(new Date(`${date}T12:00:00Z`))}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {blackouts.map((bo) => (
            <span
              key={bo.id}
              className="rounded-full bg-charcoal/5 px-2.5 py-1 text-xs text-charcoal font-sans"
            >
              Blacked out: {BLACKOUT_KINDS.find((k) => k.value === bo.kind)?.label ?? bo.kind}
            </span>
          ))}
        </div>
      </div>
      {bookings.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted font-sans">No bookings.</p>
      ) : (
        <ul>
          {bookings.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              allBookings={allBookings}
              token={token}
              onChanged={onChanged}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function BookingRow({
  booking, allBookings, token, onChanged,
}: {
  booking: Booking;
  allBookings: Booking[];
  token: string;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const product = BOOKING_PRODUCTS[booking.productSlug as BookingSlug];
  const refundCents = refundCentsFor(booking, allBookings);

  async function confirmCancel() {
    if (!reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/admin/booking/cancel", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: booking.id,
          refund: refundCents > 0,
          reason: reason.trim(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not cancel that booking.");
        return;
      }
      setConfirming(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border-b border-cream-dark/50 px-4 py-3 last:border-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-sans">
        <span className="font-medium text-charcoal">{formatTime12(pacificTimeStr(new Date(booking.startsAt)))}</span>
        <span className="text-charcoal">{product?.name ?? booking.productSlug}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-sans ${statusChipClass(booking.status)}`}>
          {booking.status.replace(/_/g, " ")}
        </span>
        {booking.comboGroup && (
          <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs text-charcoal font-sans">
            Full Farm Day
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted font-sans">
        <span>
          {booking.firstName} {booking.lastName}
        </span>
        <span>Party of {booking.partySize}</span>
        <span>{formatCents(booking.amountCents)}</span>
        <span>{booking.phone}</span>
        <span className="break-all">{booking.email}</span>
        {booking.source === "admin" && <span>Phone booking</span>}
        {booking.notes && <span>Note: {booking.notes}</span>}
      </div>

      {booking.status === "confirmed" && !confirming && (
        <button
          type="button"
          onClick={() => { setConfirming(true); setReason(""); setError(null); }}
          className="mt-2 rounded-full border border-red-200 px-3 py-1 text-xs uppercase tracking-[0.1em] text-red-700 hover:border-red-400 font-sans"
        >
          Cancel
        </button>
      )}

      {confirming && (
        <div className="mt-2 rounded-xl bg-cream-light p-3">
          {booking.comboGroup && (
            <p className="mb-1.5 text-xs text-charcoal font-sans">
              Cancels both parts of the Full Farm Day.
            </p>
          )}
          <p className="mb-1.5 text-sm text-charcoal font-sans">
            {refundCents > 0
              ? `Refund ${formatCents(refundCents)} and cancel?`
              : "Cancel this booking? (Nothing to refund.)"}
          </p>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (weather, farm closure, etc.)"
            className="mb-2 w-full max-w-sm rounded-lg border border-cream-dark px-2.5 py-1.5 text-sm outline-none focus:border-forest font-sans"
          />
          {error && <p role="alert" className="mb-2 text-xs text-red-700 font-sans">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !reason.trim()}
              onClick={confirmCancel}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.1em] font-sans ${
                busy || !reason.trim()
                  ? "cursor-not-allowed bg-cream-dark text-muted"
                  : "bg-red-700 text-white hover:bg-red-800"
              }`}
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm cancel
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="rounded-full border border-cream-dark px-4 py-1.5 text-xs uppercase tracking-[0.1em] text-charcoal hover:border-forest/40 font-sans"
            >
              Keep
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function BlackoutBar({
  token, weekStart, blackouts, onChanged,
}: {
  token: string;
  weekStart: string;
  blackouts: Blackout[];
  onChanged: () => void;
}) {
  const [startsOn, setStartsOn] = useState(weekStart);
  const [endsOn, setEndsOn] = useState(weekStart);
  const [kind, setKind] = useState<"wedding" | "closure" | "private_event">("wedding");
  const [slugs, setSlugs] = useState<Set<BookingSlug>>(new Set(PRODUCT_SLUGS));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  function toggleSlug(slug: BookingSlug) {
    setSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function pickWedding() {
    setKind("wedding");
    setSlugs(new Set<BookingSlug>(["farm-tour", "nordic-spa"]));
  }

  async function add() {
    setError(null);
    if (slugs.size === 0) {
      setError("Pick at least one product to black out.");
      return;
    }
    if (endsOn < startsOn) {
      setError("End date must be on or after the start date.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/shop/admin/booking/blackouts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          kind, startsOn, endsOn, productSlugs: Array.from(slugs), note: note.trim() || null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not save the blackout.");
        return;
      }
      setNote("");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/admin/booking/blackouts", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not remove the blackout.");
        return;
      }
      setRemovingId(null);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm">
      <div className="border-b border-cream-dark p-4">
        <p className="mb-2 text-xs uppercase tracking-[0.1em] text-muted font-sans">Blackouts</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-xs font-sans">
            <span className="mb-1 block text-muted">From</span>
            <input
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
              className="rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
            />
          </label>
          <label className="block text-xs font-sans">
            <span className="mb-1 block text-muted">To</span>
            <input
              type="date"
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
              className="rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
            />
          </label>
          <label className="block text-xs font-sans">
            <span className="mb-1 block text-muted">Kind</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
              className="rounded-lg border border-cream-dark bg-white px-2 py-1.5 text-sm outline-none focus:border-forest"
            >
              {BLACKOUT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={pickWedding}
            className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.1em] font-sans ${
              kind === "wedding"
                ? "border-forest bg-forest text-white"
                : "border-cream-dark text-charcoal hover:border-forest/40"
            }`}
          >
            Wedding
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs font-sans">
          {PRODUCT_SLUGS.map((slug) => (
            <label key={slug} className="flex items-center gap-1.5 text-charcoal">
              <input type="checkbox" checked={slugs.has(slug)} onChange={() => toggleSlug(slug)} />
              {BOOKING_PRODUCTS[slug].name}
            </label>
          ))}
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="mt-2 w-full max-w-sm rounded-lg border border-cream-dark px-2.5 py-1.5 text-sm outline-none focus:border-forest font-sans"
        />
        {error && <p role="alert" className="mt-2 text-xs text-red-700 font-sans">{error}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={add}
          className={`mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-xs uppercase tracking-[0.1em] font-sans ${
            busy ? "cursor-not-allowed bg-cream-dark text-muted" : "bg-forest text-white shadow-sm hover:shadow-md"
          }`}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add blackout
        </button>
      </div>

      {blackouts.length > 0 && (
        <ul className="divide-y divide-cream-dark/50">
          {blackouts.map((bo) => (
            <li key={bo.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm font-sans">
              <span className="text-charcoal">
                {BLACKOUT_KINDS.find((k) => k.value === bo.kind)?.label ?? bo.kind} · {bo.startsOn}
                {bo.endsOn !== bo.startsOn ? ` – ${bo.endsOn}` : ""} ·{" "}
                {bo.productSlugs.map((s) => BOOKING_PRODUCTS[s as BookingSlug]?.name ?? s).join(", ")}
                {bo.note ? ` · ${bo.note}` : ""}
              </span>
              {removingId === bo.id ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs text-charcoal">Remove?</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(bo.id)}
                    className="rounded-full bg-red-700 px-3 py-1 text-xs uppercase tracking-[0.1em] text-white hover:bg-red-800 font-sans"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemovingId(null)}
                    className="rounded-full border border-cream-dark px-3 py-1 text-xs uppercase tracking-[0.1em] text-charcoal font-sans"
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setRemovingId(bo.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-cream-dark px-2.5 py-1 text-xs text-muted hover:border-red-300 hover:text-red-700 font-sans"
                >
                  <X className="h-3 w-3" />
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ManualBookingForm({
  token, defaultDate, onClose, onBooked,
}: {
  token: string;
  defaultDate: string;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [product, setProduct] = useState<BookingSlug>("farm-tour");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productDef = BOOKING_PRODUCTS[product];

  async function submit() {
    setError(null);
    if (!/^\d{2}:\d{2}$/.test(time)) {
      setError("Pick a time.");
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      setError("Name, email, and phone are required.");
      return;
    }
    if (partySize < productDef.minParty || partySize > productDef.maxParty) {
      setError(`${productDef.name} is for ${productDef.minParty}-${productDef.maxParty} guests.`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/shop/admin/booking/manual", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          product, date, time, partySize,
          customer: {
            firstName: firstName.trim(), lastName: lastName.trim(),
            email: email.trim(), phone: phone.trim(),
          },
          note: note.trim() || null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string; bookingNumber?: string; amountCents?: number;
      };
      if (!res.ok) {
        setError(body.error ?? "Could not create the booking.");
        return;
      }
      onBooked();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.1em] text-muted font-sans">Phone booking</p>
        <button type="button" onClick={onClose} className="text-muted hover:text-charcoal" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-xs font-sans">
          <span className="mb-1 block text-muted">Product</span>
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value as BookingSlug)}
            className="w-full rounded-lg border border-cream-dark bg-white px-2 py-1.5 text-sm outline-none focus:border-forest"
          >
            {PRODUCT_SLUGS.map((slug) => (
              <option key={slug} value={slug}>{BOOKING_PRODUCTS[slug].name}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-sans">
          <span className="mb-1 block text-muted">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
          />
        </label>
        <label className="block text-xs font-sans">
          <span className="mb-1 block text-muted">Time</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
          />
        </label>
        <label className="block text-xs font-sans">
          <span className="mb-1 block text-muted">Party size</span>
          <input
            type="number"
            min={productDef.minParty}
            max={productDef.maxParty}
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
          />
        </label>
        <label className="block text-xs font-sans">
          <span className="mb-1 block text-muted">First name</span>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
          />
        </label>
        <label className="block text-xs font-sans">
          <span className="mb-1 block text-muted">Last name</span>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
          />
        </label>
        <label className="block text-xs font-sans">
          <span className="mb-1 block text-muted">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
          />
        </label>
        <label className="block text-xs font-sans">
          <span className="mb-1 block text-muted">Phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
          />
        </label>
        <label className="block text-xs font-sans sm:col-span-2 lg:col-span-3">
          <span className="mb-1 block text-muted">Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
          />
        </label>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-700 font-sans">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={submit}
        className={`mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-xs uppercase tracking-[0.1em] font-sans ${
          busy ? "cursor-not-allowed bg-cream-dark text-muted" : "bg-forest text-white shadow-sm hover:shadow-md"
        }`}
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Book it
      </button>
    </div>
  );
}
