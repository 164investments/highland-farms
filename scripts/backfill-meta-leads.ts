/**
 * Backfill Meta Lead Gen — recovers leads stranded in Meta's Lead Center.
 *
 * Fetches all leads from the active wedding form and routes any that aren't
 * already in Supabase through the same fan-out pipeline as the live webhook.
 *
 * Usage:
 *   npx tsx --env-file .env.local scripts/backfill-meta-leads.ts
 *
 * Dry run (no CRM sync, no email):
 *   DRY_RUN=true npx tsx --env-file .env.local scripts/backfill-meta-leads.ts
 */

import { createClient } from "@supabase/supabase-js";
import { fetchMetaLead, normalizeMetaLead } from "../src/lib/meta-leads";
import { syncMetaLeadToBookedIQ } from "../src/lib/bookediq";
import { syncMetaLeadToHubSpot } from "../src/lib/hubspot";
import { sendMetaLeadNotification } from "../src/lib/email";
import { sendGenerateLead } from "../src/lib/ga4";

const FORM_ID = "719780940881086"; // Wedding Form - 1.1.26
const GRAPH_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const DRY_RUN = process.env.DRY_RUN === "true";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PagedLeads {
  data: Array<{ id: string; created_time?: string }>;
  paging?: { cursors?: { after?: string }; next?: string };
}

async function fetchFormLeads(after?: string): Promise<PagedLeads> {
  const token = process.env.META_PAGE_ACCESS_TOKEN!;
  const params = new URLSearchParams({
    access_token: token,
    limit: "100",
    ...(after && { after }),
  });
  const res = await fetch(`${GRAPH_BASE}/${FORM_ID}/leads?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Graph API error: ${JSON.stringify(err)}`);
  }
  return res.json();
}

async function getExistingLeadgenIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from("meta_leads").select("leadgen_id");
  if (error) throw error;
  return new Set((data ?? []).map((r: { leadgen_id: string }) => r.leadgen_id));
}

async function main() {
  console.log(`Starting Meta lead backfill — form ${FORM_ID}${DRY_RUN ? " [DRY RUN]" : ""}`);

  const existing = await getExistingLeadgenIds();
  console.log(`Already in Supabase: ${existing.size} leads`);

  let after: string | undefined;
  let totalFetched = 0;
  let totalNew = 0;
  let totalSkipped = 0;

  do {
    const page = await fetchFormLeads(after);
    const leads = page.data ?? [];
    totalFetched += leads.size;

    for (const stub of leads) {
      totalFetched++;
      const leadgenId = stub.id;

      if (existing.has(leadgenId)) {
        totalSkipped++;
        continue;
      }

      console.log(`Processing new lead: ${leadgenId} (created: ${stub.created_time})`);

      const raw = await fetchMetaLead(leadgenId);
      if (!raw) {
        console.error(`  → Could not fetch lead data for ${leadgenId}`);
        continue;
      }

      const lead = normalizeMetaLead(raw);
      console.log(`  → ${lead.name || "(no name)"} | ${lead.email || "(no email)"} | ${lead.weddingBudget || "(no budget)"}`);

      if (!DRY_RUN) {
        // Upsert into Supabase
        const { error: upsertErr } = await supabase.from("meta_leads").upsert(
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
            raw,
          },
          { onConflict: "leadgen_id" }
        );
        if (upsertErr) console.error(`  → Supabase error: ${upsertErr.message}`);

        // CRM sync
        await syncMetaLeadToBookedIQ(lead).catch((e) => console.error("  → BookedIQ error:", e));
        await syncMetaLeadToHubSpot(lead).catch((e) => console.error("  → HubSpot error:", e));
        await sendMetaLeadNotification(lead).catch((e) => console.error("  → Email error:", e));

        // GA4
        await sendGenerateLead(null, { event_type: "wedding", form_name: "meta_lead_ad_backfill", event_name: "generate_lead" }).catch(() => {});
        await sendGenerateLead(null, { event_type: "wedding", form_name: "meta_lead_ad_backfill", event_name: "generate_lead_wedding" }).catch(() => {});

        console.log(`  → Synced to BookedIQ, HubSpot, email, GA4`);
      }

      totalNew++;

      // Throttle to avoid rate limits
      await new Promise((r) => setTimeout(r, 300));
    }

    after = page.paging?.cursors?.after;
    if (!page.paging?.next) break;
  } while (after);

  console.log(`\nBackfill complete:`);
  console.log(`  Total fetched:  ${totalFetched}`);
  console.log(`  Already in DB:  ${totalSkipped}`);
  console.log(`  New processed:  ${totalNew}${DRY_RUN ? " (dry run — not saved)" : ""}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
