"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { BOOKING_PRODUCTS, type BookingSlug } from "@/lib/booking/products";
import { pacificDateStr } from "@/lib/booking/time";

/**
 * Per-product weekly schedule rules. An "edit" is always delete-then-add (the
 * API has no update route — see `schedules/route.ts`'s doc on why the
 * engine's latest-`effectiveFrom` resolution makes that safe).
 */

const PRODUCT_SLUGS: BookingSlug[] = ["farm-tour", "nordic-spa", "wedding-call"];
const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_RE = /^\d{2}:\d{2}$/;

interface ScheduleRule {
  id: number;
  productSlug: string;
  weekday: number;
  startTimes: string[];
  capacity: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export function SchedulesTab({ token }: { token: string }) {
  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<BookingSlug>("farm-tour");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // `schedules` in this response is the FULL unfiltered list regardless
      // of `from`/`to` (see `listSchedules`'s doc) — the date range here is
      // just to satisfy the route's required query params.
      const today = pacificDateStr(new Date());
      const res = await fetch(`/api/shop/admin/booking?from=${today}&to=${today}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setSessionExpired(true);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { schedules?: ScheduleRule[]; error?: string };
      if (!res.ok) {
        setLoadError(body.error ?? "Could not load the schedules.");
        return;
      }
      setRules(body.schedules ?? []);
    } catch {
      setLoadError("Could not load the schedules.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (sessionExpired) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-sm text-charcoal shadow-sm font-sans">
        Session expired — reload with your admin link.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {PRODUCT_SLUGS.map((slug) => (
          <button
            key={slug}
            type="button"
            onClick={() => setActiveProduct(slug)}
            className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.1em] transition-colors font-sans ${
              activeProduct === slug
                ? "border-forest bg-forest text-white"
                : "border-cream-dark bg-white text-charcoal hover:border-forest/40"
            }`}
          >
            {BOOKING_PRODUCTS[slug].name}
          </button>
        ))}
      </div>

      {loadError && (
        <p role="alert" className="rounded-2xl bg-white px-4 py-3 text-sm text-red-700 shadow-sm font-sans">
          {loadError}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-8 text-sm text-muted shadow-sm font-sans">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading the schedules…
        </div>
      ) : (
        <RulesTable
          rules={rules.filter((r) => r.productSlug === activeProduct)}
          token={token}
          onChanged={load}
        />
      )}

      <AddRuleForm productSlug={activeProduct} token={token} onAdded={load} />
    </div>
  );
}

function RulesTable({
  rules, token, onChanged,
}: {
  rules: ScheduleRule[];
  token: string;
  onChanged: () => void;
}) {
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/admin/booking/schedules", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not delete that rule.");
        return;
      }
      setRemovingId(null);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (rules.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-sm text-muted shadow-sm font-sans">
        No schedule rules for this product yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      {error && (
        <p role="alert" className="border-b border-cream-dark px-4 py-2.5 text-sm text-red-700 font-sans">
          {error}
        </p>
      )}
      <table className="w-full text-sm font-sans">
        <thead>
          <tr className="border-b border-cream-dark text-left text-xs uppercase tracking-[0.1em] text-muted">
            <th className="px-4 py-3">Weekday</th>
            <th className="px-4 py-3">Times</th>
            <th className="px-4 py-3">Capacity</th>
            <th className="px-4 py-3">Effective</th>
            <th className="px-4 py-3 w-32"></th>
          </tr>
        </thead>
        <tbody>
          {rules
            .slice()
            .sort((a, b) => a.weekday - b.weekday || a.effectiveFrom.localeCompare(b.effectiveFrom))
            .map((r) => (
              <tr key={r.id} className="border-b border-cream-dark/50 last:border-0">
                <td className="px-4 py-2.5 text-charcoal">{WEEKDAY_LABELS[r.weekday]}</td>
                <td className="px-4 py-2.5 text-charcoal">{r.startTimes.join(", ")}</td>
                <td className="px-4 py-2.5 text-charcoal">{r.capacity}</td>
                <td className="px-4 py-2.5 text-charcoal">
                  {r.effectiveFrom}
                  {r.effectiveTo ? ` – ${r.effectiveTo}` : " – ongoing"}
                </td>
                <td className="px-4 py-2.5">
                  {removingId === r.id ? (
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => remove(r.id)}
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
                      onClick={() => setRemovingId(r.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-cream-dark px-2.5 py-1 text-xs text-muted hover:border-red-300 hover:text-red-700 font-sans"
                    >
                      <X className="h-3 w-3" />
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function AddRuleForm({
  productSlug, token, onAdded,
}: {
  productSlug: BookingSlug;
  token: string;
  onAdded: () => void;
}) {
  const [weekday, setWeekday] = useState(6);
  const [timesInput, setTimesInput] = useState("");
  const [capacity, setCapacity] = useState(6);
  const [effectiveFrom, setEffectiveFrom] = useState(() => pacificDateStr(new Date()));
  const [effectiveTo, setEffectiveTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    const startTimes = timesInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (startTimes.length === 0) {
      setError("Enter at least one time.");
      return;
    }
    const bad = startTimes.find((t) => !TIME_RE.test(t));
    if (bad) {
      setError(`"${bad}" isn't a valid time — use HH:MM, like 09:00 or 14:30.`);
      return;
    }
    if (capacity < 1) {
      setError("Capacity must be at least 1.");
      return;
    }
    if (effectiveTo && effectiveTo < effectiveFrom) {
      setError("Effective-to must be on or after effective-from.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/shop/admin/booking/schedules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productSlug, weekday, startTimes, capacity,
          effectiveFrom, effectiveTo: effectiveTo || null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not save the rule.");
        return;
      }
      setTimesInput("");
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-2 text-xs uppercase tracking-[0.1em] text-muted font-sans">
        Add a rule for {BOOKING_PRODUCTS[productSlug].name}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs font-sans">
          <span className="mb-1 block text-muted">Weekday</span>
          <select
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
            className="w-full rounded-lg border border-cream-dark bg-white px-2 py-1.5 text-sm outline-none focus:border-forest"
          >
            {WEEKDAY_LABELS.map((label, i) => (
              <option key={label} value={i}>{label}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-sans sm:col-span-2">
          <span className="mb-1 block text-muted">Times (comma-separated HH:MM)</span>
          <input
            value={timesInput}
            onChange={(e) => setTimesInput(e.target.value)}
            placeholder="09:00, 11:00, 14:00"
            className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
          />
        </label>
        <label className="block text-xs font-sans">
          <span className="mb-1 block text-muted">Capacity</span>
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
          />
        </label>
        <label className="block text-xs font-sans">
          <span className="mb-1 block text-muted">Effective from</span>
          <input
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
          />
        </label>
        <label className="block text-xs font-sans">
          <span className="mb-1 block text-muted">Effective to (optional)</span>
          <input
            type="date"
            value={effectiveTo}
            onChange={(e) => setEffectiveTo(e.target.value)}
            className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm outline-none focus:border-forest"
          />
        </label>
      </div>
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
        Add rule
      </button>
      <p className="mt-2 text-xs text-muted font-sans">
        New rules take effect from their start date. The newest rule for a weekday wins.
      </p>
    </div>
  );
}
