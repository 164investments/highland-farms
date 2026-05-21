import { createClient } from "@supabase/supabase-js";

export async function claimTrackingEvent(
  eventKey: string,
  eventName: string,
  source: string,
): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return true;

  const db = createClient(supabaseUrl, serviceKey);
  const { error } = await db.from("tracking_events").insert({
    event_key: eventKey,
    event_name: eventName,
    source,
  });

  if (!error) return true;

  if (error.code === "23505") {
    return false;
  }

  console.error("Tracking dedupe unavailable; sending event anyway:", error);
  return true;
}
