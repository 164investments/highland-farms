# Native calendar — manual end-to-end verification recipe

Kept for re-runs at cutover (Phase 3) and after any change to
`src/lib/booking/*`, `src/app/api/booking/*`, or `src/app/api/cron/booking-reminders`.
Last executed against the real stack: **2026-08-27** (Task 10, Phase 1). Items
4, 7, and 7b failed on that first run, were fixed in `cffe1d8`, and were
re-verified the same day — see those items below. This document reflects the
final, post-fix state; there are no known live bugs in this matrix.

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

**11/11 PASS.** The first run of this matrix (2026-08-27) found two real
bugs: items 4 (Resend never rejects, so send failures were silently
unlogged) and 7/7b (the Square-configured gate checked the pre-gift total
instead of the post-gift due amount, 503ing on bookings a gift certificate
would have fully covered). Both were fixed same-day in `cffe1d8`
(`src/lib/booking/confirmation-email.ts`, `src/lib/booking/reminder-email.ts`,
`src/app/api/booking/checkout/route.ts`) and re-verified against a flag-on
dev server per the results recorded in items 4, 7, and 7b above. There are
no known live bugs in this matrix as of `cffe1d8`; a future re-run that
finds a regression should update the affected item and this table in place,
the same way this pass did.
