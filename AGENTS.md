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
npm test         # daily-report regression suite
npm run build    # verify before pushing
npm run lint     # eslint
npm run indexnow # only when live indexing is authorized
```

## Key Paths
- Pages: `src/app/` (about, celebrations, contact, farm-tours, nordic-spa, shop, stay, thanksgiving, weddings, wedding-portfolio, sauna-near-portland)
- Thanksgiving 2026: `src/data/thanksgiving.ts` owns the seasonal package copy, accommodation photo sets and email-inquiry links. Keep four-night dates, the supplied package prices and optional upgrades distinct. The team confirms stay booking terms and group spa arrangements; tour/spa cancellation policy is not a stay-package policy. The hero is an edit of the real Lodge dining-room photo, captioned as Thanksgiving styling; preserve the actual room and use real farm photos for accommodation/experience proof.
- Accommodation photo identity follows `properties.ts` and the stay-page galleries. Legacy filenames are reversed: `properties/cottage.jpg` is William Wallace Lodge, and `properties/lodge.jpg` is Bonnie Lass Cottage. Do not infer identity from filenames or rename live files.
- Dynamic: `src/app/stay/[slug]/page.tsx` (4 properties), `src/app/wedding-portfolio/[slug]/page.tsx`
- API routes: `src/app/api/` (inquiries, acuity/webhook, meta/webhook, subscribe, cron/daily-report)
- Data: `src/data/` (properties, farm-tours, nordic-spa, gift-certificates, wedding-portfolio, thanksgiving); review quotes live in each page's own `quotes.ts`
- Libs: `src/lib/` (supabase, acuity, daily-report, html, hubspot, bookediq, email, ga4, meta, meta-leads, schemas)
- Native booking calendar (Phase 1, behind `NEXT_PUBLIC_NATIVE_CALENDAR`): `src/lib/booking/`, `src/app/api/booking/*`, `src/app/api/cron/booking-reminders` — spec: `docs/superpowers/specs/2026-08-27-native-calendar-design.md`, plan: `docs/superpowers/plans/2026-08-27-native-calendar-engine.md`; structure and rules in `ARCHITECTURE.md` under "Booking (native calendar)"
- Native booking calendar Phase 2 (booking UX, wedding-call + gift certs, admin surface, still behind the same flag except admin): `src/components/booking/` (BookingFlow, BookingPayment, NativeBookingSection), `src/app/wedding-call/`, `src/app/gift-certificates/`, `src/app/api/booking/gift/checkout`, `src/app/api/shop/admin/booking/*` (blackouts, schedules, manual, cancel, certs), `src/app/shop/admin/` (CalendarTab, SchedulesTab, CertsTab), `src/lib/booking/google-calendar.ts` + `ics.ts` + `cancel-email.ts` + `gift-email.ts` — plan: `docs/superpowers/plans/2026-08-27-native-calendar-phase2.md`; cutover verification recipe: `scripts/booking-e2e.md`
- Native booking calendar Phase 3a (Acuity mirror + cutover prep, armed but not flipped): `src/lib/booking/acuity-import.ts` (owns `bookings` rows with `source='acuity_import'` only), `scripts/import-acuity-bookings.mts` (backfill/sweep + `reconcileCancellations`), `scripts/acuity-archive.mts` (full read-only Acuity snapshot → `acuity_archive_appointments` + gzipped JSON), `scripts/acuity-schedule-suggest.mts` (observation-only schedule-seeding report), `scripts/publish-booking-gtm.mjs` (provisions the booking GA4 event tags in GTM-MBH36BJH) — structure and rules in `ARCHITECTURE.md` under "Booking (native calendar)" → "The Acuity mirror"; the flip sequence itself is `docs/superpowers/plans/2026-08-27-cutover-runbook.md`
- Google review social proof: `src/lib/reviews.ts` is the ONLY reader of `src/data/google-reviews.json`; the snapshot is refreshed weekly by `.github/workflows/refresh-google-reviews.yml` (runs `scripts/pull-gmb-reviews.mjs`, commits to main, Vercel deploys). Rules in `ARCHITECTURE.md` under "Social proof (Google reviews)".
- Layout: `src/components/layout/` (Header + Masthead, AnnouncementBar, MobileMenu, Footer, SkipLink, GTM, EmailPopup, BookedIQWidget, StructuredData, AttributionTracker; `chrome.ts` = per-page actions, bars and door rows); Field Guide primitives in `src/components/ui/FieldGuide.tsx` and `src/components/field/` (see ARCHITECTURE.md, "The paper masthead and first screens")
- Forms: `src/components/forms/` (InquiryForm, ContactForm, fields); field-to-CRM mapping in `src/lib/inquiry-mapping.ts`, proven by `scripts/inquiry-mapping.test.mts`
- Booked-wedding feed tooling: `scripts/build-booked-wedding-ad-feeds.py`, read-only account-state scripts, and `scripts/test_booked_wedding_ad_feeds.py`
- Booked-wedding feed docs and approval-gated live-account plan: `docs/meta-booked-wedding-feed.md`, `docs/live-ads-plan-2026-08-13.md`
- Config: `next.config.ts` (redirects, rewrites, security headers), `vercel.json` (daily cron)

## Environment Variables

### Public
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GTM_ID` — GTM-MBH36BJH
- `NEXT_PUBLIC_CLARITY_PROJECT_ID` — Microsoft Clarity (optional)
- `NEXT_PUBLIC_BOOKEDIQ_LOCATION_ID` — BookedIQ chat widget
- `NEXT_PUBLIC_SQUARE_APPLICATION_ID` / `NEXT_PUBLIC_SQUARE_LOCATION_ID` — Square Web Payments SDK
- `NEXT_PUBLIC_NATIVE_CALENDAR` — native booking calendar kill switch (`"true"` to enable; off in prod until Phase 3 cutover, Acuity remains live)

### Private (server-only, set in Vercel)
- `SQUARE_ACCESS_TOKEN` / `SQUARE_LOCATION_ID` — farm store payments
- `SQUARE_WEBHOOK_SIGNATURE_KEY` / `SQUARE_WEBHOOK_URL` — Square webhook (POS sync, refunds)
- `SHOP_ADMIN_TOKEN` — `/shop/admin` gate
- `SUPABASE_SERVICE_ROLE_KEY` — Meta webhook writes
- `RESEND_API_KEY` — email notifications
- `HUBSPOT_ACCESS_TOKEN` / `HUBSPOT_PIPELINE_ID` / `HUBSPOT_DEAL_STAGE_NEW_LEAD`
- `BOOKEDIQ_LOCATION_ID` / `BOOKEDIQ_PIT` — GHL CRM sync
- `ACUITY_USER_ID` / `ACUITY_API_KEY` / `ACUITY_WEBHOOK_SECRET`
- `ACUITY_ACTIVE` — cutover-only, set `"true"` alongside `NEXT_PUBLIC_NATIVE_CALENDAR=true` during the watch week (cutover runbook Step 3), removed entirely (not set `"false"`) at Step 10. Two effects while `"true"`: (1) `booking-reminders` cron skips `source='acuity_import'` bookings (Acuity's own reminders already cover them); (2) `daily-report` cron picks Mode A (live Acuity + native additions). Once removed: reminders cover imported bookings too, and `daily-report` switches to Mode B (frozen `acuity_archive_appointments` snapshot + `bookings`, Acuity's live API assumed gone).
- `META_PIXEL_ID` / `META_CAPI_TOKEN` / `META_PAGE_ACCESS_TOKEN` / `META_APP_SECRET` / `META_WEBHOOK_VERIFY_TOKEN`
- `GA4_MEASUREMENT_ID` / `GA4_API_SECRET` — Measurement Protocol
- `CRON_SECRET` — Vercel cron auth

## Integration Architecture

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
- Customer copy: no em dashes; the only public phone line is `CONTACT.phone` ((971) 236-2551). Real farm photos only, never AI lifestyle or people imagery
- The tours/spa cancellation exception sentence must stay identical in every place ARCHITECTURE.md lists
- Shop: native commerce, built Aug 2026 after the Squarespace store was cancelled and went dark. Catalog is static in `src/app/shop/data.ts`; stock is live in Supabase `shop_inventory`. Payment is **Square** (`src/lib/shop/square.ts`). Fulfillment is farm pickup + local delivery — **the site must NOT promise shipping**. Structure and the rules that keep it correct: `ARCHITECTURE.md`.
- ⛔ The server re-prices every checkout line from `data.ts`; the browser never sends prices. Don't "optimise" that away.
- ⛔ **Square is the PRICE source of truth** (Hayden, 2026-08-26). Linked variants carry Square's price; re-sync with `scripts/sync-square-prices.mjs --apply`. Unlinked products (apparel, plush, bouquets) keep their own price.
- ⛔ Even so, the Square ORDER is built from ad-hoc lines at our price, never `catalog_object_id` — a catalog line re-prices itself from Square and would diverge from what we charged.
- Square POS ↔ website inventory is linked per-variant via `shop_inventory.square_variation_id`. Mapping is ONE-TO-ONE (unique index). Confirm links in `/shop/admin` → Square link; `scripts/square-catalog-match.mjs` only proposes.
- Stock counts are entered in `/shop/admin` → Count. Every count writes an audit row to `shop_stock_counts` (previous value + who counted). Do NOT hand anyone a spreadsheet for this.
- ⛔ Never hardcode a review count or a rating anywhere — import `REVIEW_COUNT` / `FIVE_STAR_COUNT` / `REVIEW_RATING` from `@/lib/reviews`. Hardcoded `188` / `"4.9"` in three files is exactly how the site sat three months stale. Never render the rating as a decimal; display is five filled stars plus a count.
- ⛔ The Google Business Profile API does NOT accept service accounts. Headless refresh needs a *user* refresh token — mint one scoped to `business.manage` alone with `scripts/mint-gmb-refresh-token.mjs`; don't reuse the local gcloud ADC token (it also carries `cloud-platform`).
- robots.txt is a STATIC file at `public/robots.txt` (NOT `src/app/robots.ts` — a typed robots route can't emit the Cloudflare `Content-Signal` line; do not re-add robots.ts or the build conflicts). llms.txt is `public/llms.txt` — bump its `Last-Updated` on edits.
