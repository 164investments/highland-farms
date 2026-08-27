# Native calendar cutover runbook — one page, top to bottom

Phase 3a arms this; it does not flip anything. This is the sequence to run
**when Hayden says go**. Every step has a check command. Nothing here has
been executed except where marked ✅ (Phase 3a's own dry-run/read checks).

Related docs: `scripts/booking-e2e.md` (full verification matrix, re-run
before/after any `src/lib/booking/*` change), `ARCHITECTURE.md` → "Booking
(native calendar)", `scripts/publish-booking-gtm.mjs --help`.

---

## Decisions needed from Hayden before/at flip

1. **Gift-certificate scope vs. the combo.** All three sold certs
   (`tour-for-two`, `spa-for-two`, `spa-3-visit` — `src/lib/booking/gift.ts`)
   are `productScope`-locked to a single product (`farm-tour` or
   `nordic-spa`). **None of them can redeem against a Full Farm Day combo
   booking today.** Is that intended, or should value certs (kind `value`)
   be unscoped so their cents can apply to a combo checkout too? Affects
   both the live product definitions and the legacy-cert import in Step 11.
2. **Acuity cancellation date.** Step 10 needs a firm date (≥2 weeks after
   the flip, per the "watch week" margin below) to schedule the $49/mo
   cancellation and set `ACUITY_ACTIVE` removal.
3. **Mode B daily-report note.** Pre-cutover cancelled Acuity-archive rows
   are excluded from cancel-rate history in Mode B (deliberate — the report
   only reconstructs cancel-rate from native-table data, which doesn't exist
   for the Acuity era). Revisit only if the report's cancel numbers start
   mattering post-cutover; not a blocker.

---

## Step 1 — Preconditions

Do not proceed past this step without all four:

- [ ] Jalene's recurring schedules are entered for every live product.
      Check:
      ```sql
      select product_slug, count(*) from booking_schedules group by product_slug;
      ```
      Expect `farm-tour`, `nordic-spa`, `wedding-call` each `> 0`. Cross-check
      against the data-backed suggestions in
      `docs/schedule-suggestions-2026-08.md` (Task 7) — that report is
      observation-only and never wrote to the table itself.
- [ ] Wedding blackouts are present for every known wedding date. Check:
      ```sql
      select kind, starts_on, ends_on, product_slugs
      from booking_blackouts
      where kind = 'wedding'
      order by starts_on;
      ```
      Cross-reference the list against the actual booked-wedding calendar
      (Acuity wedding-portfolio bookings / `event_inquiries`) — every date
      with a wedding on it needs a row here, or farm-tour/nordic-spa
      availability will offer slots on a day the farm can't actually run
      tours.
- [ ] Jalene has replied on the 3-Visit-Pack redemption semantics (asked
      2026-08-27, msg `1a045540b04f11c8`) — needed before Step 11's legacy
      cert import, doesn't block the flip itself but get it before Step 10a
      so the export/import isn't done twice.
- [ ] Hayden's explicit go — a written "flip it" for this specific runbook,
      not silence and not "go ahead" on a broader conversation (see the
      Live Ad Account Rule's approval discipline; the same rule applies to
      this cutover even though it isn't an ad account).

## Step 2 — Re-run the Acuity importer

```bash
npx tsx --env-file .env.local scripts/import-acuity-bookings.mts
```

Catches any stragglers booked in Acuity since the last import, and runs
`reconcileCancellations` to flip any `source='acuity_import'` booking that
was cancelled in Acuity since. This is belt-and-suspenders, not the primary
sync: the webhook mirror (`src/app/api/acuity/webhook`,
`src/lib/booking/acuity-import.ts`'s `upsertAcuityBooking`) already keeps
the native `bookings` table current continuously while Acuity is live, and
`reconcileCancellations` restricts which rows it's willing to reconcile to a
window ONE MONTH NARROWER than the 18-month fetch (`[from, from+17 months)`
candidates against an 18-month Acuity fetch) — the boundary fix in commit
`109cdd5`. That margin runs the other direction from "self-limits to the
fetch horizon" might suggest: it exists so a booking rescheduled out near
the edge of the fetch window, which would otherwise look identical to a
real cancellation (Acuity just doesn't show it yet), can never be falsely
marked cancelled. Run this immediately before Step 3 so the window between
"last webhook" and "flag flip" is as small as possible.

Expect output in the `inserted=N updated=N skipped=N` / `cancelled=N` shape
documented in Task 2's report — `skipped` should be 0 (no unmapped
appointment types) and `cancelled` should be small (whatever cancelled in
Acuity since the last run).

## Step 3 — Vercel environment

Set **both**, together, in Production:

```
NEXT_PUBLIC_NATIVE_CALENDAR=true
ACUITY_ACTIVE=true
```

Then redeploy (env var changes don't apply to already-built deployments).

Both flags stay on together through the whole watch week (Step 9).
`ACUITY_ACTIVE=true` does two things while Acuity is still the account of
record even though the site now takes bookings natively:
- `src/app/api/cron/booking-reminders/route.ts` — excludes Acuity-imported
  bookings from native reminder emails (Acuity's own reminders already
  cover them; sending both would double-email guests).
- `src/app/api/cron/daily-report/route.ts` / `src/lib/daily-report.ts` —
  selects Mode A (Acuity + native additions) instead of Mode B (native
  only) for the daily report's source mode.

`ACUITY_ACTIVE` is **removed** (not just set to `false`) only at Step 10,
the same day Acuity is actually cancelled — that's the one moment imported
bookings should start getting native reminders and the daily report should
switch to Mode B.

## Step 4 — Verify

Follow `scripts/booking-e2e.md` Setup + the full matrix (Engine, Checkout,
Gift, Admin, UI sections) against the **live production** site now that the
flag is on, not just dev. Minimum before calling this step done:

- [ ] `GET /api/booking/availability?product=farm-tour&...` returns 200 with
      Jalene's real seeded slots (not the dev-seeded test times) — matrix
      item A2's recipe, live data.
- [ ] Farm-tour / nordic-spa / combo product pages render the booking
      widget and show **no Acuity CTAs** anywhere (nav, page CTAs, footer).
      Grep the deployed pages for any remaining `.as.me` link as a
      mechanical check.
- [ ] `/wedding-call` and `/gift-certificates` are live and functional
      (matrix sections B1, C1-C4).
- [ ] **One real card charge end-to-end**, then refund it via `/shop/admin`
      — this covers the outstanding farm-store admin-refund item too, not
      just booking. Use a real Square test/small-amount charge, not a
      seeded test cert.

Do not proceed to Step 5 on a partial pass — this is the last gate before
the container starts collecting real GA4 data on these events.

## Step 5 — Publish the GTM booking events

```bash
node scripts/publish-booking-gtm.mjs --dry-run   # re-confirm the plan against the LIVE workspace first
node scripts/publish-booking-gtm.mjs --publish
```

Wires GA4 event tags + custom-event triggers for `booking_select_date`,
`booking_select_time`, `booking_begin_checkout`, `gift_view`,
`gift_purchase` in container `GTM-MBH36BJH`. Deliberately excludes
`booking_purchase` (server MP already reports it — a client tag would
double-count revenue) and `booking_view_item` (fires twice per real page
view on the combo picker's collapsed expander). Both exclusions are in the
script's `--help` and header comment — re-read them before ever adding
either later.

The script refuses `--publish` if the workspace has pending changes it
didn't just make, unless `--force` is passed too — because a GTM publish
promotes the **whole workspace**, not just these five tags. If it refuses,
read what it's refusing about before forcing; don't reflexively add
`--force`.

Verify from the served container after publish, not just the API response:
```bash
curl -s 'https://www.googletagmanager.com/gtm.js?id=GTM-MBH36BJH' | grep -o '"vtp_eventName":"[a-z_]*"' | sort -u
```
should include all five new event names.

## Step 6 — Acuity admin: hide public appointment types (manual, Hayden/Jalene)

In the Acuity admin, Client Scheduling Limits → hide every public
appointment type so `highlandfarms.as.me` dead-ends politely (no more new
bookings can land there) instead of being cancelled outright — the account
stays live for reporting/export until Step 10.

## Step 7 — Reserve with Google + llms.txt + GBP

- [ ] Withdraw the Reserve-with-Google connection (Acuity is no longer the
      booking source of truth; leaving RwG pointed at it would let guests
      book a channel that dead-ends per Step 6).
- [ ] Edit `public/llms.txt`: note that booking is now native, bump
      `Last-Updated`.
- [ ] Check Google Business Profile booking links point at the site, not a
      stale Acuity URL.

## Step 8 — Domain-wide delegation grant + Meet probe

**Status as of 2026-08-27: no DWD grant exists for either candidate SA.**
Both were probed live and both come back ungranted.

1. **Confirm which SA is actually in use first** — check Vercel's
   `GOOGLE_SA_EMAIL` value for this project. Don't grant blind; grant the
   SA the app is actually configured to impersonate with. The two
   candidates seen in this fleet, with their numeric OAuth client IDs
   (admin.google.com wants the numeric ID, not the email):
   - `claude-code@ace-destination-454618-k4.iam.gserviceaccount.com` →
     `105269475534049530880`
   - `hf-mail-reader@ace-destination-454618-k4.iam.gserviceaccount.com` →
     `111205029622805614088`
2. In `admin.google.com` (domain `highlandfarms-oregon.com`) → **Security**
   → **API Controls** → **Domain-wide delegation** → **Add new**:
   - Client ID: the numeric ID from step 1, matching Vercel's actual
     `GOOGLE_SA_EMAIL`.
   - Scope: `https://www.googleapis.com/auth/calendar.events`
3. **After** the grant lands, run a live Meet probe before trusting any
   Meet link the site generates — create a test event via
   `src/lib/booking/google-calendar.ts`'s path (a real wedding-call
   booking, or a one-off script call) impersonating `events@`, confirm a
   real `hangoutLink` comes back, then delete the test event. Until this
   probe passes, treat every wedding-call confirmation's Meet link as
   possibly the `MEET LINK NEEDED` fallback (ARCHITECTURE.md rule 8 — the
   booking still confirms either way, this only affects whether the Meet
   link itself is real).

This step can be attempted by the controller in parallel with earlier
steps — it doesn't block the flag flip, only the reliability of Meet links
for wedding-call bookings taken before the grant lands.

## Step 9 — Watch week

For at least a week after the flip:

- [ ] Confirm the webhook mirror is still correctly a no-op now that Acuity
      scheduling is hidden (Step 6) — no new Acuity bookings should be
      arriving to mirror, so `bookings` growth should be 100% native-source
      going forward. A stray `source='acuity_import'` row appearing after
      Step 6 means something is still reachable that shouldn't be.
- [ ] Daily report shows the native line correctly (Mode A: Acuity total +
      native additions, per `src/lib/daily-report.ts`).
- [ ] Reminder emails: native bookings get native reminders; Acuity-imported
      bookings do NOT (still excluded per `ACUITY_ACTIVE=true`) — spot
      check `booking-reminders` cron logs.

The ≥2-week gap between flip and Step 10 (cancellation) referenced in the
decisions box gives this watch week room plus a buffer before the account
is actually cancelled.

## Step 10 — Acuity cancellation (Hayden's date, ≥2 weeks post-flip)

### Step 10a — BEFORE cancelling, while the account is still alive

- [ ] **Export the certificates/packages list** from Acuity's reports UI.
      This has to happen before cancellation — there is no API/CLI path to
      pull it after the account is gone, and no other copy of this data
      exists anywhere in this repo or Supabase.
- [ ] Confirm Jalene's answer on 3-Visit-Pack redemption semantics is in
      hand (see Preconditions) before building the import mapping.

### Then

- [ ] Export any other final data worth keeping (final appointment
      archive — `scripts/acuity-archive.mts` already has a full run from
      Task 1, re-run it once more right before cancelling to catch the last
      few days).
- [ ] Cancel the $49/mo Acuity subscription.
- [ ] **Remove `ACUITY_ACTIVE` from Vercel entirely** (not `false` — remove
      the var). From this moment, imported bookings start getting native
      reminders, and the daily report switches to Mode B.
- [ ] Redeploy.
- [ ] Re-run the archive script once more against the (now read-only, until
      it disappears) Acuity data if anything from the final export needs
      reconciling against the archive table.

## Step 11 — Post-cancellation

- [ ] Resolve the cert-scope decision (Decisions box, item 1) if not
      already resolved — determines whether the legacy import below unlocks
      combo redemption or stays product-scoped.
- [ ] **Legacy gift-certificate import**, using the Step 10a export:
      - Codes imported **UPPERCASED** — matches the live admin's own
        normalization (`src/app/api/shop/admin/booking/certs/route.ts`
        already does `.trim().toUpperCase()` on every code it reads), so a
        legacy code entered any-case at redemption still matches.
      - Map each legacy cert to the closest live `GiftProduct`
        (`src/lib/booking/gift.ts`) or issue it via
        `issueGiftCertificate` with the legacy remaining-value/units
        preserved — never re-derive the amount from a price list, carry
        forward whatever Acuity's export says is actually left on it.
      - 3-Visit-Pack rows need Jalene's redemption-semantics answer applied
        consistently with how the live `spa-3-visit` product redeems
        (`kind: "visits"`, `units: 3`).

---

## Gate

- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `node scripts/publish-booking-gtm.mjs --help` (parses, no live call)
- [ ] `node scripts/publish-booking-gtm.mjs --dry-run` (live call, prints
      plan, makes zero changes) — record output at flip time as the
      pre-publish sanity check, same as Step 5's dry-run re-confirm.

## Not in this runbook — separate approvals/actors

- The flip itself (Hayden's go, Step 1).
- Jalene's schedules/blackouts/3-visit-pack answer.
- The DWD admin-console grant (Step 8 — controller attempts separately).
- `scripts/publish-booking-gtm.mjs --publish` (Step 5 — not run in Phase 3a).
- Acuity scheduler hiding, RwG withdrawal, cancellation (Steps 6, 7, 10 —
  manual, Hayden/Jalene).
- The real card charge + refund (Step 4 — manual, live money).
- Legacy gift-cert export/import (Step 10a/11 — needs the Acuity UI while
  the account is still alive, at flip time, not before).
