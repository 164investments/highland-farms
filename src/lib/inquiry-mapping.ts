/*
 * Inquiry form mapping: the one place that decides what each inquiry field
 * becomes in Supabase, the farm's notification email, HubSpot, BookedIQ and
 * GA4. Pure on purpose (no "@/" imports, no I/O) so `npm test` can import it
 * directly; the route and the integration libs only send what this returns.
 *
 * Live definitions this mapping was written against (read-only, 2026-10-06):
 * - Supabase event_inquiries: guest_count, preferred_date, referral_source
 *   are all `text`, so new band keys and month-level dates need no migration.
 * - HubSpot hf_event_type / hf_guest_count / hf_preferred_date /
 *   hf_referral_source: free-text strings (no option list).
 * - BookedIQ (GHL location MF69VyOlWn4TT9g8AiDp): Guest Count is TEXT, Desired
 *   Event Date is a strict DATE (a non-date value 400s the WHOLE upsert),
 *   Desired Event Type and "How did you hear about us?" are SINGLE_OPTIONS.
 */

import { formatAttribution, type AttributionData } from "./attribution.ts";

// ── Event types ──────────────────────────────────────────────────────────────

/** Labels match BookedIQ's "Desired Event Type" options exactly. */
export const EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "elopement", label: "Elopement" },
  { value: "engagement-party", label: "Engagement Party" },
  { value: "rehearsal-dinner", label: "Rehearsal Dinner" },
  { value: "celebration", label: "Birthday / Anniversary" },
  { value: "retreat", label: "Retreat / Reunion" },
  { value: "photoshoot", label: "Photoshoot" },
  { value: "farm-stay", label: "Farm Stay" },
  { value: "other", label: "Other" },
] as const;

export const EVENT_TYPE_VALUES: readonly string[] = EVENT_TYPES.map((t) => t.value);

/** The form switches to wedding fields, bands and the call with Connor. */
export const WEDDING_FORM_TYPES: readonly string[] = ["wedding", "elopement"];

/**
 * Types that also fire GA4 `generate_lead_wedding`. Must stay identical to the
 * regex on GTM tags 114 / 122 / 152 (`^(wedding|elopement|engagement-party|rehearsal-dinner)$`)
 * and to the wedding pipeline report, or the Ads import drifts from the tags.
 */
export const WEDDING_LEAD_TYPES: readonly string[] = [
  "wedding",
  "elopement",
  "engagement-party",
  "rehearsal-dinner",
];

export function isWeddingForm(eventType: string | undefined | null): boolean {
  return !!eventType && WEDDING_FORM_TYPES.includes(eventType);
}

export function eventTypeLabel(value: string): string {
  return EVENT_TYPES.find((t) => t.value === value)?.label ?? value;
}

// ── Guest bands ──────────────────────────────────────────────────────────────

export interface Option {
  value: string;
  label: string;
}

export const WEDDING_GUEST_BANDS: readonly Option[] = [
  { value: "under-30", label: "Under 30" },
  { value: "30-60", label: "30 to 60" },
  { value: "60-100", label: "60 to 100" },
  { value: "100-125", label: "100 to 125" },
  { value: "not-sure", label: "Not sure yet" },
];

export const EVENT_GUEST_BANDS: readonly Option[] = [
  { value: "2-10", label: "2 to 10" },
  { value: "11-20", label: "11 to 20" },
  { value: "21-50", label: "21 to 50" },
  { value: "51-125", label: "51 to 125" },
  { value: "not-sure", label: "Not sure yet" },
];

/**
 * Values the previous form sent ("2 - 10", "11 - 20 (full property)",
 * "25 - 50", "50+"). Still accepted for a deploy window and still labelled in
 * old rows; never offered again.
 */
export const LEGACY_GUEST_BANDS: readonly Option[] = [
  { value: "25-50", label: "25 to 50" },
  { value: "50+", label: "50 or more" },
];

