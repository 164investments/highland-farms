# Native Calendar & Booking — Design Spec

**Date:** 2026-08-27
**Status:** Approved by Hayden (design); spec pending review
**Replaces:** Acuity Scheduling (full replacement — Acuity cancelled at end of migration)

## Decisions already made (Hayden, 2026-08-27)

1. **Full Acuity replacement.** We own availability, capacity, booking rules, reminders, and admin. Acuity is cancelled after cutover.
2. **Reserve with Google is abandoned.** The pending Acuity–RwG connection (submitted 2026-08-23) dies with Acuity. GBP Book button already points at our own site; measured Google-Ads booking share ~1%.
3. **v1 scope: everything.** Tours + spa + Tour/Spa combo + wedding calls + gift certificates + wedding-aware blocking. Lodging stays in Hospitable (out of scope).
4. **Engine: built in-house** on the existing Next.js + Supabase + Square + Resend stack. No new vendors.
5. Wedding calls are Calendly-style: pick a slot, choose **Google Meet (auto-created link) or in-person**.
6. **A wedding blocks the calendar**: when a wedding event is on, tour + spa availability that day is blocked.

## Grounding facts (pulled live from Acuity, 2026-08-27)

- **8 active appointment types**: 5 tour party-sizes (48403186/48403269/48403283/48403306/64217701, $150–$450, 60 min), Nordic Spa class 85942611 ($75/person, 90 min, cap 6), Wedding Call 78277096 (free, 45 min), Wedding Finalization Meeting 91550850 (free, 60 min, private).
- **191 future active appointments through 2026-12-05, ~$24,090 already paid** — must be imported and honored natively. Mix: 88 Tour-for-Two, 76 Spa, 11 Tour-for-Three, 7 Wedding Call, 4 Tour-for-Four, 3 "Tour for Two + Dozen Eggs" (hidden legacy type), 2 Tour-for-Five.
- **Gift certificates are live revenue**: 82 orders. Products: Farm Tour for Two $150 (id 1701258), Nordic Spa for Two $200 (id 2114520), **Spa 3-Visit Pack $199** (id 2189863, sold as recently as 2026-08-26). Outstanding balances must redeem natively.
- **Intake forms**: "How did you hear about us?" (form 2575369, field 14483810, required, checkboxlist) — the attribution backbone; and "Cancellation Policy" agreement checkbox (form 3332893, field 18875130, required).
- **Operating schedules CANNOT be derived from the API.** `/availability/*` conflates SOLD OUT with CLOSED (Sept 2026 spa shows only Mon–Thu sessions at 11:00/13:00/15:00 — weekends are almost certainly sold out, not closed; historical bookings exist on all 7 weekdays). Schedules must be scraped from the Acuity admin UI and **confirmed by Jalene** before cutover.
- The May 2026 native-booking build (`feat/native-booking`) is **lost** — never committed. Its verified findings survive in memory: non-admin Acuity writes enforce capacity; combo needs create-then-rollback; tracking dedup via `claimTrackingEvent("acuity_<id>")`.
- Payment landscape changed since May: **Square is live and wallet-verified** on the farm store (Apple Pay domain VERIFIED, Google Pay working). Stripe never got approved and is not used.

---

## 1. Product model

Four products, replacing Acuity's 8 types:

| Product | Shape | Price | Duration | Capacity |
|---|---|---|---|---|
| **Private Farm Tour** | private slot, party size 2–6 | $75/person ($150–$450) | 60 min | one party per slot |
| **Nordic Forest Spa** | shared class session, per-seat | $75/person | 90 min | 6 seats/session |
| **Full Farm Day (combo)** | tour + spa same day, ≥30-min buffer | $150/person | — | both legs must hold |
| **Wedding Call** | free consult, Meet or in-person | $0 | 45 min | one per slot |

Wedding Finalization Meeting = same engine as Wedding Call, 60 min, reachable only by direct link (never listed publicly).

The legacy "Tour for Two + Dozen Eggs" type is import-only; not offered natively (eggs are a farm-store product).

**Gift certificates / packages** (sold via the booking pages and the farm store, Square rail):

- Farm Tour for Two — $150 value cert
- Nordic Spa for Two — $200 value cert
- Spa 3-Visit Pack — $199, **3 visit credits**; working assumption: 1 credit = 1 person × 1 session (confirm with Jalene whether historic redemption differed)
- Codes redeem in booking checkout; partial value balances persist.

