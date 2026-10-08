// Inquiry form data path: schema → Supabase row → farm email → HubSpot →
// BookedIQ → GA4. Pure functions only; nothing here touches a live system.
import { test } from "node:test";
import assert from "node:assert/strict";
import { inquirySchema } from "../src/lib/schemas.ts";
import {
  BOOKEDIQ_FIELD,
  EVENT_GUEST_BANDS,
  LEGACY_GUEST_BANDS,
  REFERRAL_SOURCES,
  WEDDING_GUEST_BANDS,
  buildBookedIQContact,
  buildFormSubmissionPush,
  buildGa4LeadEvents,
  buildHubSpotContact,
  buildHubSpotDeal,
  buildHubSpotNote,
  buildInquiryEmail,
  buildSupabaseRow,
  encodePreferredDate,
  eventYearOptions,
  formatPreferredDate,
  guestBandLabel,
  guestBandPhrase,
  guestBandsFor,
  isPastEventMonth,
  preferredDateIso,
  referralLabel,
  splitName,
  weddingCallHref,
  type InquiryInput,
  type LeadEvent,
} from "../src/lib/inquiry-mapping.ts";

const base = { name: "Jane and Sam Smith", email: "jane@example.com", event_type: "wedding" };

function parse(extra: Record<string, unknown>) {
  return inquirySchema.safeParse({ ...base, ...extra });
}

function issuePaths(extra: Record<string, unknown>): string[] {
  const r = parse(extra);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
}

/** generate_lead events GA4 receives: the server's plus GTM tag 146's when GTM was loaded. */
function totalGenerateLead(server: LeadEvent[], gtmLoaded: boolean): number {
  return server.filter((e) => e.event_name === "generate_lead").length + (gtmLoaded ? 1 : 0);
}

// ── Schema ───────────────────────────────────────────────────────────────────

test("schema accepts every wedding band, event band and legacy band", () => {
  for (const band of [...WEDDING_GUEST_BANDS, ...EVENT_GUEST_BANDS, ...LEGACY_GUEST_BANDS]) {
    assert.equal(parse({ guest_count: band.value }).success, true, band.value);
  }
  assert.equal(parse({ guest_count: "" }).success, true, "empty band is optional");
});

test("bands are the spec's, in order, and the old 'full property' label is gone", () => {
  assert.deepEqual(
    WEDDING_GUEST_BANDS.map((b) => b.label),
    ["Under 30", "30 to 60", "60 to 100", "100 to 125", "Not sure yet"],
  );
  assert.deepEqual(
    EVENT_GUEST_BANDS.map((b) => b.label),
    ["2 to 8", "9 to 20", "21 to 50", "51 to 125", "Not sure yet"],
  );
  const every = [...WEDDING_GUEST_BANDS, ...EVENT_GUEST_BANDS, ...LEGACY_GUEST_BANDS].map((b) => b.label);
  assert.ok(every.every((l) => !/full property/i.test(l)));
  assert.equal(guestBandsFor("wedding"), WEDDING_GUEST_BANDS);
  assert.equal(guestBandsFor("elopement"), WEDDING_GUEST_BANDS);
  assert.equal(guestBandsFor("celebration"), EVENT_GUEST_BANDS);
  assert.equal(guestBandsFor(""), EVENT_GUEST_BANDS);
});

test("schema accepts each month / year / flexible combination", () => {
  const ok = [
    {},
    { event_month: "06", event_year: "2030" },
    { event_month: "06", event_year: "2030", date_flexible: true },
    { event_year: "2030" },
    { event_year: "2030", date_flexible: true },
    { date_flexible: true },
    { date_flexible: false },
    { event_month: "", event_year: "" },
    // Previous form's exact date, for the deploy window
    { preferred_date: "2030-06-14" },
  ];
  for (const extra of ok) assert.deepEqual(issuePaths(extra), [], JSON.stringify(extra));
});

test("schema rejects bad dates with the error on the right field", () => {
  assert.deepEqual(issuePaths({ event_month: "06" }), ["event_year"], "month without a year");
  assert.deepEqual(issuePaths({ event_month: "13", event_year: "2030" }), ["event_month"]);
  assert.deepEqual(issuePaths({ event_month: "6", event_year: "2030" }), ["event_month"]);
  assert.deepEqual(issuePaths({ event_year: "1999" }), ["event_year"]);
  assert.deepEqual(issuePaths({ event_year: "2041" }), ["event_year"]);
  assert.deepEqual(issuePaths({ event_year: "next year" }), ["event_year"]);
  assert.deepEqual(issuePaths({ event_month: "01", event_year: "2024" }), ["event_month"], "past month");
  assert.deepEqual(issuePaths({ preferred_date: "June" }), ["preferred_date"]);
});

