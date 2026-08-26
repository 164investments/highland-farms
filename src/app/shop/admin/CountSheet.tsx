"use client";

import { useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { InventoryRow } from "./AdminBody";

/**
 * Stock count.
 *
 * The farm walks the shelves, types what's actually there, and submits once.
 * Only the rows they touched are sent, so a partial walk-through is a valid
 * count rather than an accidental zeroing of everything they didn't reach.
 */
export function CountSheet({
  rows,
  token,
  onApplied,
}: {
  rows: InventoryRow[];
  token: string;
  onApplied: (counts: Record<string, number>) => void;
}) {
  const [countedBy, setCountedBy] = useState("");
  const [entered, setEntered] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Products with an unlimited stock aren't counted — there's nothing to count.
  const countable = useMemo(() => rows.filter((r) => r.stock !== null), [rows]);

  const touched = useMemo(
    () =>
      Object.entries(entered).filter(
        ([, v]) => v.trim() !== "" && Number.isFinite(Number(v)),
      ),
    [entered],
  );

  async function submit() {
    setError(null);
    setResult(null);
    if (!countedBy.trim()) {
      setError("Put your name in first, so the count is traceable.");
      return;
    }
    if (touched.length === 0) {
      setError("Nothing entered yet.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/shop/admin/count", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          countedBy: countedBy.trim(),
          items: touched.map(([variantId, v]) => ({
            variantId,
            counted: Math.max(0, Math.floor(Number(v))),
          })),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        applied?: number;
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Could not save the count.");
        return;
      }
      const applied: Record<string, number> = {};
      for (const [variantId, v] of touched) applied[variantId] = Math.floor(Number(v));
      onApplied(applied);
      setEntered({});
      setResult(`Counted ${body.applied} product${body.applied === 1 ? "" : "s"}.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-cream-dark p-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted font-sans">
            Counted by
          </span>
          <input
            value={countedBy}
            onChange={(e) => setCountedBy(e.target.value)}
            placeholder="Your name"
            className="w-56 rounded-xl border border-cream-dark px-3 py-2 text-sm outline-none focus:border-forest font-sans"
          />
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted font-sans">
            {touched.length} of {countable.length} entered
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className={`inline-flex min-h-[46px] items-center gap-2 rounded-full px-6 text-sm uppercase tracking-[0.1em] transition-shadow font-sans ${
              saving
                ? "cursor-not-allowed bg-cream-dark text-muted"
                : "bg-forest text-white shadow-sm hover:shadow-md"
            }`}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save count
          </button>
        </div>
      </div>

      {(error || result) && (
        <p
          role="status"
          className="border-b border-cream-dark px-4 py-2.5 text-sm text-charcoal font-sans"
        >
          {error ?? result}
        </p>
      )}

      <p className="px-4 pt-3 text-xs text-muted font-sans">
        Leave a row blank if you didn&apos;t count it. Only what you type gets
        changed.
      </p>

      <table className="mt-2 w-full text-sm font-sans">
        <thead>
          <tr className="border-b border-cream-dark text-left text-xs uppercase tracking-[0.1em] text-muted">
            <th className="px-4 py-3">Product</th>
            <th className="w-28 px-4 py-3">System</th>
            <th className="w-32 px-4 py-3">Counted</th>
          </tr>
        </thead>
        <tbody>
          {countable.map((r) => {
            const value = entered[r.variantId] ?? "";
            const diff =
              value.trim() !== "" && Number.isFinite(Number(value))
                ? Number(value) - (r.stock ?? 0)
                : null;
            return (
              <tr key={r.variantId} className="border-b border-cream-dark/50 last:border-0">
                <td className="px-4 py-2">
                  <span className="text-charcoal">{r.name}</span>
                  {r.label && <span className="text-muted"> · {r.label}</span>}
                </td>
                <td className="px-4 py-2 text-muted">{r.stock}</td>
                <td className="px-4 py-2">
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={value}
                      onChange={(e) =>
                        setEntered((prev) => ({ ...prev, [r.variantId]: e.target.value }))
                      }
                      className="w-20 rounded-lg border border-cream-dark px-2 py-1 text-sm outline-none focus:border-forest"
                    />
                    {diff !== null && diff !== 0 && (
                      <span className="text-xs text-muted">
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