## 2. Data model (Supabase — same discipline as `shop_*`)

All tables RLS-on, service-role only. Availability is **computed on read**; capacity is **claimed transactionally before charge**.

- `booking_products` — slug, name, kind (`private_slot` | `class` | `consult`), price_per_person_cents, duration, min/max party, buffer rules, active. (Static-ish config; DB so admin can tune without deploys.)
- `booking_schedules` — product_id, weekday, start times (array), capacity override, effective_from/to. Multiple rows allowed; latest effective wins.
- `booking_schedule_exceptions` — date-specific opens/closes (a one-off extra session, a holiday closure).
- `booking_blackouts` — date or datetime range, `type` (`wedding` | `closure` | `private_event`), products affected (default: tours + spa), note. **Wedding events are blackouts of type `wedding`.** Admin-entered in v1; BookedIQ auto-sync is a later phase.
- `bookings` — product_id, starts_at, party_size, first/last/email/phone, amount_cents, square_payment_id, gift_certificate_id + amount_applied, status (`confirmed` | `cancelled` | `no_show` | `completed`), referral_source, policy_agreed_at, location_choice (`meet` | `in_person`, consults only), google_event_id + meet_link (consults), `acuity_id` (imported rows), source (`native` | `acuity_import` | `admin`), created_at.
- `booking_reminders` — booking_id, kind (`48h` | `morning_of`), sent_at. **Stamp before send** (cart-email lesson).
- `gift_certificates` — code, kind (`value` | `visits`), initial + remaining (cents or visits), product_scope, purchaser/recipient, square_payment_id or `acuity_order_id`, expires_at (null = none), status.
- `booking_audit` — every admin mutation (who, what, before/after) — same pattern as `shop_stock_counts`.

### Capacity claim (the race-safety core)

