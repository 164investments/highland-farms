"use client";

import { useEffect, useState } from "react";
import {
  fetchAvailability, formatSlotTime, todayStr, plusDays, type UiDay, type UiSlot,
} from "@/lib/booking/client";

declare global { interface Window { dataLayer?: Record<string, unknown>[] } }
function push(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

const DAY_LABEL = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC", weekday: "short", month: "short", day: "numeric",
});

export function DatePicker({
  product, party, selected, onSelect, refreshNonce,
}: {
  product: string;
  party: number;
  selected: UiSlot | null;
  onSelect: (slot: UiSlot, date: string) => void;
  refreshNonce: number;
}) {
  const [days, setDays] = useState<UiDay[]>([]);
  const [windowStart, setWindowStart] = useState(todayStr());
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let dead = false;
    // Re-flips to true on every dependency change (window/party/product/refreshNonce), not
    // just on mount — that's what re-shows "Checking the calendar…" when the
    // guest count or date window changes. This effect never sets a value that
    // is itself a dependency of the effect, so it cannot cascade into a loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchAvailability(product, windowStart, plusDays(windowStart, 13), party)
      .then((d) => { if (!dead) { setDays(d); setError(false); } })
      .catch(() => { if (!dead) setError(true); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [product, party, windowStart, refreshNonce]);

  if (error) {
    return <p className="text-sm text-red-700">We couldn&apos;t load the calendar. Refresh to try again, or call (971) 563-1921.</p>;
  }

  const openDay = days.find((d) => d.date === openDate);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const open = d.slots.some((s) => s.remainingUnits > 0);
          return (
            <button
              key={d.date}
              type="button"
              disabled={!open}
              onClick={() => { setOpenDate(d.date); push("booking_select_date", { booking_product: product, date: d.date }); }}
              className={`rounded-lg border px-1 py-2 text-center text-xs transition ${
                openDate === d.date
                  ? "border-forest bg-forest text-white"
                  : open
                    ? "border-forest/25 text-forest hover:border-forest/60"
                    : "border-stone-200 text-stone-300"
              }`}
            >
              <span className="block font-sans">{DAY_LABEL.format(new Date(`${d.date}T12:00:00Z`)).split(",")[0]}</span>
              <span className="block text-sm font-medium">{Number(d.date.slice(8))}</span>
              {!open && <span className="block text-[10px]">Booked</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between font-sans text-xs">
        <button type="button" className="text-forest underline disabled:text-stone-300"
          disabled={windowStart === todayStr()}
          onClick={() => setWindowStart(plusDays(windowStart, -14))}>Earlier</button>
        <button type="button" className="text-forest underline"
          onClick={() => setWindowStart(plusDays(windowStart, 14))}>Later dates</button>
      </div>
      {loading && <p className="mt-3 font-sans text-sm text-stone-500">Checking the calendar…</p>}
      {openDay && (
        <div className="mt-4 flex flex-wrap gap-2">
          {openDay.slots.map((s) => {
            const full = s.remainingUnits <= 0;
            const scarce = !full && s.remainingUnits <= 3 && s.capacity > 1;
            return (
              <button
                key={s.startsAt}
                type="button"
                disabled={full}
                onClick={() => onSelect(s, openDay.date)}
                className={`rounded-lg border px-3 py-2 font-sans text-sm ${
                  selected?.startsAt === s.startsAt
                    ? "border-forest bg-forest text-white"
                    : full
                      ? "border-stone-200 text-stone-300 line-through"
                      : "border-forest/30 text-forest hover:bg-forest/5"
                }`}
              >
                {formatSlotTime(s.time)}
                {scarce && <span className="ml-1.5 text-xs opacity-80">{s.remainingUnits} left</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