export const GUEST_BAND_VALUES: readonly string[] = Array.from(
  new Set([...WEDDING_GUEST_BANDS, ...EVENT_GUEST_BANDS, ...LEGACY_GUEST_BANDS].map((b) => b.value)),
);

export function guestBandsFor(eventType: string | undefined | null): readonly Option[] {
  return isWeddingForm(eventType) ? WEDDING_GUEST_BANDS : EVENT_GUEST_BANDS;
}

/** "30 to 60", "Not sure yet"; unknown strings pass through untouched. */
export function guestBandLabel(value: string): string {
  const all = [...WEDDING_GUEST_BANDS, ...EVENT_GUEST_BANDS, ...LEGACY_GUEST_BANDS];
  return all.find((b) => b.value === value)?.label ?? value;
}

/** For sentences: "30 to 60 guests", "Guest count not sure yet". */
export function guestBandPhrase(value: string): string {
  if (value === "not-sure") return "Guest count not sure yet";
  return `${guestBandLabel(value)} guests`;
}

// ── How did you hear ─────────────────────────────────────────────────────────

export interface ReferralOption extends Option {
  /** Exact option in BookedIQ's "How did you hear about us?" picklist. */
  bookediq: string;
}

/** `value` keeps the slugs already stored in Supabase/HubSpot since 2026-02. */
export const REFERRAL_SOURCES: readonly ReferralOption[] = [
  { value: "google", label: "Google search", bookediq: "Google Search" },
  { value: "google-ad", label: "Google ad", bookediq: "Google Ad" },
  { value: "instagram", label: "Instagram", bookediq: "Instagram" },
  { value: "facebook", label: "Facebook", bookediq: "Facebook" },
  { value: "tiktok", label: "TikTok", bookediq: "Tik-Tok" },
  { value: "wedding-wire", label: "WeddingWire or The Knot", bookediq: "Wedding Wire / The Knot" },
  { value: "word-of-mouth", label: "Word of mouth", bookediq: "From someone you know" },
  { value: "travel-oregon", label: "Travel Oregon", bookediq: "Travel Oregon" },
  { value: "other", label: "Other", bookediq: "Other" },
];

export const REFERRAL_VALUES: readonly string[] = REFERRAL_SOURCES.map((r) => r.value);

export function referralLabel(value: string): string {
  return REFERRAL_SOURCES.find((r) => r.value === value)?.label ?? value;
}

// ── Dates: month + year + "We're flexible" ───────────────────────────────────

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const MONTH_OPTIONS: readonly Option[] = MONTHS.map((label, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label,
}));

export const MIN_EVENT_YEAR = 2024;
export const MAX_EVENT_YEAR = 2040;

/** This year and the next three: weddings here book about a year out. */
export function eventYearOptions(now: Date = new Date()): string[] {
  const y = now.getFullYear();
  return [y, y + 1, y + 2, y + 3].map(String);
}

/**
 * True when a chosen month is before last month (one month of grace absorbs
 * time zones at a month boundary). Year-only choices are never "past" unless
 * the whole year is.
 */
export function isPastEventMonth(year: string, month: string | undefined, now: Date = new Date()): boolean {
  const y = Number(year);
  if (!Number.isFinite(y)) return false;
  const current = now.getUTCFullYear() * 12 + now.getUTCMonth(); // months since year 0
  if (!month) return y < now.getUTCFullYear();
  const chosen = y * 12 + (Number(month) - 1);
  return chosen < current - 1;
}

export interface DateInput {
  event_month?: string;
  event_year?: string;
  date_flexible?: boolean;
  /** Exact YYYY-MM-DD from the previous form (deploy window only). */
  preferred_date?: string;
}

const FLEXIBLE_SUFFIX = " (flexible)";

/**
 * The `preferred_date` text stored in Supabase and HubSpot:
 * "2027-06", "2027", "2027-06 (flexible)", "flexible", or a legacy
 * "2027-06-14". Sorts and parses on the first 7 characters.
 */
