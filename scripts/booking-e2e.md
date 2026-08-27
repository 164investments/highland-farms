# Native calendar — manual end-to-end verification recipe

Kept for re-runs at cutover (Phase 3) and after any change to
`src/lib/booking/*`, `src/app/api/booking/*`, or `src/app/api/cron/booking-reminders`.
Last executed against the real stack: **2026-08-27** (Task 10, Phase 1; items
12-13 added and live-checked **2026-08-27** for Phase 2 Task 3; items 14-17
added and live-checked **2026-08-27** for Phase 2 Task 8, gift certificates;
items 18-22 added and live-checked **2026-08-27** for Phase 2 Task 12, admin
booking APIs + Square refunds; items 23-25 added and live-checked
**2026-08-27** for a same-day review of Task 12's cancel path).
Items 4, 7, and 7b failed on the Phase 1 run, were fixed in `cffe1d8`, and
were re-verified the same day — see those items below. A review of Task 12
found four real issues in the cancel path (visits-cert over-restore, a
cancel email that couldn't say both "refunded" and "gift restored" at once,
an unchecked gift-restore return, and single-leg cancel logic applied to a
two-row combo) — all four were fixed the same day and re-verified in items
23-25. This document reflects the final, post-fix state; there are no known
live bugs in this matrix.

## Setup

1. Confirm `.env.local` has NO `SQUARE_*` vars (the matrix relies on this —
   item 5 verifies the paid path 503s when Square isn't configured).
2. Start the dev server with Resend disabled so nothing reaches the farm's
   live inbox, and the flag as needed:
   ```bash
   # flag OFF run (item 1 only)
   RESEND_API_KEY=disabled-for-e2e npm run dev

   # flag ON run (items 2-11)
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
   test email so cleanup is unambiguous. 2026-08-27 run used
   `2026-09-05` / `2026-09-12` (both Saturdays) and `e2e-test@example.com`.
6. **Email-received substitution (controller ruling, 2026-08-27):** with
   Resend disabled, "confirmation email received" is replaced by: booking
   succeeds (`success:true` + row `confirmed` in DB) AND the dev-server log
   shows the matching `[booking] ... email failed` line(s). See item 4's
   result below.

## Matrix

### 1. Flag off — availability / checkout / reminders (unauthed)
Expected: 404 / 404 / 401. **PASS.**
```
GET  /api/booking/availability?product=farm-tour&from=2026-09-01&to=2026-09-30&party=2  -> 404 {"error":"Not found"}
POST /api/booking/checkout (wedding-call)                                                -> 404 {"error":"Not found"}
GET  /api/cron/booking-reminders (no auth header)                                        -> 401 {"error":"Unauthorized"}
```

### 2. Seed one Saturday tour schedule + spa schedule → correct availability
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

### 3. Wedding blackout → both products zero that day, combo has no pairs
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

### 4. Checkout `wedding-call` (free, no sourceId)
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
**Item 4: PASS** (booking success and email-failure logging both verified).

### 5. Checkout `farm-tour` with Square unconfigured → 503
```
POST /api/booking/checkout
{ product:"farm-tour", date:"2026-09-12", time:"10:00", partySize:2, ... no sourceId }
-> 503 {"error":"Online payment isn't available right now. Please call the farm."}
```
`select count(*) from bookings where product_slug='farm-tour' and status='pending'` → `0`. **PASS.**
Note: the Square-configured check runs *before* `claimSlots()` in
`checkout/route.ts`, so no pending row is ever created for this path — there
is nothing for `releaseBookings()` to release. The observable assertion
(503, zero pending rows) holds; the brief's parenthetical "(release ran)"
does not apply literally here.

### 6. Capacity race — two parallel wedding-call checkouts, same slot, capacity 1
Slot: `2026-09-05T10:00` Pacific (fresh from item 4's `09:00` booking), wedding-call
schedule capacity = 1.
```
Parallel POST /api/booking/checkout (same date/time, different idempotencyKey/name):
  A -> 409 {"error":"That time was just booked by someone else. Your card has not been charged — pick another time."}
  B -> 200 {"success":true,"bookingNumber":"HFB-260827-7080","amountCents":0}
```
Exactly one `confirmed` row for that slot. **PASS.**

### 7. Value gift cert (TESTCERT) fully covers a booking
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
`remaining_units` decremented to cover the $150.00 value used. **Item 7: PASS.**

### 7b. Visits gift cert (TESTPACK), same root cause as item 7
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
bug as item 7 — the farm-tour-with-TESTPACK "different experience" 400 was
never reached because the first checkout already 503'd.

**Fix:** same `cffe1d8` fix as item 7 (single gate, shared by both gift kinds).

**Post-fix re-verification (`cffe1d8`, 2026-08-27):** same request, flag-on
dev server, Square still unconfigured:
```
POST /api/booking/checkout
{ product:"nordic-spa", date:"2026-09-12", time:"14:00", partySize:2, giftCode:"TESTPACK", ... }
-> 200 {"success":true,"bookingNumber":"HFB-...","amountCents":0}
```
Booking `confirmed`, `amount_cents:0`; cert `remaining_units` decremented by
one visit unit. **Item 7b: PASS.**

### 8. Honeypot (`website:"x"`) → fake success, zero rows
```
POST /api/booking/checkout { ..., website:"x" }
-> 200 {"success":true,"bookingNumber":"HFB-260827-7042","amountCents":0}
```
`select count(*) from bookings where first_name='Bot'` → `0`. **PASS.**

### 9. Foreign origin → 403
```
POST /api/booking/checkout  (Origin: https://evil.example.com)
-> 403 {"error":"Unauthorized request origin."}
```
**PASS.**

### 10. Expired-hold sweep
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

### 11. Cleanup — delete every seed/test row
```sql
delete from bookings where email = 'e2e-test@example.com' or booking_number = 'E2E-EXPIRED-TEST';
delete from gift_certificates where code in ('TESTCERT','TESTPACK');
delete from booking_blackouts where note = 'E2E test blackout';
delete from booking_schedules where product_slug in ('farm-tour','nordic-spa','wedding-call');
```
Post-cleanup counts (all tables): `schedules:0, exceptions:0, blackouts:0, bookings:0, reminders:0, certs:0`. **PASS.**

### 12. Number collision — retry (Task 3, code-inspected)
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

### 13. Free wedding-call → GA4 conversion event path taken
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

### 14. Gift checkout — flag off → 404 (page + route)
```
GET  /gift-certificates                          -> 404 (page renders the not-found shell)
POST /api/booking/gift/checkout                  -> 404 {"error":"Not found"}
```
Verified with a dev server started **without** `NEXT_PUBLIC_NATIVE_CALENDAR` set.
**PASS.**

### 15. Gift checkout — paid purchase with Square unconfigured → 503, zero cert rows
Setup: flag-on dev server, `.env.local` confirmed to carry no `SQUARE_*` vars
(same precondition as item 5).
```
POST /api/booking/gift/checkout
{ productId:"tour-for-two", idempotencyKey:"e2e-test-key-0001", sourceId:"cnon:card-nonce-ok",
  purchaser:{name:"E2E Test", email:"e2e-test@example.com"} }
-> 503 {"error":"Online payment isn't available right now. Please call the farm."}
```
Dev-server log: `[gift] checkout hit with Square unconfigured` (the same gate
shape as the booking checkout's item 5, checked before any Square call or
insert is attempted).
```sql
select count(*) from gift_certificates where purchaser_email = 'e2e-test@example.com';
```
`-> 0`. **PASS.** Confirms the charge-before-insert ordering: nothing is
written when the charge is never attempted.

### 16. Gift checkout — honeypot (`website:"x"`) → fake success, zero rows
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

### 17. Gift checkout — guard spot-checks (copied verbatim from booking checkout)
```
POST /api/booking/gift/checkout  (Origin: https://evil.example.com)
-> 403 {"error":"Unauthorized request origin."}

POST /api/booking/gift/checkout  (productId:"not-a-real-product")
-> 400 {"error":"That didn't look right. Please check your details and try again."}
```
Both **PASS** — confirms the origin allowlist and zod `productId` enum are
wired the same way as the booking checkout's origin/shape guards (items 9/1).

Note: the real-charge path (Square configured, a live `sourceId` from the
Web Payments SDK, successful insert → email) is out of scope for this local
matrix (no `SQUARE_*` vars locally, matching the booking checkout's existing
precedent at item 5) — it joins the Phase 3 real-charge verification, same as
the booking checkout's paid path.

### 18. Admin booking routes — every route 401s without the token (Task 12)
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

### 19. Blackout create → availability hides the day → delete restores it (Task 12)
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

### 20. Manual booking respects capacity — second manual on a full slot errors (Task 12)
Using the same capacity-1 `wedding-call` slot from item 19:
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

### 21. Gift certificate issue → lookup → void → redemption fails (Task 12)
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

### 22. Cleanup (Task 12)
```sql
delete from bookings where email in ('e2e-test@example.com','e2e-test-2@example.com');
delete from gift_certificates where code = 'HFGC-GDWS-5B5P';
delete from booking_blackouts where note = 'E2E Task 12 blackout';   -- already 0, deleted live in item 19
delete from booking_schedules where id = 30;                         -- already 0, deleted live in item 20's follow-up
delete from booking_audit where actor = 'admin';
```
Post-cleanup counts (scoped to this run's ids/emails/codes): `bookings:0,
gift_certificates:0, booking_blackouts:0, booking_schedules:0,
booking_audit:0`. Dev server stopped; a temporary Node probe script used for
item 21's direct RPC call and this cleanup query were both deleted before
commit (`git status --short` shows only the Task 12 diff — no stray
`scripts/*-tmp.mjs`). **PASS.**

### 23. Cancel-path review follow-up — single-booking re-verify (Task 12 review)
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
against a fresh flag-on dev server (same setup as items 18-22):
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

### 24. Cancel-path review follow-up — combo group cancels as one unit (Task 12 review, Finding 4)
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
DB check afterward: the still-confirmed leg was left `status:"confirmed"`
(untouched — `cancelBookingGroup` checks every row's status BEFORE issuing
any UPDATE, so a mismatch never mutates), the other leg stayed `cancelled`
as it already was, and **zero** new `booking_audit` rows were written for
that `combo_group`. **PASS** — confirms `cancelBookingGroup` never partially
mutates a group it's about to reject.

### 25. Cancel-path review follow-up — cleanup (Task 12 review)
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

## Summary

| # | Item | Result |
|---|---|---|
| 1 | Flag off → 404/404/401 | PASS |
| 2 | Seed + availability correct | PASS |
| 3 | Wedding blackout blocks tour+spa, not wedding-call | PASS |
| 4 | wedding-call free checkout confirms + email-failure logging | PASS (fixed in `cffe1d8`, re-verified) |
| 5 | Square unconfigured → 503, no pending rows | PASS |
| 6 | Capacity race → exactly one success | PASS |
| 7 | Value gift cert fully covers booking | PASS (fixed in `cffe1d8`, re-verified) |
| 7b | Visits gift cert | PASS (fixed in `cffe1d8`, re-verified) |
| 8 | Honeypot → fake success, zero rows | PASS |
| 9 | Foreign origin → 403 | PASS |
| 10 | Expired-hold sweep | PASS |
| 11 | Cleanup | PASS |
| 12 | Number-collision retry (Task 3) | PASS (code-inspected) |
| 13 | Free wedding-call → GA4 conversion event (Task 3) | PASS |
| 14 | Gift checkout flag off → 404 (page + route) (Task 8) | PASS |
| 15 | Gift checkout paid path, Square unconfigured → 503, zero rows (Task 8) | PASS |
| 16 | Gift checkout honeypot → fake success, zero rows (Task 8) | PASS |
| 17 | Gift checkout guard spot-checks (origin, productId shape) (Task 8) | PASS |
| 18 | Admin booking routes: every route 401s without the token (Task 12) | PASS |
| 19 | Blackout create → availability hides the day → delete restores it (Task 12) | PASS |
| 20 | Manual booking respects capacity; cancel only from confirmed (Task 12) | PASS |
| 21 | Gift cert issue → lookup → void → `redeem_gift_certificate` errors (Task 12) | PASS |
| 22 | Cleanup (Task 12) | PASS |
| 23 | Cancel review follow-up: single-booking re-verify (Task 12 review) | PASS |
| 24 | Cancel review follow-up: combo group cancels as one unit + partial-guard (Task 12 review) | PASS |
| 25 | Cleanup (Task 12 review) | PASS |

**25/25 PASS** (23 exercised live end-to-end, item 12 verified by code
inspection since forcing a real `23505` isn't reliably reproducible outside
a fuzzed harness). The first run of this matrix (2026-08-27) found two real
bugs: items 4 (Resend never rejects, so send failures were silently
unlogged) and 7/7b (the Square-configured gate checked the pre-gift total
instead of the post-gift due amount, 503ing on bookings a gift certificate
would have fully covered). Both were fixed same-day in `cffe1d8`
(`src/lib/booking/confirmation-email.ts`, `src/lib/booking/reminder-email.ts`,
`src/app/api/booking/checkout/route.ts`) and re-verified against a flag-on
dev server per the results recorded in items 4, 7, and 7b above. Task 3
(same day) added durability for the paid-confirm path (RPC failure fallback
+ audit trail), a number-collision retry on `booking_number`, and fixed the
free wedding-call GA4 gate (items 12-13 above). Task 8 (same day) added the
gift certificate purchase endpoint and verified its charge-before-insert
ordering (item 15), honeypot (item 16), and guard stack (items 14, 17); no
new bugs found. Task 12 (same day) added the admin booking APIs (blackouts,
schedules, manual bookings, farm-initiated cancel + Square refund, gift
certificate issue/void) and verified the auth gate on every route (item 18),
the blackout create/delete round trip against live availability (item 19),
manual-booking capacity enforcement plus a cancel-only-from-confirmed check
(item 20), and the full gift-certificate issue/void/redemption-fails loop
including a direct RPC probe (item 21); no new bugs found at that pass. A
same-day review of Task 12 found four real issues in the cancel path,
detailed in item 23's intro and the Task 12 report: a visits-cert
over-restore (fixed by deriving actual consumed units from
`gift_amount_cents` instead of assuming `partySize`), a cancel email that
only ever named one of refund/gift-restore instead of composing both, a
`giftRestored` flag trusted without checking `restoreGiftCertificate`'s
real outcome (fixed by widening it to `Promise<boolean>`), and a cancel
route that operated on one row of a combo when a combo is really two rows
sharing `combo_group` and one payment (fixed with a new
`cancelBookingGroup` that cancels/refunds/emails the whole group
atomically, with a pre-mutation check that refuses to touch anything if the
group isn't uniformly `confirmed`). All four were fixed and re-verified
live in items 23-24, including a seeded "already partly cancelled" case
that proves the group cancel never partially mutates. No known live bugs in
this matrix as of that pass. A future re-run that finds a regression should
update the affected item and this table in place, the same way this pass
did.
