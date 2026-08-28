# Native Calendar Phase 3a — Arm the Cutover — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Do every cutover step that does not require Jalene's schedules or Hayden's flip decision: archive all Acuity history, import and continuously sync the future bookings, rewrite the daily report dual-source, wire every link/sitemap surface to flip automatically with the flag, and produce the one-page flip runbook. After this plan, cutover = set two env vars + run one script + a verify checklist.

**Architecture:** Ops scripts live in `scripts/` (run once or at flip), app changes stay flag-conditional so flag-off rendering remains byte-identical. The Acuity webhook becomes a continuous importer so the native `bookings` table mirrors Acuity in real time until the flip; a reconciling import script catches cancellations. One env var `ACUITY_ACTIVE` (set at flip alongside the flag, removed at Acuity cancellation) controls reminder exclusion and the daily report's source mode.

**Tech Stack:** Same as Phases 1–2. Acuity REST (read-only), Supabase Management API for the archive table DDL.

**Spec:** `docs/superpowers/specs/2026-08-27-native-calendar-design.md` (§6 Migration & cutover)
**Prior phases:** merged PRs #19 (`30f22d3`) + #20 (`69a555f`); cutover matrix `scripts/booking-e2e.md`.

## Global Constraints

- **The flip does NOT happen in this plan.** `NEXT_PUBLIC_NATIVE_CALENDAR` stays unset in prod; every app change must keep flag-off rendering byte-identical (prove it once at the end). No Acuity settings are modified; all Acuity access is READ-ONLY (`GET` only — the account remains the live booking system).
- Acuity API: base `https://acuityscheduling.com/api/v1/`, HTTP Basic auth `ACUITY_USER_ID:ACUITY_API_KEY` (in `.env.local`). ⛔ `/appointments` hard-caps at 500 rows and ignores paging params — ALWAYS chunk by month (`minDate`/`maxDate`), the existing `src/lib/acuity.ts` pattern.
- Type-id → product mapping (single source, exported once and reused by webhook + importer):
  `48403186→farm-tour party 2 · 48403269→3 · 48403283→4 · 48403306→5 · 64217701→6 · 85942611→nordic-spa party 1 per row (each attendee is their own Acuity appointment row) · 78277096→wedding-call party 1 · 91550850→wedding-call party 1 (finalization) · legacy "Private Tour for Two + Dozen Eggs" (resolve its id from the archive at runtime)→farm-tour party 2`.
