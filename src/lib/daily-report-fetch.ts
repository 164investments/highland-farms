/**
 * Small, dependency-injected fetching-layer helpers used by
 * `src/app/api/cron/daily-report/route.ts`. Kept out of `daily-report.ts`
 * (pure calc only) and out of the route itself (which can't be imported
 * directly by the plain-node test runner this repo uses — it resolves
 * `@/...` aliases, which only Next's build does) so this resilience logic
 * is unit-testable in isolation via a relative import.
 */

/**
 * Native additions — Mode A's `bookings source='native'` read, and the
 * `gift_certificates` read shared by both modes — are always ADDITIVE,
 * never the report's core numbers (see "Booked on the site (native)" in
 * `daily-report.ts`). A Supabase hiccup fetching them must never take down
 * the rest of a report that fetched its core data (Acuity live, or Mode B's
 * archive/bookings) just fine. Runs `fetcher`; on any rejection, logs and
 * degrades to `[]` so the report always sends with whatever it has.
 *
 * Deliberately NOT used for Mode B's own archive/bookings reads — those ARE
 * that mode's core/load-bearing data, not an addition. Silently degrading
 * them to empty would produce a report that LOOKS complete but is quietly
 * wrong (fabricated zeros), which is worse than failing loudly. See the
 * comment at that call site in route.ts.
 */
export async function fetchNativeAdditionsSafely<T>(
  label: string,
  fetcher: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await fetcher();
  } catch (err) {
    console.error(`[daily-report] native additions unavailable (${label}):`, err);
    return [];
  }
}

/**
 * Pages through `fetchPage(from, to)` — a `[from, to]` inclusive PostgREST
 * `.range()` call — accumulating every row until a page shorter than
 * `pageSize` proves the end of the table. PostgREST silently caps an
 * unbounded `select()` at its configured default (commonly 1000 rows); a
 * growing archive table would otherwise get silently truncated with no
 * error. Same "never silently truncate" convention as
 * `src/lib/acuity.ts`'s `fetchAppointmentRange` and
 * `daily-report.ts`'s `assertCompleteOrders`.
 */
export async function fetchAllPages<T>(
  pageSize: number,
  fetchPage: (from: number, to: number) => Promise<T[]>,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const page = await fetchPage(from, from + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}
