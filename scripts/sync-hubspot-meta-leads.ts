/**
 * One-time script: sync all meta_leads with synced_to_hubspot=false to HubSpot.
 * Run after fixing the leadsource validation bug.
 *
 * Usage: npx tsx --env-file .env.local scripts/sync-hubspot-meta-leads.ts
 */

import { createClient } from "@supabase/supabase-js";
import { normalizeMetaLead } from "../src/lib/meta-leads";
import { syncMetaLeadToHubSpot } from "../src/lib/hubspot";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await db
    .from("meta_leads")
    .select("*")
    .eq("synced_to_hubspot", false)
    .order("created_at", { ascending: true });

  if (error) throw error;
  console.log(`Leads to sync to HubSpot: ${data.length}`);

  let ok = 0, fail = 0;
  for (const row of data) {
    const lead = normalizeMetaLead(row.raw);
    try {
      await syncMetaLeadToHubSpot(lead);
      await db.from("meta_leads").update({ synced_to_hubspot: true }).eq("leadgen_id", row.leadgen_id);
      ok++;
      if (ok % 25 === 0) console.log(`  ${ok}/${data.length} synced...`);
    } catch (e) {
      fail++;
      console.error(`  FAIL ${row.leadgen_id}:`, e);
    }
    // 200ms throttle — HubSpot API rate limit: 150 req/10s
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nDone. Synced: ${ok} | Failed: ${fail}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