test("schema rejects bad names, emails, phones, types, bands and sources", () => {
  assert.deepEqual(issuePaths({ name: " J " }), ["name"]);
  assert.deepEqual(issuePaths({ email: "jane@" }), ["email"]);
  assert.deepEqual(issuePaths({ phone: "call me" }), ["phone"]);
  assert.deepEqual(issuePaths({ phone: "" }), [], "phone stays optional");
  assert.deepEqual(issuePaths({ phone: "+1 (503) 555-0123" }), []);
  assert.deepEqual(issuePaths({ event_type: "" }), ["event_type"]);
  assert.deepEqual(issuePaths({ event_type: "bar-mitzvah" }), ["event_type"]);
  assert.deepEqual(issuePaths({ guest_count: "11 - 20 (full property)" }), ["guest_count"]);
  assert.deepEqual(issuePaths({ guest_count: "500" }), ["guest_count"]);
  assert.deepEqual(issuePaths({ referral_source: "myspace" }), ["referral_source"]);
  assert.deepEqual(issuePaths({ message: "x".repeat(5001) }), ["message"]);
});

test("schema trims name and email and accepts every referral, including Google ad", () => {
  const r = parse({ name: "  Jane Doe ", email: " jane@example.com " });
  assert.equal(r.success, true);
  if (r.success) {
    assert.equal(r.data.name, "Jane Doe");
    assert.equal(r.data.email, "jane@example.com");
  }
  for (const src of REFERRAL_SOURCES) assert.equal(parse({ referral_source: src.value }).success, true, src.value);
  assert.ok(REFERRAL_SOURCES.some((r) => r.value === "google-ad" && r.label === "Google ad"));
});

test("schema accepts the previous form's payload unchanged (deploy window)", () => {
  const old = {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "(555) 123-4567",
    event_type: "wedding",
    guest_count: "50+",
    preferred_date: "2030-09-12",
    referral_source: "google",
    message: "Hi",
    website: "",
    _t: Date.now() - 5000,
    _sid: "abc",
    turnstile_token: "tok",
    consent_marketing_sms: false,
    consent_appointment_sms: true,
  };
  assert.equal(inquirySchema.safeParse(old).success, true);
});

// ── Dates and labels ─────────────────────────────────────────────────────────

test("preferred_date encoding, formatting and the calendar date for CRMs", () => {
  const cases: [Record<string, unknown>, string | null, string, string | null][] = [
    [{ event_month: "06", event_year: "2027" }, "2027-06", "June 2027", "2027-06-01"],
    [{ event_month: "06", event_year: "2027", date_flexible: true }, "2027-06 (flexible)", "June 2027, flexible", "2027-06-01"],
    [{ event_year: "2027" }, "2027", "2027", null],
    [{ event_year: "2027", date_flexible: true }, "2027 (flexible)", "2027, flexible", null],
    [{ date_flexible: true }, "flexible", "Flexible", null],
    [{}, null, "", null],
    [{ preferred_date: "2027-06-14" }, "2027-06-14", "June 14, 2027", "2027-06-14"],
  ];
  for (const [input, stored, label, iso] of cases) {
    const s = encodePreferredDate(input);
    assert.equal(s, stored, JSON.stringify(input));
    assert.equal(formatPreferredDate(s), label, JSON.stringify(input));
    assert.equal(preferredDateIso(s), iso, JSON.stringify(input));
  }
  // Rows written before this change still read sensibly.
  assert.equal(formatPreferredDate("next spring"), "next spring");
});

test("past-month check has one month of grace and year-only is judged by year", () => {
  const now = new Date("2026-10-06T12:00:00Z");
  assert.equal(isPastEventMonth("2026", "10", now), false);
  assert.equal(isPastEventMonth("2026", "09", now), false, "grace for time zones");
  assert.equal(isPastEventMonth("2026", "08", now), true);
  assert.equal(isPastEventMonth("2026", undefined, now), false);
  assert.equal(isPastEventMonth("2025", undefined, now), true);
  assert.deepEqual(eventYearOptions(now), ["2026", "2027", "2028", "2029"]);
});

