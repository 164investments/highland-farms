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
  // The page exists in both modes: native checkout when the flag is on, the
  // static catalog page (links into Acuity) when it is off.
  return "/gift-certificates";
}
