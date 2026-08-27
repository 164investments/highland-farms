/**
 * Minimal RFC 5545 ICS builder — no library. Every booking gets an ICS
 * attachment on its confirmation email (not just wedding calls), so this
 * has to be small, dependency-free, and correct about the two things a
 * calendar app actually checks: CRLF line endings and escaped text.
 */

/** Escapes a TEXT value per RFC 5545 §3.3.11 — backslash, then the rest. */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** UTC 'YYYYMMDDTHHMMSSZ' — DTSTART/DTEND are always emitted in UTC. */
function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export interface BuildIcsOpts {
  uid: string;
  startIso: string;
  durationMin: number;
  summary: string;
  description: string;
  location: string;
}

export function buildIcs(opts: BuildIcsOpts): string {
  const start = new Date(opts.startIso);
  const end = new Date(start.getTime() + opts.durationMin * 60000);
  const now = new Date();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Highland Farms//Native Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@highlandfarmsoregon.com`,
    `DTSTAMP:${toIcsUtc(now.toISOString())}`,
    `DTSTART:${toIcsUtc(start.toISOString())}`,
    `DTEND:${toIcsUtc(end.toISOString())}`,
    `SUMMARY:${escapeIcsText(opts.summary)}`,
    `DESCRIPTION:${escapeIcsText(opts.description)}`,
    `LOCATION:${escapeIcsText(opts.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n") + "\r\n";
}
