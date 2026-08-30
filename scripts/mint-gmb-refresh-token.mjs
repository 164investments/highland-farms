/**
 * Mint a long-lived OAuth refresh token for the Google Business Profile API,
 * scoped to business.manage ONLY.
 *
 * Why this exists: the GBP API does not accept service accounts, so the
 * scheduled review refresh (.github/workflows/refresh-google-reviews.yml) needs
 * a user refresh token. The obvious shortcut — reusing the local gcloud ADC
 * token — drags the cloud-platform scope along with it, which is far more
 * access than reading reviews needs, especially for a secret stored on a public
 * repo. This mints a narrow one against a dedicated OAuth client so it can be
 * revoked without touching local gcloud.
 *
 * Usage:
 *   GOOGLE_OAUTH_CLIENT_FILE=/path/to/client_secret_*.json \
 *     node scripts/mint-gmb-refresh-token.mjs
 *
 * Sign in as the GMB owner (hayden.laverty@gmail.com — NOT 164investments@).
 * Prints the refresh token; store it as the GOOGLE_OAUTH_REFRESH_TOKEN secret.
 */
import fs from "node:fs";
import http from "node:http";
import crypto from "node:crypto";

const SCOPE = "https://www.googleapis.com/auth/business.manage";
const PORT = Number(process.env.PORT ?? 8731);
const REDIRECT = `http://localhost:${PORT}`;

const clientFile = process.env.GOOGLE_OAUTH_CLIENT_FILE;
if (!clientFile) {
  console.error("set GOOGLE_OAUTH_CLIENT_FILE to the OAuth client JSON path");
  process.exit(2);
}
const raw = JSON.parse(fs.readFileSync(clientFile, "utf8"));
const client = raw.installed ?? raw.web;
if (!client?.client_id || !client?.client_secret) {
  console.error(`${clientFile} is not an OAuth client JSON (no installed/web block)`);
  process.exit(2);
}

const state = crypto.randomBytes(16).toString("hex");
const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    // Force the consent screen so Google actually returns a refresh_token —
    // a re-approval without this returns an access token only.
    prompt: "consent",
    state,
  });

console.log("\nOpen this URL and approve as the GMB owner:\n");
console.log(authUrl);
console.log("\nWaiting for the redirect on " + REDIRECT + " …\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("no code");
    return;
  }
  if (url.searchParams.get("state") !== state) {
    res.writeHead(400).end("state mismatch");
    console.error("state mismatch — aborting");
    process.exit(1);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: client.client_id,
      client_secret: client.client_secret,
      redirect_uri: REDIRECT,
      grant_type: "authorization_code",
    }),
  });
  const body = await tokenRes.json();

  if (!tokenRes.ok || !body.refresh_token) {
    res.writeHead(500).end("token exchange failed — see the terminal");
    console.error("token exchange failed:", JSON.stringify(body, null, 2));
    process.exit(1);
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Done — refresh token minted. You can close this tab.");

  console.log("granted scopes:", body.scope);
  console.log("\nGOOGLE_OAUTH_CLIENT_ID=" + client.client_id);
  console.log("GOOGLE_OAUTH_CLIENT_SECRET=" + client.client_secret);
  console.log("GOOGLE_OAUTH_REFRESH_TOKEN=" + body.refresh_token);
  console.log("\nStore these three as GitHub Actions secrets on this repo.");
  server.close(() => process.exit(0));
});

server.listen(PORT);
