import { BOOKING_LINKS } from "@/lib/constants";

/** Native calendar kill switch. Off ⇒ routes 404 and no UI mounts. */
export function nativeCalendarEnabled(): boolean {
  return process.env.NEXT_PUBLIC_NATIVE_CALENDAR === "true";
}

/**
 * Gift certificates link. Native calendar on ⇒ internal `/gift-certificates`
 * page; off ⇒ the legacy Acuity catalog link. Reads only the NEXT_PUBLIC_ env,
 * which is inlined at build time, so this is safe to call from both server
 * and client components.
 */
export function giftCertificatesHref(): string {
  return nativeCalendarEnabled() ? "/gift-certificates" : BOOKING_LINKS.giftCertificates;
}