export function encodePreferredDate(input: DateInput): string | null {
  let base = "";
  if (input.event_year) {
    base = input.event_month ? `${input.event_year}-${input.event_month}` : input.event_year;
  } else if (input.preferred_date?.trim()) {
    base = input.preferred_date.trim();
  }
  if (input.date_flexible) return base ? `${base}${FLEXIBLE_SUFFIX}` : "flexible";
  return base || null;
}

export interface ParsedDate {
  year?: number;
  month?: number;
  day?: number;
  flexible: boolean;
}

export function parsePreferredDate(stored: string | null | undefined): ParsedDate | null {
  if (!stored) return null;
  const s = stored.trim();
  if (s.toLowerCase() === "flexible") return { flexible: true };
  const m = s.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?( \(flexible\))?$/);
  if (!m) return null;
  return {
    year: Number(m[1]),
    ...(m[2] && { month: Number(m[2]) }),
    ...(m[3] && { day: Number(m[3]) }),
    flexible: !!m[4],
  };
}

/** "June 2027", "June 2027, flexible", "2027", "Flexible", "June 14, 2027". */
export function formatPreferredDate(stored: string | null | undefined): string {
  if (!stored) return "";
  const p = parsePreferredDate(stored);
  if (!p) return stored;
  let text = "";
  if (p.year && p.month && p.day) text = `${MONTHS[p.month - 1]} ${p.day}, ${p.year}`;
  else if (p.year && p.month) text = `${MONTHS[p.month - 1]} ${p.year}`;
  else if (p.year) text = String(p.year);
  if (p.flexible) return text ? `${text}, flexible` : "Flexible";
  return text;
}

/**
 * A real calendar date for fields that only take one (BookedIQ's DATE field,
 * HubSpot's deal close date): the first of the chosen month. Year-only and
 * "flexible" alone return null rather than inventing a day.
 */
export function preferredDateIso(stored: string | null | undefined): string | null {
  const p = parsePreferredDate(stored);
  if (!p?.year || !p.month) return null;
  const mm = String(p.month).padStart(2, "0");
  const dd = String(p.day ?? 1).padStart(2, "0");
  return `${p.year}-${mm}-${dd}`;
}

// ── Names ────────────────────────────────────────────────────────────────────

/**
 * "Jane and Sam Smith" → Jane / Smith; "Jane Doe & Sam Lee" → Jane / Doe;
 * "Jane Doe" → Jane / Doe. The full text is kept everywhere else.
 */
export function splitName(full: string): { first: string; last: string; hasPartner: boolean } {
  const people = full.trim().split(/\s+(?:and|&|\+)\s+/i).filter(Boolean);
  const firstPerson = (people[0] ?? "").split(/\s+/).filter(Boolean);
  const first = firstPerson[0] ?? "";
  let last = firstPerson.slice(1).join(" ");
  if (!last && people.length > 1) {
    const lastPerson = people[people.length - 1].split(/\s+/).filter(Boolean);
    if (lastPerson.length > 1) last = lastPerson[lastPerson.length - 1];
  }
  return { first, last, hasPartner: people.length > 1 };
}

// ── The mapped inquiry ───────────────────────────────────────────────────────

/** Structurally the validated `InquiryFormData` (kept here so this file stays pure). */
export interface InquiryInput extends DateInput {
  name: string;
  email: string;
  phone?: string;
  event_type: string;
  guest_count?: string;
  referral_source?: string;
  message?: string;
  consent_marketing_sms?: boolean;
  consent_appointment_sms?: boolean;
  attribution?: AttributionData;
  /** Submit id shared with the dataLayer push. */
  _sid?: string;
  /** The browser had GTM-MBH36BJH loaded when it submitted (see buildGa4LeadEvents). */
  _gtm?: boolean;
}

function clean(v: string | undefined | null): string | null {
  const t = v?.trim();
  return t ? t : null;
}

