"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { getVariant } from "@/app/shop/data";
import { toCents } from "./money";

/**
 * The cart.
 *
 * Stores variant ids and quantities and NOTHING about price. Everything the
 * customer sees is re-derived from the catalog on render, and the server
 * re-derives it again at checkout. A cart that remembered prices would let a
 * stale tab (or a curious shopper editing localStorage) check out at last
 * month's number.
 *
 * Backed by a module-level store read through useSyncExternalStore rather than
 * state-in-an-effect: the server snapshot is always empty, so SSR and the first
 * client paint agree, and every mounted component (cart page, floating button)
 * sees one shared value.
 */

const STORAGE_KEY = "hf-cart-v1";

export interface CartLine {
  variantId: string;
  quantity: number;
}

export interface DetailedLine {
  variantId: string;
  quantity: number;
  name: string;
  slug: string;
  image: string;
  label?: string;
  unitPriceCents: number;
  lineTotalCents: number;
}

function clampQty(n: number): number {
  return Math.max(1, Math.min(99, Math.floor(n)));
}

function readStored(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (l): l is CartLine =>
          typeof l === "object" &&
          l !== null &&
          typeof (l as CartLine).variantId === "string" &&
          Number.isFinite((l as CartLine).quantity),
      )
      .map((l) => ({ variantId: l.variantId, quantity: clampQty(l.quantity) }))
      // A product retired from the catalog must not linger in someone's cart.
      .filter((l) => getVariant(l.variantId));
  } catch {
    return [];
  }
}

// ---- store ----

interface Snapshot {
  lines: CartLine[];
  ready: boolean;
}

const EMPTY: Snapshot = { lines: [], ready: false };

let snapshot: Snapshot = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setLines(next: CartLine[]) {
  snapshot = { lines: next, ready: true };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode / quota. The cart still works for this page view.
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!hydrated) {
    hydrated = true;
    snapshot = { lines: readStored(), ready: true };
    // Let the current render finish before telling React the store moved.
    queueMicrotask(emit);
  }
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => EMPTY;

// ---- context ----

interface CartContextValue {
  lines: CartLine[];
  /** Lines joined to the catalog, with anything unrecognised dropped. */
  detailed: DetailedLine[];
  count: number;
  subtotalCents: number;
  add: (variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  /** False until localStorage has been read, so SSR and first paint agree. */
  ready: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { lines, ready } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const add = useCallback((variantId: string, quantity = 1) => {
    if (!getVariant(variantId)) return;
    const current = snapshot.lines;
    const existing = current.find((l) => l.variantId === variantId);
    setLines(
      existing
        ? current.map((l) =>
            l.variantId === variantId
              ? { ...l, quantity: clampQty(l.quantity + quantity) }
              : l,
          )
        : [...current, { variantId, quantity: clampQty(quantity) }],
    );
  }, []);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    const current = snapshot.lines;
    setLines(
      quantity <= 0
        ? current.filter((l) => l.variantId !== variantId)
        : current.map((l) =>
            l.variantId === variantId ? { ...l, quantity: clampQty(quantity) } : l,
          ),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    setLines(snapshot.lines.filter((l) => l.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const detailed = useMemo<DetailedLine[]>(
    () =>
      lines.flatMap((line) => {
        const found = getVariant(line.variantId);
        if (!found) return [];
        const unit = toCents(found.variant.price);
        return [
          {
            variantId: line.variantId,
            quantity: line.quantity,
            name: found.product.name,
            slug: found.product.slug,
            image: found.product.image,
            label: found.variant.label,
            unitPriceCents: unit,
            lineTotalCents: unit * line.quantity,
          },
        ];
      }),
    [lines],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      detailed,
      ready,
      count: detailed.reduce((n, l) => n + l.quantity, 0),
      subtotalCents: detailed.reduce((n, l) => n + l.lineTotalCents, 0),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [lines, detailed, ready, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
