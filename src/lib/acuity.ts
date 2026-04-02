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

async function fetchJSON<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`Acuity API ${res.status}: ${await res.text()}`);
  return res.json();
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
