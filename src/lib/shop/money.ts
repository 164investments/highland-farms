/**
 * Money in this store is integer cents everywhere except the display edge.
 * The catalog carries dollars (65, 32.5) because that's how the farm thinks
 * about prices; convert once at the boundary and never do float arithmetic on
 * a total.
 */

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Drops the ".00" on whole dollars — for cards and pills, not for totals. */
export function formatCentsShort(cents: number): string {
  return cents % 100 === 0
    ? `$${cents / 100}`
    : `$${(cents / 100).toFixed(2)}`;
}
