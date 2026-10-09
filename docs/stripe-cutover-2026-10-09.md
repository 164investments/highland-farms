# Stripe website payment cutover

Plan: **PAYMENT-20261009-STRIPE-SHOP**

Status: **Setup and shop cutover approved by Hayden on 2026-10-09** for
implementation commit `2d7c67d` under the private review package for this plan.
Actual Stripe TEST-mode E2E and the full isolated standing booking matrix passed.
Schema/server-only setup can proceed; shop activation still needs fresh farm
counts and separate approval of the exact Square inventory baseline. Bookings and gift sales remain on
Acuity. No real-money canary, customer import, live calendar seed, invitation or
external message is authorized. Record final release evidence before activation.

## Exact targets and first-release scope

| Target | Proposed value |
| --- | --- |
| Website | `https://highlandfarmsoregon.com` |
| Stripe merchant | `acct_1UOjHzF56Rmibldi` |
| Vercel project | `prj_jY8fVdln43BFz60Y2PtvFuqGERMW` |
| Supabase project | `qhaeqklgbfvviyedxbyl` |
| Schema files | Repository-root `supabase-stripe.sql` and `supabase-calendar.sql` from the reviewed commit |
| Stripe webhook | `https://highlandfarmsoregon.com/api/stripe/webhook` |
| Public payment provider | `NEXT_PUBLIC_PAYMENT_PROVIDER=stripe` |
| Native calendar | Keep `NEXT_PUBLIC_NATIVE_CALENDAR` off |
| Calendar-only access | New server-only `BOOKING_CALENDAR_API_TOKEN`; no customer/refund/order access |

The first proposed production change moves **shop website payments** to
Stripe hosted Checkout. The implementation also supports native tours, spa,
wedding calls and gift certificates, but their existing native-calendar gate
stays off. Acuity continues public experience booking and gift sales.
Native calendar preparation is active: use current Acuity API/UI evidence to
prepare real rules, date exceptions and closures, with a limited API/MCP path
for Jalene's own Claude workflow. This preparation does not activate native
bookings or authorize live calendar writes.
Fresh farm counts entered through **Shop Admin → Count** are the chosen stock baseline (Hayden, 2026-10-09). The initial inspection found 10 of 14 linked variations untracked in Square and no linked manual-count audits. Shop Admin counts update the website only; before activation, prepare exact Square tracking/count changes from fresh audits and obtain their separate approval. Current seeded website/Square numbers are not an authorized baseline.

Square POS, catalog price sync, variation mappings, inventory credentials and
webhooks remain configured. This plan does not change Square catalog prices,
tracking flags, mappings or POS settings.

## Implemented transaction and recovery behavior

`src/lib/payments/prepare.ts` validates the request and prices every line from
the server catalog. It merges duplicate shop variants, enforces delivery rules,
checks native schedule/lead/horizon/party/combo rules, and constructs private
snapshots. The normalized purchase hash binds retry keys to commercial/contact
details while preserving the first attempt's attribution.

