# Highland Farms — highlandfarmsoregon.com

> Business context, ads, tracking, CRM, revenue: `~/agent-memory/highland-farms/README.md`

## Stack
- Next.js 16.1.6 / React 19 / TailwindCSS 4 / TypeScript
- Supabase (project: `qhaeqklgbfvviyedxbyl`)
- Vercel (auto-deploy on push to main)
- Repo: 164investments/highland-farms

## Deploy
Push to `main` triggers auto-deploy via Vercel and requires production authorization.
Use npm with package-lock.json. Run local builds and installs through the
Mac storage guard described in the shared home instructions; do not add
Mac-only guard paths to portable scripts or CI.
```bash
npm test         # Node regression suites, including payments
local-project build # guarded Mac build; npm run build on approved remote/CI
npm run lint     # eslint
npm run indexnow # only when live indexing is authorized
```

## Key Paths
- Pages: `src/app/` (about, celebrations, contact, farm-tours, nordic-spa, shop, stay, thanksgiving, weddings, wedding-portfolio, sauna-near-portland)
- Thanksgiving 2026: `src/data/thanksgiving.ts` owns the seasonal package copy, accommodation photo sets and email-inquiry links. Keep four-night dates and the supplied package prices exact. Inclusions use the team's October 6 specifics (spa: 1 session Lodge / 2 whole farm, 16+, not on Thanksgiving Day; photoshoot 1 hour, 35 edited photos; breakfast package = eggs and sausage to cook yourself). There is ONE optional upgrade (chef-cooked Friday country breakfast, $30 per person, AJ 2026-10-07); the wine pairing and spa charcuterie were removed. Stay terms come from the team: paid in full (AJ), all sales final with no refunds (AJ and Jalene, 2026-10-07); the tour/spa cancellation policy is not a stay-package policy. Neither package makes the farm private (public tours/spa run on Friday). The hero is an edit of the real Lodge dining-room photo, captioned as Thanksgiving styling; preserve the actual room and use real farm photos for accommodation/experience proof.
- Accommodation photo identity follows `properties.ts` and the stay-page galleries. Legacy filenames are reversed: `properties/cottage.jpg` is William Wallace Lodge, and `properties/lodge.jpg` is Bonnie Lass Cottage. Do not infer identity from filenames or rename live files.
- Dynamic: `src/app/stay/[slug]/page.tsx` (4 properties), `src/app/wedding-portfolio/[slug]/page.tsx`
- API routes: `src/app/api/` (inquiries, acuity/webhook, meta/webhook, subscribe, cron/daily-report)
- Data: `src/data/` (properties, farm-tours, nordic-spa, gift-certificates, wedding-portfolio, thanksgiving); review quotes live in each page's own `quotes.ts`
- Libs: `src/lib/` (supabase, acuity, daily-report, html, hubspot, bookediq, email, ga4, meta, meta-leads, schemas)
- Stripe website payments: `src/lib/payments/` owns validated server pricing, durable reservation/reconciliation, Stripe REST transport, paid effects and browser retry context; `/api/payments/stripe/*`, `/api/stripe/webhook`, `/api/cron/stripe-reconcile`, `/payments/return`. Schema: `supabase-stripe.sql`. Pending shop-first production plan: [PAYMENT-20261009-STRIPE-SHOP](docs/stripe-cutover-2026-10-09.md); no production activation is authorized by the local implementation.
- Limited calendar integration: `src/lib/booking/calendar-{auth,schema}.ts`, `/api/shop/admin/booking/calendar` (aggregate read, no customer details), `schedules`, `exceptions`, `blackouts` and `timed-blackouts`; `scripts/calendar-mcp.mjs` is the standalone Node stdio bridge for Jalene's own Claude client. Apply `supabase-stripe.sql` and `supabase-calendar.sql` before deploying new reads. Setup and token-provisioning boundaries are in the Stripe cutover guide. The limited token never grants booking cancel/refund/manual, certificates or shop/order access.
- Native booking calendar (Phase 1, behind `NEXT_PUBLIC_NATIVE_CALENDAR`): `src/lib/booking/`, `src/app/api/booking/*`, `src/app/api/cron/booking-reminders` — spec: `docs/superpowers/specs/2026-08-27-native-calendar-design.md`, plan: `docs/superpowers/plans/2026-08-27-native-calendar-engine.md`; structure and rules in `ARCHITECTURE.md` under "Booking (native calendar)"
- Native booking calendar Phase 2 (booking UX, wedding-call + gift certs, admin surface, still behind the same flag except admin): `src/components/booking/` (BookingFlow, BookingPayment, NativeBookingSection), `src/app/wedding-call/`, `src/app/gift-certificates/`, `src/app/api/booking/gift/checkout`, `src/app/api/shop/admin/booking/*` (blackouts, schedules, manual, cancel, certs), `src/app/shop/admin/` (CalendarTab, SchedulesTab, CertsTab), `src/lib/booking/google-calendar.ts` + `ics.ts` + `cancel-email.ts` + `gift-email.ts` — plan: `docs/superpowers/plans/2026-08-27-native-calendar-phase2.md`; cutover verification recipe: `scripts/booking-e2e.md`
- Native booking calendar Phase 3a (Acuity mirror + cutover prep, armed but not flipped): `src/lib/booking/acuity-import.ts` (owns `bookings` rows with `source='acuity_import'` only), `scripts/import-acuity-bookings.mts` (backfill/sweep + `reconcileCancellations`), `scripts/acuity-archive.mts` (full read-only Acuity snapshot → `acuity_archive_appointments` + gzipped JSON), `scripts/acuity-schedule-suggest.mts` (observation-only schedule-seeding report), `scripts/publish-booking-gtm.mjs` (provisions the booking GA4 event tags in GTM-MBH36BJH) — structure and rules in `ARCHITECTURE.md` under "Booking (native calendar)" → "The Acuity mirror"; the flip sequence itself is `docs/superpowers/plans/2026-08-27-cutover-runbook.md`
- Google review social proof: `src/lib/reviews.ts` is the ONLY reader of `src/data/google-reviews.json`; the snapshot is refreshed weekly by `.github/workflows/refresh-google-reviews.yml` (runs `scripts/pull-gmb-reviews.mjs`, commits to main, Vercel deploys). Rules in `ARCHITECTURE.md` under "Social proof (Google reviews)".
- Layout: `src/components/layout/` (Header + Masthead, AnnouncementBar, MobileMenu, Footer, SkipLink, GTM, EmailPopup, BookedIQWidget, StructuredData, AttributionTracker; `chrome.ts` = per-page actions, bars and door rows); Field Guide primitives in `src/components/ui/FieldGuide.tsx` and `src/components/field/` (see ARCHITECTURE.md, "The paper masthead and first screens")
- Forms: `src/components/forms/` (InquiryForm, ContactForm, fields); field-to-CRM mapping in `src/lib/inquiry-mapping.ts`, proven by `scripts/inquiry-mapping.test.mts`
- Booked-wedding feed tooling: `scripts/build-booked-wedding-ad-feeds.py`, read-only account-state scripts, and `scripts/test_booked_wedding_ad_feeds.py`
- Booked-wedding feed docs and approval-gated live-account plan: `docs/meta-booked-wedding-feed.md`, `docs/live-ads-plan-2026-08-13.md`
- Config: `next.config.ts` (redirects, rewrites, security headers), `vercel.json` (daily jobs and five-minute Stripe reconciliation)

