/** Human-facing booking id: HFB-260905-4821. Readable over the phone. */
export function generateBookingNumber(now = new Date()): string {
  const stamp = [
    String(now.getUTCFullYear()).slice(2),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `HFB-${stamp}-${suffix}`;
}
