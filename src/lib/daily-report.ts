import type { AcuityAppointment, AcuityOrder } from "./acuity";
import { escapeHtml } from "./html.ts";

const TIME_ZONE = "America/Los_Angeles";
const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PACIFIC_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export interface DailyReportData {
  now: Date;
  active: AcuityAppointment[];
  canceled: AcuityAppointment[];
  yesterdayCandidates: AcuityAppointment[];
  pacingCandidates: AcuityAppointment[];
  scheduleCandidates: AcuityAppointment[];
  bookingCandidates: AcuityAppointment[];
  orders: AcuityOrder[];
  /** Mode A / Mode B: native bookings and native gift-cert sales, already
   *  filtered/mapped by the caller. Both default to empty, which keeps the
   *  report byte-identical to the single-source report (see
   *  `calculateNativeAdditions` and the "Booked on the site (native)"
   *  section in `buildDailyReport`). */
  nativeBookings?: AcuityAppointment[];
  nativeGiftCertValueCents?: number[];
}

interface MonthValue {
  count: number;
  value: number;
}

interface DayValue {
  label: string;
  count: number;
  value: number;
}

export interface PacingComparison {
  currentValue: number;
  previousValue: number;
  percentage: number;
  currentLabel: string;
  previousLabel: string;
}

export interface DailyReportMetrics {
  todayKey: string;
  yesterdayKey: string;
  year: number;
  yesterdayAppointments: AcuityAppointment[];
  yesterdayScheduledValue: number;
  newBookings: AcuityAppointment[];
  newActiveBookingValue: number;
  monthlyAppointments: Record<string, MonthValue>;
  ordersByMonth: Record<string, number>;
  yearOrders: AcuityOrder[];
  activeCount: number;
  totalActiveValue: number;
  pastActiveCount: number;
  pastActiveValue: number;
  futureActiveCount: number;
  futureActiveValue: number;
  canceledCount: number;
  canceledValue: number;
  byType: Array<[string, MonthValue]>;
  dowValue: number[];
  referralSources: Array<[string, number]>;
  referralAnswerCount: number;
  averagePaidAppointment: number;
  averageLeadDays: number;
  cancelRate: number;
  next7: DayValue[];
  pacing: PacingComparison | null;
  nativeAdditions: NativeAdditions;
}

export function toPacificDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }

  const parts = PACIFIC_DATE_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) throw new Error(`Unable to format date: ${String(value)}`);
  return `${year}-${month}-${day}`;
}

