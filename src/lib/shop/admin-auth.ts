import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import { ADMIN_COOKIE } from "./admin-cookie";

export { ADMIN_COOKIE };

/**
 * Farm-store admin gate.
 *
 * A single shared token, moved out of the query string into a cookie on first
 * visit. The cookie is set client-side, so it is NOT httpOnly — anyone who can
 * run script in the farm's browser can read it. That is an accepted limit here:
 * the repo has no user system and the audience is a handful of people at one
 * farm. It keeps the stock and order screens off the public internet; it is not
 * a substitute for real accounts if this grows past that.
 *
 * Everything it protects is also protected server-side — the admin API routes
 * check the same token, so a hidden page is never the only defence.
 */



function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function adminTokenConfigured(): boolean {
  return Boolean(process.env.SHOP_ADMIN_TOKEN);
}

/** True when the supplied value matches the configured admin token. */
export function isValidToken(value: string | undefined | null): boolean {
  const expected = process.env.SHOP_ADMIN_TOKEN;
  if (!expected || !value) return false;
  return safeEqual(value, expected);
}

/** Checks the admin cookie. Used by the page and by the mutation routes. */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return isValidToken(store.get(ADMIN_COOKIE)?.value);
}

/** Reads the bearer token from an API request, falling back to the cookie. */
export function tokenFromRequest(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}