/** Row for `event_inquiries` (same columns as before: no migration). */
export function buildSupabaseRow(d: InquiryInput) {
  return {
    name: d.name.trim(),
    email: d.email.trim(),
    phone: clean(d.phone),
    event_type: d.event_type,
    guest_count: clean(d.guest_count),
    preferred_date: encodePreferredDate(d),
    referral_source: clean(d.referral_source),
    message: clean(d.message),
    consent_marketing_sms: d.consent_marketing_sms ?? false,
    consent_appointment_sms: d.consent_appointment_sms ?? false,
    attribution: d.attribution ?? null,
  };
}

const EVENTS_INBOX = "events@highlandfarms-oregon.com";
const INFO_INBOX = "info@highlandfarms-oregon.com";
const EVENTS_TEAM_TYPES = ["wedding", "elopement", "engagement-party", "rehearsal-dinner", "celebration", "retreat"];

export interface EmailRow {
  label: string;
  value: string;
  /** Render as a mailto: / tel: link. */
  href?: string;
  multiline?: boolean;
}

/** What the farm's notification email shows, in order. */
export function buildInquiryEmail(d: InquiryInput) {
  const wedding = isWeddingForm(d.event_type);
  const eventLabel = eventTypeLabel(d.event_type);
  const stored = encodePreferredDate(d);
  const dateText = formatPreferredDate(stored);
  const guests = clean(d.guest_count);
  const phone = clean(d.phone);
  const referral = clean(d.referral_source);
  const message = clean(d.message);

  const rows: EmailRow[] = [
    { label: wedding ? "Names" : "Name", value: d.name.trim() },
    { label: "Email", value: d.email.trim(), href: `mailto:${d.email.trim()}` },
  ];
  if (phone) rows.push({ label: "Phone", value: phone, href: `tel:${phone}` });
  rows.push({ label: "Event type", value: eventLabel });
  if (dateText) rows.push({ label: wedding ? "Wedding date" : "Event date", value: dateText });
  if (guests) rows.push({ label: "Guests", value: guestBandLabel(guests) });
  if (referral) rows.push({ label: "Heard about us", value: referralLabel(referral) });
  const texts = [
    d.consent_appointment_sms ? "appointment texts" : null,
    d.consent_marketing_sms ? "marketing texts" : null,
  ].filter(Boolean);
  if (texts.length) rows.push({ label: "Texts OK", value: texts.join(" and ") });
  if (message) rows.push({ label: "Message", value: message, multiline: true });

  const summary = [dateText, guests ? guestBandPhrase(guests) : null].filter(Boolean).join(" · ");
  return {
    to: EVENTS_TEAM_TYPES.includes(d.event_type) ? [EVENTS_INBOX] : [INFO_INBOX],
    replyTo: d.email.trim(),
    eventLabel,
    subject: `New ${eventLabel} Inquiry from ${d.name.trim()}${summary ? ` · ${summary}` : ""}`,
    rows,
  };
}

/** HubSpot contact properties: create sets identity too; an update only the hf_* fields. */
export function buildHubSpotContact(d: InquiryInput) {
  const { first, last } = splitName(d.name);
  const stored = encodePreferredDate(d);
  const hf: Record<string, string> = {};
  if (d.event_type) hf.hf_event_type = d.event_type;
  if (clean(d.guest_count)) hf.hf_guest_count = clean(d.guest_count)!;
  if (stored) hf.hf_preferred_date = stored;
  if (clean(d.referral_source)) hf.hf_referral_source = clean(d.referral_source)!;

  const create: Record<string, string> = {
    email: d.email.trim(),
    firstname: first,
    ...(last && { lastname: last }),
    ...(clean(d.phone) && { phone: clean(d.phone)! }),
    ...hf,
  };
  return { create, update: hf };
}