## Environment Variables

### Public
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GTM_ID` — GTM-MBH36BJH
- `NEXT_PUBLIC_CLARITY_PROJECT_ID` — Microsoft Clarity (optional)
- `NEXT_PUBLIC_BOOKEDIQ_LOCATION_ID` — BookedIQ chat widget
- `NEXT_PUBLIC_SQUARE_APPLICATION_ID` / `NEXT_PUBLIC_SQUARE_LOCATION_ID` — legacy Square Web Payments SDK
- `NEXT_PUBLIC_PAYMENT_PROVIDER` — exactly `"stripe"` enables hosted Stripe website checkout; otherwise the legacy Square path remains. Public flag changes require a rebuild/deploy. Activation needs approval of the linked cutover plan.
- `NEXT_PUBLIC_NATIVE_CALENDAR` — native booking calendar kill switch (`"true"` to enable; off in prod until Phase 3 cutover, Acuity remains live)

### Private (server-only, set in Vercel)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_ACCOUNT_ID` — server-only Stripe transport, signed webhook and expected merchant-account binding; never commit values
- `STRIPE_CHECKOUT_ORIGIN` — optional canonical return origin; defaults to `https://highlandfarmsoregon.com`, restricted by `payments/stripe.ts`
- `SQUARE_ACCESS_TOKEN` / `SQUARE_LOCATION_ID` — Square POS/catalog/inventory integration and legacy website payments; retain after Stripe cutover
- `SQUARE_WEBHOOK_SIGNATURE_KEY` / `SQUARE_WEBHOOK_URL` — Square webhook (POS sync, refunds)
- `SHOP_ADMIN_TOKEN` — `/shop/admin` gate
- `BOOKING_CALENDAR_API_TOKEN` — independent, server-only limited calendar bearer token; provision/rotate only with approved live scope, never reuse the full shop token. Jalene supplies it privately to her local MCP process; no hosted OAuth/custom connector is implemented.
- `SUPABASE_SERVICE_ROLE_KEY` — private payment, shop, booking and webhook persistence
- `RESEND_API_KEY` — email notifications
- `HUBSPOT_ACCESS_TOKEN` / `HUBSPOT_PIPELINE_ID` / `HUBSPOT_DEAL_STAGE_NEW_LEAD`
- `BOOKEDIQ_LOCATION_ID` / `BOOKEDIQ_PIT` — GHL CRM sync
- `ACUITY_USER_ID` / `ACUITY_API_KEY` / `ACUITY_WEBHOOK_SECRET`
- `ACUITY_ACTIVE` — cutover-only, set `"true"` alongside `NEXT_PUBLIC_NATIVE_CALENDAR=true` during the watch week (cutover runbook Step 3), removed entirely (not set `"false"`) at Step 10. Two effects while `"true"`: (1) `booking-reminders` cron skips `source='acuity_import'` bookings (Acuity's own reminders already cover them); (2) `daily-report` cron picks Mode A (live Acuity + native additions). Once removed: reminders cover imported bookings too, and `daily-report` switches to Mode B (frozen `acuity_archive_appointments` snapshot + `bookings`, Acuity's live API assumed gone).
- `META_PIXEL_ID` / `META_CAPI_TOKEN` / `META_PAGE_ACCESS_TOKEN` / `META_APP_SECRET` / `META_WEBHOOK_VERIFY_TOKEN`
- `GA4_MEASUREMENT_ID` / `GA4_API_SECRET` — Measurement Protocol
- `CRON_SECRET` — Vercel cron auth

