# Highland Farms — highlandfarmsoregon.com

> Business context, ads, tracking, CRM, revenue: `~/.claude/projects/-Users-haydenlaverty/memory/highland-farms/README.md`

## Stack
- Next.js 16.1.6 / React 19 / TailwindCSS 4 / TypeScript
- Supabase (project: `qhaeqklgbfvviyedxbyl`)
- Vercel (auto-deploy on push to main)
- Repo: 164investments/highland-farms

## Deploy
Push to `main` triggers auto-deploy via Vercel.
```bash
npm run build    # verify before pushing
npm run lint     # eslint
npm run indexnow # submit pages to Bing
```

## Key Paths
- Pages: `src/app/` (about, celebrations, contact, farm-tours, nordic-spa, shop, stay, weddings, wedding-portfolio, sauna-near-portland)
- Dynamic: `src/app/stay/[slug]/page.tsx` (4 properties), `src/app/wedding-portfolio/[slug]/page.tsx`
- API routes: `src/app/api/` (inquiries, acuity/webhook, meta/webhook, subscribe, cron/daily-report)
- Data: `src/data/` (properties, farm-tours, nordic-spa, navigation, wedding-portfolio)
- Libs: `src/lib/` (supabase, acuity, hubspot, bookediq, email, ga4, meta, meta-leads, schemas)
- Layout: `src/components/layout/` (Header, Footer, GTM, EmailPopup, BookedIQWidget, StructuredData, AttributionTracker)
- Forms: `src/components/forms/ContactForm.tsx`
- Booked-wedding feed tooling: `scripts/build-booked-wedding-ad-feeds.py`, read-only account-state scripts, and `scripts/test_booked_wedding_ad_feeds.py`
- Booked-wedding feed docs and approval-gated live-account plan: `docs/meta-booked-wedding-feed.md`, `docs/live-ads-plan-2026-08-13.md`
- Config: `next.config.ts` (17 redirects, security headers), `vercel.json` (daily cron)

## Environment Variables

### Public
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GTM_ID` — GTM-MBH36BJH
- `NEXT_PUBLIC_CLARITY_PROJECT_ID` — Microsoft Clarity (optional)
- `NEXT_PUBLIC_BOOKEDIQ_LOCATION_ID` — BookedIQ chat widget
- `NEXT_PUBLIC_SQUARE_APPLICATION_ID` / `NEXT_PUBLIC_SQUARE_LOCATION_ID` — Square Web Payments SDK

### Private (server-only, set in Vercel)
- `SQUARE_ACCESS_TOKEN` / `SQUARE_LOCATION_ID` — farm store payments
- `SQUARE_WEBHOOK_SIGNATURE_KEY` / `SQUARE_WEBHOOK_URL` — Square webhook (POS sync, refunds)
- `SHOP_ADMIN_TOKEN` — `/shop/admin` gate
- `SUPABASE_SERVICE_ROLE_KEY` — Meta webhook writes
- `RESEND_API_KEY` — email notifications
- `HUBSPOT_ACCESS_TOKEN` / `HUBSPOT_PIPELINE_ID` / `HUBSPOT_DEAL_STAGE_NEW_LEAD`
- `BOOKEDIQ_LOCATION_ID` / `BOOKEDIQ_PIT` — GHL CRM sync
- `ACUITY_USER_ID` / `ACUITY_API_KEY` / `ACUITY_WEBHOOK_SECRET`
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
```
Validate cron header → Fetch Acuity appointments + orders →
  Build HTML report (pacing, forecast, metrics) → Resend to 4 recipients
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
- Framer Motion animations via `FadeIn` and `StaggerChildren` components
- Image galleries use Embla Carousel
- Shop: native commerce, built Aug 2026 after the Squarespace store was cancelled and went dark. Catalog is static in `src/app/shop/data.ts`; stock is live in Supabase `shop_inventory`. Payment is **Square** (`src/lib/shop/square.ts`). Fulfillment is farm pickup + local delivery — **the site must NOT promise shipping**. Structure and the rules that keep it correct: `ARCHITECTURE.md`.
- ⛔ The server re-prices every checkout line from `data.ts`; the browser never sends prices. Don't "optimise" that away.
- ⛔ **Square is the PRICE source of truth** (Hayden, 2026-08-26). Linked variants carry Square's price; re-sync with `scripts/sync-square-prices.mjs --apply`. Unlinked products (apparel, plush, bouquets) keep their own price.
- ⛔ Even so, the Square ORDER is built from ad-hoc lines at our price, never `catalog_object_id` — a catalog line re-prices itself from Square and would diverge from what we charged.
- Square POS ↔ website inventory is linked per-variant via `shop_inventory.square_variation_id`. Mapping is ONE-TO-ONE (unique index). Confirm links in `/shop/admin` → Square link; `scripts/square-catalog-match.mjs` only proposes.
- Stock counts are entered in `/shop/admin` → Count. Every count writes an audit row to `shop_stock_counts` (previous value + who counted). Do NOT hand anyone a spreadsheet for this.
- robots.txt is a STATIC file at `public/robots.txt` (NOT `src/app/robots.ts` — a typed robots route can't emit the Cloudflare `Content-Signal` line; do not re-add robots.ts or the build conflicts). llms.txt is `public/llms.txt` — bump its `Last-Updated` on edits.
