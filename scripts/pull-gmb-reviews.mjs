// Pull all Google Business Profile reviews for Highland Farms via the
// authenticated owner's gcloud session.
//
// Prereq (user runs once, signing in as the verified GMB owner):
//   gcloud auth application-default login \
//     --scopes=openid,email,profile,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/business.manage \
//     --no-launch-browser
//
// Usage:
//   node scripts/pull-gmb-reviews.mjs
//
// Output: src/data/google-reviews.json (only overwrites if scrape got
// at least MIN_REVIEWS_TO_WRITE reviews — protects the snapshot).

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUTPUT = path.join(process.cwd(), "src/data/google-reviews.json");
const MIN_REVIEWS_TO_WRITE = 5;
const QUOTA_PROJECT = process.env.QUOTA_PROJECT ?? "ace-destination-454618-k4";

/**
 * Two auth paths, in priority order:
 *  1. A stored OAuth refresh token (GOOGLE_OAUTH_*) — what CI uses. The GBP API
 *     does NOT accept service accounts, so a user refresh token is the only way
 *     to run this headlessly.
 *  2. Local gcloud ADC — what a human on this laptop uses.
 */
async function getAccessToken() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) {
      // A revoked or expired refresh token lands here. Fail loudly — a silent
      // fall-through to a stale snapshot is how a refresh job dies unnoticed.
      throw new Error(
        `refresh-token exchange failed (${res.status}): ${JSON.stringify(body).slice(0, 300)}`
      );
    }
    console.log("auth: OAuth refresh token");
    return body.access_token;
  }

  const t = execSync("gcloud auth application-default print-access-token", {
    encoding: "utf8",
  }).trim();
  if (!t) throw new Error("no ADC access token; run application-default login first");
  console.log("auth: local gcloud ADC");
  return t;
}

async function apiGet(url, token) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Goog-User-Project": QUOTA_PROJECT,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body.slice(0, 500)}`);
  }
  return res.json();
}

async function listAccounts(token) {
  const data = await apiGet(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    token
  );
  return data.accounts ?? [];
}

async function listLocations(accountName, token) {
  // accountName is "accounts/XXX"
  const fields = "name,title,storefrontAddress,metadata,storeCode";
  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=${encodeURIComponent(fields)}&pageSize=100`;
  const data = await apiGet(url, token);
  return data.locations ?? [];
}

async function listAllReviews(accountId, locationId, token) {
  // accountId / locationId without prefix
  const out = [];
  let pageToken = null;
  // Google's own profile-level aggregates, reported on every page.
  let averageRating = null;
  let totalReviewCount = null;
  for (let page = 0; page < 30; page++) {
    const params = new URLSearchParams({ pageSize: "50" });
    if (pageToken) params.set("pageToken", pageToken);
    const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?${params}`;
    const data = await apiGet(url, token);
    if (data.reviews) out.push(...data.reviews);
    if (typeof data.averageRating === "number") averageRating = data.averageRating;
    if (typeof data.totalReviewCount === "number") totalReviewCount = data.totalReviewCount;
    pageToken = data.nextPageToken;
    console.log(
      `  page ${page + 1}: +${data.reviews?.length ?? 0} reviews (total ${out.length})`
    );
    if (!pageToken) break;
  }
  return { reviews: out, averageRating, totalReviewCount };
}

// Star rating is an enum: STAR_RATING_UNSPECIFIED | ONE | TWO | THREE | FOUR | FIVE
const STAR_TO_INT = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

function gmbToOur(r) {
  // Map GMB v4 review schema → our google-reviews.json shape.
  const STAR = STAR_TO_INT;
  const publish = r.updateTime ?? r.createTime ?? null;
  return {
    rating: STAR[r.starRating] ?? 0,
    publish_time: publish,
    relative_time: null, // GMB doesn't return relative — compute on display side
    author_name: r.reviewer?.displayName ?? "Google User",
    author_photo: r.reviewer?.profilePhotoUrl ?? null,
    author_url: null,
    text: (r.comment ?? "").trim(),
    owner_reply: r.reviewReply
      ? {
          text: r.reviewReply.comment,
          updated: r.reviewReply.updateTime,
        }
      : null,
  };
}

async function main() {
  const token = await getAccessToken();
  console.log("got access token; listing accounts…");

  const accounts = await listAccounts(token);
  if (accounts.length === 0) {
    console.error("no business accounts visible. Run the login again with");
    console.error("  --scopes=...https://www.googleapis.com/auth/business.manage");
    console.error("and using the email that OWNS Highland Farms on Google.");
    process.exit(2);
  }
  for (const a of accounts) {
    console.log(`  account: ${a.name} ${a.accountName ?? ""} (${a.type})`);
  }

  let foundAcct = null;
  let foundLoc = null;
  for (const a of accounts) {
    const locs = await listLocations(a.name, token);
    for (const loc of locs) {
      const title = loc.title ?? "";
      if (/highland.*farm/i.test(title)) {
        foundAcct = a.name; // accounts/XXX
        foundLoc = loc.name; // locations/YYY
        console.log(`  match: ${title} (${loc.name})`);
        break;
      } else {
        console.log(`  skip: ${title}`);
      }
    }
    if (foundAcct) break;
  }

  if (!foundAcct || !foundLoc) {
    console.error(
      "couldn't find a location named Highland Farms in any account visible to this user. Try a different account."
    );
    process.exit(3);
  }

  const accountId = foundAcct.split("/")[1];
  const locationId = foundLoc.split("/")[1];
  console.log(`pulling reviews for accounts/${accountId}/locations/${locationId}…`);

  const { reviews, averageRating, totalReviewCount } = await listAllReviews(
    accountId,
    locationId,
    token
  );
  console.log(
    `fetched ${reviews.length} reviews total (Google reports ${totalReviewCount ?? "?"}, avg ${averageRating ?? "?"})`
  );

  // Google's totalReviewCount can drift from the objects returned when a review
  // lands mid-pull. Trust what we actually have — the count and the cards must agree.
  if (totalReviewCount != null && totalReviewCount !== reviews.length) {
    console.warn(
      `  note: totalReviewCount ${totalReviewCount} != ${reviews.length} fetched; using the fetched count`
    );
  }

  if (reviews.length < MIN_REVIEWS_TO_WRITE) {
    console.error(
      `refusing to overwrite: only got ${reviews.length} reviews (min ${MIN_REVIEWS_TO_WRITE}).`
    );
    process.exit(4);
  }

  // Rating comes from Google's own averageRating (1 dp, matching what the
  // profile displays) — never hardcoded, it feeds the JSON-LD aggregateRating.
  const rating =
    averageRating != null
      ? Math.round(averageRating * 10) / 10
      : Math.round((reviews.reduce((s, r) => s + (STAR_TO_INT[r.starRating] ?? 0), 0) / reviews.length) * 10) / 10;

  const out = {
    place_id: "ChIJF5dVblWLlVQRTa9sDtveCPY",
    name: "Highland Farms",
    rating,
    user_rating_count: reviews.length,
    fetched_at: new Date().toISOString().slice(0, 10),
    source: "google-business-profile-api",
    reviews: reviews.map(gmbToOur),
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2) + "\n");
  console.log("wrote", OUTPUT);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
