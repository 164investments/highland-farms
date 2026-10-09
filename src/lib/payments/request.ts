import { checkoutOrigin } from "./stripe";

const attempts = new Map<string, { count: number; reset: number }>();
export function allowedCheckoutOrigin(request: Request): boolean {
  const allowed = ["https://highlandfarmsoregon.com", "https://www.highlandfarmsoregon.com", checkoutOrigin()];
  if (process.env.NODE_ENV === "development") allowed.push("http://localhost:3000", "http://localhost:3099");
  return [request.headers.get("origin"), request.headers.get("referer")].some((value) => {
    try { return Boolean(value && allowed.includes(new URL(value).origin)); } catch { return false; }
  });
}

export function paymentRateLimited(request: Request, limit: number): boolean {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.reset < now) attempts.delete(key);
  const ip = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  const key = `${new URL(request.url).pathname}:${ip}`;
  const entry = attempts.get(key) ?? { count: 0, reset: now + 15 * 60000 };
  attempts.set(key, entry);
  return ++entry.count > limit;
}
