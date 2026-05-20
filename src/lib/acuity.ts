const ACUITY_USER_ID = process.env.ACUITY_USER_ID!;
const ACUITY_API_KEY = process.env.ACUITY_API_KEY!;
const BASE_URL = "https://acuityscheduling.com/api/v1";

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

export async function getAppointments(minDate: string, maxDate: string, canceled = false) {
  // Acuity API caps at 500 results with no page/offset param.
  // Fetch month-by-month to avoid hitting the limit.
  const start = new Date(minDate + "T00:00:00");
  const end = new Date(maxDate + "T00:00:00");
  const all: AcuityAppointment[] = [];
  const seen = new Set<number>();

  const cursor = new Date(start);
  while (cursor <= end) {
    const chunkStart = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const chunkEnd = monthEnd > end
      ? maxDate
      : `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`;

    const batch = await fetchJSON<AcuityAppointment[]>("/appointments", {
      minDate: chunkStart,
      maxDate: chunkEnd,
      max: "500",
      direction: "ASC",
      ...(canceled ? { canceled: "true" } : {}),
    });

    for (const a of batch) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        all.push(a);
      }
    }

    cursor.setMonth(cursor.getMonth() + 1);
    cursor.setDate(1);
  }

  return all;
}

export async function getOrders() {
  return fetchJSON<AcuityOrder[]>("/orders", { max: "100" });
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
