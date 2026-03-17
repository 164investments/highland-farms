/**
 * Meta Lead Gen Webhook Handler
 *
 * Receives real-time leadgen events from Meta whenever someone completes
 * an instant form on an ad. Routes leads to BookedIQ, HubSpot, Supabase,
 * email notification, and GA4 — matching the pattern of /api/acuity/webhook.
 *
 * Meta sends webhooks for the active form:
 *   "Wedding Form - 1.1.26" (ID: 719780940881086)
 *
 * Security: HMAC-SHA256 signature verification on every POST using
 * META_APP_SECRET. GET requests handle Meta's webhook verification challenge.
 *
 * Env vars required:
 *   META_WEBHOOK_VERIFY_TOKEN  — random token you set in Meta Events Manager
 *   META_APP_SECRET            — app secret from Meta developer portal
 *   META_PAGE_ACCESS_TOKEN     — long-lived page access token
 *   META_PAGE_ID               — Facebook Page ID (102331176047064)
 */

import { after, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { fetchMetaLead, normalizeMetaLead } from "@/lib/meta-leads";
import { syncMetaLeadToBookedIQ } from "@/lib/bookediq";
import { syncMetaLeadToHubSpot } from "@/lib/hubspot";
import { sendMetaLeadNotification } from "@/lib/email";
import { sendGenerateLead } from "@/lib/ga4";

// ── GET — webhook verification challenge ─────────────────────────────────────
// Meta sends this once when you register the webhook subscription.
// Must respond with the raw hub.challenge value as plain text.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// ── POST — live lead events ───────────────────────────────────────────────────
export async function POST(request: Request) {
  // Read raw body for HMAC verification
  const rawBody = await request.text();

  // Verify Meta signature — X-Hub-Signature-256: sha256=<hex>
  const appSecret = process.env.META_APP_SECRET;
  if (appSecret) {
    const sigHeader = request.headers.get("x-hub-signature-256") ?? "";
    const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");

    // Constant-time comparison to prevent timing attacks
    if (
      sigHeader.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected))
    ) {
      console.error("Meta webhook signature mismatch");
      // Return 200 to prevent retries — bad actor or misconfigured secret
      return NextResponse.json({ ok: true });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("Meta webhook: invalid JSON body");
    return NextResponse.json({ ok: true });
  }

  // Only handle Page object leadgen events
  if (payload.object !== "page") {
    return NextResponse.json({ ok: true });
  }

  const entries = payload.entry as Array<{ changes?: Array<{ field: string; value: { leadgen_id?: string; page_id?: string; form_id?: string; ad_id?: string; ad_name?: string; campaign_id?: string } }> }> ?? [];

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;

      const { leadgen_id: leadgenId, form_id: formId, ad_id: adId, ad_name: adName, campaign_id: campaignId } = change.value;
      if (!leadgenId) continue;

      after(async () => {
        await processLead(leadgenId, { formId, adId, adName, campaignId }).catch((err) => {
          console.error("Meta lead processing error:", leadgenId, err);
        });
      });
    }
  }

  // Always return 200 immediately — prevents Meta from retrying
  return NextResponse.json({ ok: true });
}

// ── Processing pipeline ───────────────────────────────────────────────────────
async function processLead(
  leadgenId: string,
  meta: { formId?: string; adId?: string; adName?: string; campaignId?: string }
) {
  // Fetch full lead data from Graph API
  const rawLead = await fetchMetaLead(leadgenId);
  if (!rawLead) {
    console.error("Meta lead: could not fetch lead data for", leadgenId);
    return;
  }

  const lead = normalizeMetaLead(rawLead);

  // Ensure ad context from webhook payload is included if Graph API didn't return it
  if (!lead.adId && meta.adId) lead.adId = meta.adId;
  if (!lead.adName && meta.adName) lead.adName = meta.adName;
  if (!lead.campaignId && meta.campaignId) lead.campaignId = meta.campaignId;
  if (!lead.formId && meta.formId) lead.formId = meta.formId;

  // Upsert into Supabase meta_leads table
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseServiceKey) {
    const db = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await db.from("meta_leads").upsert(
      {
        leadgen_id: lead.leadgenId,
        form_id: lead.formId ?? null,
        ad_id: lead.adId ?? null,
        ad_name: lead.adName ?? null,
        campaign_id: lead.campaignId ?? null,
        name: lead.name || null,
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        wedding_date_range: lead.weddingDateRange ?? null,
        wedding_budget: lead.weddingBudget ?? null,
        venue_priorities: lead.venuePriorities ?? null,
        inbox_url: lead.inboxUrl ?? null,
        raw: rawLead,
      },
      { onConflict: "leadgen_id" }
    );
    if (error) console.error("Supabase meta_leads upsert error:", error);
  }

  await Promise.all([
    syncMetaLeadToBookedIQ(lead)
      .then(async () => {
        if (supabaseUrl && supabaseServiceKey) {
          const db = createClient(supabaseUrl, supabaseServiceKey);
          await db.from("meta_leads")
            .update({ synced_to_bookediq: true })
            .eq("leadgen_id", lead.leadgenId);
        }
      })
      .catch((err) => console.error("BookedIQ meta lead sync error:", err)),

    syncMetaLeadToHubSpot(lead)
      .then(async () => {
        if (supabaseUrl && supabaseServiceKey) {
          const db = createClient(supabaseUrl, supabaseServiceKey);
          await db.from("meta_leads")
            .update({ synced_to_hubspot: true })
            .eq("leadgen_id", lead.leadgenId);
        }
      })
      .catch((err) => console.error("HubSpot meta lead sync error:", err)),

    sendMetaLeadNotification(lead).catch((err) =>
      console.error("Meta lead email notification error:", err)
    ),

    sendGenerateLead(null, {
      event_type: "wedding",
      form_name: "meta_lead_ad",
      event_name: "generate_lead",
    }).catch((err) => console.error("GA4 meta lead error:", err)),

    sendGenerateLead(null, {
      event_type: "wedding",
      form_name: "meta_lead_ad",
      event_name: "generate_lead_wedding",
    }).catch((err) => console.error("GA4 meta lead wedding event error:", err)),
  ]);
}
