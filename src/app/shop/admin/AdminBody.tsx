"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Link2, Link2Off, Loader2 } from "lucide-react";
import { formatCents } from "@/lib/shop/money";
import { ADMIN_COOKIE } from "@/lib/shop/admin-cookie";

export interface InventoryRow {
  variantId: string;
  name: string;
  label?: string;
  slug: string;
  stock: number | null;
  lowStockThreshold: number;
  squareVariationId: string | null;
  squareItemName: string | null;
  syncedAt: string | null;
}

export interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  fulfillment: string;
  channel: string;
  customerName: string;
  customerPhone: string;
  totalCents: number;
  refundedCents: number;
  createdAt: string;
}

type Tab = "stock" | "orders" | "square";

export function AdminBody({
  inventory,
  orders,
  token,
  setCookie,
}: {
  inventory: InventoryRow[];
  orders: OrderRow[];
  token: string;
  setCookie: boolean;
}) {
  const [tab, setTab] = useState<Tab>("stock");
  const [rows, setRows] = useState(inventory);

  // Move the token out of the address bar and into a cookie, so a shared or
  // bookmarked URL doesn't carry the key around.
  useEffect(() => {
    if (!setCookie || !token) return;
    document.cookie = `${ADMIN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=2592000; samesite=lax`;
    window.history.replaceState({}, "", "/shop/admin");
  }, [setCookie, token]);

  const lowStock = useMemo(
    () =>
      rows.filter(
        (r) => r.stock !== null && r.stock <= r.lowStockThreshold,
      ),
    [rows],
  );
  const unlinked = useMemo(
    () => rows.filter((r) => !r.squareVariationId),
    [rows],
  );

  return (
    <div className="mt-8">
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Products tracked" value={String(rows.length)} />
        <Stat
          label="Low or out of stock"
          value={String(lowStock.length)}
          tone={lowStock.length > 0 ? "warn" : "ok"}
        />
        <Stat
          label="Not linked to Square"
          value={String(unlinked.length)}
          tone={unlinked.length > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="mb-4 flex gap-2">
        {(
          [
            ["stock", "Stock"],
            ["orders", `Orders (${orders.length})`],
            ["square", "Square link"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.1em] transition-colors font-sans ${
              tab === key
                ? "border-forest bg-forest text-white"
                : "border-cream-dark bg-white text-charcoal hover:border-forest/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "stock" && <StockTable rows={rows} setRows={setRows} token={token} />}
      {tab === "orders" && <OrdersTable orders={orders} />}
      {tab === "square" && <SquareTable rows={rows} />}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "ok",
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.1em] text-muted font-sans">{label}</p>
      <p
        className={`mt-1 text-2xl font-light font-sans ${
          tone === "warn" ? "text-forest" : "text-charcoal"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StockTable({
  rows,
  setRows,
  token,
}: {
  rows: InventoryRow[];
  setRows: (r: InventoryRow[]) => void;
  token: string;
}) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(row: InventoryRow, stock: number | null) {
    setSavingId(row.variantId);
    setError(null);
    try {
      const res = await fetch("/api/shop/admin/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ variantId: row.variantId, stock }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not save.");
        return;
      }
      setRows(rows.map((r) => (r.variantId === row.variantId ? { ...r, stock } : r)));
      setSavedId(row.variantId);
      window.setTimeout(() => setSavedId(null), 1800);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      {error && (
        <p role="alert" className="border-b border-cream-dark px-4 py-2.5 text-sm text-charcoal font-sans">
          {error}
        </p>
      )}
      <table className="w-full text-sm font-sans">
        <thead>
          <tr className="border-b border-cream-dark text-left text-xs uppercase tracking-[0.1em] text-muted">
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3 w-32">In stock</th>
            <th className="px-4 py-3 w-40">Square</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const low = r.stock !== null && r.stock <= r.lowStockThreshold;
            return (
              <tr key={r.variantId} className="border-b border-cream-dark/50 last:border-0">
                <td className="px-4 py-2.5">
                  <span className="text-charcoal">{r.name}</span>
                  {r.label && <span className="text-muted"> · {r.label}</span>}
                  {low && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-forest">
                      <AlertTriangle className="h-3 w-3" />
                      {r.stock === 0 ? "out" : "low"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {r.stock === null ? (
                    <span className="text-muted">unlimited</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        defaultValue={r.stock}
                        onBlur={(e) => {
                          const next = Number(e.target.value);
                          if (Number.isFinite(next) && next !== r.stock) save(r, next);
                        }}
                        className="w-20 rounded-lg border border-cream-dark px-2 py-1 text-sm outline-none focus:border-forest"
                      />
                      {savingId === r.variantId && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
                      )}
                      {savedId === r.variantId && (
                        <Check className="h-3.5 w-3.5 text-forest" />
                      )}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {r.squareVariationId ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-forest">
                      <Link2 className="h-3.5 w-3.5" />
                      {r.squareItemName}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                      <Link2Off className="h-3.5 w-3.5" />
                      not linked
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-cream-dark px-4 py-3 text-xs text-muted font-sans">
        Editing a linked product changes the website only. Square stays the source
        of truth for anything linked, and the next sync will overwrite it — fix
        those in Square.
      </p>
    </div>
  );
}

function OrdersTable({ orders }: { orders: OrderRow[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-sm text-muted shadow-sm font-sans">
        No orders yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      <table className="w-full text-sm font-sans">
        <thead>
          <tr className="border-b border-cream-dark text-left text-xs uppercase tracking-[0.1em] text-muted">
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">How</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-cream-dark/50 last:border-0">
              <td className="px-4 py-2.5">
                <span className="text-charcoal">{o.orderNumber}</span>
                <span className="block text-xs text-muted">
                  {new Date(o.createdAt).toLocaleString("en-US", {
                    timeZone: "America/Los_Angeles",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <span className="text-charcoal">{o.customerName}</span>
                <span className="block text-xs text-muted">{o.customerPhone}</span>
              </td>
              <td className="px-4 py-2.5 capitalize text-charcoal">{o.fulfillment}</td>
              <td className="px-4 py-2.5 text-charcoal">
                {formatCents(o.totalCents)}
                {o.refundedCents > 0 && (
                  <span className="block text-xs text-muted">
                    −{formatCents(o.refundedCents)} refunded
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 capitalize text-charcoal">
                {o.status.replace(/_/g, " ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SquareTable({ rows }: { rows: InventoryRow[] }) {
  const linked = rows.filter((r) => r.squareVariationId);
  const unlinked = rows.filter((r) => !r.squareVariationId);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-sm uppercase tracking-[0.1em] text-muted font-sans">
          Linked to Square ({linked.length})
        </h2>
        <p className="mt-1.5 text-xs text-muted font-sans">
          A sale rung up on the register updates these on the website, and a
          website sale reduces them in Square. Both directions only work once
          the item has inventory tracking switched on in Square.
        </p>
        <ul className="mt-3 space-y-1 text-sm font-sans">
          {linked.map((r) => (
            <li key={r.variantId} className="flex justify-between gap-4">
              <span className="text-charcoal">
                {r.name}
                {r.label && <span className="text-muted"> · {r.label}</span>}
              </span>
              <span className="shrink-0 text-muted">{r.squareItemName}</span>
            </li>
          ))}
          {linked.length === 0 && <li className="text-muted">Nothing linked yet.</li>}
        </ul>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-sm uppercase tracking-[0.1em] text-muted font-sans">
          Not linked ({unlinked.length})
        </h2>
        <p className="mt-1.5 text-xs text-muted font-sans">
          These sell online only. If one is also sold at the farm, it can be
          oversold — the register and the website are counting separately.
        </p>
        <ul className="mt-3 grid gap-1 text-sm text-charcoal font-sans sm:grid-cols-2">
          {unlinked.map((r) => (
            <li key={r.variantId}>
              {r.name}
              {r.label && <span className="text-muted"> · {r.label}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
