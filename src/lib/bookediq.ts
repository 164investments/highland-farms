import { type InquiryFormData } from "@/lib/schemas";
import { type MetaLeadData } from "@/lib/meta-leads";
import { formatAttribution } from "@/lib/attribution";

const GHL_API = "https://services.leadconnectorhq.com";

// Custom field IDs for Highland Farms location (MF69VyOlWn4TT9g8AiDp)
const FIELD_EVENT_TYPE      = "SU7feL5qc3Rof5oH00K9"; // Desired Event Type
const FIELD_GUEST_COUNT     = "oC80o6RFqL8IjgYfudqM"; // Estimated Number of Guests
const FIELD_EVENT_DATE      = "bD5UbqcequJXjdwM7q6s"; // Desired Event Date (DATE type — strict)
const FIELD_EVENT_DATE_META = "P1OnvSvlMzgRA4i526jh"; // Desired Event Date (Meta) — free text for enum ranges
const FIELD_MESSAGE         = "XdkbuNVwwMGVNIlCRfpE"; // Contact Form Message

export async function syncInquiryToBookedIQ(data: InquiryFormData): Promise<void> {
  const locationId = process.env.BOOKEDIQ_LOCATION_ID?.trim();
  const pit = process.env.BOOKEDIQ_PIT?.trim();
  if (!locationId || !pit) {
    throw new Error("BookedIQ credentials missing (BOOKEDIQ_LOCATION_ID or BOOKEDIQ_PIT)");
  }

  const [firstName, ...rest] = data.name.trim().split(/\s+/);
  const lastName = rest.join(" ");

  const attributionText = formatAttribution(data.attribution);
  const messageText = [data.message, attributionText ? `Attribution:\n${attributionText}` : null]
    .filter(Boolean)
    .join("\n\n");

  const customFields: { id: string; field_value: string }[] = [];
  if (data.event_type)    customFields.push({ id: FIELD_EVENT_TYPE,  field_value: data.event_type });
  if (data.guest_count)   customFields.push({ id: FIELD_GUEST_COUNT, field_value: data.guest_count });
  if (data.preferred_date) customFields.push({ id: FIELD_EVENT_DATE, field_value: data.preferred_date });
  if (messageText)        customFields.push({ id: FIELD_MESSAGE,     field_value: messageText });

  const headers = {
    Authorization: `Bearer ${pit}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };

  const tags = ["source :: contact form"];
  if (data.attribution?.utm_source) tags.push(`utm_source :: ${data.attribution.utm_source}`);
  if (data.attribution?.utm_campaign) tags.push(`utm_campaign :: ${data.attribution.utm_campaign}`);
  if (data.consent_marketing_sms)    tags.push("sms consent :: marketing");
  if (data.consent_appointment_sms)  tags.push("sms consent :: appointments");

  const res = await fetch(`${GHL_API}/contacts/upsert`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      locationId,
      firstName,
      ...(lastName && { lastName }),
      email: data.email,
      ...(data.phone && { phone: data.phone }),
      source: "Website - Contact Form",
      tags,
      ...(customFields.length > 0 && { customFields }),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`BookedIQ upsert error: ${res.status} ${err}`);
  }
}

export async function syncMetaLeadToBookedIQ(lead: MetaLeadData): Promise<void> {
  const locationId = process.env.BOOKEDIQ_LOCATION_ID?.trim();
  const pit = process.env.BOOKEDIQ_PIT?.trim();
  if (!locationId || !pit) {
    throw new Error("BookedIQ credentials missing (BOOKEDIQ_LOCATION_ID or BOOKEDIQ_PIT)");
  }

  const [firstName, ...rest] = (lead.name || "Unknown").trim().split(/\s+/);
  const lastName = rest.join(" ");

  // Meta's wedding date_range is an enum, not a parseable date. The canonical
  // FIELD_EVENT_DATE is dataType=DATE and 400s on non-numeric values, so route
  // all four enums to FIELD_EVENT_DATE_META (free text) instead. Keep the
  // timeline in the message body as a redundant signal for the events team.
  const dr = lead.weddingDateRange;
  const timelineLabel: Record<string, string> = {
    just_starting_to_plan: "Just starting to plan",
    "12–18_months": "12–18 months out",
    "6–12_months": "6–12 months out",
    within_6_months: "Within 6 months",
  };

  const messageParts: string[] = [];
  if (lead.weddingBudget) messageParts.push(`Budget: ${lead.weddingBudget}`);
  if (dr) messageParts.push(`Timeline: ${timelineLabel[dr] ?? dr}`);
  if (lead.venuePriorities?.length) messageParts.push(`Venue priorities: ${lead.venuePriorities.join(", ")}`);
  if (lead.inboxUrl) messageParts.push(`Messenger: ${lead.inboxUrl}`);
  if (lead.adName) messageParts.push(`Ad: ${lead.adName}`);

  const customFields: { id: string; field_value: string }[] = [
    { id: FIELD_EVENT_TYPE, field_value: "wedding" },
  ];
  if (dr) customFields.push({ id: FIELD_EVENT_DATE_META, field_value: dr });
  if (messageParts.length) customFields.push({ id: FIELD_MESSAGE, field_value: messageParts.join("\n") });

  const headers = {
    Authorization: `Bearer ${pit}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };

  const res = await fetch(`${GHL_API}/contacts/upsert`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      locationId,
      firstName,
      ...(lastName && { lastName }),
      ...(lead.email && { email: lead.email }),
      ...(lead.phone && { phone: lead.phone }),
      source: "Meta Lead Ad",
      tags: ["source :: meta lead ad", "wedding lead"],
      customFields,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`BookedIQ meta lead upsert error: ${res.status} ${err}`);
  }
}
