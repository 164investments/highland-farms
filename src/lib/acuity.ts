const ACUITY_USER_ID = process.env.ACUITY_USER_ID!;
const ACUITY_API_KEY = process.env.ACUITY_API_KEY!;
const BASE_URL = "https://acuityscheduling.com/api/v1";
const APPOINTMENT_FETCH_LIMIT = 500;
const APPOINTMENT_RANGE_CONCURRENCY = 4;
export const ACUITY_ORDER_FETCH_LIMIT = 1000;

const headers = {
  Authorization: `Basic ${Buffer.from(`${ACUITY_USER_ID}:${ACUITY_API_KEY}`).toString("base64")}`,
};

export interface AcuityAppointment {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  datetime: string;
  datetimeCreated: string;
  price: string;
  priceSold: string;
  amountPaid: string;
  paid: string;
  type: string;
  appointmentTypeID: number;
  category: string;
  duration: string;
  calendar: string;
  calendarID: number;
  canceled: boolean;
  forms: { id: number; name: string; values: { value: string; name: string }[] }[];
}

export interface AcuityOrder {
  id: number;
  total: number;
  time: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  title: string;
  products: { id: number; name: string; quantity: number; total: number }[];
}

async function fetchJSON<T>(
  path: string,
  params: Record<string, string> = {},
  options: { revalidate?: number } = {},
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const fetchOpts: RequestInit & { next?: { revalidate?: number } } = { headers };
  if (options.revalidate !== undefined) {
    fetchOpts.next = { revalidate: options.revalidate };
  }
  const res = await fetch(url.toString(), fetchOpts);
  if (!res.ok) throw new Error(`Acuity API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getAppointment(id: number): Promise<AcuityAppointment> {
  return fetchJSON<AcuityAppointment>(`/appointments/${id}`);
}

type AppointmentFilter = "active" | "canceled" | "all";

interface DateRange {
  start: string;
  end: string;
}

function isoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addUtcDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return isoDate(value);
}

function monthlyRanges(minDate: string, maxDate: string): DateRange[] {
  const start = new Date(`${minDate}T00:00:00Z`);
  const end = new Date(`${maxDate}T00:00:00Z`);
  const cursor = new Date(start);
  const ranges: DateRange[] = [];
  while (cursor <= end) {
    const chunkStart = isoDate(cursor);
    const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
    const chunkEnd = monthEnd > end
      ? maxDate
      : isoDate(monthEnd);
    ranges.push({ start: chunkStart, end: chunkEnd });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    cursor.setUTCDate(1);
  }
  return ranges;
}

function appointmentFilterParams(filter: AppointmentFilter): Record<string, string> {
  if (filter === "canceled") return { canceled: "true" };
  if (filter === "all") return { showall: "true" };
  return {};
}

async function fetchAppointmentRange(
  range: DateRange,
  filter: AppointmentFilter,
): Promise<AcuityAppointment[]> {
  const batch = await fetchJSON<AcuityAppointment[]>("/appointments", {
    minDate: range.start,
    maxDate: range.end,
    max: String(APPOINTMENT_FETCH_LIMIT),
    direction: "ASC",
    ...appointmentFilterParams(filter),
  });

  if (batch.length < APPOINTMENT_FETCH_LIMIT) return batch;
  if (range.start === range.end) {
    throw new Error(
      `Acuity returned ${APPOINTMENT_FETCH_LIMIT} appointments for ${range.start}; refusing to silently truncate the report`,
    );
  }

  const start = new Date(`${range.start}T00:00:00Z`);
  const end = new Date(`${range.end}T00:00:00Z`);
  const daySpan = Math.floor((end.getTime() - start.getTime()) / 86_400_000);
  const midpoint = addUtcDays(range.start, Math.floor(daySpan / 2));
  const [left, right] = await Promise.all([
    fetchAppointmentRange({ start: range.start, end: midpoint }, filter),
    fetchAppointmentRange({ start: addUtcDays(midpoint, 1), end: range.end }, filter),
  ]);
  return [...left, ...right];
}

async function getAppointmentsByFilter(
  minDate: string,
  maxDate: string,
  filter: AppointmentFilter,
): Promise<AcuityAppointment[]> {
  const ranges = monthlyRanges(minDate, maxDate);
  const all: AcuityAppointment[] = [];
  for (let index = 0; index < ranges.length; index += APPOINTMENT_RANGE_CONCURRENCY) {
    const rangeBatch = ranges.slice(index, index + APPOINTMENT_RANGE_CONCURRENCY);
    const results = await Promise.all(
      rangeBatch.map((range) => fetchAppointmentRange(range, filter)),
    );
    all.push(...results.flat());
  }

  const byId = new Map<number, AcuityAppointment>();
  for (const appointment of all) byId.set(appointment.id, appointment);
  return [...byId.values()];
}

export async function getAppointments(minDate: string, maxDate: string, canceled = false) {
  return getAppointmentsByFilter(minDate, maxDate, canceled ? "canceled" : "active");
}

export async function getAllAppointments(minDate: string, maxDate: string) {
  return getAppointmentsByFilter(minDate, maxDate, "all");
}

export function assertCompleteOrders<T>(orders: T[], limit = ACUITY_ORDER_FETCH_LIMIT): T[] {
  if (orders.length >= limit) {
    throw new Error(
      `Acuity returned the ${limit}-order maximum; refusing to send an incomplete order total`,
    );
  }
  return orders;
}

export async function getOrders() {
  const orders = await fetchJSON<AcuityOrder[]>("/orders", {
    max: String(ACUITY_ORDER_FETCH_LIMIT),
  });
  return assertCompleteOrders(orders);
}

// Farm tour appointment type IDs (all on calendar 7539520, $75/person).
export const FARM_TOUR_TYPE_IDS = {
  two: 48403186,
  three: 48403269,
  four: 48403283,
  five: 48403306,
  six: 64217701,
} as const;

// Nordic Spa appointment type (calendar 13047082, $75/person, 90 min).
export const NORDIC_SPA_TYPE_ID = 85942611;

interface AcuityAvailableDate {
  date: string; // "YYYY-MM-DD"
}

async function getNextAvailableDate(
  appointmentTypeID: number,
): Promise<string | null> {
  const today = new Date();
  const months = [
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
    (() => {
      const d = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    })(),
  ];

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  for (const month of months) {
    try {
      const dates = await fetchJSON<AcuityAvailableDate[]>(
        "/availability/dates",
        {
          appointmentTypeID: String(appointmentTypeID),
          month,
        },
        { revalidate: 1800 },
      );
      const future = dates
        .map((d) => d.date)
        .filter((d) => d >= todayStr)
        .sort();
      if (future.length > 0) return future[0];
    } catch {
      // Swallow and try next month — availability is best-effort UX.
    }
  }
  return null;
}

/**
 * Returns the earliest available farm tour date (ISO YYYY-MM-DD) over the next
 * ~60 days, or null if nothing is open. Probes the 2-guest tour as a proxy —
 * all 5 group sizes share calendar 7539520.
 */
export async function getNextTourDate(): Promise<string | null> {
  return getNextAvailableDate(FARM_TOUR_TYPE_IDS.two);
}

/**
 * Returns the earliest available Nordic Spa date (ISO YYYY-MM-DD) over the next
 * ~60 days, or null if nothing is open. Spa runs Tue/Wed/Fri/Sat/Sun only.
 */
export async function getNextSpaDate(): Promise<string | null> {
  return getNextAvailableDate(NORDIC_SPA_TYPE_ID);
}
