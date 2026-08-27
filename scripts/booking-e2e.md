# Native calendar — manual end-to-end verification recipe

Kept for re-runs at cutover (Phase 3) and after any change to
`src/lib/booking/*`, `src/app/api/booking/*`, or `src/app/api/cron/booking-reminders`.
Last executed against the real stack: **2026-08-27** (Task 10, Phase 1).

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
   is checked for `[booking] ... email failed` lines. See item 4's result
   below — the log lines did **not** appear, which is itself a finding (see
   Concerns).

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

Email-failure log substitution: **did not reproduce as specified.** Checked
the dev-server log for several seconds after the request — zero
`[booking] ... email failed` lines appeared, and zero errors of any kind.
Root cause (traced, not fixed): `resend` SDK v6.9.2's `emails.send()` never
rejects its promise — an HTTP error from Resend (bad key, 4xx/5xx) resolves
as `{ data: null, error: {...} }`. `confirmation-email.ts`'s
`sendBookingEmails()` only logs when `Promise.allSettled` reports
`status === "rejected"`, which this SDK never produces for an API-level
failure. Verified directly:
```js
const { Resend } = require("resend");
new Resend("disabled-for-e2e").emails.send({from:"a@b.com",to:"c@d.com",subject:"x",html:"<p>x</p>"})
  .then(r => console.log("RESOLVED:", JSON.stringify(r)));
// RESOLVED: {"data":null,"error":{"statusCode":401,"name":"validation_error","message":"API key is invalid"}, ...}
```
So: **the "email must never block a booking" guarantee holds** (booking
confirmed regardless), but there is currently no log line, alert, or any
signal at all when Resend rejects a send. See ARCHITECTURE.md "Known gaps."
**Item 4 marked FAIL on the log-line assertion; booking-success assertion PASSES.**

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

### 7. Value gift cert (TESTCERT) — FAILED, real bug found
```sql
insert into gift_certificates (code, kind, product_scope, initial_units, remaining_units, purchaser_email, status)
  values ('TESTCERT','value',null,15000,15000,'e2e-test@example.com','active');
```
```
POST /api/booking/checkout
{ product:"nordic-spa", date:"2026-09-12", time:"11:00", partySize:2, giftCode:"TESTCERT", ... }
-> 503 {"error":"Online payment isn't available right now. Please call the farm."}
```
Cert unchanged (`remaining_units:15000`, `status:"active"`); no booking row created.

**Root cause (traced, not fixed):** `checkout/route.ts` computes
`totalCents` from the legs and gates on
`!isFree && !isSquareConfigured()` **before** the gift certificate is looked
up or redeemed. nordic-spa × party 2 = 15000 cents pre-gift, so `isFree` is
false and the route 503s — even though the $150 gift certificate would have
covered the entire booking and `dueCents` would resolve to 0 with no charge
ever attempted. The gate needs to move after gift redemption, or be
re-evaluated against `dueCents` instead of `totalCents`.
**Item 7 marked FAIL** — could not be exercised as specified in this
environment (Square deliberately unconfigured per the task design), and the
underlying ordering bug would reproduce in production too if Square were
ever briefly unavailable on a fully-gifted booking.

### 7b. Visits gift cert (TESTPACK) — FAILED, same root cause
```sql
insert into gift_certificates (code, kind, product_scope, initial_units, remaining_units, purchaser_email, status)
  values ('TESTPACK','visits','nordic-spa',3,3,'e2e-test@example.com','active');
```
```
POST /api/booking/checkout
{ product:"nordic-spa", date:"2026-09-12", time:"14:00", partySize:2, giftCode:"TESTPACK", ... }
-> 503 {"error":"Online payment isn't available right now. Please call the farm."}
```
Cert unchanged (`remaining_units:3`); zero pending rows. Same gate-ordering
bug as item 7. The farm-tour-with-TESTPACK "different experience" 400 was
not reached because the first checkout already 503'd.
**Item 7b marked FAIL** for the same reason as item 7.

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
| 4 | wedding-call free checkout confirms | PASS (booking); **FAIL** (email-failure log line never appears — SDK resolves, doesn't reject) |
| 5 | Square unconfigured → 503, no pending rows | PASS |
| 6 | Capacity race → exactly one success | PASS |
| 7 | Value gift cert fully covers booking | **FAIL** — Square-unconfigured gate checks pre-gift total, 503s before gift redemption is even attempted |
| 7b | Visits gift cert | **FAIL** — same root cause as 7 |
| 8 | Honeypot → fake success, zero rows | PASS |
| 9 | Foreign origin → 403 | PASS |
| 10 | Expired-hold sweep | PASS |
| 11 | Cleanup | PASS |

**8 full passes, 1 partial pass (4), 2 fails (7, 7b), all traced to two
distinct, unfixed root causes** — see ARCHITECTURE.md "Booking (native
calendar) → Known gaps" for both. Neither bug is in code this task is meant
to fix; per the task's instructions they are recorded here for the
controller to route.
