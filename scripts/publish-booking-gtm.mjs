#!/usr/bin/env node
// Highland Farms — GTM booking event tag provisioner (Phase 3a cutover, Task 8)
//
// Wires GA4 event tags + custom-event triggers in container GTM-MBH36BJH for
// the native-calendar dataLayer events that don't yet have container
// coverage:
//
//   booking_select_date, booking_select_time, booking_begin_checkout,
//   gift_view, gift_purchase
//
// ⛔⛔ Deliberately NOT wired here — do not add these later without re-reading
// the reasoning, both are called out in BookingFlow.tsx's own GTM NOTE too:
//   - booking_purchase   The checkout route (src/app/api/booking/checkout)
//                         already reports the purchase server-side via GA4
//                         Measurement Protocol + Meta CAPI. A client GA4 tag
//                         on this event with no dedup key wired in GTM would
//                         DOUBLE-COUNT booking revenue.
//   - booking_view_item  Fires once per <BookingFlow> mount. The combo (Full
//                         Farm Day) picker renders farm-tour AND nordic-spa
//                         BookingFlow instances behind a collapsed expander,
//                         so a container tag on this event DOUBLE-FIRES per
//                         real guest page view.
//
// Usage:
//   node scripts/publish-booking-gtm.mjs                     # dry run (default) — prints the plan only
//   node scripts/publish-booking-gtm.mjs --dry-run            # same, explicit
//   node scripts/publish-booking-gtm.mjs --publish             # create the objects, version, and publish for real
//   node scripts/publish-booking-gtm.mjs --publish --force     # also publish even if the workspace has UNRELATED pending changes
//   node scripts/publish-booking-gtm.mjs --help
//
// A publish promotes the WHOLE workspace, not just this script's objects —
// see memory/shared/google-tag-manager-api.md. So before any --publish this
// script always fetches workspaces/{ws}/status first and REFUSES to publish
// if it finds pending changes this script didn't just make, unless --force
// is also passed. --dry-run always prints that status regardless.
//
// Auth: GOOGLE_SA_EMAIL + GOOGLE_SA_PRIVATE_KEY — the same service account
// already used for the GA4 Data API and the wedding-call Google Meet
// integration (src/lib/ga4-data.ts, src/lib/booking/google-calendar.ts).
// Needs THREE Tag Manager scopes, or a publish 403s at create_version with a
// bare "insufficient authentication scopes" that reads like a permissions
// wall and is easy to misdiagnose as "the API can't do this":
//   tagmanager.readonly                - read the workspace/tags/triggers/variables
//   tagmanager.edit.containers         - create tags/triggers/variables in the workspace
//   tagmanager.edit.containerversions  - create a VERSION (the one that's easy to miss)
//   tagmanager.publish                 - promote the version to live
//
// No external dependencies — Node's built-in `crypto` signs the JWT, same
// pattern as src/lib/ga4-data.ts.

import { createSign } from "crypto";

const ACCOUNT_ID = "6233486551";
const CONTAINER_ID = "186547008"; // GTM-MBH36BJH
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GTM_API = "https://www.googleapis.com/tagmanager/v2";

const SCOPES = [
  "https://www.googleapis.com/auth/tagmanager.readonly",
  "https://www.googleapis.com/auth/tagmanager.edit.containers",
  "https://www.googleapis.com/auth/tagmanager.edit.containerversions",
  "https://www.googleapis.com/auth/tagmanager.publish",
].join(" ");

// The GA4 measurement-ID constant variable already in the container
// (variableId 131, value "G-T8L6HCG9EL" as of 2026-08-27). Tags reference it
// by name, not by ID, so no lookup is required to use it.
const GA4_VAR_REF = "{{GA4}}";

