/**
 * Pacific wall-clock ↔ UTC without a date library.
 *
 * Two-pass conversion: guess the instant assuming a fixed offset, read back
 * what Pacific wall time that instant actually is, correct by the difference.
 * Correct across both DST transitions for any real schedule time (the farm
 * doesn't book at 2am on transition night).
 */

const TZ = "America/Los_Angeles";

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function pacificParts(utc: Date): { y: number; mo: number; d: number; h: number; mi: number } {
  const map: Record<string, string> = {};
  for (const p of partsFmt.formatToParts(utc)) map[p.type] = p.value;
  return {
    y: Number(map.year),
    mo: Number(map.month),
    d: Number(map.day),
    h: Number(map.hour === "24" ? "0" : map.hour),
    mi: Number(map.minute),
  };
}

export function pacificDateStr(utc: Date): string {
  const p = pacificParts(utc);
  return `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

export function pacificTimeStr(utc: Date): string {
  const p = pacificParts(utc);
  return `${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;
}

/** '2026-09-05' + '11:00' (Pacific) → the UTC instant. */
export function slotToUtc(dateStr: string, time: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  // First guess: pretend Pacific == UTC.
  let guess = new Date(Date.UTC(y, mo - 1, d, h, mi));
  // Correct twice — the second pass fixes a guess that crossed a DST boundary.
  for (let i = 0; i < 2; i++) {
    const got = pacificParts(guess);
    const wantMinutes = Date.UTC(y, mo - 1, d, h, mi) / 60000;
    const gotMinutes = Date.UTC(got.y, got.mo - 1, got.d, got.h, got.mi) / 60000;
    guess = new Date(guess.getTime() + (wantMinutes - gotMinutes) * 60000);
  }
  return guess;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function pacificWeekday(dateStr: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" })
    .format(slotToUtc(dateStr, "12:00"));
  return WEEKDAYS.indexOf(name);
}

export function addDays(dateStr: string, n: number): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, mo - 1, d + n));
  return next.toISOString().slice(0, 10);
}

export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