## Integration Architecture

### Website Payments (gated Stripe implementation, 2026-10-09)
```
Validate + server-price → atomic reserve_stripe_checkout (stock/slots/gift) →
  hosted Checkout, manual capture → verify canonical Stripe session/intent →
  durable processing claim → capture exact amount → atomic domain finalization →
  retryable email + Square inventory effects
```
`stripe_checkout_attempts` and its RPCs are service-role only. Unknown create,
capture or cancellation outcomes retain the same attempt and reservation;
never release on a timeout or capture without a valid claim. Default holds
last 45 minutes and hosted sessions 40 minutes; a two-minute processing lease
allows crash recovery without releasing an ambiguous payment. Webhook,
receipt status and the five-minute cron share reconciliation. Rollback keeps
these paths and durable state active for in-flight Stripe purchases.
Square adjustment timestamps are frozen by the effects RPC before outbound
submission and reused identically on concurrent/unknown retries. Unknown
adjustments aged 24 hours retain stock holds for manual reconciliation.
Canonical counts keep raw `calculated_at`/quantity; use the distinct
`sync_square_stock_snapshot` row-locked timestamp-aware RPC. Old counts are
discarded, equal stamps recompute holds, and the old two-argument wrapper
cannot overwrite known stamps. The canonical-fetch Square webhook returns 503
on failed writes without claiming first. Rollback changes the provider flag;
retain this adapter/webhook/RPC. Verify mapped tracking and timestamps live
before activation. Refund preflight checks all attempt legs are confirmed or
cancelled before gateway access; SQL locks reject consumed/missing/mismatched
related state.