// ---------------------------------------------------------------------------
// Event plan
//
// The existing Farm Store tags (GA4 - View Item, GA4 - Begin Checkout, etc.)
// read their params from an `ecommerce.*` nested dataLayer shape (e.g.
// `dlv - value` -> "ecommerce.value"). Highland Farms' booking dataLayer push
// (BookingFlow.tsx / DatePicker.tsx / ComboPicker.tsx / GiftBody.tsx — the
// shared `push(event, params)` helper) pushes a FLAT object instead:
// `{ event, ...params }`, no `ecommerce` wrapper. So the existing `dlv - *`
// variables do NOT read our params correctly and new flat-path variables are
// needed — named distinctly (booking_/gift_ prefixed) so they don't collide
// with or get confused for the ecommerce-shaped ones.
const VARIABLES = [
  { name: "dlv - booking_product", dlKey: "booking_product" },
  { name: "dlv - booking_date", dlKey: "date" },
  { name: "dlv - booking_slot", dlKey: "slot" },
  { name: "dlv - booking_value", dlKey: "value" },
  { name: "dlv - gift_product", dlKey: "gift_product" },
];

const EVENTS = [
  {
    event: "booking_select_date",
    triggerName: "Booking - booking_select_date",
    tagName: "GA4 - Booking Select Date",
    params: { booking_product: "dlv - booking_product", date: "dlv - booking_date" },
  },
  {
    event: "booking_select_time",
    triggerName: "Booking - booking_select_time",
    tagName: "GA4 - Booking Select Time",
    // The combo (Full Farm Day) picker's push for this event also carries a
    // `spa_slot` field (ComboPicker.tsx's onSelect, BookingFlow.tsx ~line
    // 160) alongside `slot`/`date`. Deliberately left unwired here — not an
    // oversight — the tour `slot` param already identifies the booking;
    // `spa_slot` is redundant for GA4 reporting purposes.
    params: {
      booking_product: "dlv - booking_product",
      slot: "dlv - booking_slot",
      date: "dlv - booking_date",
    },
  },
  {
    event: "booking_begin_checkout",
    triggerName: "Booking - booking_begin_checkout",
    tagName: "GA4 - Booking Begin Checkout",
    params: { booking_product: "dlv - booking_product", value: "dlv - booking_value" },
  },
  {
    event: "gift_view",
    triggerName: "Booking - gift_view",
    tagName: "GA4 - Gift View",
    params: {},
  },
  {
    event: "gift_purchase",
    triggerName: "Booking - gift_purchase",
    tagName: "GA4 - Gift Purchase",
    params: { value: "dlv - booking_value", gift_product: "dlv - gift_product" },
  },
];

// ---------------------------------------------------------------------------
// CLI

function printHelp() {
  console.log(`Highland Farms — GTM booking event tag provisioner (Phase 3a cutover)

Creates GA4 event tags + custom-event triggers in container GTM-MBH36BJH for:
  booking_select_date, booking_select_time, booking_begin_checkout,
  gift_view, gift_purchase

Deliberately NOT created (see the header comment in this file for why):
  - booking_purchase   server MP already reports the purchase; a client tag
                       here would double-count revenue
  - booking_view_item  fires twice per real page view for the combo picker's
                       collapsed expander; a container tag would double-fire

Usage:
  node scripts/publish-booking-gtm.mjs                   dry run (default)
  node scripts/publish-booking-gtm.mjs --dry-run          dry run, explicit
  node scripts/publish-booking-gtm.mjs --publish          create + version + publish for real
  node scripts/publish-booking-gtm.mjs --publish --force  publish even with unrelated pending workspace changes
  node scripts/publish-booking-gtm.mjs --help             this text

Auth: GOOGLE_SA_EMAIL + GOOGLE_SA_PRIVATE_KEY env vars (same SA as
src/lib/ga4-data.ts), needs the tagmanager.readonly + edit.containers +
edit.containerversions + publish scopes. A publish promotes the WHOLE GTM
workspace, so this script always checks workspaces/{ws}/status first and
refuses to publish over unrelated pending changes unless --force is passed.
`);
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}
const doPublish = args.includes("--publish");
const force = args.includes("--force");
const dryRun = !doPublish; // --dry-run is just the (redundant) default

