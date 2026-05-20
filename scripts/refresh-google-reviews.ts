/**
 * Refresh src/data/google-reviews.json from the Google Places API.
 *
 * Usage:
 *   GOOGLE_PLACES_API_KEY=... npx tsx scripts/refresh-google-reviews.ts
 *
 * Notes:
 * - Places API (New) returns up to 5 reviews per call. The aggregate
 *   rating + total count are accurate.
 * - Set GOOGLE_PLACES_API_KEY in the shell. Key lives on GCP project
 *   tokyo-vigil-454618-a5 ("Maps Platform API Key").
 */
import fs from "node:fs";
import path from "node:path";

const PLACE_ID = "ChIJF5dVblWLlVQRTa9sDtveCPY"; // Highland Farms, Brightwood OR

async function main() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    console.error("Set GOOGLE_PLACES_API_KEY in the env.");
    process.exit(1);
  }

  const res = await fetch(`https://places.googleapis.com/v1/places/${PLACE_ID}`, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,reviews",
    },
  });

  if (!res.ok) {
    console.error("Places API error:", res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();

  const out = {
    place_id: data.id,
    name: data.displayName?.text,
    rating: data.rating,
    user_rating_count: data.userRatingCount,
    fetched_at: new Date().toISOString().slice(0, 10),
    reviews: (data.reviews ?? []).map((r: Record<string, unknown>) => {
      const author = (r.authorAttribution as Record<string, string>) ?? {};
      const text = (r.originalText ?? r.text) as Record<string, string> | undefined;
      return {
        rating: r.rating,
        publish_time: r.publishTime,
        relative_time: r.relativePublishTimeDescription,
        author_name: author.displayName,
        author_photo: author.photoUri,
        author_url: author.uri,
        text: text?.text ?? "",
      };
    }),
  };

  const target = path.join(process.cwd(), "src/data/google-reviews.json");
  fs.writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
  console.log(
    `Wrote ${target}: ${out.user_rating_count} total reviews, ${out.reviews.length} cached.`
  );
}

main();