Stripe shop activation leaves `NEXT_PUBLIC_NATIVE_CALENDAR` off and Acuity
live. Prepare native tours/spa/calls/gifts from current Acuity evidence;
authenticate date-specific schedule/closure maintenance through the limited
calendar API so Jalene can use her own Claude/MCP workflow. Ask for manual
facts only when authorized APIs/evidence cannot expose them. Real schedules,
capacity rules, refreshed appointment import, shared wedding resources,
external busy coverage and gift migration still need parity checks. Native
activation also requires Stripe TEST-mode end-to-end verification with no real
money or external messages/invitations; the shop-first plan keeps native off.
This repository is public: never commit raw Acuity UI/API snapshots, occupancy,
full timed blocks or generated seed SQL/previews. Keep those private artifacts
outside the checkout: raw inputs under
`~/scratch/highland-stripe-20261009/evidence/`, preview/seed under
`~/scratch/highland-stripe-20261009/prepared/`. The prepared snapshot has
93 future tour dates, 129 spa classes/47 dates, six weekly wedding-call rules,
20 future overrides and 87 timed blocks in the default year. Two API probes
verified 65-minute wedding-call start spacing; retain 60-minute finalized call
duration and actual imported padding.
`scripts/prepare-acuity-calendar.mts --ui PATH --api PATH --out DIR` accepts
explicit private paths and defaults to dry run; preparing SQL does not authorize
applying it.
Gift parity is 19 active products: 16 face-value offers plus 3/5/10-visit
packages at $199/$299/$549 with 180-day expiry. Preserve legacy aliases;
combo value credit works on tour/spa separately or together, never wedding
calls. Both additive SQL schemas passed repeated isolated PostgreSQL checks
with concurrency/gift fixtures, and nine compatibility tests passed. The full
173-test suite and TypeScript/lint/build passed before final fixes; latest
focused runs passed 13 admin checks, four signed inventory checks and 11 SQL
groups. Payment browser checks passed at desktop 1440px and true iPhone 393px;
78 calendar states passed with six screenshots. Submissions were mocked and
outside requests blocked. Final full-suite count/lint/build remain pending.
Actual Stripe gateway E2E is blocked by the missing TEST key. Proposed isolated
setup is `127.0.0.1:3099`, disposable local Unix-socket PostgreSQL ports
55443/55444, a local fixture REST bridge, captured mail and mocked Square;
Stripe CLI forwarding needs approved setup. No new remote account/hosting/DB.
The receipt document excludes analytics/replay/CRM/chat through
`PaymentPrivacy`; browser shop purchase events wait for normal navigation.

### Form Submission (`POST /api/inquiries`)
```
Validate (origin + rate limit + honeypot + timing) →
  Supabase write (blocking) →
  Fire-and-forget: Resend email + HubSpot (contact+deal) + BookedIQ + GA4 MP
```

### Acuity Booking (`POST /api/acuity/webhook`)
```
Validate secret → Extract booking →
  GA4 purchase + product event (farm_tour/nordic_spa/wedding_call) +
  Meta CAPI Purchase (skip free bookings)
```

### Meta Lead Gen (`POST /api/meta/webhook`)
```
HMAC verify → Fetch lead from Graph API → Supabase upsert →
  BookedIQ + HubSpot + email notification + GA4 generate_lead
```

### Daily Report (`GET /api/cron/daily-report`, 3 PM UTC daily)
Dual-mode as of Phase 3a, selected by `ACUITY_ACTIVE` (see Environment
Variables above): **Mode A** (today, and through the cutover watch week) is
live Acuity + native additions, unchanged from the original single-source
report; **Mode B** (once `ACUITY_ACTIVE` is removed post-cancellation) reads
history from the frozen `acuity_archive_appointments` snapshot and current
activity from `bookings`, merged — no live Acuity API by then.
```
Validate cron header → Fetch Acuity appointments + orders (Mode A) OR
  frozen archive + bookings, paged (Mode B) →
  Normalize Pacific-day and year-boundary windows →
  Build escaped HTML report (active/canceled value, pacing, next 7 days) →
  Resend to 4 recipients
```

### Wedding Pipeline Report (`GET /api/cron/wedding-inquiry-report`, Mon 4 PM UTC / 9 AM PT)
```
Validate cron header →
  Supabase: event_inquiries (wedding types) + meta_leads →
  Acuity: wedding calls (calendar 12109481) →
  GA4 Data API: wedding page traffic + sources (optional, needs SA key) →
  Build HTML report → Resend to 6 recipients (team + events)
```
- GA4 helper: `src/lib/ga4-data.ts` (JWT auth, no external deps)
- Env vars for GA4 (optional): `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`
- ⚠️ **These same two vars now also power wedding-call Google Meet links**
  (`src/lib/booking/google-calendar.ts`), via the same service account
  impersonating `events@highlandfarms-oregon.com` — needs a **domain-wide
  delegation grant for the `calendar.events` scope**, which is pending as of
  Phase 2. Until that grant lands, `isCalendarConfigured()` may report true
  (both env vars present) while the actual event/Meet-link call still fails —
  that's fine, it's designed to: see ARCHITECTURE.md rule 8, the booking
  still confirms and the farm gets a `MEET LINK NEEDED` flag instead.

## Database Tables (Supabase)
- `shop_inventory` / `shop_orders` / `shop_order_items` / `shop_webhook_events` / `shop_stock_counts` / `shop_waitlist` / `shop_abandoned_carts` — farm store (DDL: `supabase-shop*.sql`; RLS on, service-role only)
- `stripe_checkout_attempts` — durable payment/reservation state; `supabase-stripe.sql` also extends shop, booking and gift financial columns and replaces reservation-aware stock/sweep functions; apply only under an approved live plan
- `event_inquiries` — contact form submissions
- `email_subscribers` — newsletter popup signups
- `meta_leads` — Meta instant form leads (synced to BookedIQ + HubSpot)

