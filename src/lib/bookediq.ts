import { type InquiryFormData } from "@/lib/schemas";

const GHL_API = "https://services.leadconnectorhq.com";

// Custom field IDs for Highland Farms location (MF69VyOlWn4TT9g8AiDp)
const FIELD_EVENT_TYPE   = "SU7feL5qc3Rof5oH00K9"; // Desired Event Type
const FIELD_GUEST_COUNT  = "oC80o6RFqL8IjgYfudqM"; // Estimated Number of Guests
const FIELD_EVENT_DATE   = "bD5UbqcequJXjdwM7q6s"; // Desired Event Date
const FIELD_MESSAGE      = "XdkbuNVwwMGVNIlCRfpE"; // Contact Form Message

export async function syncInquiryToBookedIQ(data: InquiryFormData): Promise<void> {
  const locationId = process.env.BOOKEDIQ_LOCATION_ID;
  const pit = process.env.BOOKEDIQ_PIT;
  if (!locationId || !pit) return;

  const [firstName, ...rest] = data.name.trim().split(/\s+/);
  const lastName = rest.join(" ");

  const customFields: { id: string; field_value: string }[] = [];
  if (data.event_type)    customFields.push({ id: FIELD_EVENT_TYPE,  field_value: data.event_type });
  if (data.guest_count)   customFields.push({ id: FIELD_GUEST_COUNT, field_value: data.guest_count });
  if (data.preferred_date) customFields.push({ id: FIELD_EVENT_DATE, field_value: data.preferred_date });
  if (data.message)       customFields.push({ id: FIELD_MESSAGE,     field_value: data.message });

  const headers = {
    Authorization: `Bearer ${pit}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };

  const tags = ["source :: contact form"];
  if (data.consent_marketing_sms)    tags.push("sms consent :: marketing");
  if (data.consent_appointment_sms)  tags.push("sms consent :: appointments");

  try {
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
      console.error("BookedIQ upsert error:", res.status, err);
    }
  } catch (err) {
    console.error("BookedIQ sync error:", err);
  }
}