test("labels for bands and sources, including legacy values", () => {
  assert.equal(guestBandLabel("30-60"), "30 to 60");
  assert.equal(guestBandLabel("9-20"), "9 to 20");
  // Bands sent before 2026-10-07 still label in old rows.
  assert.equal(guestBandLabel("11-20"), "11 to 20");
  assert.equal(guestBandLabel("50+"), "50 or more");
  assert.equal(guestBandPhrase("not-sure"), "Guest count not sure yet");
  assert.equal(guestBandPhrase("100-125"), "100 to 125 guests");
  assert.equal(referralLabel("google"), "Google search");
  assert.equal(referralLabel("google-ad"), "Google ad");
  assert.equal(referralLabel("Squarespace Shop"), "Squarespace Shop");
});

test("names: couples keep a sensible first and last name", () => {
  assert.deepEqual(splitName("Jane and Sam Smith"), { first: "Jane", last: "Smith", hasPartner: true });
  assert.deepEqual(splitName("Jane Doe & Sam Lee"), { first: "Jane", last: "Doe", hasPartner: true });
  assert.deepEqual(splitName("Jane + Sam"), { first: "Jane", last: "", hasPartner: true });
  assert.deepEqual(splitName("  Jane   Doe "), { first: "Jane", last: "Doe", hasPartner: false });
  assert.deepEqual(splitName("Cher"), { first: "Cher", last: "", hasPartner: false });
  // "Alexandra" contains "and" but is not a separator.
  assert.deepEqual(splitName("Alexandra Brandt"), { first: "Alexandra", last: "Brandt", hasPartner: false });
});

// ── A wedding lead, end to end ───────────────────────────────────────────────

const wedding: InquiryInput = {
  name: "Jane and Sam Smith",
  email: "jane@example.com",
  phone: "(503) 555-0123",
  event_type: "wedding",
  guest_count: "60-100",
  event_month: "06",
  event_year: "2027",
  date_flexible: true,
  referral_source: "google-ad",
  message: "We love the cows.",
  consent_marketing_sms: false,
  consent_appointment_sms: true,
  attribution: { utm_source: "google", utm_medium: "cpc", utm_campaign: "wedding-venue-local-or", gclid: "G1" },
  _sid: "sid-1",
};

test("wedding lead → Supabase row (same columns, text values)", () => {
  assert.deepEqual(buildSupabaseRow(wedding), {
    name: "Jane and Sam Smith",
    email: "jane@example.com",
    phone: "(503) 555-0123",
    event_type: "wedding",
    guest_count: "60-100",
    preferred_date: "2027-06 (flexible)",
    referral_source: "google-ad",
    message: "We love the cows.",
    consent_marketing_sms: false,
    consent_appointment_sms: true,
    attribution: wedding.attribution,
  });
});

test("wedding lead → farm email shows month, flexible, band and how they heard", () => {
  const mail = buildInquiryEmail(wedding);
  assert.deepEqual(mail.to, ["events@highlandfarms-oregon.com"]);
  assert.equal(mail.replyTo, "jane@example.com");
  assert.equal(mail.subject, "New Wedding Inquiry from Jane and Sam Smith · June 2027, flexible · 60 to 100 guests");
  assert.deepEqual(
    mail.rows.map((r) => [r.label, r.value]),
    [
      ["Names", "Jane and Sam Smith"],
      ["Email", "jane@example.com"],
      ["Phone", "(503) 555-0123"],
      ["Event type", "Wedding"],
      ["Wedding date", "June 2027, flexible"],
      ["Guests", "60 to 100"],
      ["Heard about us", "Google ad"],
      ["Texts OK", "appointment texts"],
      ["Message", "We love the cows."],
    ],
  );
});

test("wedding lead → HubSpot contact, note and deal", () => {
  const hs = buildHubSpotContact(wedding);
  assert.deepEqual(hs.create, {
    email: "jane@example.com",
    firstname: "Jane",
    lastname: "Smith",
    phone: "(503) 555-0123",
    hf_event_type: "wedding",
    hf_guest_count: "60-100",
    hf_preferred_date: "2027-06 (flexible)",
    hf_referral_source: "google-ad",
  });
  // An existing contact only gets the inquiry fields, never a new name or phone.
  assert.deepEqual(hs.update, {
    hf_event_type: "wedding",
    hf_guest_count: "60-100",
    hf_preferred_date: "2027-06 (flexible)",
    hf_referral_source: "google-ad",
  });
  const note = buildHubSpotNote(wedding);
  assert.match(note, /Names: Jane and Sam Smith/);
  assert.match(note, /Guest Count: 60 to 100/);
  assert.match(note, /Wedding Date: June 2027, flexible/);
  assert.match(note, /Referral Source: Google ad/);
  assert.match(note, /Attribution:\nutm_source: google/);
  assert.deepEqual(buildHubSpotDeal(wedding), {
    dealname: "Jane Smith – wedding (June 2027, flexible)",
    closedate: "2027-06-01",
  });
});