## Security
- CSRF: origin/referer validation on all form handlers
- Rate limiting: 5 submissions/IP/hour (in-memory)
- Honeypot fields + timing validation (min 2 sec)
- Acuity webhook: secret query param
- Meta webhook: HMAC-SHA256 signature verification

## Conventions
- Fire-and-forget pattern: Supabase write first, then async syncs to downstream systems
- All tracking server-side via GA4 Measurement Protocol + Meta CAPI
- Properties defined statically in `src/data/properties.ts` (whole-farm, lodge, cottage, camp)
- Pages use the Field Guide primitives (`ui/FieldGuide.tsx`, `components/field/`); never a page-local section, quote, price row, FAQ or sticky bar. `framer-motion` and `embla-carousel-react` have no importers since the October 2026 redesign (removing them is a separate package change)
- Booking actions always go through `BookingButton` / `BookingTextLink` (they push `booking_start` and open the Acuity modal); keep `data-hero-cta` on first-screen CTAs
- Unconfirmed facts render through `PendingSlot`, which outputs nothing in production; wrap whole elements only
- Customer copy: no em dashes; the public phone line is `CONTACT.phone` ((971) 236-2551, Google Voice). `CONTACT.ordersPhone` ((971) 563-1921, Jalene) appears only for farm-store pickup arrangements and holiday packages (Jalene, 2026-10-07). Never publish Connor's cell (Hayden, 2026-09-14). Never name individual animals (Jalene and AJ, 2026-10-07: a working farm moving toward farm-to-table, not a sanctuary or petting zoo); species and "the herd" are fine. Real farm photos only, never AI lifestyle or people imagery. One owner-approved exception: `public/images/farm/farm-aerial-patio-lawn-lodge-dusk.jpg` (/about, /celebrations, Whole Farm stay) is a ChatGPT render Connor supplied as the current-layout aerial; Hayden approved it on 2026-10-07. Keep "Styled" in its alt text and do not treat it as a precedent
- The tours/spa cancellation exception sentence must stay identical in every place ARCHITECTURE.md lists
- Shop: native commerce, built Aug 2026 after the Squarespace store was cancelled and went dark. Catalog is static in `src/app/shop/data.ts`; stock is live in Supabase `shop_inventory`. Website payment uses gated Stripe hosted Checkout when `NEXT_PUBLIC_PAYMENT_PROVIDER=stripe`; otherwise the legacy Square path remains. Square continues to own POS, linked prices and inventory. Fulfillment is farm pickup + local delivery; **the site must NOT promise shipping**. Structure and the rules that keep it correct: `ARCHITECTURE.md`.
- ⛔ The server re-prices every checkout line from `data.ts`; the browser never sends prices. Don't "optimise" that away.
- ⛔ **Square is the PRICE source of truth** (Hayden, 2026-08-26). Linked variants carry Square's price; re-sync with `scripts/sync-square-prices.mjs --apply`. Unlinked products (apparel, plush, bouquets) keep their own price.
- ⛔ On the legacy Square payment path, the Square ORDER uses ad-hoc lines at our price, never `catalog_object_id`; a catalog line would re-price itself. Stripe checkout creates no Square payment/order, then adjusts linked Square inventory with a stable attempt key after paid finalization.
- Square POS ↔ website inventory is linked per-variant via `shop_inventory.square_variation_id`. Mapping is ONE-TO-ONE (unique index). Confirm links in `/shop/admin` → Square link; `scripts/square-catalog-match.mjs` only proposes.
- Stock counts are entered in `/shop/admin` → Count. Every count writes an audit row to `shop_stock_counts` (previous value + who counted). Do NOT hand anyone a spreadsheet for this.
- ⛔ Never hardcode a review count or a rating anywhere — import `REVIEW_COUNT` / `FIVE_STAR_COUNT` / `REVIEW_RATING` from `@/lib/reviews`. Hardcoded `188` / `"4.9"` in three files is exactly how the site sat three months stale. Never render the rating as a decimal; display is five filled stars plus a count.
- ⛔ The Google Business Profile API does NOT accept service accounts. Headless refresh needs a *user* refresh token — mint one scoped to `business.manage` alone with `scripts/mint-gmb-refresh-token.mjs`; don't reuse the local gcloud ADC token (it also carries `cloud-platform`).
- robots.txt is a STATIC file at `public/robots.txt` (NOT `src/app/robots.ts` — a typed robots route can't emit the Cloudflare `Content-Signal` line; do not re-add robots.ts or the build conflicts). llms.txt is `public/llms.txt` — bump its `Last-Updated` on edits.
