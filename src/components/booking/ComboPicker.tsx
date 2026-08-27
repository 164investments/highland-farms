"use client";

import { useEffect, useState } from "react";
import {
  fetchComboAvailability, formatSlotTime, todayStr, plusDays, type UiComboDay, type UiSlot,
} from "@/lib/booking/client";

export interface ComboSelection { date: string; tourTime: string; spaTime: string }

declare global { interface Window { dataLayer?: Record<string, unknown>[] } }
function push(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

const DAY_LABEL = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC", weekday: "short", month: "short", day: "numeric",
});

/**
 * Full Farm Day picker: same day-grid UX as DatePicker, but each day's
 * options are tour+spa PAIRS (already buffer-checked by comboDays()) instead
 * of single slots. `party` drives both legs' unit needs, so it stays an
 * effect dependency the same way DatePicker's does.
 */
export function ComboPicker({
  party, selected, onSelect, refreshNonce,
}: {
  party: number;
  selected: ComboSelection | null;
  onSelect: (tourSlot: UiSlot, spaSlot: UiSlot, date: string) => void;
  refreshNonce: number;
}) {
  const [days, setDays] = useState<UiComboDay[]>([]);
  const [windowStart, setWindowStart] = useState(todayStr());
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let dead = false;
    // Re-flips to true on every dependency change, not just on mount — see
    // DatePicker's identical comment. This effect never sets a value that is
    // itself a dependency, so it cannot cascade into a loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchComboAvailability(windowStart, plusDays(windowStart, 13), party)
      .then((d) => { if (!dead) { setDays(d); setError(false); } })
      .catch(() => { if (!dead) setError(true); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [party, windowStart, refreshNonce]);

  if (error) {
    return <p className="text-sm text-red-700">We couldn&apos;t load the calendar. Refresh to try again, or call (971) 563-1921.</p>;
  }

  // comboDays() only returns dates that have at least one valid pair, so the
  // 14-day grid is built from the window itself (matching DatePicker's full
  // window) and looked up against a date -> pairs map.
  const windowDates = Array.from({ length: 14 }, (_, i) => plusDays(windowStart, i));
  const pairsByDate = new Map(days.map((d) => [d.date, d.pairs]));
  const openPairs = openDate ? (pairsByDate.get(openDate) ?? []) : [];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {windowDates.map((date) => {
          const open = (pairsByDate.get(date)?.length ?? 0) > 0;
          return (
            <button
              key={date}
              type="button"
              disabled={!open}
              onClick={() => { setOpenDate(date); push("booking_select_date", { booking_product: "combo", date }); }}
              className={`rounded-lg border px-1 py-2 text-center text-xs transition ${
                openDate === date
                  ? "border-forest bg-forest text-white"
                  : open
                    ? "border-forest/25 text-forest hover:border-forest/60"
                    : "border-stone-200 text-stone-300"
              }`}
            >
              <span className="block font-sans">{DAY_LABEL.format(new Date(`${date}T12:00:00Z`)).split(",")[0]}</span>
              <span className="block text-sm font-medium">{Number(date.slice(8))}</span>
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
      {openDate && openPairs.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {openPairs.map((pair) => {
            const scarce = pair.spa.remainingUnits <= 3;
            const isSelected =
              selected?.date === openDate &&
              selected.tourTime === pair.tour.time &&
              selected.spaTime === pair.spa.time;
            return (
              <button
                key={`${pair.tour.startsAt}_${pair.spa.startsAt}`}
                type="button"
                onClick={() => onSelect(pair.tour, pair.spa, openDate)}
                className={`rounded-lg border px-3 py-2.5 text-left font-sans text-sm ${
                  isSelected
                    ? "border-forest bg-forest text-white"
                    : "border-forest/30 text-forest hover:bg-forest/5"
                }`}
              >
                {formatSlotTime(pair.tour.time)} tour + {formatSlotTime(pair.spa.time)} spa
                {scarce && <span className="ml-1.5 text-xs opacity-80">{pair.spa.remainingUnits} spa seats left</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
