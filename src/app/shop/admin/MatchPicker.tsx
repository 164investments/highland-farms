"use client";

import { useState } from "react";
import { Check, Link2Off, Loader2 } from "lucide-react";
import type { InventoryRow } from "./AdminBody";

export interface SquareCandidate {
  variationId: string;
  name: string;
  priceCents: number | null;
  trackInventory: boolean;
}

/**
 * Link website products to Square items by hand.
 *
 * The auto-matcher proposes; a person decides. It already mismatched the New
 * York Steak to a variable-price duplicate, which is exactly the class of error
 * a name-similarity score cannot catch and a person spots instantly.
 */
export function MatchPicker({
  rows,
  candidates,
  token,
  onLinked,
}: {
  rows: InventoryRow[];
  candidates: SquareCandidate[];
  token: string;
  onLinked: (variantId: string, c: SquareCandidate | null) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const taken = new Set(
    rows.map((r) => r.squareVariationId).filter((v): v is string => Boolean(v)),
  );

  async function link(row: InventoryRow, variationId: string) {
    setBusyId(row.variantId);
    setError(null);
    try {
      const candidate = candidates.find((c) => c.variationId === variationId) ?? null;
      const res = await fetch("/api/shop/admin/match", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          variantId: row.variantId,
          squareVariationId: variationId || null,
          squareItemName: candidate?.name ?? null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not save the link.");
        return;
      }
      onLinked(row.variantId, candidate);
    } finally {
      setBusyId(null);
    }
  }

  const money = (c: number | null) => (c == null ? "no set price" : `$${(c / 100).toFixed(2)}`);

  return (
    <div className="rounded-2xl bg-white shadow-sm">
      <div className="border-b border-cream-dark p-4">
        <p className="text-sm text-charcoal font-sans">
          Linking a product means a sale on the register lowers the website&apos;s
          count, and a website sale lowers Square&apos;s.
        </p>
        <p className="mt-1.5 text-xs text-muted font-sans">
          One Square item can only back one product. Anything with no set price in
          Square is usually a duplicate or a custom-price line, so check before
          picking it.
        </p>
      </div>

      {error && (
        <p role="alert" className="border-b border-cream-dark px-4 py-2.5 text-sm text-charcoal font-sans">
          {error}
        </p>
      )}

      <table className="w-full text-sm font-sans">
        <thead>
          <tr className="border-b border-cream-dark text-left text-xs uppercase tracking-[0.1em] text-muted">
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Square item</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.variantId} className="border-b border-cream-dark/50 last:border-0">
              <td className="px-4 py-2">
                <span className="text-charcoal">{r.name}</span>
                {r.label && <span className="text-muted"> · {r.label}</span>}
              </td>
              <td className="px-4 py-2">
                <span className="flex items-center gap-2">
                  <select
                    value={r.squareVariationId ?? ""}
                    onChange={(e) => link(r, e.target.value)}
                    className="max-w-[22rem] flex-1 rounded-lg border border-cream-dark bg-white px-2 py-1.5 text-sm outline-none focus:border-forest"
                  >
                    <option value="">Not linked</option>
                    {candidates.map((c) => {
                      const usedElsewhere =
                        taken.has(c.variationId) && c.variationId !== r.squareVariationId;
                      return (
                        <option
                          key={c.variationId}
                          value={c.variationId}
                          disabled={usedElsewhere}
                        >
                          {c.name} · {money(c.priceCents)}
                          {c.trackInventory ? " · tracked" : ""}
                          {usedElsewhere ? " (already linked)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  {busyId === r.variantId && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
                  )}
                  {r.squareVariationId ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-forest" />
                  ) : (
                    <Link2Off className="h-3.5 w-3.5 shrink-0 text-muted" />
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
