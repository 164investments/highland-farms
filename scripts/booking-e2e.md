# Native calendar — standing cutover verification matrix

This is the **Phase 3 cutover re-run playbook**. Run it in full (Setup +
every area below, in order) before flipping `NEXT_PUBLIC_NATIVE_CALENDAR` to
`"true"` in production, and again after any change to `src/lib/booking/*`,
`src/components/booking/*`, `src/app/api/booking/*`,
`src/app/api/shop/admin/booking/*`, or `src/app/api/cron/booking-reminders`.

Items are grouped by area (Engine, Checkout, Gift, Admin, UI) rather than by
the task that added them, so a re-run can work straight down the matrix.
Every item keeps its original recipe and last-verified result; nothing from
the task-by-task history below was dropped, only reordered and renumbered.
A table mapping this document's numbering to the original chronological
numbering (as recorded in past task reports) lives in Task 14's report if
you need to trace an item back to the task/commit that added it.

**History (chronological, for context — see the Summary table at the bottom
for area-grouped results):** first executed against the real stack
**2026-08-27** (Task 10, Phase 1). Engine items 5-6 below (number-collision
retry, free-consult GA4 event) added and live-checked the same day for Phase
2 Task 3. Gift items added and live-checked the same day for Phase 2 Task 8.
Admin items added and live-checked the same day for Phase 2 Task 12 (admin
booking APIs + Square refunds), then extended the same day by a review pass
that found four real issues in the cancel path (visits-cert over-restore, a
cancel email that couldn't say both "refunded" and "gift restored" at once,
an unchecked gift-restore return, and single-leg cancel logic applied to a
two-row combo) — all four fixed and re-verified same-day — and then by a
follow-up re-review that found a TOCTOU race in the combo-cancel fix itself
(fixed by making `cancelBookingGroup` a single atomic `UPDATE ... RETURNING`
statement). This document reflects the final, post-fix state as of Task 14
(2026-08-27): **no known live bugs in this matrix.**

## Setup