/** The note on the HubSpot contact: readable labels plus the attribution block. */
export function buildHubSpotNote(d: InquiryInput): string {
  const { hasPartner } = splitName(d.name);
  const stored = encodePreferredDate(d);
  const attributionText = formatAttribution(d.attribution);
  const lines = [
    hasPartner ? `Names: ${d.name.trim()}` : null,
    `Event Type: ${eventTypeLabel(d.event_type)}`,
    clean(d.guest_count) ? `Guest Count: ${guestBandLabel(clean(d.guest_count)!)}` : null,
    stored ? `${isWeddingForm(d.event_type) ? "Wedding Date" : "Event Date"}: ${formatPreferredDate(stored)}` : null,
    clean(d.referral_source) ? `Referral Source: ${referralLabel(clean(d.referral_source)!)}` : null,
    clean(d.message) ? `\nMessage:\n${clean(d.message)}` : null,
    attributionText ? `\nAttribution:\n${attributionText}` : null,
  ].filter(Boolean);
  return `Highland Farms inquiry from website:\n\n${lines.join("\n")}`;
}

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

/** Deal name and close date (first of the chosen month, else six months out). */
export function buildHubSpotDeal(d: InquiryInput, now: Date = new Date()) {
  const { first, last } = splitName(d.name);
  const stored = encodePreferredDate(d);
  const dateText = formatPreferredDate(stored) || "TBD";
  return {
    dealname: `${first}${last ? ` ${last}` : ""} – ${d.event_type || "Inquiry"} (${dateText})`,
    closedate:
      preferredDateIso(stored) ?? new Date(now.getTime() + SIX_MONTHS_MS).toISOString().split("T")[0],
  };
}

/** BookedIQ (GHL) custom field ids for the Highland Farms location. */
export const BOOKEDIQ_FIELD = {
  eventType: "SU7feL5qc3Rof5oH00K9", // Desired Event Type (SINGLE_OPTIONS)
  guestCount: "oC80o6RFqL8IjgYfudqM", // Estimated Number of Guests (TEXT)
  eventDate: "bD5UbqcequJXjdwM7q6s", // Desired Event Date (DATE: strict, a bad value 400s the upsert)
  eventDateMeta: "P1OnvSvlMzgRA4i526jh", // Desired Event Date - META (SINGLE_OPTIONS; Meta path only)
  message: "XdkbuNVwwMGVNIlCRfpE", // Contact Form Message (LARGE_TEXT)
  howHeard: "YKJFaETa1FNabZohr92y", // How did you hear about us? (SINGLE_OPTIONS)
} as const;

