/**
 * GA4 Data API client using Google Service Account JWT auth.
 * No external dependencies — uses Node.js crypto for JWT signing.
 *
 * Required env vars (optional — report degrades gracefully without them):
 *   GOOGLE_SA_EMAIL       — service account email
 *   GOOGLE_SA_PRIVATE_KEY — PEM private key (with literal \n or real newlines)
 */

import { createSign } from "crypto";

const GA4_PROPERTY_ID = "342159869";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DATA_API = `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`;

async function getAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SA_EMAIL;
  const rawKey = process.env.GOOGLE_SA_PRIVATE_KEY;
  if (!email || !rawKey) return null;

  const privateKey = rawKey.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, "base64url");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${header}.${payload}.${signature}`,
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

export interface GA4PageRow {
  pagePath: string;
  sessions: number;
  users: number;
}

export interface GA4SourceRow {
  source: string;
  medium: string;
  sessions: number;
}

export interface GA4EventRow {
  eventName: string;
  count: number;
}

export interface GA4ClickToCall {
  pagePath: string;
  phoneNumber: string;
  count: number;
}

export interface GA4WeddingData {
  pages: GA4PageRow[];
  sources: GA4SourceRow[];
  totalSessions: number;
  totalUsers: number;
  prevPeriodSessions: number;
  clickToCalls: GA4ClickToCall[];
  totalClickToCalls: number;
  prevClickToCalls: number;
}

/**
 * Fetch wedding-related GA4 data for the given period.
 * Returns null if SA credentials are not configured.
 */
export async function getWeddingGA4Data(
  startDate: string,
  endDate: string,
  prevStartDate: string,
  prevEndDate: string
): Promise<GA4WeddingData | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const weddingPageFilter = {
    orGroup: {
      expressions: [
        { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/weddings" } } },
        { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/wedding-portfolio" } } },
        { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/celebrations" } } },
      ],
    },
  };

  // Click-to-call scoped to wedding pages (AND filter: event + page)
  const clickToCallWeddingFilter = {
    andGroup: {
      expressions: [
        { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "click_to_call" } } },
        {
          orGroup: {
            expressions: [
              { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/weddings" } } },
              { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/wedding-portfolio" } } },
              { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/celebrations" } } },
              { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/contact" } } },
            ],
          },
        },
      ],
    },
  };

  // Run 7 reports in parallel (includes ungrouped totals for accuracy)
  const [pagesRes, totalsRes, sourcesRes, prevRes, ctcRes, ctcPrevRes, ctcAllRes] = await Promise.all([
    // 1. Page-level breakdown (top 20 — for the table)
    fetch(DATA_API, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }],
        dimensionFilter: weddingPageFilter,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 20,
      }),
    }),

    // 2. Ungrouped totals for wedding pages (accurate sessions + users)
    fetch(DATA_API, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }],
        dimensionFilter: weddingPageFilter,
      }),
    }),

    // 3. Traffic sources for wedding pages
    fetch(DATA_API, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: weddingPageFilter,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
      }),
    }),

    // 4. Previous period total sessions (for comparison)
    fetch(DATA_API, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        dateRanges: [{ startDate: prevStartDate, endDate: prevEndDate }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: weddingPageFilter,
      }),
    }),

    // 5. Click-to-call on wedding pages (current, breakdown)
    fetch(DATA_API, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "customEvent:page_location" }, { name: "customEvent:phone_number" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: clickToCallWeddingFilter,
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
        limit: 20,
      }),
    }),

    // 6. Click-to-call on wedding pages (previous, total only)
    fetch(DATA_API, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        dateRanges: [{ startDate: prevStartDate, endDate: prevEndDate }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: clickToCallWeddingFilter,
      }),
    }),

    // 7. Click-to-call site-wide total (for the ungrouped count)
    fetch(DATA_API, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: clickToCallWeddingFilter,
      }),
    }),
  ]);

  if (!pagesRes.ok || !totalsRes.ok || !sourcesRes.ok || !prevRes.ok) return null;

  const [pagesData, totalsData, sourcesData, prevData, ctcData, ctcPrevData, ctcAllData] = await Promise.all([
    pagesRes.json(),
    totalsRes.json(),
    sourcesRes.json(),
    prevRes.json(),
    ctcRes.ok ? ctcRes.json() : { rows: [] },
    ctcPrevRes.ok ? ctcPrevRes.json() : { rows: [] },
    ctcAllRes.ok ? ctcAllRes.json() : { rows: [] },
  ]);

  const pages: GA4PageRow[] = (pagesData.rows ?? []).map(
    (r: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      pagePath: r.dimensionValues[0].value,
      sessions: parseInt(r.metricValues[0].value) || 0,
      users: parseInt(r.metricValues[1].value) || 0,
    })
  );

  const sources: GA4SourceRow[] = (sourcesData.rows ?? []).map(
    (r: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      source: r.dimensionValues[0].value,
      medium: r.dimensionValues[1].value,
      sessions: parseInt(r.metricValues[0].value) || 0,
    })
  );

  // Use ungrouped totals for accuracy (not sums of per-page rows)
  const totalSessions = parseInt(totalsData.rows?.[0]?.metricValues?.[0]?.value) || 0;
  const totalUsers = parseInt(totalsData.rows?.[0]?.metricValues?.[1]?.value) || 0;
  const prevPeriodSessions =
    parseInt(prevData.rows?.[0]?.metricValues?.[0]?.value) || 0;

  const clickToCalls: GA4ClickToCall[] = (ctcData.rows ?? []).map(
    (r: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      pagePath: r.dimensionValues[0].value,
      phoneNumber: r.dimensionValues[1].value,
      count: parseInt(r.metricValues[0].value) || 0,
    })
  );
  const totalClickToCalls = parseInt(ctcAllData.rows?.[0]?.metricValues?.[0]?.value) || 0;
  const prevClickToCalls =
    parseInt(ctcPrevData.rows?.[0]?.metricValues?.[0]?.value) || 0;

  return {
    pages, sources, totalSessions, totalUsers, prevPeriodSessions,
    clickToCalls, totalClickToCalls, prevClickToCalls,
  };
}