1. Confirm `.env.local` has NO `SQUARE_*` vars (the matrix relies on this —
   the Checkout section's Square-unconfigured items verify the paid path
   503s when Square isn't configured).
2. Start the dev server with Resend disabled so nothing reaches the farm's
   live inbox, and the flag as needed:
   ```bash
   # flag OFF run (Engine item 1 only)
   RESEND_API_KEY=disabled-for-e2e npm run dev

   # flag ON run (everything else)
   RESEND_API_KEY=disabled-for-e2e NEXT_PUBLIC_NATIVE_CALENDAR=true npm run dev
   ```
   Runs on port 3000 (or `PORT=3099`) — both are in the checkout route's
   dev-only origin allowlist.
3. Checkout requests **must** send `Origin: http://localhost:3000` (or
   `:3099`) or the origin/referer check 403s.
4. Seed/cleanup SQL via the Supabase Management API:
   ```bash
   curl -s -X POST "https://api.supabase.com/v1/projects/qhaeqklgbfvviyedxbyl/database/query" \
     -H "Authorization: Bearer $(cat ~/.supabase/access-token)" \
     -H "Content-Type: application/json" \
     -d '{"query":"<SQL>"}'
   ```
5. Use future Saturdays (schedules are seeded by weekday) and a disposable
   test email so cleanup is unambiguous. The 2026-08-27 runs used
   `2026-09-05` / `2026-09-12` / `2026-09-19` (all Saturdays) and
   `e2e-test@example.com`.
6. **Email-received substitution (controller ruling, 2026-08-27):** with
   Resend disabled, "confirmation email received" is replaced by: booking
   succeeds (`success:true` + row `confirmed` in DB) AND the dev-server log
   shows the matching `[booking] ... email failed` line(s). See Checkout
   item 1's result below.
7. Admin routes additionally need `SHOP_ADMIN_TOKEN` set for the dev-server
   process only (not written to `.env.local`) and every admin request sent
   with `Authorization: Bearer $SHOP_ADMIN_TOKEN`.

---

## A. Engine — schedules, availability, capacity, blackouts

### A1. Flag off — availability / checkout / reminders (unauthed)
Expected: 404 / 404 / 401. **PASS.**
```
GET  /api/booking/availability?product=farm-tour&from=2026-09-01&to=2026-09-30&party=2  -> 404 {"error":"Not found"}
POST /api/booking/checkout (wedding-call)                                                -> 404 {"error":"Not found"}
GET  /api/cron/booking-reminders (no auth header)                                        -> 401 {"error":"Unauthorized"}
```

### A2. Seed one Saturday tour schedule + spa schedule → correct availability
Seeded (weekday 6 = Saturday, Pacific):
```sql
insert into booking_schedules (product_slug, weekday, start_times, capacity, effective_from) values
  ('farm-tour', 6, ARRAY['10:00','13:00'], 2, '2026-01-01'),
  ('nordic-spa', 6, ARRAY['11:00','14:00'], 6, '2026-01-01'),
  ('wedding-call', 6, ARRAY['09:00','10:00','11:00'], 1, '2026-01-01');
```
```
GET /api/booking/availability?product=farm-tour&from=2026-09-05&to=2026-09-12&party=2
-> 2026-09-05: [{time:"10:00",capacity:2,remainingUnits:2}, {time:"13:00",capacity:2,remainingUnits:2}]
   2026-09-12: same shape
GET /api/booking/availability?product=nordic-spa&from=2026-09-05&to=2026-09-12&party=2
-> 2026-09-05: [{time:"11:00",capacity:6,remainingUnits:6}, {time:"14:00",capacity:6,remainingUnits:6}]
```
Correct slots, `remainingUnits === capacity` (nothing booked yet). **PASS.**

### A3. Wedding blackout → both products zero that day, combo has no pairs
```sql
insert into booking_blackouts (kind, starts_on, ends_on, note)
  values ('wedding', '2026-09-05', '2026-09-05', 'E2E test blackout');
-- product_slugs defaults to {farm-tour,nordic-spa} — wedding-call is untouched
```
```
GET /api/booking/availability?product=farm-tour&from=2026-09-05&to=2026-09-05   -> {"days":[{"date":"2026-09-05","slots":[]}]}
GET /api/booking/availability?product=nordic-spa&from=2026-09-05&to=2026-09-05  -> {"days":[{"date":"2026-09-05","slots":[]}]}
GET /api/booking/availability?product=combo&from=2026-09-05&to=2026-09-05       -> {"days":[]}   (no pairs)
GET /api/booking/availability?product=wedding-call&from=2026-09-05&to=2026-09-05 -> still 3 slots (weddings don't block wedding-call — expected: a wedding CALL is a consult, not the wedding itself)
```
**PASS.**

### A4. Capacity race — two parallel wedding-call checkouts, same slot, capacity 1
Slot: `2026-09-05T10:00` Pacific (fresh from Checkout item 1's `09:00` booking), wedding-call
schedule capacity = 1.
```
Parallel POST /api/booking/checkout (same date/time, different idempotencyKey/name):
  A -> 409 {"error":"That time was just booked by someone else. Your card has not been charged — pick another time."}
  B -> 200 {"success":true,"bookingNumber":"HFB-260827-7080","amountCents":0}
```
Exactly one `confirmed` row for that slot. **PASS.**

### A5. Expired-hold sweep
```sql
insert into bookings (booking_number, product_slug, starts_at, duration_min, party_size, units,
  status, hold_expires_at, first_name, last_name, email, phone, amount_cents, referral_source)
values ('E2E-EXPIRED-TEST', 'farm-tour', '2026-09-19T17:00:00Z', 60, 2, 1,
  'pending', now() - interval '1 hour', 'Expired','Hold','e2e-test@example.com','5035551234',15000,'e2e-test');
```
```
GET /api/cron/booking-reminders  (Authorization: Bearer $CRON_SECRET)
-> 200 {"swept":1,"reminders":0}
```
Row deleted after the call. `reminders:0` as expected — all confirmed test
bookings (2026-09-05) were weeks outside the 42-54h reminder window, checked
and confirmed via the query itself (no candidates). **PASS.**

### A6. Number collision — retry (code-inspected)
Not exercised live: forcing a real `23505` on `bookings.booking_number` needs
a second in-flight request racing the exact same 4-digit random suffix inside
the same UTC day, which isn't reliably reproducible outside a fuzzed harness.
Verified instead by unit reasoning against the actual code:
- `claim_booking_slots` inserts a row keyed by `booking_number`, which carries
  a unique index (see `supabase-booking.sql`); a same-day suffix repeat raises
  Postgres `23505`.
- `store.ts` `claimSlots()` maps `error?.code === "23505"` to
  `{ ok: false, reason: "number_collision", message: "" }` — added *before*
  the generic `error` branch, so it can't be shadowed by the catch-all.
- `checkout/route.ts` wraps the claim in a two-attempt loop: `bookingNumber`
  and `claim` are both `let`; on `reason === "number_collision"` a fresh
  `generateBookingNumber()` is drawn and `claimSlots` is retried exactly once
  with `buildCustomer(bookingNumber)` re-evaluated against the new number.
  A second collision (astronomically unlikely — the retry itself would need
  to hit yet another 4-digit clash the same day) falls through to the normal
  `if (!claim.ok)` 503/409 handling, so the request still fails safely rather
  than looping. **PASS (code-inspected).**

### A7. Cleanup — Engine section
```sql
delete from bookings where email = 'e2e-test@example.com' or booking_number = 'E2E-EXPIRED-TEST';
delete from booking_blackouts where note = 'E2E test blackout';
delete from booking_schedules where product_slug in ('farm-tour','nordic-spa','wedding-call');
```
Post-cleanup counts (all tables): `schedules:0, exceptions:0, blackouts:0`.
This cleanup query also covered the `bookings` and `gift_certificates` rows
created by the Checkout section below, since Engine and Checkout were
exercised together in one run — see Checkout item 8 for the combined
post-cleanup counts. **PASS.**

### A8. Acuity importer idempotency (Phase 3a Task 2, live run against real Acuity data)
`npx tsx --env-file .env.local scripts/import-acuity-bookings.mts` against
the live Highland Farms Acuity account (`--from` defaulted to today,
2026-08-27), imports active appointments through 2028-02-27 (18 months),
then reconciles cancellations.

Run 1 (fresh import):
```
[import-acuity-bookings] fetched 199 active appointments
[import-acuity-bookings] inserted=199 updated=0 skipped=0
[import-acuity-bookings] cancelled=0
[import-acuity-bookings] DONE inserted=199 updated=0 skipped=0 cancelled=0
```
Verify: `select count(*), sum(amount_cents) from bookings where source='acuity_import'`
→ `count=199, sum_cents=2441239`, matching the run log exactly. Product
breakdown: `farm-tour: 109 rows, units 1/1, party_size 2-5` · `nordic-spa: 78
rows, units 1/1, party_size 1/1` (each attendee is its own Acuity
appointment row, per the plan's Global Constraints) · `wedding-call: 12
rows, units 1/1, party_size 1/1`. All 199 rows `status='confirmed'`.

Run 2 (immediate re-run, idempotency proof):
```
[import-acuity-bookings] fetched 199 active appointments
[import-acuity-bookings] inserted=0 updated=199 skipped=0
[import-acuity-bookings] cancelled=0
[import-acuity-bookings] DONE inserted=0 updated=199 skipped=0 cancelled=0
```
Post-run-2 verify: `count=199, sum_cents=2441239` — unchanged. Zero new
rows, every row matched by `acuity_id` and went through the
`source='acuity_import'`-guarded update path. **PASS.**

Spot-check (5 random imported rows cross-referenced against
`acuity_archive_appointments`, the raw Acuity API capture from Task 1 —
datetime, amount, and names match exactly for all 5):

| acuity_id | product | starts_at | amount_cents | name |
|---|---|---|---|---|
| 1744081638 | farm-tour | 2026-09-16 17:00 UTC | 15000 | Victoria Healy |
| 1761752691 | nordic-spa | 2026-10-11 22:00 UTC | 7500 | Anil A |
| 1731755315 | nordic-spa | 2026-09-01 22:00 UTC | 9000 | Dylan Jones |
| 1749869547 | farm-tour | 2026-09-03 17:00 UTC | 17700 | chris schroeder |
| 1729027108 | farm-tour | 2026-10-31 17:00 UTC | 15000 | Ann Truong |

**PASS.**

---

## B. Checkout — customer-facing booking flow

### B1. Checkout `wedding-call` (free, no sourceId)
```
POST /api/booking/checkout
{ product:"wedding-call", date:"2026-09-05", time:"09:00", partySize:1,
  customer:{...}, referralSource:"e2e-test", policyAgreed:true, locationChoice:"meet" }
-> 200 {"success":true,"bookingNumber":"HFB-260827-1886","amountCents":0}
```
DB: `status='confirmed'`, `amount_cents=0`. **Booking half PASSES.**

**Original bug (found this run, fixed in `cffe1d8`):** the email-failure log
substitution did not reproduce as specified. The dev-server log showed zero
`[booking] ... email failed` lines after the request, and zero errors of any
kind. Root cause: `resend` SDK v6.9.2's `emails.send()` never rejects its
promise — an HTTP error from Resend (bad key, 4xx/5xx) resolves as
`{ data: null, error: {...} }` instead. `confirmation-email.ts`'s
`sendBookingEmails()` only logged when `Promise.allSettled` reported
`status === "rejected"`, which this SDK never produces for an API-level
failure, so a failed send was completely silent. Verified directly:
```js
const { Resend } = require("resend");
new Resend("disabled-for-e2e").emails.send({from:"a@b.com",to:"c@d.com",subject:"x",html:"<p>x</p>"})
  .then(r => console.log("RESOLVED:", JSON.stringify(r)));
// RESOLVED: {"data":null,"error":{"statusCode":401,"name":"validation_error","message":"API key is invalid"}, ...}
```
The "email must never block a booking" guarantee held throughout (booking
confirmed regardless) — the gap was purely the missing operational signal.

**Fix (`cffe1d8`):** both `confirmation-email.ts` and `reminder-email.ts`
now route sends through a `sendOrThrow()` helper that throws on a resolved
`result.error`, so `Promise.allSettled`'s rejection branch (and the cron's
`try`/`catch`) actually engage on a real Resend failure.

**Post-fix re-verification (`cffe1d8`, 2026-08-27):** re-ran this exact
request against a flag-on dev server with `RESEND_API_KEY=disabled-for-e2e`.
Booking still confirms (`success:true`, DB `confirmed`), and the dev-server
log now shows both expected lines:
```
[booking] customer confirmation email failed HFB-...: API key is invalid
[booking] farm notification email failed HFB-...: API key is invalid
```
**Item B1: PASS** (booking success and email-failure logging both verified).

### B2. Checkout `farm-tour` with Square unconfigured → 503
```
POST /api/booking/checkout
{ product:"farm-tour", date:"2026-09-12", time:"10:00", partySize:2, ... no sourceId }
-> 503 {"error":"Online payment isn't available right now. Please call the farm."}
```
`select count(*) from bookings where product_slug='farm-tour' and status='pending'` → `0`. **PASS.**
Note: the Square-configured check runs *before* `claimSlots()` in
`checkout/route.ts`, so no pending row is ever created for this path — there
is nothing for `releaseBookings()` to release. The observable assertion
(503, zero pending rows) holds; the original brief's parenthetical "(release
ran)" does not apply literally here.

### B3. Value gift cert (TESTCERT) fully covers a booking
```sql
insert into gift_certificates (code, kind, product_scope, initial_units, remaining_units, purchaser_email, status)
  values ('TESTCERT','value',null,15000,15000,'e2e-test@example.com','active');
```
**Original bug (found this run, fixed in `cffe1d8`):**
```
POST /api/booking/checkout
{ product:"nordic-spa", date:"2026-09-12", time:"11:00", partySize:2, giftCode:"TESTCERT", ... }
-> 503 {"error":"Online payment isn't available right now. Please call the farm."}
```
Cert unchanged (`remaining_units:15000`, `status:"active"`); no booking row created.
Root cause: `checkout/route.ts` computed `totalCents` from the legs and
gated on `!isFree && !isSquareConfigured()` **before** the gift certificate
was looked up or redeemed. nordic-spa × party 2 = 15000 cents pre-gift, so
`isFree` was false and the route 503'd — even though the $150 gift
certificate would have covered the entire booking and `dueCents` would
resolve to 0 with no charge ever attempted.

**Fix (`cffe1d8`):** the Square-configured gate moved inside the
`dueCents > 0` charge branch, after gift redemption, mirroring the existing
missing-`sourceId` failure path (restore gift, release claim, same 503 —
now only when a charge is actually still due).

**Post-fix re-verification (`cffe1d8`, 2026-08-27):** same request, same
gift cert, flag-on dev server with Square still unconfigured:
```
POST /api/booking/checkout
{ product:"nordic-spa", date:"2026-09-12", time:"11:00", partySize:2, giftCode:"TESTCERT", ... }
-> 200 {"success":true,"bookingNumber":"HFB-...","amountCents":0}
```
Booking `confirmed`, `amount_cents:0`, no Square call attempted; cert
`remaining_units` decremented to cover the $150.00 value used. **Item B3: PASS.**

### B4. Visits gift cert (TESTPACK), same root cause as B3
```sql
insert into gift_certificates (code, kind, product_scope, initial_units, remaining_units, purchaser_email, status)
  values ('TESTPACK','visits','nordic-spa',3,3,'e2e-test@example.com','active');
```
**Original bug (found this run, fixed in `cffe1d8`):**
```
POST /api/booking/checkout
{ product:"nordic-spa", date:"2026-09-12", time:"14:00", partySize:2, giftCode:"TESTPACK", ... }
-> 503 {"error":"Online payment isn't available right now. Please call the farm."}
```
Cert unchanged (`remaining_units:3`); zero pending rows. Same gate-ordering
bug as B3 — the farm-tour-with-TESTPACK "different experience" 400 was
never reached because the first checkout already 503'd.

**Fix:** same `cffe1d8` fix as B3 (single gate, shared by both gift kinds).

**Post-fix re-verification (`cffe1d8`, 2026-08-27):** same request, flag-on
dev server, Square still unconfigured:
```
POST /api/booking/checkout
{ product:"nordic-spa", date:"2026-09-12", time:"14:00", partySize:2, giftCode:"TESTPACK", ... }
-> 200 {"success":true,"bookingNumber":"HFB-...","amountCents":0}
```
Booking `confirmed`, `amount_cents:0`; cert `remaining_units` decremented by
one visit unit. **Item B4: PASS.**

### B5. Honeypot (`website:"x"`) → fake success, zero rows
```
POST /api/booking/checkout { ..., website:"x" }
-> 200 {"success":true,"bookingNumber":"HFB-260827-7042","amountCents":0}
```
`select count(*) from bookings where first_name='Bot'` → `0`. **PASS.**

### B6. Foreign origin → 403
```
POST /api/booking/checkout  (Origin: https://evil.example.com)
-> 403 {"error":"Unauthorized request origin."}
```
**PASS.**

### B7. Free wedding-call → GA4 conversion event path taken
The GA4 gate used to be `dueCents > 0`, which never fires for a free
wedding-call consult (Acuity's webhook equivalent is `book_wedding_call`,
which the wedding pipeline report reads). Task 3 changed the gate to
`dueCents > 0 || isConsult`. `sendBookingPurchase()` logs nothing on success
(only `console.error` on a non-OK response or a thrown fetch), so a plain
"no error in the log" isn't proof the branch executed — it's also what a
skipped branch looks like. To get an unambiguous signal without sending a
fake conversion to the farm's live GA4 property (its wedding/book_wedding_call
events feed real Google Ads smart-bidding conversion actions — see
`README.md`'s Integration Architecture), the live check below blanked
`GA4_MEASUREMENT_ID`/`GA4_API_SECRET` for the dev-server process only
(`.env.local` untouched) and added a one-line temporary
`console.log` immediately inside the `if (fresh && (dueCents > 0 ||
isConsult))` block, reverted immediately after capturing the log line (not
part of the committed diff — confirmed via `git diff --stat` before/after).

Setup: flag-on dev server on port 3000 (3099 was occupied by an unrelated
project's server, left untouched), Resend disabled, GA4 secrets blanked:
```bash
GA4_MEASUREMENT_ID= GA4_API_SECRET= RESEND_API_KEY=disabled-for-e2e \
  NEXT_PUBLIC_NATIVE_CALENDAR=true PORT=3000 npm run dev
```
Seeded one wedding-call Saturday schedule (`booking_schedules` id 9,
weekday 6, `start_times:['09:00']`, capacity 1, effective_from 2026-01-01),
booked the next Saturday (2026-08-29 09:00, party 2, free):
```
POST /api/booking/checkout
{ product:"wedding-call", date:"2026-08-29", time:"09:00", partySize:2, ... }
-> 200 {"success":true,"bookingNumber":"HFB-260827-1750","amountCents":0}
```
Dev-server log:
```
[e2e-temp] GA4 gate OPENED booking=HFB-260827-1750 isConsult=true dueCents=0
```
No `GA4 MP booking error` line followed — with the secrets blanked,
`sendBookingPurchase()` hit its `if (!measurementId || !apiSecret) return;`
guard and no-opped internally, so nothing reached the live property. DB
confirms the full path completed: `bookings` row `status:confirmed,
amount_cents:0`; `tracking_events` row `native_HFB-260827-1750` present
(`event_name:purchase, source:native-booking`). **PASS.**

Cleanup: deleted the booking row, the `tracking_events` row, and schedule id
9. Verified via a `count(*)` query on all three keyed to this run's ids —
`bookings:0, tracking:0, schedule:0`. Dev server stopped; the temporary log
line was removed from `checkout/route.ts` before commit (`git diff --stat`
shows only the Task 3 brief's intended edits).

### B8. Cleanup — Checkout section (Phase 1 initial run)
```sql
delete from bookings where email = 'e2e-test@example.com' or booking_number = 'E2E-EXPIRED-TEST';
delete from gift_certificates where code in ('TESTCERT','TESTPACK');
delete from booking_blackouts where note = 'E2E test blackout';
delete from booking_schedules where product_slug in ('farm-tour','nordic-spa','wedding-call');
```
Post-cleanup counts (all tables): `schedules:0, exceptions:0, blackouts:0, bookings:0, reminders:0, certs:0`. **PASS.**

---

## C. Gift certificates — purchase flow

### C1. Gift checkout — flag off → 404 (page + route)
```
GET  /gift-certificates                          -> 404 (page renders the not-found shell)
POST /api/booking/gift/checkout                  -> 404 {"error":"Not found"}
```
Verified with a dev server started **without** `NEXT_PUBLIC_NATIVE_CALENDAR` set.
**PASS.**

### C2. Gift checkout — paid purchase with Square unconfigured → 503, zero cert rows
Setup: flag-on dev server, `.env.local` confirmed to carry no `SQUARE_*` vars
(same precondition as Checkout item B2).
```
POST /api/booking/gift/checkout
{ productId:"tour-for-two", idempotencyKey:"e2e-test-key-0001", sourceId:"cnon:card-nonce-ok",
  purchaser:{name:"E2E Test", email:"e2e-test@example.com"} }
-> 503 {"error":"Online payment isn't available right now. Please call the farm."}
```
Dev-server log: `[gift] checkout hit with Square unconfigured` (the same gate
shape as the booking checkout's B2, checked before any Square call or
insert is attempted).
```sql
select count(*) from gift_certificates where purchaser_email = 'e2e-test@example.com';
```
`-> 0`. **PASS.** Confirms the charge-before-insert ordering: nothing is
written when the charge is never attempted.

### C3. Gift checkout — honeypot (`website:"x"`) → fake success, zero rows
```
POST /api/booking/gift/checkout
{ productId:"spa-for-two", idempotencyKey:"e2e-test-key-0002",
  purchaser:{name:"Bot", email:"bot@example.com"}, website:"x" }
-> 200 {"success":true,"code":"HFGC-2DXJ-5AK8"}
```
The returned code is a plausible fake (mirrors the booking checkout's fake
`bookingNumber` on honeypot) — generated in-memory via `generateGiftCode()`,
never inserted.
```sql
select count(*) from gift_certificates where purchaser_email = 'bot@example.com' or code = 'HFGC-2DXJ-5AK8';
```
`-> 0`. **PASS.**

### C4. Gift checkout — guard spot-checks (copied verbatim from booking checkout)
```
POST /api/booking/gift/checkout  (Origin: https://evil.example.com)
-> 403 {"error":"Unauthorized request origin."}

POST /api/booking/gift/checkout  (productId:"not-a-real-product")
-> 400 {"error":"That didn't look right. Please check your details and try again."}
```
Both **PASS** — confirms the origin allowlist and zod `productId` enum are
wired the same way as the booking checkout's origin/shape guards (B6/A1).

Note: the real-charge path (Square configured, a live `sourceId` from the
Web Payments SDK, successful insert → email) is out of scope for this local
matrix (no `SQUARE_*` vars locally, matching the booking checkout's existing
precedent at B2) — it joins the Phase 3 real-charge verification, same as
the booking checkout's paid path.

---

## D. Admin — booking APIs, cancel path, audit trail

### D1. Admin booking routes — every route 401s without the token
Setup: flag-on dev server, `SHOP_ADMIN_TOKEN=e2e-admin-token-task12` set for
the dev-server process only (not written to `.env.local`), Resend disabled.
```
GET  /api/shop/admin/booking?from=2026-09-01&to=2026-09-30   -> 401
POST /api/shop/admin/booking/blackouts                        -> 401
DEL  /api/shop/admin/booking/blackouts                        -> 401
POST /api/shop/admin/booking/schedules                        -> 401
DEL  /api/shop/admin/booking/schedules                        -> 401
POST /api/shop/admin/booking/manual                            -> 401
POST /api/shop/admin/booking/cancel                            -> 401
GET  /api/shop/admin/booking/certs?code=X                      -> 401
POST /api/shop/admin/booking/certs                              -> 401
```
All 9 (across the 6 route files) returned `{"error":"Unauthorized"}` with no
`Authorization` header. **PASS.**

### D2. Blackout create → availability hides the day → delete restores it
Seeded a `wedding-call` Saturday schedule (capacity 1, `2026-09-19 09:00`)
via `POST /api/shop/admin/booking/schedules`, confirmed via the public
availability route that the slot showed `remainingUnits:1`. Then:
```
POST /api/shop/admin/booking/blackouts
{ kind:"closure", startsOn:"2026-09-19", endsOn:"2026-09-19",
  productSlugs:["farm-tour","nordic-spa","wedding-call"], note:"E2E Task 12 blackout" }
-> 200 {"ok":true,"blackout":{"id":2,...}}

GET /api/booking/availability?product=wedding-call&from=2026-09-19&to=2026-09-19&party=1
-> {"days":[{"date":"2026-09-19","slots":[]}]}     -- day hidden

GET /api/shop/admin/booking?from=2026-09-19&to=2026-09-19 (with token)
-> blackouts array contains the id-2 row                  -- admin GET sees it too

DELETE /api/shop/admin/booking/blackouts  { "id": 2 }
-> 200 {"ok":true}

GET /api/booking/availability?product=wedding-call&from=2026-09-19&to=2026-09-19&party=1
-> {"days":[{"date":"2026-09-19","slots":[{"time":"09:00","capacity":1,"remainingUnits":1}]}]}
   -- restored
```
**PASS.**

### D3. Manual booking respects capacity — second manual on a full slot errors
Using the same capacity-1 `wedding-call` slot from D2:
```
POST /api/shop/admin/booking/manual
{ product:"wedding-call", date:"2026-09-19", time:"09:00", partySize:1,
  customer:{firstName:"E2E",lastName:"One",email:"e2e-test@example.com",phone:"5035551111"},
  note:"Task 12 e2e first manual booking" }
-> 200 {"ok":true,"bookingNumber":"HFB-260827-4517","amountCents":0}

POST /api/shop/admin/booking/manual   (same slot, second customer)
-> 409 {"error":"That time was just booked by someone else. Your card has not been charged..."}
```
`GET /api/shop/admin/booking?from=2026-09-19&to=2026-09-19` confirmed the
row: `status:"confirmed"`, `source:"admin"`, `referralSource:"phone"`,
`amountCents:0`, `notes:"Task 12 e2e first manual booking"`. **PASS** —
capacity enforced, `source`/`referralSource` recorded correctly, no charge
attempted for a phone booking.

Also exercised cancel on this same booking: `POST /api/shop/admin/booking/cancel`
with `{id, refund:true, reason:"E2E task 12 cancel test"}` returned
`{"ok":true,"refunded":false,...}` (no card was ever charged, so
`refundCents` was 0 and `refundPayment` was correctly never called); a
second cancel attempt on the same (now-cancelled) id returned `404
{"error":"Booking not found, or not currently confirmed."}`, confirming
cancel only fires from `confirmed`. Dev-server log showed
`[booking-admin] cancel email failed: HFB-260827-4517 Error: API key is
invalid` at `cancel-email.ts`'s `sendOrThrow` — the same
Resend-disabled-so-log-the-failure substitution used elsewhere in this
matrix, confirming the guest email path was actually exercised. **PASS.**

### D4. Gift certificate issue → lookup → void → redemption fails
```
POST /api/shop/admin/booking/certs
{ action:"issue", productId:"tour-for-two", purchaserEmail:"e2e-test@example.com",
  recipientEmail:null, paymentId:null }
-> 200 {"ok":true,"code":"HFGC-GDWS-5B5P"}

GET /api/shop/admin/booking/certs?code=HFGC-GDWS-5B5P
-> {"certificate":{"code":"HFGC-GDWS-5B5P","kind":"value","productScope":"farm-tour",
     "initialUnits":15000,"remainingUnits":15000,"squarePaymentId":"admin_manual",
     "status":"active",...}}

POST /api/shop/admin/booking/certs   { action:"void", code:"HFGC-GDWS-5B5P" }
-> 200 {"ok":true}

GET /api/shop/admin/booking/certs?code=HFGC-GDWS-5B5P
-> {"certificate":{...,"status":"void",...}}
```
Then probed `redeem_gift_certificate` directly via the service-role client
(same call `store.ts`'s `redeemGiftCertificate` makes) to prove the voided
code is actually unusable at the RPC that matters, not just at the admin
read:
```js
await db.rpc("redeem_gift_certificate", { p_code: "HFGC-GDWS-5B5P", p_requested: 1 })
-> data: null, error: { code: "P0001", message: "gift certificate not usable" }
```
`P0001` is exactly the error `redeem_gift_certificate` raises for a
non-`active` cert (`supabase-booking.sql`) and the code `store.ts`'s
`redeemGiftCertificate` maps to "code isn't valid" at checkout. **PASS.**

### D5. Cleanup (Task 12 admin-APIs run)
```sql
delete from bookings where email in ('e2e-test@example.com','e2e-test-2@example.com');
delete from gift_certificates where code = 'HFGC-GDWS-5B5P';
delete from booking_blackouts where note = 'E2E Task 12 blackout';   -- already 0, deleted live in D2
delete from booking_schedules where id = 30;                         -- already 0, deleted live in D3's follow-up
delete from booking_audit where actor = 'admin';
```
Post-cleanup counts (scoped to this run's ids/emails/codes): `bookings:0,
gift_certificates:0, booking_blackouts:0, booking_schedules:0,
booking_audit:0`. Dev server stopped; a temporary Node probe script used for
D4's direct RPC call and this cleanup query were both deleted before
commit (`git status --short` shows only the Task 12 diff — no stray
`scripts/*-tmp.mjs`). **PASS.**

### D6. Cancel-path review follow-up — single-booking re-verify
A review pass on Task 12 found four real issues in the cancel path (see
Task 12's report for the full writeup): a visits-cert over-restore, a cancel
email that only ever named ONE of a refund/gift-restore instead of both, a
`giftRestored` flag trusted without checking `restoreGiftCertificate`'s
outcome, and — the significant one — the cancel route operating on a single
row when a combo (Full Farm Day) is actually two rows sharing `combo_group`
and one payment, which mis-computes a refund if only one leg is cancelled.
All four were fixed (`restoreGiftCertificate` now returns `Promise<boolean>`;
gift-unit restoration derives the actual visits consumed via
`Math.round(gift_amount_cents / (amount_cents / party_size))` instead of
assuming `partySize`; the cancel email composes both money sentences,
refund then gift-restore, when both apply; the route detects a `comboGroup`
on the target row and cancels/refunds/emails the WHOLE group atomically via
the new `cancelBookingGroup`). Re-ran the single-booking cancel flow first,
against a fresh flag-on dev server (same setup as D1-D5):
```
POST /api/shop/admin/booking/schedules  (wedding-call, Saturday, capacity 1)  -> 200
POST /api/shop/admin/booking/manual     (single-leg booking)                  -> 200 {"bookingNumber":"HFB-260827-7547",...}
GET  /api/shop/admin/booking?from=2026-09-19&to=2026-09-19
  -> row carries "comboGroup":null (new field, confirms single-leg bookings are unaffected by the fix)

POST /api/shop/admin/booking/cancel  {id, refund:true, reason:"E2E re-verify single cancel"}
  -> 200 {"ok":true,"cancelledIds":["...7547-row-id..."],"refunded":false,"refundId":null,"refundError":null,"giftRestored":false}
  -- refunded:false is correct: no square_payment_id on a phone booking, so refundPayment was never called

POST /api/shop/admin/booking/cancel  (same id again)
  -> 404 {"error":"Booking not found, or not currently confirmed."}
```
Dev-server log confirmed the cancel email `sendOrThrow` fired and failed on
the disabled Resend key (same substitution as before), so the composed-email
code path was actually exercised, not just unit-reasoned. **PASS** — single-
leg behavior is unchanged by the Finding 4 fix.

### D7. Cancel-path review follow-up — combo group cancels as one unit
Combo bookings are never free, so they can't be seeded through the public
checkout without a live Square charge (out of scope, same as the existing
paid-path notes elsewhere in this matrix). Per the reviewer's instruction,
seeded two rows directly via a service-role script with a shared
`combo_group` uuid, both `status:'confirmed'`, no `square_payment_id`, no
gift certificate:
```js
// farm-tour leg + nordic-spa leg, same combo_group, both confirmed, no payment id, no gift
insert into bookings (...) values (leg1), (leg2);
```
```
POST /api/shop/admin/booking/cancel  { id: <leg1's id>, refund:true, reason:"E2E combo group cancel test" }
-> 200 {"ok":true,
        "cancelledIds":["<leg1 id>","<leg2 id>"],
        "refunded":false,"refundId":null,"refundError":null,"giftRestored":false}
```
Verified directly against the DB (service-role read, not just the route's
response):
```
bookings: leg1 status=cancelled, leg2 status=cancelled   -- BOTH rows flipped from a single leg's id
booking_audit: exactly ONE row, action=booking_cancelled, actor=admin,
  detail.booking_ids=[leg1,leg2], detail.combo_group=<the group uuid>,
  detail.booking_number="<leg1 number> / <leg2 number>"
```
`refunded:false` confirms `refundPayment` was correctly never called (no
`square_payment_id` on either leg — `paymentId` resolved to `null`, so the
`refund && paymentId && refundCents > 0` guard short-circuited). **PASS** —
cancelling one leg's id cancels the whole group, computes the refund across
both legs, and writes exactly one audit row naming both ids.

**Follow-up check — the "already partly cancelled" guard (Finding 4's 409
path):** seeded a second combo pair the same way, then cancelled ONE leg
directly via SQL (simulating some other process having already moved half
the group) before calling the route on the STILL-CONFIRMED leg's id:
```
POST /api/shop/admin/booking/cancel  { id: <still-confirmed leg's id>, refund:false, reason:"E2E partial-combo test" }
-> 409 {"error":"That booking's combo pair is already partly cancelled — check the calendar."}
```
Note: this 409 message no longer exists post-D9's atomic-`UPDATE` rework — the
current code returns `"That booking is already cancelled."` for the
equivalent case (see `cancel/route.ts` and D9 below). Recorded here verbatim
as the pre-TOCTOU-fix result; don't chase this exact string on a re-run.
DB check afterward: the still-confirmed leg was left `status:"confirmed"`
(untouched — `cancelBookingGroup` checks every row's status BEFORE issuing
any UPDATE, so a mismatch never mutates), the other leg stayed `cancelled`
as it already was, and **zero** new `booking_audit` rows were written for
that `combo_group`. **PASS** — confirms `cancelBookingGroup` never partially
mutates a group it's about to reject.

### D8. Cleanup (Task 12 cancel-path review)
```sql
delete from bookings where email = 'e2e-test@example.com' or booking_number ilike 'E2E-%';
delete from booking_schedules where id = 31;
delete from booking_audit where actor = 'admin';
```
Post-cleanup counts (scoped to this run): `bookings:0, booking_schedules:0,
booking_audit:0`. All four temporary Node scripts used for this follow-up
pass (two seed scripts, a verify script, a cleanup script) were deleted
before commit — `git status --short` shows only the intended Task 12 review
diff (`cancel/route.ts`, `cancel-email.ts`, `store.ts`). Dev server
stopped. **PASS.**

### D9. Cancel-path re-review follow-up — TOCTOU fix in `cancelBookingGroup`
A re-review of D7's fix found a real race left in it: the original
`cancelBookingGroup` was a SELECT (check every row is `confirmed`) followed
by a separate UPDATE. Between those two calls, a concurrent cancel on the
same group could flip a subset, so the count check afterward could return
`{ok:false, reason:"partial"}` — a 409 with **no refund, no audit, no
email** — for rows THIS call had, in fact, just cancelled a moment earlier
via the UPDATE it had already issued. The old doc comment's claim ("this
NEVER partially cancels") overstated what a read-then-write pair can
actually guarantee.

Fix: `cancelBookingGroup` is now ONE statement — `UPDATE ... WHERE
combo_group = X AND status = 'confirmed' RETURNING *` — with no read
beforehand. `flipped.length === 0` (genuinely mutation-free — nothing in
the DB changed) returns `{ok:false, reason:"already_cancelled"}`;
`flipped.length > 0` returns `{ok:true, flipped, group}` even when
`flipped` is a strict subset of the full group (a racer got the rest — see
`store.ts`'s updated doc comment for the exact guarantee this makes and
doesn't make). The route was updated to match: refund is computed off the
FULL group's rows (safe under a racing duplicate because the idempotency
key stays `refund_${comboGroup}` — Square executes a given key's refund at
most once), gift restore fires only when `flipped` contains the
gift-stamped leg (the confirmed→cancelled transition is atomic per row, so
at most one racer's `flipped` set ever contains that leg), the audit row
lists the ids THIS call flipped plus the combo_group and full-group ids,
and the guest email sends whenever `flipped.length > 0`.

Re-ran against a fresh flag-on dev server:
```
-- fresh combo pair, both confirmed, no payment id, no gift
POST /api/shop/admin/booking/cancel  { id: <leg1>, refund:true, reason:"E2E atomic combo re-verify" }
-> 200 {"ok":true,"cancelledIds":["<leg1>","<leg2>"],"refunded":false,...}

-- DB check: both rows "cancelled", exactly 1 matching booking_audit row

POST /api/shop/admin/booking/cancel  (same leg1 id again)
-> 404 {"error":"Booking not found, or not currently confirmed."}
   -- caught by the route's own by-id pre-check before it ever reaches
      cancelBookingGroup, since leg1's row is itself already cancelled

-- DB check after the re-cancel attempt: BOTH rows still "cancelled"
   (unchanged), audit row count STILL 1 -- zero mutation, zero new audit row
```
To exercise `cancelBookingGroup`'s own `already_cancelled` branch directly
(the specific function the TOCTOU bug lived in, rather than the route's
by-id fast path), ran the exact statement it issues — `UPDATE bookings SET
status='cancelled' ... WHERE combo_group = X AND status = 'confirmed'
RETURNING id, status` — against the now-fully-cancelled group via a
service-role probe:
```
-> returned rows: []   (0 rows matched/updated)
```
Zero rows returned confirms `flipped.length === 0` on this input, which is
exactly the `already_cancelled` branch's trigger — and confirms the
statement is a no-op against an already-cancelled group (no rows to touch,
so nothing to partially mutate). A follow-up read confirmed both rows and
the audit count were still unchanged after the probe. **PASS.**

Also re-ran the single-leg (non-combo) cancel path, which this fix doesn't
touch, as a regression check: manual-booked a single `wedding-call` slot,
cancelled it (`refunded:false`, correct — no payment id), and a second
cancel attempt on the same id returned 404. `comboGroup:null` confirmed via
the GET range route. **PASS** — unaffected by the fix.

### D10. Cleanup (Task 12 re-review)
```sql
delete from bookings where email = 'e2e-test@example.com' or booking_number ilike 'E2E-%';
delete from booking_schedules where id in (31, 32);
delete from booking_audit where actor = 'admin';
```
Post-cleanup counts (scoped to this run): `bookings:0, booking_schedules:0,
booking_audit:0`. All four temporary Node scripts used for this pass (a
seed script, a route-level verify script, a direct `cancelBookingGroup`
probe script, a cleanup script) were deleted before commit — `git status
--short` shows only `cancel/route.ts` and `store.ts` changed. Dev server
stopped. **PASS.**

---

## E. UI — browser-level checks

No scripted browser-level items are in this matrix as of Task 14; every item
above is an API/DB-level check run directly against the dev server. Visual
and mobile QA of the booking widgets (party stepper, date picker, payment
fallback, sticky mobile CTA, flag-off byte-identity of the marketing pages)
were done live during Phase 2 Tasks 5 and 10 with screenshots and are
recorded in those tasks' reports and in `ARCHITECTURE.md`'s flag-off proof
in Task 14's report, not as numbered items here. A future revision of this
matrix should add a scripted browser pass (device-emulation screenshots of
the full booking flow, both mobile and desktop) as Phase 3 approaches —
until then, treat Task 5/10's screenshot passes plus Task 14's flag-off
byte-identity re-proof as this area's coverage.

---

## Summary

| # | Item | Result |
|---|---|---|
| A1 | Flag off → 404/404/401 | PASS |
| A2 | Seed + availability correct | PASS |
| A3 | Wedding blackout blocks tour+spa, not wedding-call | PASS |
| A4 | Capacity race → exactly one success | PASS |
| A5 | Expired-hold sweep | PASS |
| A6 | Number-collision retry | PASS (code-inspected) |
| A7 | Cleanup (Engine section) | PASS |
| A8 | Acuity importer idempotency (live, 199 rows, re-run = 0 inserted) | PASS |
| B1 | wedding-call free checkout confirms + email-failure logging | PASS (fixed in `cffe1d8`, re-verified) |
| B2 | Square unconfigured → 503, no pending rows | PASS |
| B3 | Value gift cert fully covers booking | PASS (fixed in `cffe1d8`, re-verified) |
| B4 | Visits gift cert | PASS (fixed in `cffe1d8`, re-verified) |
| B5 | Honeypot → fake success, zero rows | PASS |
| B6 | Foreign origin → 403 | PASS |
| B7 | Free wedding-call → GA4 conversion event | PASS |
| B8 | Cleanup (Checkout section, Phase 1 initial run) | PASS |
| C1 | Gift checkout flag off → 404 (page + route) | PASS |
| C2 | Gift checkout paid path, Square unconfigured → 503, zero rows | PASS |
| C3 | Gift checkout honeypot → fake success, zero rows | PASS |
| C4 | Gift checkout guard spot-checks (origin, productId shape) | PASS |
| D1 | Admin booking routes: every route 401s without the token | PASS |
| D2 | Blackout create → availability hides the day → delete restores it | PASS |
| D3 | Manual booking respects capacity; cancel only from confirmed | PASS |
| D4 | Gift cert issue → lookup → void → `redeem_gift_certificate` errors | PASS |
| D5 | Cleanup (Task 12 admin-APIs run) | PASS |
| D6 | Cancel review follow-up: single-booking re-verify | PASS |
| D7 | Cancel review follow-up: combo group cancels as one unit + partial-guard | PASS |
| D8 | Cleanup (Task 12 cancel-path review) | PASS |
| D9 | Cancel re-review follow-up: TOCTOU fix in `cancelBookingGroup` | PASS |
| D10 | Cleanup (Task 12 re-review) | PASS |
| E | UI/browser-level checks | Not in this matrix — see area note above |

**29/29 PASS** (27 exercised live end-to-end, A6 verified by code
inspection since forcing a real `23505` isn't reliably reproducible outside
a fuzzed harness, and E has no numbered items yet). A8 (2026-08-27, Phase 3a
Task 2) added the Acuity booking importer and ran it live twice against the
real Highland Farms Acuity account — 199 rows imported, re-run inserted
zero, both counts and the amount sum matched between the run log and a
direct Supabase query; see A8 above for the full spot-check. The first run of this
matrix (2026-08-27) found two real bugs: B1 (Resend never rejects, so send
failures were silently unlogged) and B3/B4 (the Square-configured gate
checked the pre-gift total instead of the post-gift due amount, 503ing on
bookings a gift certificate would have fully covered). Both were fixed
same-day in `cffe1d8` (`src/lib/booking/confirmation-email.ts`,
`src/lib/booking/reminder-email.ts`, `src/app/api/booking/checkout/route.ts`)
and re-verified against a flag-on dev server per the results recorded in B1,
B3, and B4 above. Task 3 (same day) added durability for the paid-confirm
path (RPC failure fallback + audit trail), a number-collision retry on
`booking_number`, and fixed the free wedding-call GA4 gate (A6, B7 above).
Task 8 (same day) added the gift certificate purchase endpoint and verified
its charge-before-insert ordering (C2), honeypot (C3), and guard stack (C1,
C4); no new bugs found. Task 12 (same day) added the admin booking APIs
(blackouts, schedules, manual bookings, farm-initiated cancel + Square
refund, gift certificate issue/void) and verified the auth gate on every
route (D1), the blackout create/delete round trip against live availability
(D2), manual-booking capacity enforcement plus a cancel-only-from-confirmed
check (D3), and the full gift-certificate issue/void/redemption-fails loop
including a direct RPC probe (D4); no new bugs found at that pass. A
same-day review of Task 12 found four real issues in the cancel path,
detailed in D6's intro and the Task 12 report: a visits-cert over-restore
(fixed by deriving actual consumed units from `gift_amount_cents` instead of
assuming `partySize`), a cancel email that only ever named one of
refund/gift-restore instead of composing both, a `giftRestored` flag trusted
without checking `restoreGiftCertificate`'s real outcome (fixed by widening
it to `Promise<boolean>`), and a cancel route that operated on one row of a
combo when a combo is really two rows sharing `combo_group` and one payment
(fixed with a `cancelBookingGroup` that cancels/refunds/emails the whole
group as one operation). All four were fixed and verified live in D6-D7,
including a seeded "already partly cancelled" case. A same-day RE-review of
that Finding-4 fix then found a real TOCTOU race inside `cancelBookingGroup`
itself: it was a SELECT-then-UPDATE pair, and a concurrent cancel landing
between those two calls could flip a subset of the group while the count
check afterward still reported a blanket "partial" failure — a 409 with no
refund, audit, or email for rows the call had, in fact, already cancelled a
moment earlier. That function's own doc comment overstated the guarantee
("this NEVER partially cancels"), which the read-then-write shape couldn't
actually back up. Fixed in D9-D10 by collapsing it to one atomic `UPDATE ...
RETURNING` statement with no prior read, re-verified live (fresh combo pair
cancels as one unit; a direct probe of the exact `already_cancelled`
statement against an already-fully-cancelled group returns zero rows,
proving that specific branch is genuinely mutation-free now rather than
merely claimed to be). No known live bugs in this matrix as of that pass.

**Task 14 (2026-08-27)** consolidated this document from its prior
chronological numbering (1-27, with 7b as a sub-item) into the area-grouped
form above and re-ran the full gate (`npm test && npm run lint && npm run
build`, 42/42 tests) plus a flag-off byte-identical re-proof of
`/farm-tours` and `/nordic-spa` comparing the current tree against the
Phase-1 baseline commit — no new bugs found; see Task 14's report for the
old→new numbering map and the byte-identity method/result. A future re-run
that finds a regression should update the affected item and this table in
place, the same way every pass so far has.
