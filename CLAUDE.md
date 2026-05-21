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
- Config: `next.config.ts` (17 redirects, security headers), `vercel.json` (daily cron)

## Environment Variables

### Public
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GTM_ID` — GTM-MBH36BJH
- `NEXT_PUBLIC_CLARITY_PROJECT_ID` — Microsoft Clarity (optional)
- `NEXT_PUBLIC_BOOKEDIQ_LOCATION_ID` — BookedIQ chat widget

### Private (server-only, set in Vercel)
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
- Shop redirects to external `shop.highlandfarmsoregon.com` (Squarespace)