// ---------------------------------------------------------------------------
// Auth (mirrors src/lib/ga4-data.ts's JWT flow, extra scopes)

async function getAccessToken() {
  const email = process.env.GOOGLE_SA_EMAIL;
  const rawKey = process.env.GOOGLE_SA_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error(
      "GOOGLE_SA_EMAIL and GOOGLE_SA_PRIVATE_KEY must both be set (same service account used for the GA4 Data API / Google Meet integration)."
    );
  }
  const privateKey = rawKey.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ iss: email, scope: SCOPES, aud: TOKEN_URL, iat: now, exp: now + 3600 })
  ).toString("base64url");

  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, "base64url");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${header}.${payload}.${signature}`,
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Token request failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// ---------------------------------------------------------------------------
// GTM API helpers

let TOKEN;
async function gtm(method, path, body) {
  const res = await fetch(`${GTM_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Object builders (plain GTM API request bodies)

function buildVariable(v) {
  return {
    name: v.name,
    type: "v",
    parameter: [
      { type: "integer", key: "dataLayerVersion", value: "2" },
      { type: "boolean", key: "setDefaultValue", value: "false" },
      { type: "template", key: "name", value: v.dlKey },
    ],
  };
}

function buildTrigger(ev) {
  return {
    name: ev.triggerName,
    type: "customEvent",
    customEventFilter: [
      {
        type: "equals",
        parameter: [
          { type: "template", key: "arg0", value: "{{_event}}" },
          { type: "template", key: "arg1", value: ev.event },
        ],
      },
    ],
  };
}

function buildTag(ev, triggerId) {
  return {
    name: ev.tagName,
    type: "gaawe",
    parameter: [
      { type: "boolean", key: "sendEcommerceData", value: "false" },
      {
        type: "list",
        key: "eventSettingsTable",
        list: Object.entries(ev.params).map(([param, varName]) => ({
          type: "map",
          map: [
            { type: "template", key: "parameter", value: param },
            { type: "template", key: "parameterValue", value: `{{${varName}}}` },
          ],
        })),
      },
      { type: "template", key: "eventName", value: ev.event },
      { type: "template", key: "measurementIdOverride", value: GA4_VAR_REF },
    ],
    firingTriggerId: [triggerId],
    tagFiringOption: "oncePerEvent",
  };
}

// ---------------------------------------------------------------------------

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes will be made)" : "PUBLISH"}\n`);

  TOKEN = await getAccessToken();

  const workspaces = await gtm(
    "GET",
    `/accounts/${ACCOUNT_ID}/containers/${CONTAINER_ID}/workspaces`
  );
  const ws = workspaces.workspace?.[0];
  if (!ws) throw new Error("No workspace found on GTM-MBH36BJH.");
  const wsPath = ws.path;
  console.log(`Workspace: "${ws.name}" (workspaceId ${ws.workspaceId})`);

  const status = await gtm("GET", `/${wsPath}/status`);
  const pending = status.workspaceChange ?? [];
  console.log(`Workspace status: ${pending.length} pending change(s)${pending.length ? ":" : " (clean)."}`);
  for (const c of pending) {
    console.log(`  - ${c.changeStatus ?? "?"} ${c[Object.keys(c).find((k) => k !== "changeStatus")]?.name ?? "(unnamed)"}`);
  }
  console.log();

  const [existingVars, existingTriggers, existingTags] = await Promise.all([
    gtm("GET", `/${wsPath}/variables`),
    gtm("GET", `/${wsPath}/triggers`),
    gtm("GET", `/${wsPath}/tags`),
  ]);
  const varByName = new Map((existingVars.variable ?? []).map((v) => [v.name, v]));
  const triggerByName = new Map((existingTriggers.trigger ?? []).map((t) => [t.name, t]));
  const tagByName = new Map((existingTags.tag ?? []).map((t) => [t.name, t]));

  const varsToCreate = VARIABLES.filter((v) => !varByName.has(v.name));
  const triggersToCreate = EVENTS.filter((e) => !triggerByName.has(e.triggerName));
  const tagsToCreate = EVENTS.filter((e) => !tagByName.has(e.tagName));

  console.log(
    `Plan: ${varsToCreate.length}/${VARIABLES.length} variables, ${triggersToCreate.length}/${EVENTS.length} triggers, ${tagsToCreate.length}/${EVENTS.length} tags need creating.\n`
  );

  if (varsToCreate.length) {
    console.log("--- Variables to create ---");
    for (const v of varsToCreate) console.log(JSON.stringify(buildVariable(v), null, 2));
  }
  if (triggersToCreate.length) {
    console.log("--- Triggers to create ---");
    for (const e of triggersToCreate) console.log(JSON.stringify(buildTrigger(e), null, 2));
  }
  if (tagsToCreate.length) {
    console.log("--- Tags to create (firingTriggerId shown as <trigger id once created>) ---");
    for (const e of tagsToCreate) console.log(JSON.stringify(buildTag(e, "<pending>"), null, 2));
  }
  if (!varsToCreate.length && !triggersToCreate.length && !tagsToCreate.length) {
    console.log("Nothing to do — every planned variable/trigger/tag already exists by name.");
  }

  if (dryRun) {
    console.log("\nDry run complete. No API writes were made. Re-run with --publish to apply.");
    return;
  }

  // --- live path (never invoked by Task 8) ---
  if (pending.length > 0 && !force) {
    console.error(
      `\nREFUSING to publish: workspace has ${pending.length} pending change(s) not made by this run. Re-run with --force to publish anyway (this promotes ALL of them, not just booking events).`
    );
    process.exit(1);
  }

  const createdVars = [];
  for (const v of varsToCreate) {
    const created = await gtm("POST", `/${wsPath}/variables`, buildVariable(v));
    createdVars.push(created);
    console.log(`Created variable "${created.name}" (id ${created.variableId})`);
  }

  const createdTriggers = new Map();
  for (const e of triggersToCreate) {
    const created = await gtm("POST", `/${wsPath}/triggers`, buildTrigger(e));
    createdTriggers.set(e.triggerName, created);
    console.log(`Created trigger "${created.name}" (id ${created.triggerId})`);
  }

  for (const e of tagsToCreate) {
    const triggerId =
      createdTriggers.get(e.triggerName)?.triggerId ?? triggerByName.get(e.triggerName)?.triggerId;
    const created = await gtm("POST", `/${wsPath}/tags`, buildTag(e, triggerId));
    console.log(`Created tag "${created.name}" (id ${created.tagId})`);
  }

  if (!varsToCreate.length && !triggersToCreate.length && !tagsToCreate.length) {
    console.log("Nothing new was created — skipping version/publish.");
    return;
  }

  const version = await gtm("POST", `/${wsPath}:create_version`, {
    name: "Native calendar booking events (Phase 3a Task 8)",
    notes:
      "GA4 event tags for booking_select_date, booking_select_time, booking_begin_checkout, gift_view, gift_purchase. Excludes booking_purchase (server MP already reports it) and booking_view_item (double-fires on the combo picker).",
  });
  console.log(`Created version ${version.containerVersion.versionId}`);

  await gtm(
    "POST",
    `/accounts/${ACCOUNT_ID}/containers/${CONTAINER_ID}/versions/${version.containerVersion.versionId}:publish`,
    {}
  );
  console.log("Published.");

  const live = await gtm("GET", `/accounts/${ACCOUNT_ID}/containers/${CONTAINER_ID}/versions:live`);
  console.log(`Live version is now: ${live.containerVersionId ?? live.name}`);
}

main().catch((err) => {
  console.error(`\nERROR: ${err.message}`);
  process.exit(1);
});