`claim_booking_slot(product, starts_at, party_size)` RPC:
1. Advisory lock on `(product_id, starts_at)`.
2. Recompute remaining capacity = schedule capacity − confirmed seats − blackout check.
3. Insert a `pending` booking row (TTL ~10 min) or raise.
4. Square charge (server re-priced; idempotency key **rotates on decline, is reused on unknown outcome** — shop rule).
5. Confirm row, or release on decline/timeout. A cron sweeps expired pendings (fixes the shop's known claim-leak gap from day one).
6. Combo: claim both legs inside one transaction; charge once; both confirm or both release. No cross-system rollback anymore — this is the payoff of owning the calendar.

`revoke ... from public` on every function (postgres-revoke lesson — shipped exploit class on this exact site 8/26).

## 3. Booking UX (Hormozi × Jobs; ~97% mobile)

**On-page, one screen deep, no account, no iframe.** Flow: date → time → party size → contact + policy → pay.

- Month strip with real availability; **true scarcity only** ("2 seats left at 1pm" from live counts; sold-out days visible — a filling calendar is honest social proof). Never a manufactured count or timer.
- Default party size 2 (81% of future tour bookings — 88 of 108). Price recomputes live; **all-in total always visible**: "No fees. $75 per person. That's it." (FTC junk-fee compliant.)
- Contact = first name, last name, email, phone + required policy checkbox (strict policy stated in place, not linked away) + "How did you hear about us?" (kept — it feeds attribution) ≈ 6 fields total.
- **Express wallets first** (Apple Pay/Google Pay via existing Square setup), card second. Wallet rebuilt on total change (shop lesson).
- Social proof at the decision point: "Loved by 188 guests · 4.9★" with real photography only (no AI imagery — standing rule).
- Blemish-first effort collapse: name the drive, convert it — "Leave Portland at 9, home by 1."
- Risk reversal inside the strict policy: "If **we** cancel for weather or animal safety, full refund or first pick of new dates. Your call."
- **Combo upsell before payment** as a path ("Make it a full day — add the spa"), never competing with the primary CTA. Post-visit email sells the 3-Visit Pack (80% spa repeat rate — the LTV play).
- Wedding call: slot picker → Meet/in-person toggle → confirm. Google Calendar API creates the event on `events@highlandfarms-oregon.com` with conferenceData when Meet is chosen; guest gets invite + .ics.
- Gift certs: code field in checkout; also a "Give Highland Farms" purchase page (cert products, Square, emailed code).

## 4. Admin (`admin.highlandfarmsoregon.com` — new Calendar section)

Beside the farm-store tabs: **Calendar** (week/day view of all bookings incl. imported), **Blackouts** (add wedding/closure blocks — one tap "Wedding on {date}" blocks tours+spa), **Schedules** (edit weekly hours/sessions), **Manual booking** (phone bookings, optional charge or record-cash), **Cancel/refund** (Square refund + seat release + email), **Gift certs** (issue, look up, adjust). All mutations audit-trailed and server-authorized (single-token cookie model as today).

## 5. Emails (Resend) & tracking

- Confirmation (policy restated, directions, what-to-bring, add-to-calendar), reminders 48h + morning-of, post-visit (review ask per compliance rules + cross-sell: tour→spa, spa→3-Visit Pack), wedding-call confirmation with Meet link. CAN-SPAM baked into the shared shell; transactional sends exempt but include address anyway.
- **Server-side GA4 Measurement Protocol + Meta CAPI** fire at booking confirmation with real client_id/fbp/fbc (action_source `website` now — better match quality than the webhook's `other`). Client-side funnel events: `view_item`, `select_date`, `select_time`, `add_contact_info`, `begin_checkout`, `purchase`.
- This **retires** the Acuity webhook (913060/913061), GTM trigger 149/tag 150 (Acuity link-click `begin_checkout`), and the UTM-loss attribution gap.
- **Daily report rewritten** to read `bookings` + `gift_certificates` (+ archived Acuity data for YTD continuity). Existing recipients unchanged. Known timezone/metric bugs in the current report are fixed by the rewrite (see `daily-report-audit-2026-08-27` memory).

## 6. Migration & cutover

1. **Build behind `NEXT_PUBLIC_NATIVE_CALENDAR`** — routes 404 and zero bundle impact when off; live site provably unchanged (May pattern).
2. **Config import:** scrape Acuity admin availability/limits (Playwright + logged-in Chrome profile recipe); seed `booking_schedules`; **Jalene confirms hours** (the one human dependency; API cannot distinguish CLOSED from SOLD OUT).
3. **Full historical archive first:** all appointments (all-time, month-chunked under the 500-cap), orders, certificate list (admin export — the API cannot enumerate certificates) → stored in repo `docs/` + Supabase archive table. Nothing gets cancelled until this is verified.
4. **Future-booking import:** 191 rows, idempotent on `acuity_id`; reminders switch to ours; imported guests get no "re-confirmation" spam (their Acuity confirmation stands).
5. **Gift-cert import:** outstanding codes/balances from the admin export → `gift_certificates` with original codes preserved (guests hold physical/emailed codes).
6. **Flip:** booking buttons/pages go native and Acuity's public scheduler is hidden the same hour (no split brain). RwG connection withdrawn.
7. **Straggler net:** Acuity webhook stays ~2 weeks; any straggler booking imports automatically.
8. **Cancel Acuity ($49/mo)** — Hayden's call on date, after archive verification.

Untouched: Meta lead webhook, wedding forms, BookedIQ/HubSpot sync, Hospitable lodging, farm store.

## 7. Testing

- Engine unit tests: slot generation (weekday rules, exceptions, blackouts, wedding blocks, DST boundaries — America/Los_Angeles is the single source tz), capacity math, combo buffer intersection.
- API e2e: happy path per product; slot-race → 409 + no charge; amount-mismatch → 402; expired-pending sweep; honeypot; foreign origin 403; gift-cert redemption incl. partial balance + over-redemption; wallet total-change rebuild.
- Concurrency test: parallel claims on the last spa seat — exactly one wins.
- Full mobile browser smoke (device emulation per standing tooling rule, both mobile + desktop): every product incl. combo and wedding call (real Meet link created on a test calendar, then deleted).
- Migration dry run against a Supabase branch: import 191, re-run (idempotency), spot-check 10 against Acuity UI.
- **One real card charge** end-to-end before cutover (also closes the farm store's own open item).
- ARCHITECTURE.md updated in the same PRs (structural additions: booking engine, Google Calendar integration).

## 8. Open items (non-blocking)

- Jalene: confirm real operating schedules per product; confirm 3-Visit-Pack redemption semantics.
- Gift-cert outstanding-balance export path (Acuity admin UI; API insufficient).
- Acuity cancellation date — Hayden.
- Later phases (explicitly out of v1): BookedIQ→blackout auto-sync, waitlist for sold-out sessions, reschedule self-service (policy currently forbids it), lodging.
