/**
 * The admin cookie name, alone in its own module.
 *
 * `admin-auth.ts` imports `next/headers`, which is server-only. The admin's
 * client component needs this constant too, and importing it from there would
 * drag a server module into the browser bundle and fail the build.
 */
export const ADMIN_COOKIE = "hf_shop_admin";