`reserve_stripe_checkout` atomically creates durable payment state, reserves
shop stock or all booking legs, and redeems any gift credit. Default holds
last **45 minutes**. Hosted Stripe sessions last **40 minutes**, leaving a
five-minute reconciliation buffer, and authorize cards with **manual capture**.
Free and fully gift-covered bookings need no card or hosted session. The transport pins API `2026-09-30.endive` and filters with `allowed_payment_method_types[0]=card`; Stripe removed `payment_method_types` in this version ([official changelog](https://docs.stripe.com/changelog/endive)). Sessions also set `wallet_options[link][display]=never` because [Link can accept bank/Klarna funding inside a card integration](https://docs.stripe.com/payments/link/link-payment-integrations). This keeps the initial release on the exercised card path.

Webhook, receipt polling and the five-minute reconciliation cron fetch canonical
Stripe state. They check payment mode, attempt/session/intent binding, USD
currency and exact cents. Capture requires a durable **two-minute processing
lease** plus valid reservations; a known linked-POS shortfall refuses capture.
One transaction then records the paid order/items, confirms all booking legs
or issues the purchased gift certificate. Processing holds survive the generic
booking sweep. A retry after captured-payment persistence failure finalizes the
same purchase without another capture.
The cron processes up to 50 attempts, rotates attempted rows even after
failure, and uses a 180-second work deadline within a 300-second route limit
to keep older open sessions from starving newer recovery work.

Unknown create, capture and cancellation outcomes retain the same attempt and
reservation. Do not release stock, restore gifts, remove rows or start a new
payment merely because a network request timed out. Verified terminal gateway
state, or the safe overdue no-session path, permits expiry. Late authorizations
on expired reservations are cancelled. Expired pending zero-charge attempts
restore reservations without contacting Stripe.

Verified paid/expired receipts retire only their matching browser retry key; zero-charge success retires its key immediately. A paid checkout replay opens the existing receipt. This permits identical later purchases while an old receipt cannot clear a newer attempt.

Paid emails use strict error handling and stable per-attempt/per-recipient
Resend idempotency keys. Booking email data, Meet-link outcome and ICS timestamp
are frozen before sends. Calendar event IDs are deterministic; Meet creation
remains best effort, with the existing farm follow-up flag. Provider key
retention is finite, so this does not promise unlimited exactly-once email
delivery. Fresh complete booking-group/payment checks suppress cancelled confirmations before Calendar work and again before email. A distinct suppression marker does not claim delivery or stop financial reconciliation; an already submitted provider message can still race cancellation.

Square absolute counts subtract open Stripe reservations and paid stock not
yet synchronized. Before the first outbound adjustment, the effects RPC freezes
the adjustment timestamp; concurrent and unknown-outcome retries reuse the
identical timestamp and idempotency key. An unknown adjustment aged 24 hours
fails closed, retaining its stock hold for manual reconciliation.
After adjustment, effects mark that attempt synchronized and refresh canonical
counts with their raw `calculated_at` timestamps and quantities.
`sync_square_stock_snapshot` compares timestamps under the inventory row lock,
discards older counts and recomputes reservations for a repeated timestamp.
The legacy two-argument wrapper cannot overwrite a known timestamp. Square
webhooks fetch canonical counts and return 503 for retry on failure; they do
not claim the event before a successful write. Local stock claims are atomic.
A **distributed timing race remains** between a POS
sale, webhook delivery, website capture and Square adjustment; a delayed POS
event can arrive after the website's last shortfall check. Verify mapped
tracking and canonical timestamp state live and exercise this overlap before
enabling; do not claim the
implementation prevents every cross-system oversell.

## Exact proposed live changes, in execution order

The exact setup and shop release scope is approved. Execute one category at a time and record
its readback before continuing.

1. **Stripe TEST-mode setup and no-real-money end-to-end verification.** Before
   live activation, configure TEST-mode credentials and TEST-mode webhook
   routing for merchant `acct_1UOjHzF56Rmibldi`, using the local application at
   `http://127.0.0.1:3099` and disposable local PostgreSQL over Unix sockets
   on ports `55443`/`55444`. Use a local fixture REST bridge, mocked Square
   inventory and locally captured mail/calendar effects. No new remote hosting,
   database or account is proposed. Restricted TEST credentials and local event forwarding are approved;
   the approved restricted TEST key is saved owner-only and actual hosted gateway checks passed. The exact permission-group amendment is recorded below.
   Do not send external
   messages or invitations. Exercise the sandbox scenarios below using Stripe
   test cards, with no real-money charge/refund or live canary. Passing this
   gate and the full `scripts/booking-e2e.md` matrix in the isolated environment
   are required before proceeding to live schema, configuration or shop deployment,
   even though public native booking stays off.
2. **Schema.** Confirm the target Supabase project and existing shop/booking
   prerequisites. Apply the reviewed `supabase-stripe.sql` and then
   `supabase-calendar.sql` before deploying application code that reads the new
   calendar fields/tables. The Stripe migration adds the private
   `stripe_checkout_attempts` state, financial/provider columns and indexes,
   service-role RPCs, reservation-aware Square sync and a Stripe-aware hold
   sweep. It replaces relevant functions while retaining legacy Square paths.
   The calendar migration adds interval blackouts and the verified capacity,
   padding and imported-duration support described below. Read back
   table/column/function definitions, RLS and grants. Do not seed,
   alter or invent live booking schedules as part of this migration.
3. **Stripe server access.** Confirm merchant `acct_1UOjHzF56Rmibldi` and create
   a server-only restricted key with the least permissions needed for the
   implemented endpoints: account read; Checkout Session create/read;
   PaymentIntent read/capture/cancel; Charge read; Refund list/read/create.
   Verify the available permission controls and endpoint access before use;
   do not grant unrelated customer, catalog, payout or subscription writes.
   Store the value in approved secret configuration, never this document or Git.
4. **Stripe webhook.** Create the canonical HTTPS endpoint above, subscribed
   only to `checkout.session.completed`, `checkout.session.expired`,
   `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, and `charge.refunded`. Store its
   signing secret in approved environment configuration. Read back URL,
   merchant, mode and subscribed events. Signed events are retrieved canonically
   before reconciliation; duplicate and out-of-order deliveries are expected.
5. **Production environment.** In Vercel project
   `prj_jY8fVdln43BFz60Y2PtvFuqGERMW`, set server-only `STRIPE_SECRET_KEY` and
   `STRIPE_WEBHOOK_SECRET`, set `STRIPE_ACCOUNT_ID=acct_1UOjHzF56Rmibldi`, and
   set `NEXT_PUBLIC_PAYMENT_PROVIDER=stripe`. Keep the native calendar off and
   retain all existing Square, Supabase, Acuity, email and cron configuration.
   Generate a separate random 32-byte `BOOKING_CALENDAR_API_TOKEN` for the
   prepared Claude bridge, set it server-only in this same Vercel project, and
   keep the local handoff copy at `~/.config/highland-farms/calendar-mcp.env`
   with owner-only permissions. Never reuse `SHOP_ADMIN_TOKEN`. Verify the
   limited token with a read-only aggregate calendar request after deployment;
   do not use it to write schedules as part of this shop activation. Its scope
   is the nine documented calendar tools on the canonical website. Revoke it
   by removing/rotating that environment value and redeploying. This plan
   authorizes no delivery message, account invitation or change to Jalene's
   machine; the standalone bridge and placeholder config are prepared locally.
   `STRIPE_CHECKOUT_ORIGIN` can remain unset because the default is the canonical
   website; do not introduce an arbitrary return host.
6. **Reviewed deployment.** Deploy the approved commit with a rebuild so the
   public provider selector is consistent in server and browser bundles. A push
   to `main` triggers Vercel production deployment and belongs to this approval
   scope only when the reviewed commit is identified. The deployment includes
   the authenticated `/api/cron/stripe-reconcile` job on `*/5 * * * *`.
7. **Readback and observation.** Confirm the expected deployment, provider flag,
   native flag off, shop redirect URL on `checkout.stripe.com` from existing
   customer sessions or approved sandbox evidence, webhook routing,
   cron authentication and private receipt behavior. Review existing real
   purchases read-only for reconciliation/notification/stock discrepancies.
   This plan includes no real-money canary, external messages or invitations.
   Stop on mismatched account, mode, totals or bindings.

## Verification evidence and pending work

| Check | Evidence/status |
| --- | --- |
| Prepare, email and paid-effects regression checks | Included in the final passing suite; mocked external calls |
| Full regression suite | **208 tests passed** after the final review fixes, zero failed or skipped |
| SQL migration and RPC behavior | Both additive schemas passed repeated isolated PostgreSQL verification, including concurrency and gift fixtures; latest run passed 14 groups |
| Calendar/gift compatibility | Nine compatibility tests passed; this does not establish full calendar parity |
| Latest focused regressions | 13 admin checks and four signed inventory checks passed after final fixes |
| TypeScript, lint and build | Full ESLint and the final guarded shop-only production webpack build passed, including TypeScript; placeholder credentials, existing shared dependencies, no package/lockfile changes |
| Final compiled API gates | Ten local checks passed: origin/JSON/config gates, legacy rail rejection, cron/calendar authentication and receipt privacy; no live calls |
| Stripe sandbox end-to-end | Passed S1–S10 plus S7I with actual TEST hosted decline/success, canonical signed events, captures, refunds, expiry/concurrency and failure recovery. Synthetic negative canonical patches are labeled separately; no second merchant was provisioned. Inventory/mail/calendar effects were captured locally |
| Native booking standing matrix | All 30 numbered A–D cases plus desktop/true mobile E pass in isolated legacy-off/on profiles with final SQL hashes |
| Desktop and true mobile payment UI verification | Passed at desktop 1440px and true iPhone 393px across shop/gift/booking and receipt states; mocked submissions, outside requests blocked |
| Final shop-only boundaries | Passed desktop and true iPhone: Stripe shop CTA, native booking/gift/availability disabled, Acuity fallbacks retained, no Square SDK, unknown receipt404 and private/no-referrer/noindex headers |
| Calendar browser verification | 78 states passed; six screenshots captured |
| Calendar MCP bridge | Eight mocked stdio/validation/transport/privacy tests passed on 2026-10-09, covering all nine tools; no real API calls |
| Production activation | **Approved shop scope; blocked on fresh farm counts, exact Square inventory approval and final live configuration. Native bookings/gifts stay off.** |

Safe Stripe sandbox verification needs an isolated database, mocked inventory,
locally captured email/calendar effects, TEST-mode credentials and test webhook
routing. Do not pair a
test Stripe key with production Supabase, live Square inventory or the farm's
live recipients. Credential provisioning and any external sandbox writes must
stay within their authorized scope. Existing mocked tests block unexpected
network destinations.

Exercise success, decline, abandoned/expired Checkout, cancel/back navigation,
duplicate requests/events, network loss after session creation and capture,
failed database finalization, lease recovery, price/amount/reference tampering,
POS shortfall, cart clearing only after paid state, email failure/retry and
webhook/cron recovery. Refund checks must cover pending/failed/unknown outcomes,
partial dashboard refunds, a lost refund response, replay without duplicate
refunds, whole-combo cancellation and exact gift-unit restoration.

Use [scripts/booking-e2e.md](../scripts/booking-e2e.md) as the standing native
calendar coverage matrix. Its historical recipes write real Supabase data,
exercise admin changes and reference legacy Square behavior; they are not
authorized by read-only access. Adapt and execute them in an isolated test
environment before any approved native cutover. Preserve the existing
[Acuity cutover runbook](superpowers/plans/2026-08-27-cutover-runbook.md).

Keep large installs/builds on an already approved remote host when suitable.
On Hayden's Mac, check capacity before large operations and use the guarded
`local-project` launcher, retaining the 30-GiB reserve. Do not create another
dependency tree/build just to inspect this change. If capacity blocks a required
build, record it as blocked rather than claiming release verification passed.

## Native booking and gift activation remains separate

Do not flip `NEXT_PUBLIC_NATIVE_CALENDAR` in this shop plan. Confirm real
weekly and date-specific availability, lead/horizon rules, min/max party,
closures, wedding blackouts and existing bookings before proposing that change.
Acuity API inspection found **942 timed blocks**, **129 explicit spa classes**
and tour limits of **two appointments per slot and six per day**. These require
date exceptions, interval closures, appointment-count limits and imported
duration/padding, rather than assuming native party capacity matches Acuity.
The private dry-run preview/seed in
`/Users/haydenlaverty/scratch/highland-stripe-20261009/prepared` represents
93 future tour dates, 129 spa classes across 47 dates, six weekly wedding-call
rules, 20 future date overrides and 87 timed blocks within the default one-year
window. Two Acuity API probes verified the wedding-call start spacing of
65 minutes. Native finalization preserves the 60-minute call duration and
actual imported padding; start spacing is not substituted for appointment
duration. Refreshed appointment import and the critical calendar matrix remain
pending.
The resource identity and concurrency relationship across the wedding calendars
remains unresolved; this implementation does not establish full Acuity parity.
External busy-calendar coverage and shared wedding resources still need parity
verification. Spa and wedding closure coverage must be checked against the
complete evidence. Keep native booking off until these checks and Stripe
sandbox end-to-end verification pass.
Never fill gaps by inventing schedules. Extract
available facts through authorized Acuity APIs/UI first. Ask Jalene only for
facts those sources cannot expose, rather than asking her to recreate the
calendar manually.

Reconcile the Acuity booking mirror, cancellations, gift products, outstanding
gift liabilities and redemption units; verify imported capacity, reminder
ownership, Google Meet fallback and reporting mode. Re-run the standing matrix
with Stripe-specific payment expectations and complete safe sandbox end-to-end
checks before presenting a separate exact native activation plan.

Gift catalog parity now covers 19 active products: 16 existing face-value
offers plus 3-, 5- and 10-visit packages priced at $199, $299 and $549,
respectively, expiring after 180 days. Legacy product aliases remain accepted.
Combo value credit can be redeemed for a tour and spa separately or together;
it never applies to wedding calls. This catalog compatibility does not replace
verification of outstanding gift liabilities before native activation.

The GitHub repository is public. Keep raw Acuity UI/API snapshots, occupancy,
complete timed blocks and generated seed SQL/previews outside the repository;
do not commit them under `docs/evidence` or paste them into public documentation.
The private preparation inputs are
`~/scratch/highland-stripe-20261009/evidence/acuity-calendar-ui-2026-10-09.json`
and `~/scratch/highland-stripe-20261009/evidence/acuity-calendar-api-2026-10-09.json`.
The preparation CLI accepts explicit input/output paths and defaults to dry run:

```bash
node --experimental-strip-types scripts/prepare-acuity-calendar.mts \
  --ui "$HOME/scratch/highland-stripe-20261009/evidence/acuity-calendar-ui-2026-10-09.json" \
  --api "$HOME/scratch/highland-stripe-20261009/evidence/acuity-calendar-api-2026-10-09.json" \
  --out "$HOME/scratch/highland-stripe-20261009/prepared"
```

This prepares private review artifacts only; it does not apply live calendar
changes or activate the native calendar. Review the generated preview and SQL
privately before requesting exact import authorization.

## Refund and cancellation operation

For Stripe native bookings, the admin route identifies the durable attempt and
verifies every attempt leg is confirmed or cancelled before contacting the
gateway. SQL locks validate related state and reject consumed, missing or
mismatched records before final cancellation/restoration. The route
uses actual cash due. A requested full cancellation brings cumulative cash
refunds to that captured total, subtracting prior dashboard refunds. It lists
existing operations, including pending refunds, before another submission and
uses a stable operation key. The booking remains confirmed if the refund is
pending, failed or uncertain. Retry the same cancellation after checking
canonical Stripe state; do not invent a new refund key to bypass recovery.

Only verified full refund success permits the requested refund-and-cancel path
to cancel every leg and restore the actual redeemed gift units once. A
no-refund farm cancellation still cancels/restores through the same attempt
transaction. Dashboard refund webhooks record cumulative financial amounts;
they do not automatically cancel bookings, restore gifts or void certificates.
Legacy Square bookings retain their original provider route.

## Jalene's local calendar MCP setup

The implementation provides a **local stdio MCP server**, not a hosted OAuth
connector. Jalene can run the single `scripts/calendar-mcp.mjs` file on her own
machine with her own Claude Desktop account or another local MCP-capable
client. It uses existing Node.js (20.9+), built-in fetch and no package install.
Copy only the bridge file to a durable local path; she does not need this Mac's
workspace, the repository dependencies, Supabase credentials, Stripe keys or
the full shop admin token.

The canonical API host is fixed to `https://highlandfarmsoregon.com` and redirects
are rejected. The only credential used is `BOOKING_CALENDAR_API_TOKEN`. The
bridge never falls back to `SHOP_ADMIN_TOKEN`; API/customer errors are sanitized
and responses are filtered to calendar data. No token values, raw server errors,
customer names/contact details or free-text notes are written to MCP output.

| MCP tool | API operation |
| --- | --- |
| `read_calendar(start,end)` | `GET /api/shop/admin/booking/calendar?from=...&to=...`, inclusive maximum 63 days |
| `set_weekly_schedule` | `POST /api/shop/admin/booking/schedules` |
| `set_date_schedule` | `POST /api/shop/admin/booking/exceptions` |
| `set_blackout` | `POST /api/shop/admin/booking/blackouts` |
| `set_timed_blackout` | `POST /api/shop/admin/booking/timed-blackouts` |
| `delete_weekly_schedule(id)` | `DELETE /api/shop/admin/booking/schedules` |
| `delete_date_schedule(productSlug,onDate)` | `DELETE /api/shop/admin/booking/exceptions` |
| `delete_blackout(id)` | `DELETE /api/shop/admin/booking/blackouts` |
| `delete_timed_blackout(id)` | `DELETE /api/shop/admin/booking/timed-blackouts` |

Read results include weekly rules, date overrides, date and timed blackouts,
and occupancy aggregated by product/start time with conflict duration/padding,
without individual bookings or customer
details. Weekly weekday values are Sunday `0` through Saturday `6`. Dates and
wall times use `America/Los_Angeles`. Opening a date requires explicit capacity;
current per-slot limits are two tour appointments, six spa guests and one
wedding-call appointment, enforced by both the API and bridge.
`startTimes:null, capacity:null` closes it, while deleting that override restores
the weekly rule. Creating a weekly rule inserts a new row, so read the current
rules first and use the returned numeric ID for an intended deletion.
Timed blackouts require `productSlugs`, `kind`, `startsAt` and `endsAt`;
timestamps include seconds and `Z` or an explicit UTC offset, and end must be
later than start. For example, a Pacific winter closure uses an `-08:00` offset.
`kind` is `wedding`, `closure` or `private_event`; optional notes must contain
no customer details and are excluded from read results.

The limited server token is accepted only for calendar read, weekly schedules,
date exceptions, date blackouts and timed blackouts. It cannot access booking
cancellation/refunds,
manual bookings, certificates, customer details, orders or broader shop admin.
Existing full admin authentication and cookies remain unchanged. Set/delete
tools are annotated as mutations with destructive hints, so the client can
show the change for review; annotations do not replace authorization.

**Provisioning proposal, still unapproved:** the shop activation plan includes
creating an independent random
32-byte calendar token, set server-only `BOOKING_CALENDAR_API_TOKEN` on Vercel
project `prj_jY8fVdln43BFz60Y2PtvFuqGERMW`, and deliver that dedicated value to
Jalene only through a separately approved private channel for her local configuration. Do not
reuse or disclose the shop admin token. Approve the exact credential scope,
recipient/delivery and deployment before executing. Approval of the shop plan
covers server provisioning and the private local handoff copy; sending the token
or changing Jalene's machine remains separate. The example below provisions
nothing. Live schedule changes require
their own explicit requested dates/times/capacity/closures after current-state
readback. No token has been created or delivered by this work.

After approved provisioning and deployment, merge this entry into Jalene's
existing Claude Desktop configuration. Replace the file paths with absolute
paths on **her machine** and fill the token privately. The example contains
placeholders only; keep the real file out of Git and shared documentation.

```json
{
  "mcpServers": {
    "highland-calendar": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/calendar-mcp.mjs"],
      "env": {
        "BOOKING_CALENDAR_API_TOKEN": "REPLACE_PRIVATELY_AFTER_APPROVED_PROVISIONING"
      }
    }
  }
}
```

Use Claude Desktop's developer configuration and restart the application after
saving; preserve any existing MCP entries. Its
[official local-server guide](https://modelcontextprotocol.io/docs/develop/connect-local-servers)
documents this configuration flow. The bridge implements the standard
[newline stdio transport](https://modelcontextprotocol.io/specification/2024-11-05/basic/transports)
and negotiates protocol `2024-11-05`. No remote connector URL/OAuth setup is
provided, and no change to Jalene's account or machine was made here.

Her first request should read the intended date range and compare it with the
current Acuity-derived preparation. An authorized update should name the exact
product, dates, Pacific times and capacity/closure, then read back the changed
range. The bridge rejects unknown fields/products, impossible dates/times,
reversed ranges and broader operations before sending a request.

## Rollback

Restore the previous `NEXT_PUBLIC_PAYMENT_PROVIDER` value (unset/non-`stripe`)
and rebuild/deploy the reviewed rollback configuration using the new inventory
adapter and webhook implementation. Provider-flag rollback is the safe rollback;
do not restore an older application version that bypasses timestamp-aware stock
sync. Keep the native calendar
off and Acuity live. This restores the legacy Square website entry points for
new checkout attempts.

Retain Stripe secrets, webhook endpoint, five-minute cron, additive schema,
durable attempts, receipt verification, `sync_square_stock_snapshot` and the
new Square adapter/webhook. They must continue to reconcile
existing authorizations/captures, paid fulfillment and refund events after the
UI switch. Do not delete attempts, release ambiguous reservations, drop the
schema, disable recovery or remove Square inventory mappings as rollback.
Investigate discrepancies using canonical provider state and the durable
attempt reference before any separately approved corrective write.

## Receipt privacy and measurement

`PaymentPrivacy` omits analytics/replay/CRM/chat and GTM noscript from the
receipt document; receipt metadata and API headers suppress indexing and
referrer disclosure. Treat the high-entropy session URL as a receipt capability.
Do not put it in telemetry, support screenshots, public documents or logs.

The shop browser purchase event is queued until normal navigation can load
GTM. Closing the tab or losing browser state can lose measurement. Booking
GA4/Meta preserves its existing shared dedupe and best-effort delivery, and
counts only cash collected so gift redemption is not counted again. Use paid
database/provider state for reconciliation, not analytics delivery.