function dateFromKey(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

function dateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(key: string, days: number): string {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function monthKey(key: string): string {
  return key.slice(0, 7);
}

function monthName(key: string, short = false): string {
  const name = MONTH_NAMES[Number(key.slice(5, 7)) - 1];
  return short ? name.slice(0, 3) : name;
}

function dayOfMonth(key: string): number {
  return Number(key.slice(8, 10));
}

function formatShortDate(key: string, includeYear = false): string {
  return `${monthName(key, true)} ${dayOfMonth(key)}${includeYear ? `, ${key.slice(0, 4)}` : ""}`;
}

function formatDayLabel(key: string): string {
  return `${DOW_NAMES[dateFromKey(key).getUTCDay()]}, ${formatShortDate(key)}`;
}

function paid(appointment: AcuityAppointment): number {
  return Number.parseFloat(
    appointment.amountPaid || appointment.priceSold || appointment.price || "0",
  );
}

function fmtMoney(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function uniqueAppointments(appointments: AcuityAppointment[]): AcuityAppointment[] {
  const byId = new Map<number, AcuityAppointment>();
  for (const appointment of appointments) byId.set(appointment.id, appointment);
  return [...byId.values()];
}

function sumAppointmentValue(appointments: AcuityAppointment[]): number {
  return appointments.reduce((sum, appointment) => sum + paid(appointment), 0);
}

// ---- Dual-source additions (Phase 3a Task 5) ----
//
// MODE A (Acuity still live — today, and post-flip while ACUITY_ACTIVE is
// "true"): the existing Acuity-derived active/canceled/etc. arrays above are
// untouched. Native activity (bookings with source='native', and native gift
// certificate sales) is summed SEPARATELY via `calculateNativeAdditions` and
// rendered as its own labeled line — never merged into the Acuity numbers.
//
// MODE B (post-Acuity-cancellation — flag on, ACUITY_ACTIVE not "true"): the
// live Acuity API is dead. `acuity_archive_appointments` is a frozen,
// one-time snapshot; `bookings` (both 'native' and 'acuity_import' rows) is
// the live source of truth going forward. `mapArchiveToAppointment` and
// `mapBookingToAppointment` normalize each source into the same
// `AcuityAppointment` shape the rest of this file already knows how to
// calculate on, and `mergeArchiveWithCurrent` lets a current `bookings` row
// supersede its frozen archive counterpart (matched by the original Acuity
// id) so the same underlying appointment is never double-counted.

/** An imported booking (`bookings.source = 'acuity_import'`) carries the
 *  original Acuity id and can collide with a real one — so its synthetic id
 *  must be impossible to confuse with a real (always-positive) Acuity id. */
function syntheticAppointmentId(bookingId: string): number {
  let hash = 0;
  for (let index = 0; index < bookingId.length; index += 1) {
    hash = (hash * 31 + bookingId.charCodeAt(index)) | 0;
  }
  return -Math.abs(hash) - 1;
}

export interface ArchiveAppointmentRow {
  id: number;
  datetime: string;
  datetimeCreated: string;
  firstName: string;
  lastName: string;
  amountPaidCents: number;
  priceCents: number;
  canceled: boolean;
  type: string;
}

/** Converts a frozen `acuity_archive_appointments` row into the same shape
 *  the rest of this file's pure calculations already operate on. */
export function mapArchiveToAppointment(row: ArchiveAppointmentRow): AcuityAppointment {
  const amountPaid = (row.amountPaidCents / 100).toFixed(2);
  const price = (row.priceCents / 100).toFixed(2);
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: "",
    phone: "",
    date: "",
    time: "",
    datetime: row.datetime,
    datetimeCreated: row.datetimeCreated,
    price,
    priceSold: price,
    amountPaid,
    paid: row.amountPaidCents > 0 ? "yes" : "no",
    type: row.type,
    appointmentTypeID: 0,
    category: "",
    duration: "",
    calendar: "",
    calendarID: 0,
    canceled: row.canceled,
    forms: [],
  };
}

export interface BookingReportRow {
  /** The booking's own uuid — only used to derive a synthetic id when
   *  `acuityId` is null (a native booking has no Acuity mirror). */
  id: string;
  /** Set on rows imported from Acuity (`bookings.acuity_id`); null for
   *  native-only bookings. */
  acuityId: number | null;
  startsAt: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  amountCents: number;
  /** Pre-resolved by the caller from `bookings.status` (cancelled/no_show). */
  canceled: boolean;
  /** Pre-resolved friendly product name (e.g. via `getBookingProduct`). */
  type: string;
}

/** Converts a `bookings` row (either source) into the same
 *  `AcuityAppointment` shape. An imported row's id is the original Acuity
 *  id (so it lines up with `mapArchiveToAppointment` for dedupe); a native
 *  row gets a deterministic synthetic id that can never look like a real
 *  (positive) Acuity id. */
export function mapBookingToAppointment(row: BookingReportRow): AcuityAppointment {
  const amount = (row.amountCents / 100).toFixed(2);
  return {
    id: row.acuityId ?? syntheticAppointmentId(row.id),
    firstName: row.firstName,
    lastName: row.lastName,
    email: "",
    phone: "",
    date: "",
    time: "",
    datetime: row.startsAt,
    datetimeCreated: row.createdAt,
    price: amount,
    priceSold: amount,
    amountPaid: amount,
    paid: row.amountCents > 0 ? "yes" : "no",
    type: row.type,
    appointmentTypeID: 0,
    category: "",
    duration: "",
    calendar: "",
    calendarID: 0,
    canceled: row.canceled,
    forms: [],
  };
}

/** Mode B: a current `bookings` row (native or imported) supersedes its
 *  frozen archive counterpart when the two share an id (the original Acuity
 *  id for imports) — the bookings-sourced entry reflects any status change
 *  (e.g. a post-cutover cancellation) the frozen archive can't know about.
 *  Reuses the same last-write-wins de-dupe `calculateDailyReport` already
 *  applies to every candidate array, so no appointment is ever double
 *  counted between the two sources. */
export function mergeArchiveWithCurrent(
  archived: AcuityAppointment[],
  current: AcuityAppointment[],
): AcuityAppointment[] {
  return uniqueAppointments([...archived, ...current]);
}

export interface GiftCertReportRow {
  kind: "value" | "visits";
  productScope: string;
  units: number;
}

export interface GiftCatalogEntry {
  kind: "value" | "visits";
  productScope: string;
  units: number;
  amountCents: number;
}

/** A 'value' certificate's `initial_units` IS its cents by construction
 *  (see `src/lib/booking/gift.ts`). A 'visits' certificate's units are a
 *  visit count, not money — its price has to come from the static product
 *  catalog, passed in by the caller (never imported here, to keep this file
 *  free of a dependency on the booking product catalog). */
export function resolveGiftCertValueCents(
  row: GiftCertReportRow,
  catalog: GiftCatalogEntry[],
): number {
  if (row.kind === "value") return row.units;
  const match = catalog.find(
    (entry) => entry.kind === row.kind
      && entry.productScope === row.productScope
      && entry.units === row.units,
  );
  return match?.amountCents ?? 0;
}

export interface NativeAdditions {
  bookingCount: number;
  bookingValue: number;
  giftCount: number;
  giftValue: number;
}

/** Mode A: sums native bookings + native gift certificate sales completely
 *  separately from the Acuity-derived numbers above, so they can be shown
 *  as their own labeled, auditable line. */
export function calculateNativeAdditions(
  nativeBookings: AcuityAppointment[],
  nativeGiftCertValueCents: number[],
): NativeAdditions {
  return {
    bookingCount: nativeBookings.length,
    bookingValue: sumAppointmentValue(nativeBookings),
    giftCount: nativeGiftCertValueCents.length,
    giftValue: nativeGiftCertValueCents.reduce((sum, cents) => sum + cents, 0) / 100,
  };
}

function previousMonth(key: string): string {
  const date = dateFromKey(`${monthKey(key)}-01`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return dateKey(date.getUTCFullYear(), date.getUTCMonth(), 1).slice(0, 7);
}

function daysInMonth(key: string): number {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function calculatePacing(
  active: AcuityAppointment[],
  todayKey: string,
): PacingComparison | null {
  const elapsedDays = dayOfMonth(todayKey) - 1;
  if (elapsedDays <= 0) return null;

  const currentMonth = monthKey(todayKey);
  const priorMonth = previousMonth(todayKey);
  const comparisonDays = Math.min(elapsedDays, daysInMonth(priorMonth));
  const currentEnd = `${currentMonth}-${String(elapsedDays).padStart(2, "0")}`;
  const priorEnd = `${priorMonth}-${String(comparisonDays).padStart(2, "0")}`;

  const currentValue = sumAppointmentValue(active.filter((appointment) => {
    const key = toPacificDateKey(appointment.datetime);
    return key >= `${currentMonth}-01` && key <= currentEnd;
  }));
  const previousValue = sumAppointmentValue(active.filter((appointment) => {
    const key = toPacificDateKey(appointment.datetime);
    return key >= `${priorMonth}-01` && key <= priorEnd;
  }));

  if (previousValue <= 0) return null;
  return {
    currentValue,
    previousValue,
    percentage: Math.round(((currentValue - previousValue) / previousValue) * 100),
    currentLabel: `${monthName(currentMonth, true)} 1–${elapsedDays}`,
    previousLabel: `${monthName(priorMonth, true)} 1–${comparisonDays}`,
  };
}

export function getDailyReportDateRanges(now: Date) {
  const todayKey = toPacificDateKey(now);
  const year = Number(todayKey.slice(0, 4));
  const reportYear = { start: `${year}-01-01`, end: `${year}-12-31` };
  const priorMonthKey = previousMonth(todayKey);
  const priorMonth = {
    start: `${priorMonthKey}-01`,
    end: `${priorMonthKey}-${String(daysInMonth(priorMonthKey)).padStart(2, "0")}`,
  };
  return {
    reportYear,
    nextYear: { start: `${year + 1}-01-01`, end: `${year + 1}-12-31` },
    priorMonth,
    fetchPriorMonthSeparately: priorMonth.start < reportYear.start,
  };
}

export function getDailyReportDateLabel(now: Date): string {
  const key = toPacificDateKey(now);
  return formatShortDate(key, true);
}

export function calculateDailyReport(data: DailyReportData): DailyReportMetrics {
  const todayKey = toPacificDateKey(data.now);
  const yesterdayKey = addDays(todayKey, -1);
  const year = Number(todayKey.slice(0, 4));

  const active = uniqueAppointments(data.active);
  const canceled = uniqueAppointments(data.canceled);
  const yesterdayCandidates = uniqueAppointments(data.yesterdayCandidates);
  const pacingCandidates = uniqueAppointments(data.pacingCandidates);
  const scheduleCandidates = uniqueAppointments(data.scheduleCandidates);
  const bookingCandidates = uniqueAppointments(data.bookingCandidates);

  const yesterdayAppointments = yesterdayCandidates
    .filter((appointment) => toPacificDateKey(appointment.datetime) === yesterdayKey)
    .toSorted((a, b) => a.datetime.localeCompare(b.datetime));
  const newBookings = bookingCandidates
    .filter((appointment) => toPacificDateKey(appointment.datetimeCreated) === yesterdayKey)
    .toSorted((a, b) => a.datetimeCreated.localeCompare(b.datetimeCreated));

  const monthlyAppointments: Record<string, MonthValue> = {};
  for (const appointment of active) {
    const key = monthKey(toPacificDateKey(appointment.datetime));
    monthlyAppointments[key] ??= { count: 0, value: 0 };
    monthlyAppointments[key].count += 1;
    monthlyAppointments[key].value += paid(appointment);
  }

  const yearOrders = data.orders.filter(
    (order) => order.time.startsWith(String(year)) && order.status === "paid",
  );
  const ordersByMonth: Record<string, number> = {};
  for (const order of yearOrders) {
    const key = order.time.slice(0, 7);
    ordersByMonth[key] = (ordersByMonth[key] || 0) + order.total;
  }

  const pastActive = active.filter(
    (appointment) => toPacificDateKey(appointment.datetime) <= yesterdayKey,
  );
  const futureActive = active.filter(
    (appointment) => toPacificDateKey(appointment.datetime) > yesterdayKey,
  );

  const byTypeMap: Record<string, MonthValue> = {};
  const dowValue = [0, 0, 0, 0, 0, 0, 0];
  for (const appointment of active) {
    byTypeMap[appointment.type] ??= { count: 0, value: 0 };
    byTypeMap[appointment.type].count += 1;
    byTypeMap[appointment.type].value += paid(appointment);
    dowValue[dateFromKey(toPacificDateKey(appointment.datetime)).getUTCDay()] += paid(appointment);
  }

  const referralMap: Record<string, number> = {};
  for (const appointment of [...active, ...canceled]) {
    for (const form of appointment.forms || []) {
      for (const value of form.values || []) {
        if (!value.name.toLowerCase().includes("hear")) continue;
        const source = value.value.trim();
        if (source) referralMap[source] = (referralMap[source] || 0) + 1;
      }
    }
  }

  let totalLeadDays = 0;
  let leadCount = 0;
  for (const appointment of active) {
    const created = dateFromKey(toPacificDateKey(appointment.datetimeCreated));
    const service = dateFromKey(toPacificDateKey(appointment.datetime));
    const days = (service.getTime() - created.getTime()) / 86_400_000;
    if (days >= 0) {
      totalLeadDays += days;
      leadCount += 1;
    }
  }

  const next7: DayValue[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const key = addDays(todayKey, offset);
    const appointments = scheduleCandidates.filter(
      (appointment) => toPacificDateKey(appointment.datetime) === key,
    );
    next7.push({
      label: formatDayLabel(key),
      count: appointments.length,
      value: sumAppointmentValue(appointments),
    });
  }

  const paidAppointments = active.filter((appointment) => paid(appointment) > 0);
  const totalActiveValue = sumAppointmentValue(active);

  return {
    todayKey,
    yesterdayKey,
    year,
    yesterdayAppointments,
    yesterdayScheduledValue: sumAppointmentValue(yesterdayAppointments),
    newBookings,
    newActiveBookingValue: sumAppointmentValue(
      newBookings.filter((appointment) => !appointment.canceled),
    ),
    monthlyAppointments,
    ordersByMonth,
    yearOrders,
    activeCount: active.length,
    totalActiveValue,
    pastActiveCount: pastActive.length,
    pastActiveValue: sumAppointmentValue(pastActive),
    futureActiveCount: futureActive.length,
    futureActiveValue: sumAppointmentValue(futureActive),
    canceledCount: canceled.length,
    canceledValue: sumAppointmentValue(canceled),
    byType: Object.entries(byTypeMap).sort((a, b) => b[1].value - a[1].value),
    dowValue,
    referralSources: Object.entries(referralMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6),
    referralAnswerCount: Object.values(referralMap).reduce((sum, count) => sum + count, 0),
    averagePaidAppointment: paidAppointments.length
      ? totalActiveValue / paidAppointments.length
      : 0,
    averageLeadDays: leadCount ? Math.round(totalLeadDays / leadCount) : 0,
    cancelRate: active.length + canceled.length
      ? (canceled.length / (active.length + canceled.length)) * 100
      : 0,
    next7,
    pacing: calculatePacing(pacingCandidates, todayKey),
    nativeAdditions: calculateNativeAdditions(
      data.nativeBookings ?? [],
      data.nativeGiftCertValueCents ?? [],
    ),
  };
}

function safeAppointmentName(appointment: AcuityAppointment): string {
  const firstName = escapeHtml(appointment.firstName.trim() || "Guest");
  const lastInitial = escapeHtml(appointment.lastName.trim().charAt(0) || "?");
  return `${firstName} ${lastInitial}.`;
}

export function buildDailyReport(data: DailyReportData): string {
  const metrics = calculateDailyReport(data);
  const {
    todayKey, yesterdayKey, year, yesterdayAppointments, newBookings,
    monthlyAppointments, ordersByMonth, yearOrders, byType, dowValue,
    referralSources, referralAnswerCount, next7, pacing, nativeAdditions,
  } = metrics;

  const appointmentRows = yesterdayAppointments.map((appointment) => {
    const time = escapeHtml(appointment.time.replace(/:00/g, "").toLowerCase());
    const type = escapeHtml(appointment.type);
    return `<tr><td height='4'></td></tr><tr><td style='padding:10px 14px;background:#f8f7f4;border-radius:6px;'><table width='100%'><tr><td width='60px' style='font-size:13px;color:#888;font-weight:600;'>${time}</td><td style='font-size:14px;color:#1c1d1d;'>${type} — ${safeAppointmentName(appointment)}</td><td align='right' style='font-size:14px;font-weight:600;color:#1c1d1d;'>${fmtMoney(paid(appointment))}</td></tr></table></td></tr>`;
  }).join("");

  const bookingRows = newBookings.map((appointment) => {
    const appointmentKey = toPacificDateKey(appointment.datetime);
    const includeYear = appointmentKey.slice(0, 4) !== String(year);
    const status = appointment.canceled
      ? " <span style='font-size:11px;color:#c41e1e;font-weight:700;'>(CANCELED)</span>"
      : "";
    return `<tr><td height='4'></td></tr><tr><td style='padding:10px 14px;background:#eaf7ec;border-radius:6px;'><table width='100%'><tr><td style='font-size:14px;color:#1c1d1d;'>${safeAppointmentName(appointment)} — ${escapeHtml(appointment.type)}${status}</td><td align='right' style='font-size:13px;color:#888;'>${formatShortDate(appointmentKey, includeYear)}</td><td align='right' width='78' style='font-size:14px;font-weight:600;color:#3B8344;'>${fmtMoney(paid(appointment))}</td></tr></table></td></tr>`;
  }).join("");

  const reportMonth = monthKey(todayKey);
  const monthKeys = [...new Set([
    ...Object.keys(monthlyAppointments),
    ...Object.keys(ordersByMonth),
  ])].sort();
  const monthRows = monthKeys.map((key) => {
    const appointments = monthlyAppointments[key] || { count: 0, value: 0 };
    const orderValue = ordersByMonth[key] || 0;
    const isCurrent = key === reportMonth;
    const isFuture = key > reportMonth;
    const textColor = isFuture ? "#999" : "#1c1d1d";
    const background = isCurrent ? "background:#fffbf0;" : "";
    const weight = isCurrent ? "font-weight:600;" : "";
    let pacingBadge = "";
    if (isCurrent && pacing) {
      const color = pacing.percentage >= 0 ? "#3B8344" : "#c41e1e";
      const arrow = pacing.percentage >= 0 ? "9650" : "9660";
      const sign = pacing.percentage >= 0 ? "+" : "";
      pacingBadge = ` <span style='font-size:11px;color:${color};font-weight:700;'>&#${arrow}; ${sign}${pacing.percentage}% (${pacing.currentLabel} vs ${pacing.previousLabel})</span>`;
    }
    return `<tr style='border-bottom:1px solid #f0f0f0;${background}'><td style='padding:10px 0;font-size:14px;color:${textColor};${weight}'>${monthName(key)}${pacingBadge}</td><td align='center' style='font-size:14px;color:${textColor};${weight}'>${appointments.count || "—"}</td><td align='right' style='font-size:14px;color:${textColor};${weight}'>${appointments.count ? fmtMoney(appointments.value) : "—"}</td><td align='right' style='font-size:14px;color:${textColor};'>${orderValue ? fmtMoney(orderValue) : "—"}</td></tr>`;
  }).join("");

  const next7Rows = next7.map((day) => {
    const color = day.count ? "#1c1d1d" : "#999";
    return `<tr style='border-bottom:1px solid #f0f0f0;'><td style='padding:8px 0;font-size:14px;color:${color};'>${day.label}</td><td align='center' style='font-size:14px;color:${color};'>${day.count ? `${day.count} appts` : "—"}</td><td align='right' style='font-size:14px;font-weight:600;color:${color};'>${day.count ? fmtMoney(day.value) : "—"}</td></tr>`;
  }).join("");

  const mainTypes = byType.slice(0, 5);
  const otherTypes = byType.slice(5);
  const typeRows = mainTypes.map(([name, value]) => `<tr style='border-bottom:1px solid #f0f0f0;'><td style='padding:8px 0;font-size:14px;color:#1c1d1d;'>${escapeHtml(name)}</td><td align='center' style='font-size:13px;color:#888;'>${value.count}</td><td align='right' style='font-size:14px;font-weight:600;color:#1c1d1d;'>${fmtMoney(value.value)}</td></tr>`).join("");
  const otherCount = otherTypes.reduce((sum, [, value]) => sum + value.count, 0);
  const otherValue = otherTypes.reduce((sum, [, value]) => sum + value.value, 0);
  const otherRow = otherCount
    ? `<tr><td style='padding:8px 0;font-size:14px;color:#1c1d1d;'>Other</td><td align='center' style='font-size:13px;color:#888;'>${otherCount}</td><td align='right' style='font-size:14px;font-weight:600;color:#1c1d1d;'>${fmtMoney(otherValue)}</td></tr>`
    : "";

  const maxDowValue = Math.max(...dowValue);
  const dowRows = [6, 0, 5, 4, 3, 2, 1]
    .filter((index) => dowValue[index] > 0)
    .map((index) => {
      const width = maxDowValue
        ? Math.max(2, Math.round((dowValue[index] / maxDowValue) * 100))
        : 0;
      return `<tr><td style='padding:4px 0;font-size:13px;color:#888;width:40px;'>${DOW_NAMES[index]}</td><td style='padding:4px 0;'><table cellspacing='0' cellpadding='0' width='100%'><tr><td style='background:#f2c070;height:18px;border-radius:4px;width:${width}%;'></td><td></td></tr></table></td><td align='right' style='padding:4px 0 4px 8px;font-size:13px;font-weight:600;color:#1c1d1d;width:70px;'>${fmtMoney(dowValue[index])}</td></tr>`;
    }).join("");

  const referralRows = referralSources.map(([name, count]) => {
    const percentage = referralAnswerCount
      ? Math.round((count / referralAnswerCount) * 100)
      : 0;
    return `<tr style='border-bottom:1px solid #f0f0f0;'><td style='padding:8px 0;font-size:14px;color:#1c1d1d;'>${escapeHtml(name)}</td><td align='right' style='font-size:14px;font-weight:600;color:#1c1d1d;'>${count} <span style='color:#888;font-weight:400;font-size:12px;'>(${percentage}%)</span></td></tr>`;
  }).join("");

  const yearOrderValue = yearOrders.reduce((sum, order) => sum + order.total, 0);
  const todayLabel = formatShortDate(todayKey, true);
  const yesterdayLabel = formatDayLabel(yesterdayKey);

  // Additive only: renders nothing when there's no native activity, so the
  // rest of this report stays byte-identical to the single-source report.
  const nativeSection = (nativeAdditions.bookingCount > 0 || nativeAdditions.giftCount > 0)
    ? `<tr><td style='padding:28px 32px 0;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Booked on the site (native)</span><table width='100%' cellspacing='0' style='margin-top:12px;'><tr><td width='48%' style='padding:14px;background:#eaf7ec;border-radius:8px;text-align:center;'><span style='font-size:22px;font-weight:700;color:#3B8344;'>${nativeAdditions.bookingCount}</span><br><span style='font-size:11px;color:#888;font-weight:600;'>NATIVE BOOKINGS</span><br><span style='font-size:13px;color:#1c1d1d;'>${fmtMoney(nativeAdditions.bookingValue)}</span></td><td width='4%'></td><td width='48%' style='padding:14px;background:#eaf7ec;border-radius:8px;text-align:center;'><span style='font-size:22px;font-weight:700;color:#3B8344;'>${nativeAdditions.giftCount}</span><br><span style='font-size:11px;color:#888;font-weight:600;'>NATIVE GIFT CERTS SOLD</span><br><span style='font-size:13px;color:#1c1d1d;'>${fmtMoney(nativeAdditions.giftValue)}</span></td></tr></table></td></tr>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head><body style='margin:0;padding:0;background:#f8f7f4;font-family:Arial,Helvetica,sans-serif;'><table width='100%' cellpadding='0' cellspacing='0' style='background:#f8f7f4;'><tr><td align='center' style='padding:32px 16px;'><table width='100%' cellpadding='0' cellspacing='0' style='max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);'>` +
    `<tr><td style='background:#1c1d1d;padding:24px 32px;'><table width='100%'><tr><td><span style='font-size:22px;font-weight:700;color:#f2c070;letter-spacing:0.5px;'>Highland Farms</span><br><span style='font-size:13px;color:#aaa;'>Daily Booking &amp; Appointment Report</span></td><td align='right'><span style='font-size:14px;color:#f2c070;font-weight:600;'>${todayLabel}</span><br><span style='font-size:12px;color:#888;'>${DOW_NAMES[dateFromKey(todayKey).getUTCDay()]}</span></td></tr></table></td></tr>` +
    `<tr><td style='padding:28px 32px 0;'><table width='100%' cellspacing='0'><tr><td style='padding-bottom:20px;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Yesterday — ${yesterdayLabel}</span></td></tr><tr><td><table width='100%' cellspacing='0'><tr><td width='33%' style='padding:16px;background:#f8f7f4;border-radius:8px;text-align:center;'><span style='font-size:28px;font-weight:700;color:#1c1d1d;'>${fmtMoney(metrics.yesterdayScheduledValue)}</span><br><span style='font-size:11px;color:#888;font-weight:600;'>SCHEDULED VALUE</span></td><td width='4%'></td><td width='29%' style='padding:16px;background:#f8f7f4;border-radius:8px;text-align:center;'><span style='font-size:28px;font-weight:700;color:#1c1d1d;'>${yesterdayAppointments.length}</span><br><span style='font-size:11px;color:#888;font-weight:600;'>ACTIVE APPOINTMENTS</span></td><td width='4%'></td><td width='30%' style='padding:16px;background:#f8f7f4;border-radius:8px;text-align:center;'><span style='font-size:28px;font-weight:700;color:#3B8344;'>${fmtMoney(metrics.newActiveBookingValue)}</span><br><span style='font-size:11px;color:#888;font-weight:600;'>NEW ACTIVE BOOKINGS</span></td></tr></table></td></tr></table></td></tr>` +
    (yesterdayAppointments.length
      ? `<tr><td style='padding:24px 32px 0;'><table width='100%' cellspacing='0'><tr><td style='padding-bottom:12px;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Yesterday's Active Appointments</span></td></tr>${appointmentRows}</table></td></tr>`
      : `<tr><td style='padding:24px 32px 0;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Yesterday's Active Appointments</span><p style='font-size:14px;color:#999;margin:12px 0 0;'>No active appointments yesterday</p></td></tr>`) +
    (newBookings.length
      ? `<tr><td style='padding:28px 32px 0;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Bookings Created Yesterday (Pacific Time)</span><table width='100%' cellspacing='0' style='margin-top:12px;'>${bookingRows}</table></td></tr>`
      : "") +
    nativeSection +
    `<tr><td style='padding:28px 32px 0;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>${year} Activity by Service / Sale Month</span><table width='100%' cellspacing='0' style='margin-top:12px;border-collapse:collapse;'><tr style='border-bottom:2px solid #eee;'><td style='padding:8px 0;font-size:12px;font-weight:600;color:#888;'>MONTH</td><td align='center' style='padding:8px 0;font-size:12px;font-weight:600;color:#888;'>ACTIVE APPTS</td><td align='right' style='padding:8px 0;font-size:12px;font-weight:600;color:#888;'>APPT VALUE</td><td align='right' style='padding:8px 0;font-size:12px;font-weight:600;color:#888;'>ORDER SALES</td></tr>${monthRows}` +
    `<tr style='background:#1c1d1d;'><td style='padding:14px 10px;font-size:14px;font-weight:700;color:#f2c070;border-radius:6px 0 0 0;'>${year} active appointment dates</td><td align='center' style='padding:14px 0;font-size:14px;font-weight:700;color:#f2c070;'>${metrics.activeCount}</td><td align='right' style='padding:14px 0;font-size:14px;font-weight:700;color:#f2c070;'>${fmtMoney(metrics.totalActiveValue)}</td><td></td></tr>` +
    `<tr style='background:#f8f7f4;'><td style='padding:10px;font-size:13px;color:#666;'>Past active through ${formatShortDate(yesterdayKey)}</td><td align='center' style='font-size:13px;color:#666;'>${metrics.pastActiveCount}</td><td align='right' style='font-size:13px;font-weight:600;color:#666;'>${fmtMoney(metrics.pastActiveValue)}</td><td></td></tr>` +
    `<tr style='background:#f8f7f4;'><td style='padding:10px;font-size:13px;color:#666;'>Future active appointments</td><td align='center' style='font-size:13px;color:#666;'>${metrics.futureActiveCount}</td><td align='right' style='font-size:13px;font-weight:600;color:#666;'>${fmtMoney(metrics.futureActiveValue)}</td><td></td></tr>` +
    `<tr style='background:#f8f7f4;'><td style='padding:10px;font-size:13px;color:#666;'>Canceled appointment records</td><td align='center' style='font-size:13px;color:#666;'>${metrics.canceledCount}</td><td align='right' style='font-size:13px;font-weight:600;color:#666;'>${fmtMoney(metrics.canceledValue)}</td><td style='font-size:11px;color:#999;text-align:right;'>Acuity amount paid</td></tr>` +
    `<tr style='background:#f8f7f4;'><td style='padding:10px;font-size:13px;color:#666;border-radius:0 0 0 6px;'>${year} Acuity store orders</td><td align='center' style='font-size:13px;color:#666;'>${yearOrders.length}</td><td></td><td align='right' style='padding-right:10px;font-size:13px;font-weight:600;color:#666;border-radius:0 0 6px 0;'>${fmtMoney(yearOrderValue)}</td></tr></table></td></tr>` +
    `<tr><td style='padding:28px 32px 0;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Next 7 Days — Active Schedule</span><table width='100%' cellspacing='0' style='margin-top:12px;border-collapse:collapse;'>${next7Rows}</table></td></tr>` +
    `<tr><td style='padding:28px 32px 0;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Appointment Value by Service Type (${year} Appointment Dates)</span><table width='100%' cellspacing='0' style='margin-top:12px;border-collapse:collapse;'>${typeRows}${otherRow}</table></td></tr>` +
    `<tr><td style='padding:28px 32px 0;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Key Metrics (${year} Appointment Dates)</span><table width='100%' cellspacing='0' style='margin-top:12px;'><tr><td width='32%' style='padding:14px;background:#f8f7f4;border-radius:8px;text-align:center;'><span style='font-size:12px;color:#888;font-weight:600;'>AVG PAID APPT</span><br><span style='font-size:22px;font-weight:700;color:#1c1d1d;'>${fmtMoney(metrics.averagePaidAppointment)}</span></td><td width='2%'></td><td width='32%' style='padding:14px;background:#f8f7f4;border-radius:8px;text-align:center;'><span style='font-size:12px;color:#888;font-weight:600;'>AVG LEAD TIME</span><br><span style='font-size:22px;font-weight:700;color:#1c1d1d;'>${metrics.averageLeadDays} days</span></td><td width='2%'></td><td width='32%' style='padding:14px;background:#f8f7f4;border-radius:8px;text-align:center;'><span style='font-size:12px;color:#888;font-weight:600;'>CANCEL RATE</span><br><span style='font-size:22px;font-weight:700;color:#1c1d1d;'>${metrics.cancelRate.toFixed(1)}%</span></td></tr></table></td></tr>` +
    `<tr><td style='padding:28px 32px 0;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Appointment Value by Service Day (${year} Appointment Dates)</span><table width='100%' cellspacing='0' style='margin-top:12px;'>${dowRows}</table></td></tr>` +
    `<tr><td style='padding:28px 32px;'><span style='font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;'>Top Referral Sources (${year} Appointment Dates)</span><table width='100%' cellspacing='0' style='margin-top:12px;border-collapse:collapse;'>${referralRows}</table></td></tr>` +
    `<tr><td style='background:#f8f7f4;padding:16px 32px;text-align:center;'><span style='font-size:11px;color:#999;'>Operational Acuity report. Appointment values are Acuity amount paid, not accounting revenue or verified completion.</span></td></tr></table></td></tr></table></body></html>`;
}