- Imported rows: `source='acuity_import'`, `booking_number = 'ACU-' + acuity id`, `status='confirmed'`, `units` = 1 for farm-tour/wedding-call, 1 for each spa row, `amount_cents = round(amountPaid×100)`, `policy_agreed_at = null`, referral from the "How did you hear about us?" form value when present. Idempotent on the existing `bookings.acuity_id` unique column — upsert, never duplicate.
- Reminders must NEVER double-send: while `ACUITY_ACTIVE === "true"`, the reminder cron skips `source='acuity_import'` rows (Acuity still emails its own reminders). The env var is set at flip and removed only when the Acuity subscription is cancelled.
- The daily report's numbers must not change while the flag is off (native `source='native'` bookings are zero until flip) — prove by generating the report body before/after the change with identical inputs.
- New table `acuity_archive_appointments`: RLS on, revoke anon/authenticated, service-role only (house rule; apply via the Supabase Management API, `POST /v1/projects/qhaeqklgbfvviyedxbyl/database/query`, token `~/.supabase/access-token`).
- Gates per task: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` clean. The daily-report test suite (`scripts/daily-report.test.mts`) is load-bearing — it must stay green through Task 5.
- Commits end with the standing Co-Authored-By + Claude-Session trailer.

---

### Task 1: Full Acuity archive (script + Supabase table + run)

**Files:**
- Create: `scripts/acuity-archive.mts`
- Create: `supabase-acuity-archive.sql`
- Create: `docs/acuity-archive/` (gzipped JSON artifacts, committed)

**Interfaces:**
- Produces: table `acuity_archive_appointments (id bigint pk, datetime timestamptz, datetime_created timestamptz, appointment_type_id bigint, type text, calendar_id bigint, first_name text, last_name text, email text, phone text, amount_paid_cents int, price_cents int, canceled boolean, raw jsonb, archived_at timestamptz default now())`; repo artifacts `docs/acuity-archive/appointments-YYYYMMDD.json.gz`, `orders-YYYYMMDD.json.gz`, `config-YYYYMMDD.json.gz` (appointment-types + calendars + forms).

- [ ] **Step 1:** Write `supabase-acuity-archive.sql` (table above + `alter table ... enable row level security; revoke all on acuity_archive_appointments from anon, authenticated;`) and apply via the Management API (expect `[]`).
- [ ] **Step 2:** Write `scripts/acuity-archive.mts`:

```ts
// Archive EVERY Acuity appointment (active + canceled), all orders, and the
// account config, before anything is ever cancelled. Read-only against Acuity.
// Run: npx tsx --env-file .env.local scripts/acuity-archive.mts
import { createClient } from "@supabase/supabase-js";
import { gzipSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const AUTH = Buffer.from(
  `${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`,
).toString("base64");
const BASE = "https://acuityscheduling.com/api/v1";

async function acuity(path: string): Promise<unknown[]> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Basic ${AUTH}` },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as unknown[];
}

function* months(fromYear: number, toYear: number): Generator<[string, string]> {
  for (let y = fromYear; y <= toYear; y++)
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, "0");
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
      yield [`${y}-${mm}-01`, `${y}-${mm}-${String(last).padStart(2, "0")}`];
    }
}

const appts: Record<string, unknown>[] = [];
for (const [min, max] of months(2019, 2027)) {
  for (const canceled of ["false", "true"]) {
    const rows = (await acuity(
      `/appointments?minDate=${min}&maxDate=${max}&max=500&canceled=${canceled}`,
    )) as Record<string, unknown>[];
    if (rows.length >= 500) throw new Error(`month ${min} hit the 500 cap — split it`);
    appts.push(...rows);
  }
}
const orders = await acuity("/orders?max=500");
const config = {
  appointmentTypes: await acuity("/appointment-types"),
  calendars: await acuity("/calendars"),
  forms: await acuity("/forms"),
};
console.log(`appointments=${appts.length} orders=${orders.length}`);

const stamp = process.argv[2] ?? "manual";
mkdirSync("docs/acuity-archive", { recursive: true });
writeFileSync(`docs/acuity-archive/appointments-${stamp}.json.gz`, gzipSync(JSON.stringify(appts)));
writeFileSync(`docs/acuity-archive/orders-${stamp}.json.gz`, gzipSync(JSON.stringify(orders)));
writeFileSync(`docs/acuity-archive/config-${stamp}.json.gz`, gzipSync(JSON.stringify(config)));

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
for (let i = 0; i < appts.length; i += 500) {
  const batch = appts.slice(i, i + 500).map((a) => ({
    id: a.id,
    datetime: a.datetime,
    datetime_created: a.datetimeCreated ?? null,
    appointment_type_id: a.appointmentTypeID,
    type: a.type,
    calendar_id: a.calendarID ?? null,
    first_name: a.firstName, last_name: a.lastName,
    email: a.email, phone: a.phone,
    amount_paid_cents: Math.round(Number(a.amountPaid ?? 0) * 100),
    price_cents: Math.round(Number(a.price ?? 0) * 100),
    canceled: Boolean(a.canceled),
    raw: a,
  }));
  const { error } = await db.from("acuity_archive_appointments").upsert(batch, { onConflict: "id" });
  if (error) throw new Error(`archive upsert failed at ${i}: ${error.message}`);
}
const { count } = await db.from("acuity_archive_appointments").select("*", { count: "exact", head: true });
console.log(`supabase archive rows=${count}`);
```

(The `raw` field keeps the full appointment incl. `forms` answers; `Date.now()`-free — the stamp comes from argv, pass today's date.)
- [ ] **Step 3:** Run it (`npx tsx --env-file .env.local scripts/acuity-archive.mts 20260827`). Sanity: appointments count should be ≳ 4,800 (≈626 by Apr 2026 + growth + canceled rows); Supabase count must equal the DEDUPED id count (rescheduled rows can appear in two month buckets — the upsert dedupes; assert `count === new Set(ids).size` in the script or after). Record counts.
- [ ] **Step 4:** Gate (`tsc` on scripts is covered by `npm run build`? No — .mts scripts aren't in the build; run `npx tsx --env-file .env.local scripts/acuity-archive.mts` itself as the proof) + commit the script, SQL, and the three `.json.gz` artifacts.

### Task 2: Booking importer (script + run + reconcile)

**Files:**
- Create: `src/lib/booking/acuity-import.ts` (mapping + upsert logic, shared with Task 3's webhook)
- Create: `scripts/import-acuity-bookings.mts` (thin runner)

**Interfaces:**
- Produces:
  - `ACUITY_TYPE_MAP: Record<number, { slug: "farm-tour" | "nordic-spa" | "wedding-call"; party: number }>` (the Global Constraints table; the legacy eggs type id is looked up by name from `/appointment-types` at run time and merged in)
  - `mapAcuityAppointment(appt): BookingUpsert | null` — null for unknown types (logged); referral extracted from `appt.forms[].values[]` where the form name contains "hear"
  - `upsertAcuityBooking(appt): Promise<"inserted" | "updated" | "skipped">` — service-role upsert on `acuity_id` (booking_number `ACU-<id>`, duration from the product, `starts_at` from `appt.datetime` (it carries the offset — `new Date(...)` is correct), fields per Global Constraints); NEVER touches rows whose `source !== 'acuity_import'`
  - `reconcileCancellations(fromIso): Promise<number>` — marks `source='acuity_import'` bookings `cancelled` when their acuity_id appears in Acuity's `canceled=true` set (month-chunked fetch) or no longer appears in the active set for its month
- [ ] **Step 1:** Implement both files (full logic per the interfaces; the runner takes `--from 2026-08-27` defaulting to today, imports active future appointments month-by-month through +18 months, then runs `reconcileCancellations`).
- [ ] **Step 2:** RUN it live. Expect ≈191 inserted (the number can drift with fresh bookings — record actual). Verify: `select count(*), sum(amount_cents) from bookings where source='acuity_import'` matches the run log; spa rows have `units=1`; a spot-check of 5 rows against the Acuity UI values recorded in the report.
- [ ] **Step 3:** Re-run immediately → all "updated"/"skipped", count unchanged (idempotency proof). Record both run outputs.
- [ ] **Step 4:** Gate + commit. Add e2e item to `scripts/booking-e2e.md` (section A): importer idempotency, with the two run outputs.

### Task 3: Continuous sync — webhook upserts stragglers

**Files:**
- Modify: `src/app/api/acuity/webhook/route.ts`

- [ ] **Step 1:** After the existing tracking work (which stays untouched), on `scheduled`/`appointment.scheduled` AND `rescheduled`/`appointment.rescheduled` actions, call `upsertAcuityBooking(appt)` best-effort (own try/catch, `console.error("[booking] acuity mirror upsert failed", appt.id, err)`) — runs REGARDLESS of the flag (the mirror keeps the native table current until cancellation). Note: the route currently early-returns on non-scheduled actions at ~line 114 — restructure so rescheduled also reaches the upsert while tracking still fires only for scheduled (keep existing tracking semantics EXACTLY: dedupe key unchanged).
- [ ] **Step 2:** Local verification: POST the webhook shape (`action=scheduled&id=<a real future appointment id from Task 2's import>`) with the secret to a dev server → row updated; a fabricated id → logged failure, 200 still returned (webhook must never error to Acuity). Record.
- [ ] **Step 3:** Gate + commit.

### Task 4: Reminder exclusion while Acuity is active

**Files:**
- Modify: `src/app/api/cron/booking-reminders/route.ts`

- [ ] **Step 1:** In the candidates query/filter, when `process.env.ACUITY_ACTIVE === "true"`, exclude `source = 'acuity_import'` rows from REMINDERS (the sweep is untouched). Comment: "Acuity still sends its own reminders for appointments it booked; ours would double up. This env var dies when the Acuity subscription is cancelled — after that, imported bookings get OUR reminders." Select `source` in the query.
- [ ] **Step 2:** Gate + commit. (No env change in Vercel now — reminders only fire flag-on; the runbook sets `ACUITY_ACTIVE=true` together with the flag.)

### Task 5: Daily report v2 — dual-source

**Files:**
- Modify: `src/lib/daily-report.ts` + `src/app/api/cron/daily-report/route.ts`
- Test: `scripts/daily-report.test.mts` (extend, keep green)

**Rules (exact):**
- While `ACUITY_ACTIVE === "true"` (and today, where it's unset in prod, treat unset-but-flag-off as the same mode): base numbers come from Acuity live API exactly as today, PLUS native additions counted separately: bookings `source='native'` (they have no Acuity mirror) and native gift-cert sales (`gift_certificates` where `square_payment_id is not null`). Show native additions as their own labeled line items ("Booked on the site (native)") so the report's existing Acuity numbers are unchanged and auditable.
- When `ACUITY_ACTIVE` is NOT "true" AND `NEXT_PUBLIC_NATIVE_CALENDAR` IS "true" (post-cancellation mode): Acuity live API is dead — YTD/history comes from `acuity_archive_appointments` (amount_paid_cents, canceled=false), current activity from `bookings` (confirmed/completed, both sources, dedupe is inherent — imported rows ARE the old Acuity rows) + native gift certs.
- Pure calculation additions go in `daily-report.ts` (testable); fetching in the route.
- [ ] **Step 1:** Extend `scripts/daily-report.test.mts` with the new pure functions' cases (native-additions summing; archive-mode math; zero-native = byte-identical section output). Run → RED.
- [ ] **Step 2:** Implement. Run tests → GREEN, whole suite green.
- [ ] **Step 3:** Deploy-safety proof: generate the report HTML body twice with the same mocked Acuity inputs — old code path vs new with zero native rows — and diff (allow only the absence/emptiness of the native line when zero; state the exact diff). Record in report.
- [ ] **Step 4:** Gate + commit.

### Task 6: Flip wiring — every surface flips with the flag

**Files:**
- Modify: `src/lib/constants.ts` or call sites (choose the minimal-diff approach below), `src/data/navigation.ts`, `src/app/shop/ShopBody.tsx`, `src/app/farm-tours/page.tsx`, `src/app/nordic-spa/page.tsx`, `src/components/shared/StickyMobileCTA.tsx` usage on the two product pages, `src/app/sitemap.ts`, `public/llms.txt` (NO — llms.txt is static; put its edit in the runbook instead), `src/components/booking/NativeBookingSection.tsx` (if needed for the sticky anchor)

- [ ] **Step 1: Gift links.** Server components (`farm-tours`, `nordic-spa`, the nav consumer, `ShopBody` if server — CHECK: ShopBody is a client component ("use client"), so it cannot call `nativeCalendarEnabled()` server-side; instead thread a prop or read `process.env.NEXT_PUBLIC_NATIVE_CALENDAR === "true"` directly — NEXT_PUBLIC_ vars are inlined into client bundles, so a direct check works in client components too and flips at build time with the env). Introduce ONE helper in `src/lib/booking/flag.ts`: `giftCertificatesHref(): string` returning `/gift-certificates` when the flag is on else `BOOKING_LINKS.giftCertificates` — usable in both server and client components (it only reads the NEXT_PUBLIC_ env). Replace all SIX call sites. External-link styling/`external` props must be conditional too (native href is internal — no `external`, no Acuity utm/tracking wrapper when flag on; keep exact current markup when off).
- [ ] **Step 2: Nav wedding-call.** In `src/data/navigation.ts`, the weddings nav (find the current wedding-call/consult entry if one exists — if none exists, add nothing; report what you found). Data files are imported by server + client — same `giftCertificatesHref`-style pattern if a link exists.
- [ ] **Step 3: Sitemap.** `src/app/sitemap.ts`: when the flag is on, add `/wedding-call` and `/gift-certificates` entries (priority 0.6). Flag off = today's output.
- [ ] **Step 4: Native sticky CTA.** On the two product pages the Acuity `BookingStickyCTA` is hidden flag-on (Phase 2); add the flag-on replacement: a minimal sticky mobile CTA anchoring to `#book` (the NativeBookingSection id) — implement as `NativeStickyCTA` in `src/components/booking/` reusing the existing sticky component's styling with an anchor href, mounted inside the flag-on branch. Mobile shot to confirm.
- [ ] **Step 5:** Byte-identical flag-off proof for `/farm-tours`, `/nordic-spa`, `/shop`, and the sitemap route (build+curl diff vs pre-task build, modulo build ids). Gate + commit.

### Task 7: Schedule suggestions for Jalene (report only — nothing seeded)

**Files:**
- Create: `scripts/acuity-schedule-suggest.mts`, output `docs/schedule-suggestions-2026-08.md`

- [ ] **Step 1:** Script reads `acuity_archive_appointments` (last 12 months, canceled=false), buckets start times per product per Pacific weekday, and writes a markdown table per product: weekday, observed start times (with counts), busiest month. Header states plainly: "Observed from 12 months of real bookings. SOLD OUT and CLOSED look identical in this data. Jalene's entries in the admin are the source of truth; this is a cross-check."
- [ ] **Step 2:** Run it, commit script + output. (This doc backs a follow-up nudge to Jalene if her Schedules tab stays empty.)

### Task 8: GTM publish script (armed, NOT run) + the cutover runbook

**Files:**
- Create: `scripts/publish-booking-gtm.mjs`
- Create: `docs/superpowers/plans/2026-08-27-cutover-runbook.md`

- [ ] **Step 1: GTM script.** Following the working recipe in memory `shared/google-tag-manager-api.md` (three scopes incl. `edit.containerversions`; read `workspaces/{ws}/status` first; publish promotes the whole workspace — the script must print the workspace status and REFUSE to publish if unrelated pending changes exist, requiring `--force`): create GA4 event tags + custom-event triggers for `booking_select_date`, `booking_select_time`, `booking_begin_checkout`, `gift_view`, `gift_purchase` (container `GTM-MBH36BJH`). ⛔ Do NOT create a GA4 tag for `booking_purchase` or `booking_view_item` — server MP already reports purchases (double count) and the combo `view_item` double-fires from the collapsed expander; put both exclusions IN THE SCRIPT as comments and in its `--help`. Script takes `--dry-run` (default: dry) and `--publish`. Do NOT run `--publish` in this plan; run `--dry-run` and record its plan output.
- [ ] **Step 2: Runbook** — one page, executable top to bottom, with check commands:
  1. Preconditions: Jalene's schedules entered (query `booking_schedules` count per product > 0) + wedding blackouts present + Hayden's explicit go.
  2. Re-run `scripts/import-acuity-bookings.mts` (fresh stragglers + cancellation reconcile).
  3. Vercel env: add `NEXT_PUBLIC_NATIVE_CALENDAR=true` + `ACUITY_ACTIVE=true` (production) → redeploy.
  4. Verify (from `scripts/booking-e2e.md` section references): availability 200 with Jalene's real slots; product pages show the widget and no Acuity CTAs; /wedding-call + /gift-certificates live; one real card charge end-to-end (THE outstanding farm-store item too) and refund it via the admin.
  5. `node scripts/publish-booking-gtm.mjs --publish`.
  6. Acuity admin (manual, Hayden/Jalene): hide all public appointment types (Client Scheduling Limits), so highlandfarms.as.me dead-ends politely.
  7. Withdraw the Reserve-with-Google connection; `public/llms.txt` edit (booking is native now; bump Last-Updated); GBP links check.
  8. DWD grant (admin.google.com → Security → API Controls → Domain-wide delegation → SA client id + scope `https://www.googleapis.com/auth/calendar.events`) + run the live Meet probe.
  9. Watch week: straggler webhook mirrors, daily report shows the native line, reminders behavior.
  10. Acuity cancellation (Hayden's date, ≥2 weeks post-flip): export any final data, cancel the $49/mo, REMOVE `ACUITY_ACTIVE` (imported bookings start getting our reminders), archive re-run.
  11. Post-cancel: the cert-scope decision (can certs redeem on combos?) + legacy gift-cert import (admin-UI export needed from Acuity BEFORE cancellation — put it at step 10a: export certificates/packages list from the Acuity reports UI while the account is alive, import with codes UPPERCASED).
- [ ] **Step 3:** Gate + commit.

---

## NOT in this plan (needs humans or the flip)
The flip itself · Jalene's schedules/blackouts/pack answer · the DWD admin-console grant (controller attempts it separately) · GTM `--publish` · Acuity scheduler hiding, RwG withdrawal, cancellation · the real card charge · legacy gift-cert export/import (needs the Acuity UI while alive, at flip time).
