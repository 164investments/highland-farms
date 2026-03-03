/**
 * Meta Lead Gen — fetches and normalizes leads from Meta instant forms.
 *
 * Used by the /api/meta/webhook route to pull full lead data after receiving
 * a leadgen webhook event. Meta only sends the leadgen_id in the webhook;
 * the actual field data must be fetched from the Graph API.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 */

const GRAPH_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface MetaLeadData {
  leadgenId: string;
  formId?: string;
  adId?: string;
  adName?: string;
  campaignId?: string;
  name: string;
  email?: string;
  phone?: string;
  /** "Within 6 months" | "6–12 months" | "12–18 months" | "Just starting to plan" */
  weddingDateRange?: string;
  /** "Under $6,000" | "$6,000–$10,000" | "$10,000–$15,000" | "$15,000+" */
  weddingBudget?: string;
  /** ["Private, exclusive setting", "On-site catering", ...] */
  venuePriorities?: string[];
  /** Messenger thread link included by Meta in leadgen forms */
  inboxUrl?: string;
  createdTime?: string;
}

interface FieldData {
  name: string;
  values: string[];
}

interface RawMetaLead {
  id: string;
  created_time?: string;
  ad_id?: string;
  ad_name?: string;
  campaign_id?: string;
  form_id?: string;
  field_data?: FieldData[];
}

/**
 * Fetches the full lead record from the Graph API using the leadgen ID.
 * Requires META_PAGE_ACCESS_TOKEN env var (long-lived page token).
 */
export async function fetchMetaLead(leadgenId: string): Promise<RawMetaLead | null> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.error("META_PAGE_ACCESS_TOKEN not set");
    return null;
  }

  const fields = "field_data,created_time,ad_id,ad_name,campaign_id,form_id";
  const url = `${GRAPH_BASE}/${leadgenId}?fields=${fields}&access_token=${token}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Meta lead fetch error:", res.status, err);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("Meta lead fetch network error:", err);
    return null;
  }
}

/**
 * Normalizes the raw Graph API field_data array into a typed MetaLeadData object.
 * Field names come from the form definition ("Wedding Form - 1.1.26", ID 719780940881086).
 */
export function normalizeMetaLead(raw: RawMetaLead): MetaLeadData {
  const fields: Record<string, string | string[]> = {};

  for (const field of raw.field_data ?? []) {
    // Multi-select fields have multiple values
    if (field.values.length > 1) {
      fields[field.name] = field.values;
    } else {
      fields[field.name] = field.values[0] ?? "";
    }
  }

  // Standard Meta fields
  const name = (fields["full_name"] as string) || "";
  const email = (fields["email"] as string) || undefined;
  const phone = (fields["phone_number"] as string) || undefined;

  // Custom form fields from Wedding Form 1.1.26
  const weddingDateRange = (fields["_estimated_wedding_date_or_season"] as string) || undefined;
  const weddingBudget = (fields["estimated_total_wedding_budget"] as string) || undefined;
  const inboxUrl = (fields["inbox_url"] as string) || undefined;

  // Multi-select venue priorities
  const rawPriorities = fields["what_matters_most_to_you_in_a_venue?"];
  const venuePriorities = Array.isArray(rawPriorities)
    ? rawPriorities
    : rawPriorities
    ? [rawPriorities]
    : undefined;

  return {
    leadgenId: raw.id,
    formId: raw.form_id,
    adId: raw.ad_id,
    adName: raw.ad_name,
    campaignId: raw.campaign_id,
    createdTime: raw.created_time,
    name,
    email,
    phone,
    weddingDateRange,
    weddingBudget,
    venuePriorities,
    inboxUrl,
  };
}
