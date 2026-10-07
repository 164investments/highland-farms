import { type InquiryFormData } from "@/lib/schemas";
import { type MetaLeadData } from "@/lib/meta-leads";
import { buildHubSpotContact, buildHubSpotDeal, buildHubSpotNote } from "@/lib/inquiry-mapping";

const API = "https://api.hubapi.com";

// HubSpot-defined association type IDs
const NOTE_TO_CONTACT_TYPE_ID = 202; // note → contact
const DEAL_TO_CONTACT_TYPE_ID = 3;   // deal → contact

export async function syncInquiryToHubSpot(data: InquiryFormData): Promise<void> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN?.trim();
  if (!token) return;

  // Every property value comes from the inquiry mapping (src/lib/inquiry-mapping.ts).
  const contact = buildHubSpotContact(data);
  const authHeader = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // ── 1. Create or resolve contact ───────────────────────────────────────────
  let contactId: string | undefined;

  try {
    const createRes = await fetch(`${API}/crm/v3/objects/contacts`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({ properties: contact.create }),
    });

    if (createRes.ok) {
      const body = await createRes.json();
      contactId = body.id;
    } else if (createRes.status === 409) {
      // Contact already exists — fetch by email, then patch custom properties
      const getRes = await fetch(
        `${API}/crm/v3/objects/contacts/${encodeURIComponent(contact.create.email)}?idProperty=email`,
        { headers: authHeader }
      );
      if (getRes.ok) {
        const body = await getRes.json();
        contactId = body.id;

        // Update the existing contact with latest inquiry data
        await fetch(`${API}/crm/v3/objects/contacts/${contactId}`, {
          method: "PATCH",
          headers: authHeader,
          body: JSON.stringify({ properties: contact.update }),
        });
      }
    }
  } catch (err) {
    console.error("HubSpot contact error:", err);
  }

  if (!contactId) return;

  // ── 2. Add a note with the full free-text message ──────────────────────────
  try {
    await fetch(`${API}/crm/v3/objects/notes`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        properties: {
          hs_note_body: buildHubSpotNote(data),
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
    // Close date: first of the chosen month if given, else six months out.
    const { dealname, closedate } = buildHubSpotDeal(data);
    const dealStage = process.env.HUBSPOT_DEAL_STAGE_NEW_LEAD?.trim() ?? "";

    const dealRes = await fetch(`${API}/crm/v3/objects/deals`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        properties: {
          dealname,
          pipeline: pipelineId,
          dealstage: dealStage,
          closedate,
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
 *
 * The live property defines exactly: under_6000, 6000_to_10000, 10000_to_15000,
 * 15000_to_20000, 20000_plus, not_sure. "$20,000+" is the top bucket, so every
 * band above it collapses into it.
 *
 * Order matters. Ranges are matched before open-ended bands, because
 * "$20,000–$30,000" contains both 20000 and 30000 and must not be read as "$30,000+".
 */
export function normalizeMetaBudget(raw: string): string {
  const lower = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (lower.includes("under") || lower.startsWith("under")) return "under_6000";
  if (lower.includes("6000") && lower.includes("10000")) return "6000_to_10000";
  if (lower.includes("10000") && lower.includes("15000")) return "10000_to_15000";
  if (lower.includes("15000") && lower.includes("20000")) return "15000_to_20000";
  if (lower.includes("20000") || lower.includes("20k")) return "20000_plus";
  // "$30,000+" reached the raw fallback before this line and HubSpot rejected it,
  // so the top-budget leads — the ones worth the most — lost their budget in the CRM.
  if (lower.includes("30000") || lower.includes("30k")) return "20000_plus";
  if (lower.includes("notsure") || lower.includes("sure")) return "not_sure";
  // Return raw as fallback — HubSpot will reject unknown enum values gracefully
  return raw;
}