test("wedding lead → BookedIQ custom fields use only values the fields accept", () => {
  const c = buildBookedIQContact(wedding);
  assert.equal(c.firstName, "Jane");
  assert.equal(c.lastName, "Smith");
  assert.equal(c.source, "Website - Contact Form");
  assert.deepEqual(c.tags, [
    "source :: contact form",
    "utm_source :: google",
    "utm_campaign :: wedding-venue-local-or",
    "sms consent :: appointments",
  ]);
  const byId = Object.fromEntries((c.customFields ?? []).map((f) => [f.id, f.field_value]));
  assert.equal(byId[BOOKEDIQ_FIELD.eventType], "wedding");
  assert.equal(byId[BOOKEDIQ_FIELD.guestCount], "60 to 100");
  // DATE field: a real day only (first of the month), never "June 2027".
  assert.equal(byId[BOOKEDIQ_FIELD.eventDate], "2027-06-01");
  assert.match(byId[BOOKEDIQ_FIELD.eventDate], /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(byId[BOOKEDIQ_FIELD.howHeard], "Google Ad");
  assert.equal(byId[BOOKEDIQ_FIELD.eventDateMeta], undefined, "Meta-only field untouched");
  assert.equal(
    byId[BOOKEDIQ_FIELD.message],
    "Names: Jane and Sam Smith\nWedding date: June 2027, flexible\n\nWe love the cows.\n\nAttribution:\nutm_source: google\nutm_medium: cpc\nutm_campaign: wedding-venue-local-or\ngclid: G1",
  );
});

test("every How-did-you-hear answer maps to an exact BookedIQ picklist option", () => {
  // Live picklist on field YKJFaETa1FNabZohr92y, read 2026-10-06.
  const live = [
    "Instagram", "Facebook", "Tik-Tok", "Google Search", "Google Ad", "Website", "Airbnb",
    "From someone you know", "Wedding Wire / The Knot", "Travel Oregon", "Other",
  ];
  for (const src of REFERRAL_SOURCES) assert.ok(live.includes(src.bookediq), src.value);
});

test("BookedIQ field ids are unchanged (the Meta lead path shares them)", () => {
  assert.deepEqual(BOOKEDIQ_FIELD, {
    eventType: "SU7feL5qc3Rof5oH00K9",
    guestCount: "oC80o6RFqL8IjgYfudqM",
    eventDate: "bD5UbqcequJXjdwM7q6s",
    eventDateMeta: "P1OnvSvlMzgRA4i526jh",
    message: "XdkbuNVwwMGVNIlCRfpE",
    howHeard: "YKJFaETa1FNabZohr92y",
  });
});

test("BookedIQ DATE field is skipped when there is no month to put a day on", () => {
  for (const extra of [{ event_month: "", event_year: "2027" }, { event_month: "", event_year: "", date_flexible: true }]) {
    const c = buildBookedIQContact({ ...wedding, ...extra });
    assert.equal(c.customFields?.find((f) => f.id === BOOKEDIQ_FIELD.eventDate), undefined, JSON.stringify(extra));
  }
});

test("wedding lead → exactly one generate_lead, plus generate_lead_wedding", () => {
  for (const gtmLoaded of [true, false]) {
    const events = buildGa4LeadEvents({ ...wedding, _gtm: gtmLoaded });
    assert.equal(totalGenerateLead(events, gtmLoaded), 1, `gtm loaded: ${gtmLoaded}`);
    const lead = events.find((e) => e.event_name === "generate_lead");
    if (lead) {
      assert.equal(lead.event_type, "wedding");
      assert.equal(lead.event_id, "sid-1");
    }
    const weddingEvents = events.filter((e) => e.event_name === "generate_lead_wedding");
    assert.equal(weddingEvents.length, 1, "Google Ads import 7520960358 still fed");
    assert.equal(weddingEvents[0].event_id, "sid-1:wedding");
    assert.equal(weddingEvents[0].event_type, "wedding");
  }
  // A payload from the old client has no _gtm: the server sends generate_lead.
  assert.equal(buildGa4LeadEvents(wedding).filter((e) => e.event_name === "generate_lead").length, 1);
});

test("dataLayer push keeps the exact shape GTM tags 114/122/128/146/152 read", () => {
  assert.deepEqual(buildFormSubmissionPush(wedding), {
    event: "form_submission",
    form_name: "event_inquiry",
    event_type: "wedding",
    event_id: "sid-1",
    email: "jane@example.com",
    phone: "(503) 555-0123",
  });
  assert.equal("phone" in buildFormSubmissionPush({ ...wedding, phone: "" }), false);
});

test("wedding call link is prefilled for Acuity", () => {
  const href = weddingCallHref(
    "https://highlandfarms.as.me/schedule/e759f21b/appointment/78277096/calendar/12109481?utm_content=x",
    wedding,
  );
  const u = new URL(href);
  assert.equal(u.searchParams.get("firstName"), "Jane");
  assert.equal(u.searchParams.get("lastName"), "Smith");
  assert.equal(u.searchParams.get("email"), "jane@example.com");
  assert.equal(u.searchParams.get("phone"), "(503) 555-0123");
  assert.equal(u.searchParams.get("utm_content"), "x");
  assert.equal(new URL(weddingCallHref("https://example.com/a", {})).search, "", "no blanks when nothing typed");
});

// ── A non-wedding lead, end to end ───────────────────────────────────────────

const birthday: InquiryInput = {
  name: "Pat Lee",
  email: "pat@example.com",
  event_type: "celebration",
  guest_count: "21-50",
  event_year: "2027",
  event_month: "",
  referral_source: "word-of-mouth",
  message: "",
  _sid: "sid-2",
};

test("non-wedding lead → Supabase, email, HubSpot, BookedIQ", () => {
  const row = buildSupabaseRow(birthday);
  assert.equal(row.guest_count, "21-50");
  assert.equal(row.preferred_date, "2027");
  assert.equal(row.phone, null);
  assert.equal(row.message, null);
  assert.equal(row.attribution, null);

  const mail = buildInquiryEmail(birthday);
  assert.deepEqual(mail.to, ["events@highlandfarms-oregon.com"]);
  assert.equal(mail.subject, "New Birthday / Anniversary Inquiry from Pat Lee · 2027 · 21 to 50 guests");
  assert.deepEqual(
    mail.rows.map((r) => [r.label, r.value]),
    [
      ["Name", "Pat Lee"],
      ["Email", "pat@example.com"],
      ["Event type", "Birthday / Anniversary"],
      ["Event date", "2027"],
      ["Guests", "21 to 50"],
      ["Heard about us", "Word of mouth"],
    ],
  );

  assert.deepEqual(buildHubSpotContact(birthday).create, {
    email: "pat@example.com",
    firstname: "Pat",
    lastname: "Lee",
    hf_event_type: "celebration",
    hf_guest_count: "21-50",
    hf_preferred_date: "2027",
    hf_referral_source: "word-of-mouth",
  });
  const deal = buildHubSpotDeal(birthday, new Date("2026-10-06T00:00:00Z"));
  assert.equal(deal.dealname, "Pat Lee – celebration (2027)");
  assert.equal(deal.closedate, "2027-04-04", "year only: six months out, not an invented day");

  const c = buildBookedIQContact(birthday);
  const byId = Object.fromEntries((c.customFields ?? []).map((f) => [f.id, f.field_value]));
  assert.deepEqual(byId, {
    [BOOKEDIQ_FIELD.eventType]: "celebration",
    [BOOKEDIQ_FIELD.guestCount]: "21 to 50",
    [BOOKEDIQ_FIELD.howHeard]: "From someone you know",
    [BOOKEDIQ_FIELD.message]: "Event date: 2027",
  });
  assert.deepEqual(c.tags, ["source :: contact form"]);
});

test("non-wedding lead → exactly one generate_lead and no wedding event", () => {
  for (const gtmLoaded of [true, false]) {
    const events = buildGa4LeadEvents({ ...birthday, _gtm: gtmLoaded });
    assert.equal(totalGenerateLead(events, gtmLoaded), 1, `gtm loaded: ${gtmLoaded}`);
    assert.equal(events.some((e) => e.event_name === "generate_lead_wedding"), false);
  }
  const serverOnly = buildGa4LeadEvents({ ...birthday, _gtm: false });
  assert.deepEqual(serverOnly, [
    { event_name: "generate_lead", event_type: "celebration", form_name: "event_inquiry", event_id: "sid-2" },
  ]);
});

test("general contact inquiries still go to info@", () => {
  assert.deepEqual(buildInquiryEmail({ ...birthday, event_type: "farm-stay" }).to, ["info@highlandfarms-oregon.com"]);
  assert.deepEqual(buildInquiryEmail({ ...birthday, event_type: "other" }).to, ["info@highlandfarms-oregon.com"]);
  assert.deepEqual(buildInquiryEmail({ ...birthday, event_type: "elopement" }).to, ["events@highlandfarms-oregon.com"]);
});