/** The `/contacts/upsert` body for a website inquiry, minus `locationId`. */
export function buildBookedIQContact(d: InquiryInput) {
  const { first, last, hasPartner } = splitName(d.name);
  const stored = encodePreferredDate(d);
  const iso = preferredDateIso(stored);
  const guests = clean(d.guest_count);
  const referral = REFERRAL_SOURCES.find((r) => r.value === d.referral_source);
  const attributionText = formatAttribution(d.attribution);

  // The DATE field can only hold a day, so the month (and "flexible") is
  // spelled out at the top of the message the events team reads.
  const header = [
    hasPartner ? `Names: ${d.name.trim()}` : null,
    stored ? `${isWeddingForm(d.event_type) ? "Wedding date" : "Event date"}: ${formatPreferredDate(stored)}` : null,
  ].filter(Boolean);
  const messageText = [
    header.length ? header.join("\n") : null,
    clean(d.message),
    attributionText ? `Attribution:\n${attributionText}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const customFields: { id: string; field_value: string }[] = [];
  // Slug, as before: the "0.1 Assign Staff based on Event Type" workflow reads this field.
  if (d.event_type) customFields.push({ id: BOOKEDIQ_FIELD.eventType, field_value: d.event_type });
  if (guests) customFields.push({ id: BOOKEDIQ_FIELD.guestCount, field_value: guestBandLabel(guests) });
  if (iso) customFields.push({ id: BOOKEDIQ_FIELD.eventDate, field_value: iso });
  if (referral) customFields.push({ id: BOOKEDIQ_FIELD.howHeard, field_value: referral.bookediq });
  if (messageText) customFields.push({ id: BOOKEDIQ_FIELD.message, field_value: messageText });

  const tags = ["source :: contact form"];
  if (d.attribution?.utm_source) tags.push(`utm_source :: ${d.attribution.utm_source}`);
  if (d.attribution?.utm_campaign) tags.push(`utm_campaign :: ${d.attribution.utm_campaign}`);
  if (d.consent_marketing_sms) tags.push("sms consent :: marketing");
  if (d.consent_appointment_sms) tags.push("sms consent :: appointments");

  return {
    firstName: first,
    ...(last && { lastName: last }),
    email: d.email.trim(),
    ...(clean(d.phone) && { phone: clean(d.phone)! }),
    source: "Website - Contact Form",
    tags,
    ...(customFields.length > 0 && { customFields }),
  };
}

export interface LeadEvent {
  event_name: "generate_lead" | "generate_lead_wedding";
  event_type: string;
  form_name: string;
  event_id?: string;
  attribution?: AttributionData;
}

/**
 * Server-side GA4 Measurement Protocol events for one website inquiry.
 *
 * `generate_lead`: exactly one per lead, counting the browser. The form's
 * `form_submission` dataLayer push fires GTM tag 146 ("GA4 - Form
 * Submission"), which already sends `generate_lead` with event_type and
 * event_id. GA4 does not de-duplicate on event_id, so when the browser had
 * GTM loaded (`_gtm`) the server stays quiet; when GTM was blocked or absent
 * the server sends it instead. September 2026 showed the cost of sending
 * both: 934 `generate_lead` for 741 real leads. If tag 146 is ever paused,
 * drop the `_gtm` condition here.
 *
 * `generate_lead_wedding`: kept for wedding-type leads because Google Ads
 * imports it (conversion action 7520960358, secondary) and GA4 marks it a key
 * event. Retiring it is a Hayden decision; see the forms MAPPING.md.
 */
export function buildGa4LeadEvents(d: InquiryInput): LeadEvent[] {
  const base = {
    event_type: d.event_type,
    form_name: "event_inquiry",
    ...(d.attribution && { attribution: d.attribution }),
  };
  const events: LeadEvent[] = [];
  if (!d._gtm) {
    events.push({ event_name: "generate_lead", ...base, ...(d._sid && { event_id: d._sid }) });
  }
  if (WEDDING_LEAD_TYPES.includes(d.event_type)) {
    events.push({
      event_name: "generate_lead_wedding",
      ...base,
      ...(d._sid && { event_id: `${d._sid}:wedding` }),
    });
  }
  return events;
}

/** The `form_submission` dataLayer push (drives Ads "Book Your Wedding", enhanced conversions, Meta Lead). */
export function buildFormSubmissionPush(d: Pick<InquiryInput, "event_type" | "_sid" | "email" | "phone">) {
  return {
    event: "form_submission",
    form_name: "event_inquiry",
    event_type: d.event_type,
    event_id: d._sid,
    email: d.email.trim(),
    ...(clean(d.phone) && { phone: clean(d.phone)! }),
  };
}

/**
 * Acuity wedding-call link prefilled from the inquiry. Acuity reads
 * firstName / lastName / email / phone from the scheduling URL.
 */
export function weddingCallHref(
  base: string,
  d: { name?: string; email?: string; phone?: string },
): string {
  const url = new URL(base);
  if (d.name?.trim()) {
    const { first, last } = splitName(d.name);
    url.searchParams.set("firstName", first);
    if (last) url.searchParams.set("lastName", last);
  }
  if (d.email?.trim()) url.searchParams.set("email", d.email.trim());
  if (d.phone?.trim()) url.searchParams.set("phone", d.phone.trim());
  return url.toString();
}
