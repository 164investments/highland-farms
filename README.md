Highland Farms' Next.js site includes the farm store, experience booking
integration, venue inquiries and reporting. Use npm with `package-lock.json`.

## Getting Started

On Hayden's Mac, use the guarded project launcher from this checkout:

```bash
local-project dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
The launcher enforces the shared local storage/build policy. Use
`local-project install` when dependencies are needed; do not replace the npm
lockfile. In an approved remote environment or CI, use the repository's normal
`npm ci`, `npm run dev` and `npm run build` commands.

## Verify Changes

```bash
npm test
npm run lint
local-project build
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the project map, integration boundaries,
and the rules that keep the farm store and reporting flows correct.

## Website payments

Hosted Stripe Checkout is implemented for shop orders and the gated native
booking/gift flows. Production activation is pending; the exact shop-first
plan is [PAYMENT-20261009-STRIPE-SHOP](docs/stripe-cutover-2026-10-09.md).
Square continues to own the POS, linked catalog prices and inventory.

`NEXT_PUBLIC_PAYMENT_PROVIDER=stripe` selects Stripe at build time. The server
needs `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ACCOUNT_ID`, the
existing Supabase service configuration, and the approved
`supabase-stripe.sql` and `supabase-calendar.sql` migrations before deploying
the new application reads. Store secret values only in the approved
environment configuration. Changing the public flag requires a rebuild and
deployment; applying SQL, provisioning keys/webhooks or changing production
environment variables requires live approval first.

The proposed first release leaves `NEXT_PUBLIC_NATIVE_CALENDAR` off. Acuity
remains the live experience calendar and gift purchase path until real
schedules, closures, refreshed appointment import, shared wedding resources,
external busy coverage and gifts pass parity checks and Stripe TEST-mode
end-to-end verification. The plan includes no real-money canary or external
messages/invitations. The old Square payment code remains the rollback path.
Keep Stripe webhook/reconciliation state and credentials when rolling back,
so authorized or captured purchases can finish safely. Roll back the provider
flag while retaining the new Square adapter/webhook and timestamp-aware RPC;
restoring old stock-sync code can overwrite protected counts.

Square adjustments freeze their timestamp before outbound submission and reuse
it on unknown/concurrent retries. An unknown adjustment aged 24 hours retains
its stock hold for manual reconciliation. Canonical quantity/`calculated_at`
snapshots use `sync_square_stock_snapshot`: older counts are discarded under
row locks and equal stamps recompute holds. The old wrapper cannot overwrite
a known stamp; the webhook fetches canonical counts and returns 503 on failed
writes without claiming first. Verify mapped tracking/timestamps live before
activation. Refund preflight validates all attempt legs before gateway access;
SQL locks reject consumed, missing or mismatched state.

The receipt at `/payments/return` verifies payment on the server before showing
success. It excludes analytics, replay, CRM and chat scripts. Shop purchase
events wait for normal navigation before GTM can process them; analytics is
best effort and never proof of fulfillment.

Focused mocked payment checks are included in `npm test`. The isolated
PostgreSQL migration/RPC fixture is `scripts/stripe-storage.test.py`, which
requires existing PostgreSQL binaries and creates a disposable local database.
These checks do not replace Stripe sandbox end-to-end verification. The
two additive schemas passed repeated isolated PostgreSQL checks with
concurrency/gift fixtures, and nine compatibility tests passed. The current 208-test suite, ESLint and 14 PostgreSQL Stripe groups pass, including count/remap races and cancellation suppression. The final guarded shop-only production webpack build passed, including TypeScript. Payment browser states passed at desktop 1440px and true iPhone 393px; 78 calendar states passed with six screenshots, using mocked submissions and blocked outside requests.
The approved actual Stripe TEST matrix (S1–S10 plus inventory recovery S7I) and all 30 numbered standing booking cases passed in isolation. Actual card charges/refunds used TEST mode; inventory, mail and calendar effects were captured locally. Synthetic negative cases are identified separately in the private evidence index. The [cutover plan](docs/stripe-cutover-2026-10-09.md) records the gates and the standing [native booking matrix](scripts/booking-e2e.md); run historical live-data recipes only under their specific authorization. Tests use local `127.0.0.1:3099`, disposable PostgreSQL Unix sockets, a fixture REST bridge, captured mail/calendar and mocked Square. No production activation has occurred. Fresh farm counts entered in Shop Admin are the stock baseline; Square tracking/count changes need an exact separately approved proposal before shop activation.

Jalene can maintain verified native calendar rules through a limited calendar
API and the dependency-free `scripts/calendar-mcp.mjs` bridge on her own
machine/Claude account. See the [local MCP setup](docs/stripe-cutover-2026-10-09.md#jalenes-local-calendar-mcp-setup).
The dedicated `BOOKING_CALENDAR_API_TOKEN` grants calendar read and
schedule/date-exception/date-blackout/timed-blackout changes, with no customer,
order, certificate or refund access. Token provisioning is approved in the shop plan; live calendar updates and native
activation require separate approval; a hosted OAuth connector is not implemented.
This repository is public. Keep Acuity snapshots, occupancy, timed blocks and
generated calendar seed SQL/previews outside the checkout; the cutover guide
documents private input paths and the dry-run preparation command. The private
preview/seed is in `/Users/haydenlaverty/scratch/highland-stripe-20261009/prepared`:
93 future tour dates, 129 spa classes/47 dates, six weekly wedding-call rules,
20 future overrides and 87 timed blocks in the default year. Two API probes
verified 65-minute wedding-call starts; finalized calls preserve 60-minute
duration and actual padding.

Gift parity covers 19 active products: 16 face-value offers and 3/5/10-visit
packages at $199/$299/$549, expiring after 180 days. Legacy aliases remain;
combo value credit applies to tour/spa separately or together, never wedding
calls. Native activation remains off pending the checks above.

## Thanksgiving 2026

The seasonal stay offer is at `/thanksgiving`, with details in
`src/data/thanksgiving.ts`. Guests inquire by email; this page does not charge
or reserve a stay. Its package links prefill the selected package and a
headcount template (16+ vs under 16, allergies, upgrade interest). See `AGENTS.md` for content and booking-term boundaries.

## Tracking Setup

Production tracking expects these public IDs to be configured in Vercel:

- `NEXT_PUBLIC_GTM_ID` for Google Tag Manager.
- `NEXT_PUBLIC_CLARITY_PROJECT_ID` for Microsoft Clarity session analytics.
- `NEXT_PUBLIC_BOOKEDIQ_LOCATION_ID` for the LeadConnector chat widget.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` for Cloudflare Turnstile.

Server-side conversion tracking also requires `GA4_MEASUREMENT_ID`,
`GA4_API_SECRET`, `META_PIXEL_ID`, `META_CAPI_TOKEN`, `ACUITY_WEBHOOK_SECRET`,
`ACUITY_USER_ID`, `ACUITY_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

Run the additive SQL in `supabase-setup.sql` after deploying attribution or
webhook dedupe changes.

## Booked-Wedding Ad Feeds

The repository includes a read-only builder for locally validated Meta and
Google suppression and revenue-measurement files. It does not write to either
ad account. See [the feed guide](docs/meta-booked-wedding-feed.md) for inputs,
commands, output files, and safety gates. Any future live-account write must
follow the exact, approval-gated sequence in the
[staged ads plan](docs/live-ads-plan-2026-08-13.md).

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

Pushing to `main` triggers production deployment for the existing Vercel
project. Local implementation approval does not authorize that push or a
production payment change. Follow [AGENTS.md](AGENTS.md) and the exact approved
release plan before changing the live site.
