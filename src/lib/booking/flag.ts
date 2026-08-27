/** Native calendar kill switch. Off ⇒ routes 404 and no UI mounts. */
export function nativeCalendarEnabled(): boolean {
  return process.env.NEXT_PUBLIC_NATIVE_CALENDAR === "true";
}
