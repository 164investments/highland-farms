import { type InquiryFormData } from "@/lib/schemas";
import { type MetaLeadData } from "@/lib/meta-leads";

const API = "https://api.hubapi.com";

// HubSpot-defined association type IDs
const NOTE_TO_CONTACT_TYPE_ID = 202; // note → contact
const DEAL_TO_CONTACT_TYPE_ID = 3;   // deal → contact

export async function syncInquiryToHubSpot(data: InquiryFormData): Promise<void> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN?.trim();
  if (!token) return;

  const [firstname, ...rest] = data.name.trim().split(/\s+/);
  const lastname = rest.join(" ");

  const authHeader = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // ── 1. Create or resolve contact ───────────────────────────────────────────
  let contactId: string | undefined;

  try {
    const createRes = await fetch(`${API}/crm/v3/objects/contacts`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        properties: {
          email: data.email,
          firstname,
          ...(lastname && { lastname }),
          ...(data.phone && { phone: data.phone }),
          ...(data.event_type && { hf_event_type: data.event_type }),
          ...(data.guest_count && { hf_guest_count: data.guest_count }),
          ...(data.preferred_date && { hf_preferred_date: data.preferred_date }),
          ...(data.referral_source && { hf_referral_source: data.referral_source }),
        },
      }),
    });

    if (createRes.ok) {
      const body = await createRes.json();
      contactId = body.id;
    } else if (createRes.status === 409) {
      // Contact already exists — fetch by email, then patch custom properties
      const getRes = await fetch(
        `${API}/crm/v3/objects/contacts/${encodeURIComponent(data.email)}?idProperty=email`,
        { headers: authHeader }
      );
      if (getRes.ok) {
        const body = await getRes.json();
        contactId = body.id;

        // Update the existing contact with latest inquiry data
        await fetch(`${API}/crm/v3/objects/contacts/${contactId}`, {
          method: "PATCH",
          headers: authHeader,
          body: JSON.stringify({
            properties: {
              ...(data.event_type && { hf_event_type: data.event_type }),
              ...(data.guest_count && { hf_guest_count: data.guest_count }),
              ...(data.preferred_date && { hf_preferred_date: data.preferred_date }),
              ...(data.referral_source && { hf_referral_source: data.referral_source }),
            },
          }),
        });
      }
    }
  } catch (err) {
    console.error("HubSpot contact error:", err);
  }

  if (!contactId) return;

  // ── 2. Add a note with the full free-text message ──────────────────────────
  try {
    const noteLines = [
      `Event Type: ${data.event_type}`,
      data.guest_count ? `Guest Count: ${data.guest_count}` : null,
      data.preferred_date ? `Preferred Date: ${data.preferred_date}` : null,
      data.referral_source ? `Referral Source: ${data.referral_source}` : null,
      data.message ? `\nMessage:\n${data.message}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    await fetch(`${API}/crm/v3/objects/notes`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        properties: {
          hs_note_body: `Highland Farms inquiry from website:\n\n${noteLines}`,
          hs_timestamp: new Date().toISOString(),
        },
        associations: [
          {
            to: { id: contactId },
            types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: NOTE_TO_CONTACT_TYPE_ID }],
          },
        ],
      }),
    });
  } catch (err) {
    console.error("HubSpot note error:", err);
  }

  // ── 3. Create a deal and associate it to the contact ───────────────────────
  const pipelineId = process.env.HUBSPOT_PIPELINE_ID?.trim();
  if (!pipelineId) return; // Skip deal creation until pipeline is set up

  try {
    const dealName = [
      `${firstname}${lastname ? ` ${lastname}` : ""}`,
      "–",
      data.event_type || "Inquiry",
      `(${data.preferred_date || "TBD"})`,
    ].join(" ");

    // Close date: preferred_date if provided, else 6 months from now
    const closeDate = data.preferred_date
      ? new Date(data.preferred_date).toISOString().split("T")[0]
      : new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const dealStage = process.env.HUBSPOT_DEAL_STAGE_NEW_LEAD?.trim() ?? "";

    const dealRes = await fetch(`${API}/crm/v3/objects/deals`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        properties: {
          dealname: dealName,
          pipeline: pipelineId,
          dealstage: dealStage,
          closedate: closeDate,
        },
      }),
    });

    if (dealRes.ok) {
      const deal = await dealRes.json();
      const dealId: string = deal.id;

      // Associate deal → contact
      await fetch(`${API}/crm/v4/associations/deals/contacts/batch/create`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          inputs: [
            {
              from: { id: dealId },
              to: { id: contactId },
              types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: DEAL_TO_CONTACT_TYPE_ID }],
            },
          ],
        }),
      });
    }
  } catch (err) {
    console.error("HubSpot deal error:", err);
  }
}

export async function syncMetaLeadToHubSpot(lead: MetaLeadData): Promise<void> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN?.trim();
  if (!token) return;

  const [firstname, ...rest] = (lead.name || "Unknown").trim().split(/\s+/);
  const lastname = rest.join(" ");

  const authHeader = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // ── 1. Create or resolve contact ───────────────────────────────────────────
  let contactId: string | undefined;

  try {
    const createRes = await fetch(`${API}/crm/v3/objects/contacts`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        properties: {
          ...(lead.email && { email: lead.email }),
          firstname,
          ...(lastname && { lastname }),
          ...(lead.phone && { phone: lead.phone }),
          hf_event_type: "wedding",
          ...(lead.weddingDateRange && { hf_preferred_date: lead.weddingDateRange }),
          ...(lead.weddingBudget && { hf_wedding_budget: normalizeMetaBudget(lead.weddingBudget) }),
          ...(lead.venuePriorities?.length && { hf_venue_priorities: lead.venuePriorities.join(", ") }),
          hf_referral_source: "Meta Lead Ad",
        },
      }),
    });

    if (createRes.ok) {
      const body = await createRes.json();
      contactId = body.id;
    } else if (createRes.status === 409 && lead.email) {
      const getRes = await fetch(
        `${API}/crm/v3/objects/contacts/${encodeURIComponent(lead.email)}?idProperty=email`,
        { headers: authHeader }
      );
      if (getRes.ok) {
        const body = await getRes.json();
        contactId = body.id;

        await fetch(`${API}/crm/v3/objects/contacts/${contactId}`, {
          method: "PATCH",
          headers: authHeader,
          body: JSON.stringify({
            properties: {
              hf_event_type: "wedding",
              ...(lead.weddingDateRange && { hf_preferred_date: lead.weddingDateRange }),
              ...(lead.weddingBudget && { hf_wedding_budget: normalizeMetaBudget(lead.weddingBudget) }),
              ...(lead.venuePriorities?.length && { hf_venue_priorities: lead.venuePriorities.join(", ") }),
              leadsource: "SOCIAL_MEDIA",
            },
          }),
        });
      }
    }
  } catch (err) {
    console.error("HubSpot meta lead contact error:", err);
  }

  if (!contactId) return;

  // ── 2. Add a structured note ────────────────────────────────────────────────
  try {
    const noteLines = [
      "Meta Lead Ad — Highland Farms Wedding Form",
      "",
      lead.weddingBudget ? `Budget: ${lead.weddingBudget}` : null,
      lead.weddingDateRange ? `Wedding Date Range: ${lead.weddingDateRange}` : null,
      lead.venuePriorities?.length
        ? `Venue Priorities:\n${lead.venuePriorities.map((p) => `  • ${p}`).join("\n")}`
        : null,
      lead.adName ? `Ad Name: ${lead.adName}` : null,
      lead.inboxUrl ? `Messenger: ${lead.inboxUrl}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    await fetch(`${API}/crm/v3/objects/notes`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        properties: {
          hs_note_body: noteLines,
          hs_timestamp: new Date().toISOString(),
        },
        associations: [
          {
            to: { id: contactId },
            types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: NOTE_TO_CONTACT_TYPE_ID }],
          },
        ],
      }),
    });
  } catch (err) {
    console.error("HubSpot meta lead note error:", err);
  }

  // ── 3. Create a deal ────────────────────────────────────────────────────────
  const pipelineId = process.env.HUBSPOT_PIPELINE_ID;
  if (!pipelineId) return;

  try {
    const dealStage = process.env.HUBSPOT_DEAL_STAGE_NEW_LEAD ?? "";
    const dealName = `Meta Lead — ${firstname}${lastname ? ` ${lastname}` : ""}`;
    const closeDate = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const dealRes = await fetch(`${API}/crm/v3/objects/deals`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        properties: {
          dealname: dealName,
          pipeline: pipelineId,
          dealstage: dealStage,
          closedate: closeDate,
        },
      }),
    });

    if (dealRes.ok) {
      const deal = await dealRes.json();
      const dealId: string = deal.id;

      await fetch(`${API}/crm/v4/associations/deals/contacts/batch/create`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          inputs: [
            {
              from: { id: dealId },
              to: { id: contactId },
              types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: DEAL_TO_CONTACT_TYPE_ID }],
            },
          ],
        }),
      });
    }
  } catch (err) {
    console.error("HubSpot meta lead deal error:", err);
  }
}

/**
 * Maps Meta lead form budget strings to HubSpot hf_wedding_budget enum values.
 * Meta sends raw form values; HubSpot expects the defined option keys.
 */
function normalizeMetaBudget(raw: string): string {
  const lower = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (lower.includes("under") || lower.startsWith("under")) return "under_6000";
  if (lower.includes("6000") && lower.includes("10000")) return "6000_to_10000";
  if (lower.includes("10000") && lower.includes("15000")) return "10000_to_15000";
  if (lower.includes("15000") && lower.includes("20000")) return "15000_to_20000";
  if (lower.includes("20000") || lower.includes("20k")) return "20000_plus";
  if (lower.includes("notsure") || lower.includes("sure")) return "not_sure";
  // Return raw as fallback — HubSpot will reject unknown enum values gracefully
  return raw;
}
