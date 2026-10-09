# Architecture — highlandfarmsoregon.com

Where code goes and why. Update this file in the **same PR** as any structural
change. Companion docs: `AGENTS.md` (working rules), `CLAUDE.md` (Claude import),
`README.md` (how to run).

## What this app is

One Next.js App Router site serving three businesses that share a farm:

1. **The venue** — weddings, celebrations, farm stays. Lead-generation: forms in,
   CRM out. No money changes hands on the site.
2. **The experiences** — farm tours and the Nordic spa. Booked through **Acuity**,
   which owns the calendar, capacity and confirmation emails.
3. **The farm store** — physical goods, with a legacy Square payment path and
   gated Stripe hosted Checkout. Square remains the POS, linked-price and
   inventory system; the approved Stripe shop cutover awaits fresh stock and final live configuration.

These have different shapes: a lead fans out, the live experience calendar
belongs to Acuity, and an order moves money transactionally. The gated native
calendar and store share durable Stripe payment orchestration while keeping
their catalogs, capacity and fulfillment rules in their own domains.

## Directory map

```
src/
  app/                     routes (App Router)
    shop/                  the farm store — see "Commerce" below
    api/                   route handlers; one directory per integration
  components/
    layout/                shell: Header (+ Masthead, AnnouncementBar, MobileMenu),
                           Footer, EmailPopup, BookedIQWidget, GTM, StructuredData;
                           chrome.ts = page types, actions, bars, seasons, door rows
    ui/                    primitives: Container, Button, FieldGuide (paper
                           system atoms and PendingSlot; client-safe, no data)
    field/                 Field Guide pieces that read data or open bookings:
                           Reviews (server only), Faq, PriceRows, StickyBar,
                           WeddingCallLink, ChatLauncher
    home/                  the homepage sections, its data and its quotes.ts
    forms/                 lead capture (InquiryForm, ContactForm, fields)
    shared/                booking buttons + Acuity modal, visit pickers,
                           Highland Day block, Know before you book, visit FAQ
    stay/                  stay pages: booking card, Hospitable widget, facts
    booking/               native calendar UI (behind the flag)
    shop/                  commerce-only UI that lives outside /app/shop
  lib/
    shop/                  ALL farm-store domain logic (see below)
    payments/              Stripe transport, durable checkout orchestration,
                           reconciliation, paid effects and browser retry context
    <integration>.ts       one file per external system: acuity, hubspot,
                           bookediq, meta, ga4, supabase, resend, turnstile
    daily-report.ts        pure daily-report calculations + escaped email template
    html.ts                shared HTML escaping for all email renderers
    reviews.ts             the ONLY reader of google-reviews.json — see "Social proof"
  data/                    static page content (properties, tours, spa, portfolio)
                           + google-reviews.json, refreshed by a scheduled job
docs/                      plans, recovered data, ads runbooks
scripts/                   one-off + scheduled ops scripts
.github/workflows/         scheduled jobs that commit back to the repo
supabase-*.sql             schema, applied by hand (no migration runner here)
```

### Where does X go?

The seasonal Thanksgiving offer is a server-rendered marketing page at
`src/app/thanksgiving/page.tsx`, with package content and prefilled email links
in `src/data/thanksgiving.ts`. It sends inquiries to the address supplied by the
farm; it does not create bookings, charge payments or apply tour/spa terms to a
stay package. Discoverability comes from the Stays menu, `/stay` and the sitemap.
Its hero edits the actual Lodge dining-room photo with Thanksgiving table
styling, which the caption identifies. Accommodation photo sets live with the
package data; the whole-farm card shows the Lodge, Cottage and Camp separately.
Accommodation and experience photos use the existing real farm assets.
The page uses the Field Guide paper system (`src/components/ui/FieldGuide.tsx`):
its hero lives in `src/app/thanksgiving/ThanksgivingHero.tsx` beside the page.

| Adding… | Put it in |
|---|---|
| A marketing page | `src/app/<route>/page.tsx`, content in `src/data/` if it's a list |
| A new external system | `src/lib/<system>.ts` + a route under `src/app/api/<system>/` |
| Farm-store business logic | `src/lib/shop/` — never inline in a component |
| A shared visual primitive | `src/components/ui/` |
| A DB table | append to a `supabase-*.sql` file, then **apply it before deploying** |
| A one-off or cron script | `scripts/` |
| A review count, rating, or star badge | import from `src/lib/reviews.ts` — never a literal |
| A Field Guide (paper) first screen | `src/app/<route>/<Name>Hero.tsx` beside the page, built from `src/components/ui/FieldGuide.tsx`; its list copy in `src/data/` |
| A section, list, quote, price row, FAQ or sticky bar | the shared primitives in `src/components/ui/FieldGuide.tsx` and `src/components/field/` (API: `finish/notes/PRIMITIVES.md`); never a page-local copy |
| A masthead action, bar or menu/footer row for a page type | `src/components/layout/chrome.ts` |
| A review quote on a page | a `QuoteSpec` (author + review date) in that page's own `quotes.ts`, kept pure (type-only imports). `scripts/review-quotes.test.mts` globs every `src/**/quotes.ts` and proves each quote verbatim from the snapshot |
| A fact the farm has not confirmed yet | wrap the whole element (a row, a sentence, a block) in `PendingSlot` (`ui/FieldGuide.tsx`); it renders nothing in production. Never words inside a sentence: the page must read complete and true with every slot removed |
| Customer-facing copy | no em dashes (titles use ` · `); the public phone line is `CONTACT.phone`; `CONTACT.ordersPhone` only for shop pickup and holiday packages; never name individual animals |

**The tours and spa cancellation policy** is strict, and its exception sentence
("The only exception is if we cancel for severe weather or for the safety of our
animals or guests, in which case we will refund or rebook you.") must read the
same everywhere: `src/data/farm-tours.ts`, `src/data/nordic-spa.ts`,
`src/data/gift-certificates.ts`, `src/app/sauna-near-portland/page.tsx`,
`src/app/terms/page.tsx`, `src/components/shared/KnowBeforeYouBook.tsx` and
`public/llms.txt`. Point-of-sale lines render it through `cancellationAnswer()`.
Stays have their own line (`StayCancellationLine`): stay bookings are final, with
no refunds (Jalene and AJ, 2026-10-07); never present the tour and spa policy or
its weather exception as a lodging policy.

## The paper masthead and first screens

Approved 2026-10-06 ("Field Guide", led by weddings); chrome round 2 built
the same evening from `finish/boards/_shared/` and `finish/boards/shared/`.

**The masthead** (`Header.tsx`, client) is solid paper on every page from the
first render: no transparent mode. Lockup B sits in the centre, the name in
words (`MastheadName`: HIGHLAND FARMS over BRIGHTWOOD, OREGON; Hayden's rule
that the name reads on every page). Below xl: the menu button left, the page's
own action right. From xl: Weddings · Real weddings · Farm tours · Nordic spa ·
Stays on the left, Shop · Gifts and the action on the right (the boards' `lg:`
is `xl:` here because that row does not fit 1024px). Phone name sizes step down
at 389px and 359px so the name never touches the action (measured with the real
fonts: at least 16px clear from 320px up).

**Page types** live in `chrome.ts` (`pageTypeFor(pathname)`), and everything
per page derives from the type: the right-hand action (`pageActionFor`, labels
from CONSISTENCY #5, in-page anchors such as `#choose`, `#availability`,
`#book`, `#stays`, `#packages`; the shop shows `Cart (n)` from the cart), the
menu's pinned button, and the announcement bar. The
action carries `data-masthead-action` and fades while the bottom sticky bar
shows (CONSISTENCY #9). Cart and order pages show no action; checkout gets the
quiet variant (name, back to cart, "Secure") and the slim footer.

**The bar** (`AnnouncementBar.tsx`) is one 40px paper-shade line with a pine link and no dismiss
button. Only about (the free call), shop (pickup and delivery terms, numbers
from `src/lib/shop/fulfillment.ts`), the stays index only (Thanksgiving, until Nov 23;
single stays have their own booking and no bar) and
tours/spa/sauna (gift certificates, Nov 1 to Dec 24) have one. Season gates
run in the visitor's Pacific date: an inline script sets `<html data-season>`
and `data-bar-hidden` before first paint, so a page prerendered weeks earlier
still shows the right bar; an effect keeps them right on client navigation.
Any element with `data-season-only="gift|thanksgiving-bar|thanksgiving-links"`
hides outside its season (globals.css).

**Heights.** The bar (40px) plus the name row (60px, 96px from xl, 3px double
rule included). The static `--header-h` defaults in `globals.css` mirror them
(100/136px, 60/96px without a bar, 60/84px on checkout) and the
ResizeObserver in Header keeps them exact, so pages offset with
`var(--header-h)`. Past 40px of scroll the whole masthead moves up 40px: the
bar scrolls away, the name row stays pinned, and page padding does not change.

**The menu** (`MobileMenu.tsx`) is a sheet that slides in from the left, where
the menu button sits, over the page dimmed behind it (88% wide, at most 380px).
A tap on the page, a swipe left, Escape or the close button dismisses it; it
stays mounted for the 300ms slide out, and motion is off under reduced motion.
Top row: close, the name, tap to call. Weddings leads as a framed photo plate
(a couple between two coos) captioned with the Google review count, then the
coos line (`WEDDING_MENU_NOTE`), the two-night price (`WEDDING_PRICE_NOTE`;
wedding prices are allowed since Hayden removed the no-price rule on
2026-10-07, and each must match the workbook) and the September 2026 sell-out (`WEDDING_DEMAND_NOTE`),
both sourced from the Confirmed Weddings workbook in `chrome.ts`, and three
icon steps (see N real weddings, the free 20-page look book, the free call).
`MenuFacts` (review count, confirmed-couple count) is resolved in the server
layout and passed through `Header`, since the review snapshot and portfolio
must not ship to the client. The sheet is portalled to `<body>` and the other
body children are `inert` while it is open. Visits are rows with a framed
real photo, the name and the one-line hint (`ChromeDoor.note`; the
footer no longer shows it). Then "More from the farm" (one dotted line that wraps after a dot on narrow phones) and three
uniform quick actions (call, directions, Instagram: `TEL_HREF`, `DIRECTIONS_HREF`). The page action is pinned at the
thumb. The current page carries a pine bar and "You are here". Photos come
through `next/image` at 44-640px (3-30 KB) and load only when the sheet opens.
History: 2026-10-07 the hinted rows read "very busy"; the text-only fix read
"very basic"; this version follows mobile-drawer practice. Escape, focus trap,
scroll lock, `aria-current`.

**The footer** (`Footer.tsx`, server) is the phone menu laid flat (mobile
review board B1, 2026-10-07), paper-shade under a double rule: the menu's own
plate with the compact review count in its mat (`proof`), Weddings as the one
large lead with `WEDDING_MENU_NOTE`, the menu's price and September lines
(`WEDDING_PRICE_NOTE`, `WEDDING_DEMAND_NOTE`) and its three icon steps
(`data-footer-weddings` on the plate and this group), the visit doors as plain
rows (`data-footer-visit-rows`) and the short links (`doors`; on phones an even
two-column grid), the one public line in pine with the two labelled emails
(`talk`), the address and directions (`find`), then the directories and legal on
two compact 12px lines with 24px targets (a two-column grid under 375px; the "For
AI agents" link stays) and the colophon. One note per group, one link style,
no hint column (`ChromeDoor.note` is now unused by the footer). **By page type**
(globals.css on `data-masthead`): weddings, the journal and couple pages, about,
celebrations and contact drop the plate and Weddings group (the page carries its
own); home drops the plate (its photo repeats) and the visit rows; the shop drops
the visit rows; visit, stay, gift and Thanksgiving pages put the visit doors first
on phones. A page hides parts it already shows with
`<FooterHide parts={["find"]} />` (`doors | find | talk | proof`; pure CSS through
`:has()`, so it is right in the server HTML); /contact hides find and talk by
route, the legal pages hide `talk`, the 404 hides `doors` and `proof`. **The quiet
footer** (`[data-footer-slim]`: the cow-head drawing with the "Highland Farms"
wordmark, "Questions about an order? Call", Privacy, Terms, Accessibility)
replaces it on checkout, the cart and the order pages by route, and on any page
that renders `<FooterQuiet />` (`bare` drops the help line; the unsubscribe page
uses it).

**Wedding-call links** in the chrome go through `WeddingCallLink`, which pushes
the same `booking_start` (`booking_type: "wedding_call"`) as the inquiry form.

**The look-book card** (`EmailPopup.tsx`) offers the 2027 look book to couples
only: the real-weddings journal, /about, and home after a wedding page in the
same visit; never on a form or booking page. Since 2026-10-07 (Hayden: "drop
the gate") it is a docked, non-modal paper card with one button that opens
`/lookbook.pdf`: no email field, no dimmed page, no focus trap; Escape or the
plain close dismisses it for 30 days, and opening it ends it for good. Pushes
`lookbook_open` (`placement: "lookbook-popup"`); `lookbook_email_submit` and
`email_subscribe` no longer fire from it. In the page flow, /weddings and the
journal use `LookbookCard` (`app/weddings/LookbookLink.tsx`): the same cover,
one outline button, and its own `lookbook_open` placement.

**Stay cross-sells** (`components/stay/StayLines.tsx`): `StayHereRows` renders
"While you're here" on /stay and every stay page as small photo rows (Thanksgiving
behind its season gate, then the tour and the spa through `BookingTextLink`), and
`StayKnowRows` states a stay's minimum once.

**The booking wrapper** (`BookingModalRoot` in `shared/BookingButton.tsx`) is a
paper header over the Acuity iframe: the title wraps instead of crowding the
links, a quiet "New tab" escape, a 44px plain close, and one line under the
title (`wrapperNote`: the spa's quantity help, or "Private tour, rain or shine"
on the tour calendar). Acuity's own page inside the frame is not ours.

**The forms** (`components/forms/`) draw their own framed card with the cow
seal: date and guests first, phone last with both text consents beside it in
full (one-line labels above the unchanged wording), a folded optional note,
one server-error line with the phone, and the success inside the same card;
the call with Daunte is its own door below. Pages render the form without a
wrapper frame. Event guest bands are 2 to 8 / 9 to 20 / 21 to 50 / 51 to 125
(one house, the whole farm), with older band values still labelled.

**The bottom sticky bar** (`field/StickyShell.tsx`, used by `FieldStickyBar`)
is the page's one phone action (52px button; 48px with tighter padding under 375px,
where `--sticky-bar-h` follows). It appears once the first-screen CTA
(`data-hero-cta`) scrolls away, or from load with `showOnLoad` on pages that
have no first-screen button (the wedding portfolio and couple pages). It hides
while its `hideWhenVisible` target or any `[data-sticky-stop]` element is on
screen, and while a text field has focus. It sets `<html data-sticky>` while
mounted, which adds its height under `[data-site-footer]` and to
`scroll-padding-bottom` so it never covers content or focus, and
`data-sticky-shown` while visible. The chat lift is measured from the bubble's
resting position (`field/chatLift.ts`), so it never stacks. **The chat launcher** (`field/ChatLauncher.tsx`,
mounted by `BookedIQWidget`) adopts one rule into the LeadConnector shadow root
so the launcher follows `--hf-chat-lift` (above the bar) and
`--hf-chat-visibility` (hidden under any `aria-modal` dialog, cart and
checkout). It never defers or changes the widget script.

The home, /weddings, /farm-tours and /nordic-spa first screens share the
paper tokens (`--paper`, `--ink*`, `--pine`, `--rule`, `--frame`) and one
7/5 desktop grid. Each plate is the page's LCP image: a sized frame with
a `fill` image at high priority (the homepage art-directs two photos with
`getImageProps` and `<picture>`). Booking actions in them go through
`BookingButton` / `BookingTextLink` so tracking and the modal stay one path.

## Social proof (Google reviews)

Reviews are the strongest conversion lever on this site and they appear in more
places than is obvious: hero badges, near-CTA counts, the review-card sections,
and the `aggregateRating` JSON-LD in `StructuredData.tsx` (which Google reads —
a wrong number there is a structured-data problem, not just stale copy).

The data is a **committed snapshot**, not a runtime fetch:

```
Google Business Profile v4 API
  └─ scripts/pull-gmb-reviews.mjs        (weekly, via GitHub Actions)
       └─ src/data/google-reviews.json   (committed → Vercel auto-deploys)
            └─ src/lib/reviews.ts        (the only module that reads the JSON)
                 ├─ field/Reviews.tsx    FieldReviewTier (hero / near-CTA /
                 │                       compact tiers), FieldReview and
                 │                       FieldReviewList (quotes from each
                 │                       page's quotes.ts via review-quotes.ts)
                 └─ StructuredData        aggregateRating JSON-LD
```

### The rules that keep this honest

1. **`src/lib/reviews.ts` is the single source of truth.** Nothing else imports
   `google-reviews.json`. `field/Reviews.tsx` is server-only so the snapshot
   never ships to the browser; client components receive resolved props.
2. ⛔ **Never hardcode a review count or a rating.** They went stale for three
   months precisely because `188` and `"4.9"` were typed into three files.
   Import `REVIEW_COUNT` / `FIVE_STAR_COUNT` / `REVIEW_RATING` instead.
3. **Never render `REVIEW_RATING` as a decimal.** Display is always five filled
   stars plus a count — hero uses `REVIEW_COUNT`, near-CTA uses
   `FIVE_STAR_COUNT`, inline uses `REVIEW_COUNT`. The decimal is for JSON-LD only.
4. **A snapshot, not a fetch, is deliberate.** Pages stay fully prerendered, no
   API call happens on a page view, the JSON diffs in review, and the site keeps
   rendering if Google's API is down.
5. **The rating comes from Google's `averageRating`**, not from anything we
   compute or type. The pull script rounds it to 1dp, matching the profile.
6. ⛔ **The GBP API does not accept service accounts** — a *user* refresh token
   is the only headless path. `scripts/mint-gmb-refresh-token.mjs` mints one
   scoped to `business.manage` alone; do not substitute the local gcloud ADC
   token, which also carries `cloud-platform`.
7. The workflow refuses to commit a snapshot whose review count dropped more
   than 10%, and skips a commit where only `fetched_at` moved — so a bad pull
   or a no-op run can't trigger a production deploy.

## Website payments (gated Stripe implementation, 2026-10-09)

`NEXT_PUBLIC_PAYMENT_PROVIDER=stripe` switches shop, native booking and native
gift purchase UIs to hosted Stripe Checkout. It is a build-time public flag;
without that exact value, the legacy Square payment components/routes remain.
The old Square checkout routes reject new requests when Stripe is enabled,
preventing stale tabs from charging the alternate rail. This code is prepared
locally; [PAYMENT-20261009-STRIPE-SHOP](docs/stripe-cutover-2026-10-09.md) authorizes the shop cutover after its test and stock gates pass.
The first activation covers the shop. `NEXT_PUBLIC_NATIVE_CALENDAR`
stays off, so Acuity still owns public experience bookings and gift sales.

```
src/lib/payments/
  prepare.ts       Zod validation + normalized request hash; re-price catalog,
                   enforce delivery/schedule/party/combo rules; read-only snapshot
  store.ts         service-role durable attempt and transactional RPC interface
  stripe.ts        Stripe REST transport, account check, manual capture,
                   signature verification and cumulative refund recovery
  reconcile.ts     pure session/intent/reservation state machine
  service.ts       shared checkout/session/recovery/notification orchestration
  effects.ts       paid emails, Square stock adjustment/refresh, booking tracking
  request.ts       parsed-origin checks and per-instance rate limiting
  client.ts        stable browser retry keys and cart/return context
src/app/api/payments/stripe/checkout/route.ts   prepare/reserve/open Checkout
src/app/api/payments/stripe/status/route.ts     verify receipt + reconcile
src/app/api/stripe/webhook/route.ts             signed Checkout/refund events
src/app/api/cron/stripe-reconcile/route.ts      authenticated five-minute recovery
src/app/payments/return/                       verified confirmation UI
src/components/layout/PaymentPrivacy.tsx       third-party-script receipt boundary
supabase-stripe.sql                            private state + financial columns/RPCs
```

The durable attempt binds a normalized purchase hash, server-priced snapshot,
reference, Stripe session/intent, reserved stock/booking IDs, gift units and
cash due. Browser prices and payment tokens are ignored. Tracking fields can
vary on retry without changing the purchase; the original attribution is kept.
Reservation, capacity claims and gift redemption happen in one transaction.
The default reservation is 45 minutes; the hosted session expires five minutes
earlier, after 40 minutes. Stripe receives the exact cash due in integer USD
cents and uses manual capture. The transport pins Stripe API `2026-09-30.endive` and uses `allowed_payment_method_types[0]=card`; the removed `payment_method_types` field must not return. Per-session `wallet_options[link][display]=never` excludes Link bank/Klarna funding from this card-only release. Upgrade the version through isolated gateway tests, including hosted method presentation and webhook compatibility.

Webhook delivery, receipt polling and cron fetch canonical Stripe state and
validate mode, session/intent binding, currency and exact amount. Capture
requires a persisted processing claim, including a fresh check for known POS
stock shortfalls. Its two-minute lease prevents concurrent work and permits
crash recovery. Processing booking holds survive the generic hold sweep.
The cron considers up to 50 attempts per run, rotates attempted rows through
the queue even on failure, and has a 180-second work deadline inside a
300-second route limit so older open sessions do not starve newer recovery.
After capture, one transaction records the order and items, confirms every
booking leg, or issues the gift certificate. Retrying a captured payment
repeats domain finalization without charging again. Free or fully gift-covered
bookings finalize without Stripe card entry; overdue pending free attempts
expire and restore their reservations. Browser retry keys retire after verified paid/expired receipts or successful zero-charge booking, permitting an identical later purchase; old receipts cannot clear a newer attempt. Paid checkout replays return the existing receipt.

A network exception is never proof of a decline. Unknown create/capture/cancel
outcomes retain the same attempt and its reservation. Release needs verified
expiry/cancellation, or the safe no-session deadline path, which cannot have
captured without a persisted claim. Late authorizations on expired attempts
are cancelled rather than captured. Keep webhook/cron/state alive after a
provider rollback so existing Stripe purchases can finish.

Paid effects retry until `notified_at` is set. Booking confirmation work checks the complete current group and payment/snapshot binding before Calendar creation and again before email. Fully cancelled groups get a separate `confirmation_suppressed_at` marker; partial, missing or consumed groups fail closed. Suppression never claims delivery and does not disable financial reconciliation. Already submitted messages can still race cancellation. Customer/farm/recipient emails
have stable per-attempt Resend keys and strict provider-error handling;
booking email payloads and ICS timestamps are frozen before sending.
Wedding-call Calendar IDs are deterministic, with conflict readback, while
Meet-link creation remains best effort. Before outbound Square adjustment, the
effects RPC freezes its timestamp; concurrent/unknown-outcome retries reuse it
with the same key. Unknown adjustments aged 24 hours fail closed, retaining
stock holds for manual reconciliation. Effects set `square_synced_at` after
adjustment and refresh canonical timestamped absolute counts. Provider
idempotency retention is finite; these
keys do not establish unlimited exactly-once email delivery.

`PaymentPrivacy` suppresses GTM (including noscript), attribution, replay, CRM,
email popup and chat scripts on `/payments/*`. Receipt metadata/headers prohibit
indexing and referrer disclosure. `next.config.ts` applies explicit private/no-referrer/noindex rules to both `/payments/:path*` and `/api/payments/stripe/:path*`; the global header default overrides the status route’s own response policy without the API exception. The session ID is a receipt capability;
public status responses expose only status/kind/reference/result, never the
stored customer snapshot or intent ID. Shop browser purchase events remain
queued until normal navigation loads GTM; conversion delivery is best effort.
Booking GA4/Meta uses the shared event claim and tracks only cash collected,
avoiding gift-redemption double counting.

Stripe dashboard refunds update cumulative recorded cents without initiating
domain cancellation. Refund preflight verifies every attempt leg is confirmed
or cancelled before gateway access; SQL locks reject consumed, missing or
mismatched related state. Farm booking cancellations refund the exact remaining
cash first when requested, recognize existing/pending refund operations on
retry, and cancel all legs/restore actual gift units once under the attempt
lock. Pending, failed or unknown refunds keep the booking intact. Legacy
Square bookings retain their original cancellation/refund path.

## Commerce (the farm store)

Added Aug 2026 after the Squarespace store was cancelled and went dark. The old
`/shop` was a catalog that linked out; it is now a real store.

```
src/app/shop/
  data.ts              THE CATALOG — products, variants, prices. Static.
  checkout/ExpressPay.tsx  legacy Square Apple Pay + Google Pay
  page.tsx             collection page (ISR, revalidate 60)
  ShopBody.tsx         collection UI (client)
  [slug]/              product detail + AddToCart
  cart/                cart page
  checkout/            shared details form; hosted Stripe or legacy Square fields
  thank-you/           legacy Square post-purchase confirmation
  order/               fallback "call us to order" page
src/lib/shop/
  data flows from      catalog (static)  +  inventory (Supabase)
  inventory.ts         live stock reads (service-role)
  cart.tsx             client cart: external store + Context
  money.ts             integer cents; the only place dollars↔cents converts
  fulfillment.ts       pickup vs local delivery, ZIP allowlist, fees
  square.ts            POS inventory + legacy payment rail (REST, no SDK)
  orders.ts            order writes + atomic stock claim/release
  order-email.ts       customer receipt + farm pick list
src/app/api/shop/checkout/route.ts   legacy Square transactional endpoint
src/app/api/shop/cart/save|recover/   abandoned-cart capture + restore
src/app/api/cron/abandoned-carts/     hourly reminder job
src/lib/shop/abandoned-cart-email.ts  the reminder template
src/app/api/square/webhook/route.ts  Square -> website (POS sales, refunds, orphan payments)
src/app/api/shop/admin/inventory/    admin writes
src/app/shop/admin/                  stock, count, orders, Square matching
  CountSheet.tsx                     shelf count -> DB, with an audit trail
  MatchPicker.tsx                    human-confirmed Square linking
src/lib/shop/admin-auth.ts           shared-token gate (+ admin-cookie.ts for the client)
```

### The rules that keep this honest

1. **The catalog is static; availability is not.** Names and prices live in
   `data.ts` (in git, reviewable). Stock lives in `shop_inventory` so the farm can
   sell out without a deploy. Never put stock counts in `data.ts` — the values
   there are a one-time seed only.

2. **The server is the price authority.** The browser sends variant ids and
   quantities, never prices. Stripe `payments/prepare.ts` and the legacy
   `/api/shop/checkout` re-derive every line from `data.ts`. A cart that remembered prices would let a stale tab check out at last
   month's number.

3. **Money is integer cents everywhere but the display edge.** Convert once via
   `money.ts`. Never do float arithmetic on a total.

4. **Reserve stock before charging.** Stripe wraps `claim_shop_stock` in its
   durable attempt transaction and releases only after safe expiry/cancellation;
   unknown outcomes keep the reservation. The legacy Square route claims first,
   releases on its failed-charge path, and records the order after charging.
   Stripe finalization is transactional and recoverable after capture; email
   failure must never tell a paid customer to purchase again.

5. **Fulfillment is pickup or local delivery. The farm does not ship.** The rule
   lives once in `fulfillment.ts` and is enforced on both the form and the server,
   so the two can't drift. If this ever changes, audit the marketing copy too —
   the announcement bar, the `/shop` hero and the trust strip all advertised
   "insulated shipping" and had to be corrected when the Squarespace store died.

6. **⛔ SQUARE IS THE PRICE SOURCE OF TRUTH** (Hayden, 2026-08-26). For any
   variant linked to a Square variation, Square's price wins and `data.ts` holds
   a copy. Re-sync with `node scripts/sync-square-prices.mjs --apply`, which only
   touches linked variants. Unlinked products (all apparel, both plush, the
   bouquets) keep their own price because Square has no opinion on them.

   This inverted an earlier rule that said the opposite. The reason the earlier
   rule existed still holds on the legacy payment path: **the Square order is
   built from ad-hoc line items at our price, never `catalog_object_id`.** Prices
   agreeing today doesn't make them the same system, and a catalog line would
   re-price itself from Square the instant someone edits the register, silently
   diverging from the amount we charged. Pricing is synced deliberately, not
   implicitly.

   ⚠️ A Square variation with **no set price** is a custom-price or duplicate
   line, not a $0 product. The sync skips and reports those. The website's New
   York Steak was auto-linked to exactly such a duplicate; the real item was
   "NY Steak" at $20.

7. **Shop tables AND functions are service-role only.** The tables have RLS on
   with zero policies, which is deny-all. The functions need separate care:
   ⛔ **revoke from `PUBLIC`, not just `anon`/`authenticated`.** Postgres grants
   EXECUTE to PUBLIC by default and grants are additive, so revoking from `anon`
   leaves the PUBLIC grant it inherits. A `SECURITY DEFINER` function has no RLS
   gate — EXECUTE is the only gate. This was shipped wrong on 2026-08-26 and left
   both stock RPCs callable by anyone holding the (publicly-known) anon key.

### The Square link (added 2026-08-26)

The farm rings sales up on Square. Without a link, the same physical plush can be
sold at the register and on the website, because the two count separately.

**Both directions, and why each is built the way it is:**

- **Register → website.** Square's `inventory.count.updated` webhook fetches
  canonical quantity and raw `calculated_at`, then writes through the distinct
  `sync_square_stock_snapshot` RPC. Under the inventory row lock, older snapshots
  are discarded and equal timestamps recompute holds. The old two-argument
  wrapper cannot overwrite a known timestamp. Failure returns 503 for retry,
  with no claim-before-write event loss. Only variants that
  carry a `square_variation_id` are touched; a Square event for something the
  website doesn't sell (wedding deposits, pumpkins) is a no-op by design. The
  Stripe migration subtracts pending/processing/review reservations and paid
  reservations not yet synchronized, so an absolute POS count cannot simply
  erase a website hold. `stripe_stock_shortfall` records consumed held units.
- **Website → register.** After a paid order, `adjustInventory()` posts an
  ADJUSTMENT to Square for the mapped lines.

⛔ **The legacy Square order is built from ad-hoc line items at OUR prices, never
`catalog_object_id`.** A catalog line is priced from Square's catalog, and
Square's prices disagree with the website's (Beef Tenderloin $22 vs $29,
Boneless Pork Chop $9 vs $15). Referencing the catalog would make the Square
order total diverge from the amount charged. Pricing and stock are therefore
moved by two separate calls, on purpose.
Stripe purchases create no Square payment/order; they preserve this independent
price/inventory boundary through paid inventory adjustments.

Manual inventory writes and audited Count batches lock inventory rows and reject stock changes while Stripe reservations remain unresolved; threshold-only edits remain allowed. Linked manual counts retain the existing website-only semantics and source timestamps, so the next canonical Square snapshot can replace them. Mapping changes reject unresolved holds, reset stock/source chronology on a real remap, and require a fresh canonical baseline. Checkout reservation compares current mappings and quantities with the prepared Square adjustment snapshot under those locks.

⛔ **Mapping is one-to-one and must stay that way.** A unique index enforces it.
The website sells Pork Shoulder Roast in three weight tiers against Square's
single "Pork Shoulder Roast" — linking all three would decrement one count for
three different products. `scripts/square-catalog-match.mjs` demotes any
contested match to "needs a human" rather than guessing.

⚠️ **A mapping needs inventory tracking ON in Square.** Verify current mapped
tracking and canonical timestamps live before activation; historical linked-item counts are
not readiness evidence. Local claims and known-shortfall checks cannot close
the distributed timing race between a POS sale, its webhook, website capture
and the subsequent Square decrement. Exercise that overlap in an isolated
fixture, and monitor linked-stock discrepancies after an approved cutover.
Provider rollback changes the public flag while retaining the new Square
adapter/webhook and timestamp-aware RPC; deploying old stock-sync code is unsafe.

### Abandoned cart recovery (added 2026-08-26)

Email is captured on the checkout page as soon as a valid address is typed, and
the cart is snapshotted against it. Two reminders then stop: ~1h and ~24h.

⛔ **The snapshot stores variant ids and quantities, never prices.** Same rule as
the checkout: a two-day-old email must not be able to check out at a price we no
longer charge, and Square moves prices without us. `subtotal_cents` is stored for
the email and reporting only, recomputed server-side, never used to charge.

The rules that stop it embarrassing the farm, all enforced in the cron:
never mail a cart that has since been ordered (the checkout calls
`mark_cart_recovered`); never mail an unsubscribed address; never mail the same
step twice (the timestamp is written **before** the send, so a crash costs one
reminder rather than sending two); drop sold-out lines and skip the cart entirely
if nothing is left; ignore carts older than a week; and cap sends per run.

⭐ Editing a cart refreshes `updated_at`, which restarts the idle clock — someone
actively shopping has not abandoned anything.

CAN-SPAM is built into the template shell, not left to the caller: every send
carries a working unsubscribe plus the farm's physical address, and the job sets
`List-Unsubscribe` / `List-Unsubscribe-Post` for native one-click in Gmail.

### The cart-reminder A/B test

⛔ **Two independent randomisations, not a six-cell grid.** Three variants times
two senders would need roughly six times the traffic to resolve, and this store
will not produce it. `variant` and `sender` are assigned independently and read
as two separate questions: which argument works (~1/3 each) and who should sign
it (~1/2 each). Same traffic, two answerable questions.

Assignment happens once, on first save, and `coalesce` keeps it — a shopper who
gets Connor at 1h must not get Jalene at 24h. Read results from the
`shop_cart_test_results` view, which counts only carts that were actually
MAILED; including carts that never reached the 1h threshold would dilute every
rate.

⛔ **A sender's `photo` must be a REAL photograph or null.** Never generate a
likeness: a fabricated headshot of a real employee is a worse version of the
fake-provenance-imagery problem, because it puts a face and words on someone who
consented to neither. Jalene has no photo on file and signs without one.

### Known gaps

Ranked.

- ⚠️ **Legacy Square stock reservation has no TTL.** `claim_shop_stock` decrements outright;
  there is no `reserved` column. Release only happens on the in-request decline
  path, so if the function dies between claim and release the unit is decremented
  forever (phantom sold-out). Needs either a reserved-with-expiry model or the
  webhook above plus a sweeper. Stripe attempts add durable expiry/recovery;
  do not apply the legacy cleanup assumption to Stripe holds.
- ⚠️ **Rate limiting is per-instance, in-memory.** Each warm serverless instance
  keeps its own counter, so the "12 per 15 min" is not global, and a cold start
  resets it. The legacy endpoint calls Square directly; both website providers
  still need stronger shared abuse controls. The legacy endpoint is a card-testing
  oracle with a weak brake. Wants a shared store (Redis/Supabase) and/or the
  Turnstile challenge the repo already uses on the contact form.
- **Admin auth is a single shared token**, and its cookie is set client-side so
  it is not httpOnly. Adequate for one farm team; not real accounts. If this ever
  needs per-person accountability beyond the free-text "counted by" field, that's
  the thing to fix first.
- **POS mappings need current review.** Unlinked goods have no cross-system
  inventory protection, even though local website stock claims are atomic.
- **Shop refunds are recorded, not initiated by the shop UI.** Provider
  webhooks write cumulative `refunded_cents` and status. Native farm booking
  cancellation has a separate refund action.
- **No CSP.** Not required for the wallets (Square is allowed by default when no
  CSP exists), but a checkout page with no script-integrity control is the one
  gap an assessor would flag under SAQ A-EP. If a CSP is ever added it MUST
  allowlist `web.squarecdn.com` and Square's PCI-connect origin, or card entry
  breaks silently.
- **Stripe checkout currently requests card payments only.** Wallet
  availability is Stripe/browser/account dependent and needs sandbox checks;
  ACH, Cash App Pay and Afterpay are not part of this cutover. Legacy Square
  Apple Pay and Google Pay code remains for rollback.
- **(historical) Digital wallets were off.** Apple/Google Pay run through the same
  `POST /v2/payments` call and need no server change; Apple Pay needs the
  `.well-known/apple-developer-merchantid-domain-association` file plus domain
  registration. The current `Permissions-Policy` header omits `payment`, which
  leaves it at its `self` default — that does NOT block wallets.

## Booking (native calendar)

Added Aug 2026 (Phase 1, behind `NEXT_PUBLIC_NATIVE_CALENDAR`) to replace Acuity
as the calendar of record for farm tours, the Nordic spa, and wedding calls.
Acuity remains live in production until the flag flips (Phase 3). Phase 2
(same month) added the on-page booking widgets, wedding-call scheduling +
Google Meet, gift certificates, and the farm's admin booking surface. Phase 3a
(also Aug 2026) added the Acuity-mirror importer, the frozen Acuity archive,
the GTM event provisioner, and armed (but did not run) the cutover runbook —
`docs/superpowers/plans/2026-08-27-cutover-runbook.md`.

The October 9 Stripe implementation is a separate payment gate, described
above. It does not establish calendar readiness. Acuity API evidence includes
942 timed blocks, 129 explicit spa classes and tour limits of two appointments
per slot and six per day. Native preparation maps these to date exceptions,
interval blackouts and appointment-count limits using current Acuity evidence and
authenticated admin maintenance, including date exceptions for Jalene's own
Claude/MCP workflow. The private default-year preparation contains 93 future
tour dates, 129 spa classes across 47 dates, six weekly wedding-call rules,
20 future overrides and 87 timed blocks. Two API probes verified 65-minute
wedding-call start spacing; finalized calls retain a 60-minute duration and
actual imported padding. Refreshed appointment import, shared wedding resources,
external busy coverage and full parity remain verification gaps. Ask for manual
facts only when authorized APIs cannot expose them.
Keep the native flag off until real schedules, exceptions, blackouts, imports and gifts pass
the [standing matrix](scripts/booking-e2e.md) and Stripe TEST-mode end-to-end
checks with no real-money transactions or external messages/invitations.

This repository is public. Raw Acuity calendar inputs, occupancy/full timed
blocks and generated seed SQL/previews stay outside Git under the private
`~/scratch/highland-stripe-20261009/evidence/` input directory; the generated
preview/seed is in `/Users/haydenlaverty/scratch/highland-stripe-20261009/prepared`.
The path-driven
`scripts/prepare-acuity-calendar.mts --ui PATH --api PATH --out DIR` preparation
CLI defaults to dry run; it does not apply changes. See the cutover guide for
the private input locations and review procedure.

The gift catalog has 19 active products: 16 existing face-value offers and
3/5/10-visit packages at $199/$299/$549 with 180-day expiry. Legacy aliases
remain accepted. Combo value credit can fund tours and spa independently or
together, and is never eligible for wedding calls. Both additive SQL schemas
passed repeated isolated PostgreSQL checks, including concurrency/gift
fixtures; nine compatibility tests passed. The current 208-test suite and ESLint passed, as did 14 real PostgreSQL Stripe groups including count/remap races and cancelled-confirmation suppression. The final guarded shop-only production webpack build passed, including TypeScript.
Desktop 1440px/true iPhone 393px payment states and 78 calendar browser states passed with mocked submissions and outside requests blocked; six calendar screenshots were captured. Actual Stripe TEST S1–S10 plus S7I, all 30 numbered standing cases and final shop-only desktop/true-mobile boundaries passed; synthetic negative cases are labeled separately in private evidence. No production activation has occurred. Fresh farm counts entered through Shop Admin are the chosen stock baseline; linked Square tracking and canonical counts must be reconciled under an exact separate inventory change approval before activation.

```
src/lib/booking/
  products.ts            THE CATALOG — slugs, prices, party size, lead time. Static.
  engine.ts               pure availability math (schedules + exceptions + blackouts
                           + booked units -> offered slots); no I/O
  store.ts                Supabase I/O: schedule reads, claim/confirm/release RPCs,
                           gift-certificate RPCs, gift-certificate insert, the
                           best-effort booking_audit writer
  time.ts                 the only place America/Los_Angeles <-> UTC conversion happens
  flag.ts                 the NEXT_PUBLIC_NATIVE_CALENDAR kill switch — GUEST-FACING
                           surfaces only, see rule 9
  client.ts               browser-side availability fetch + idempotency-aware submit,
                           used by every BookingFlow instance
  booking-number.ts       customer-facing booking number generator
  confirmation-email.ts   customer + farm confirmation emails (composes the
                           "MEET LINK NEEDED" farm-notification fallback, rule 8)
  cancel-email.ts         farm-initiated cancellation email (refund and/or
                           gift-restore composed together when both apply)
  reminder-email.ts       48h / morning-of reminder emails
  gift.ts                 gift certificate PRODUCTS (fixed price/kind/scope), code
                           generation, and issuance (insert + one 23505 retry)
  gift-email.ts           gift certificate purchase + delivery emails
  google-calendar.ts      wedding-call Meet-link creation via a domain-wide-delegated
                           service account impersonating events@; NEVER throws (rule 8)
  ics.ts                  .ics calendar attachment for confirmation/reminder emails
  acuity-import.ts         mirrors live Acuity appointments into `bookings` as
                           `source='acuity_import'` — see "The Acuity mirror" below
src/components/booking/
  BookingFlow.tsx          client widget: date/slot pick -> party -> details -> pay
  BookingPayment.tsx       legacy Square card + wallet bootstrap
  NativeBookingSection.tsx server wrapper — returns null when the flag is off, so
                           mounting it on a guest page is always flag-off-safe
src/app/api/booking/
  availability/route.ts   GET — offered slots per product (or combo pairs)
  checkout/route.ts       POST — legacy Square booking checkout
  gift/checkout/route.ts  POST — legacy Square gift purchase (charge, then issue)
src/app/gift-certificates/page.tsx   flag off: StaticGifts.tsx (each gift links to
                                     its Acuity catalog product); flag on:
                                     GiftBody.tsx (native purchase)
src/app/wedding-call/page.tsx   wedding-call scheduling page (mounts BookingFlow
                                 directly — no pricing card, the product is free)
src/app/api/cron/booking-reminders/route.ts   expired-hold sweep + reminder sends
src/app/api/cron/daily-report/route.ts   dual-mode (Mode A/B, see "The Acuity mirror" below)
src/app/api/acuity/webhook/route.ts   best-effort real-time mirror into `bookings`
                                        (calls the same `upsertAcuityBooking` the
                                        importer script does)
scripts/import-acuity-bookings.mts   bulk backfill + periodic straggler sweep —
                                       upserts active appointments, then runs
                                       `reconcileCancellations`
scripts/acuity-archive.mts           read-only full Acuity snapshot (all appointments,
                                       orders, config) into `acuity_archive_appointments`
                                       + gzipped JSON, before the account is ever cancelled
scripts/acuity-schedule-suggest.mts  observation-only report of Jalene's actual booking
                                       patterns, to seed `booking_schedules` — never
                                       writes to the table itself
scripts/publish-booking-gtm.mjs      provisions the GA4 event tags/triggers for the
                                       booking dataLayer events in GTM-MBH36BJH
supabase-booking.sql      schema + RPCs, applied by hand (no migration runner here)
supabase-calendar.sql     additive interval-blackout/capacity/import support;
                           apply with supabase-stripe.sql before new application reads
```

### Limited calendar API and Jalene's Claude bridge

`calendar-auth.ts` accepts the existing full admin credential or the independent
`BOOKING_CALENDAR_API_TOKEN` only on the aggregate calendar read and weekly
schedule/date-exception/date-blackout/timed-blackout routes. Other booking and
shop routes retain
their full admin gate; the limited token cannot cancel/refund, create manual
bookings, manage gift certificates or read customers/orders. Existing admin
cookies are unchanged. `calendar-schema.ts` validates real dates, Pacific
times, product slugs and explicit open-date capacity. Current slot capacities
are capped at two tour appointments, six spa guests and one wedding call;
the local MCP bridge checks those same product limits before making requests.

`GET /api/shop/admin/booking/calendar?from=...&to=...` returns rules, exceptions,
date and timed blackouts without free-text notes, and occupancy summed by
product/start with conflict duration/padding. The inclusive range is at most
63 days. `POST`/`DELETE` on `exceptions` replaces
or removes an override by product/date. `startTimes:null` closes a date;
deleting the exception restores weekly behavior. Weekly rule and blackout
creation/deletion keep their existing endpoint shapes and audit behavior.
`timed-blackouts` accepts offset-aware `startsAt`/`endsAt` instants, affected
products and kind, with optional private notes; deletion uses its numeric ID.

`scripts/calendar-mcp.mjs` runs locally on Jalene's machine through her own
Claude/MCP client. It uses Node built-ins, newline stdio JSON-RPC and protocol
`2024-11-05`, with nine validated read/set/delete tools. It calls only the
canonical HTTPS site's calendar endpoints, uses the dedicated token without
admin-token fallback, rejects redirects and filters API results again to
exclude customer data, notes and secrets. It adds no hosted MCP/OAuth service.
Provisioning the token and changing live schedules remain separate approved
actions; [setup instructions](docs/stripe-cutover-2026-10-09.md#jalenes-local-calendar-mcp-setup)
do not activate anything.

### The Acuity mirror (Phase 3a)

Feeds the native `bookings` table from the still-live Acuity account so the
native calendar's own tables — and eventually its own reports — don't have to
wait for the cutover flip to have real data in them.

- **Ownership is enforced by `source`, not by inference.**
  `acuity-import.ts`'s `upsertAcuityBooking` only ever reads/writes rows with
  `source='acuity_import'` — both the lookup and the update are guarded on
  it. If a `bookings` row for a given `acuity_id` somehow has a different
  `source` (e.g. `native` or `admin`), the importer logs a warning and skips
  it rather than touching it. Two callers share this one function so the
  mapping logic never forks: `scripts/import-acuity-bookings.mts` (the bulk
  backfill + periodic sweep) and `src/app/api/acuity/webhook/route.ts` (a
  best-effort real-time mirror on every `scheduled`/`rescheduled` webhook).
- **`acuity_archive_appointments`** is the frozen full-history snapshot
  written by `scripts/acuity-archive.mts` — every appointment (active +
  canceled), not just the mirror's active-only slice. It's the thing Mode B
  of the daily report reads for pre-cutover history once Acuity itself is
  gone (see below), and the only durable copy of anything Acuity currently
  holds. Re-run before Step 10's cancellation (runbook Step 10a) — there is
  no API path to pull this data after the account is cancelled.
- **`reconcileCancellations`'s 17-month candidate margin.** It fetches an
  18-month Acuity window but only reconciles `bookings` rows whose
  `starts_at` falls in the first 17 of those months
  (`[fromIso, from + 17 months)`). The 1-month margin exists so a booking
  rescheduled OUT to near the edge of the 18-month fetch — which would
  otherwise look identical to a real cancellation (Acuity just hasn't been
  asked that far out yet) — can never be falsely marked cancelled; it
  self-heals once its new date rolls inside the window on a later run.
- **Reconcile <-> webhook race guard.** `reconcileCancellations` captures
  `fetchStartedAt` before calling Acuity, then excludes from its
  cancel-candidates any row whose `updated_at` is at/after that timestamp —
  a booking created (and webhook-mirrored) while the reconcile fetch is in
  flight can't possibly appear in Acuity's response snapshot, and without
  this guard would look identical to a real cancellation.
- **`ACUITY_ACTIVE` plays two distinct roles**, both scoped to the watch-week
  period where the site takes bookings natively but Acuity is still the
  account of record (see the runbook's Step 3):
  1. `src/app/api/cron/booking-reminders/route.ts` excludes
     `source='acuity_import'` bookings from native reminder emails while
     `ACUITY_ACTIVE=true` — Acuity's own reminders already cover them.
  2. `src/app/api/cron/daily-report/route.ts` uses it (together with
     `NEXT_PUBLIC_NATIVE_CALENDAR`) to pick Mode A vs. Mode B: **Mode A**
     (today, and immediately post-flip) reads live Acuity + native additions,
     unchanged from the single-source report. **Mode B** (once
     `ACUITY_ACTIVE` is unset, at Step 10) reads history from the frozen
     `acuity_archive_appointments` snapshot and current activity from
     `bookings` (`native` + `acuity_import`), merged via
     `mergeArchiveWithCurrent` — Acuity's live API is gone by then. Both of
     Mode B's own reads are paged with `fetchAllPages` (stable `.order("id")`
     + `.range()`) rather than an unbounded `select()`, since PostgREST
     silently caps an unbounded read at its default page size and these are
     Mode B's core/load-bearing data, not an optional addition.

### Admin booking surface

Lives inside the existing farm-store admin (`/shop/admin`, `src/lib/shop/admin-auth.ts`
shared-token gate) rather than a new admin app — same operator, same login.

```
src/app/api/shop/admin/booking/
  route.ts               GET — bookings + blackouts in a date range
  blackouts/route.ts      POST/DELETE — wedding + closure blackouts
  schedules/route.ts      POST/DELETE — weekly recurring availability
  manual/route.ts         POST — phone/walk-in bookings (claims capacity, no charge)
  cancel/route.ts         POST — farm-initiated cancel + provider refund + gift restore;
                           detects a combo_group and cancels/refunds/emails the whole
                           pair atomically, never a single leg of a combo
  certs/route.ts          GET/POST — gift certificate issue, lookup, void
src/app/shop/admin/
  CalendarTab.tsx          bookings + blackout calendar view
  SchedulesTab.tsx         weekly schedule editor
  CertsTab.tsx             gift certificate issue/lookup/void UI
```

### The rules that keep this honest

1. **The engine is pure; the RPC is the authority.** `engine.ts` decides what's
   offered; `claim_booking_slots` enforces capacity under an advisory lock.
   Availability shown to users is real counts — scarcity is never invented.
2. **Slots are held BEFORE charging.** Legacy/admin claims use the original
   10-minute pending hold. Stripe reservation extends it to the 45-minute
   attempt deadline and processing claims protect it from the generic sweep;
   only verified reconciliation releases Stripe holds.
3. **The server derives every price from `products.ts`.** The browser sends
   product/date/time/party only.
4. **All schedule wall-times are America/Los_Angeles**; storage is timestamptz.
   Conversion happens only in `time.ts`.
5. **A wedding is a blackout** (`booking_blackouts.kind='wedding'`) that blocks
   tours + spa. Weddings are not bookings.
6. **Everything guest-facing is behind `NEXT_PUBLIC_NATIVE_CALENDAR`** until
   cutover (Phase 3). Acuity remains the live calendar of record until then.
7. **Every admin mutation writes `booking_audit`.** `auditBooking()` in
   `store.ts` is a best-effort insert (it never throws — auditing must not
   break a booking) but every admin route calls it with actor `"admin"` and a
   detail payload that names exactly what changed: a blackout created, a
   schedule edited, a manual booking taken, a cancel/refund, a cert issued or
   voided. The customer-facing checkout/cron paths default to actor
   `"system"` instead.
8. **Meet-link creation is best-effort; a wedding-call booking NEVER fails on
   calendar errors.** `google-calendar.ts`'s `createWeddingCallEvent()` never
   throws — a missing service-account config, a non-2xx response, or a
   network error all resolve `null` and log the booking number. When that
   happens the confirmation email still sends: the customer copy promises the
   Meet link will follow by email, and the farm notification is flagged
   `MEET LINK NEEDED` so a human closes the loop by hand. The booking itself
   confirms regardless — a calendar hiccup is never the reason a wedding
   couple's call fails to book.
9. **Admin booking screens are NOT flag-gated by design.** `flag.ts`'s kill
   switch guards guest-facing surfaces only (rule 6); the admin routes under
   `/api/shop/admin/booking/*` and their `/shop/admin` tabs have no
   `nativeCalendarEnabled()` check anywhere in them. This is deliberate:
   Jalene needs to seed real schedules and blackouts, and the farm needs to
   take manual bookings and issue gift certificates, before cutover — not
   after. Guests see none of it until the flag flips; the admin surface is
   just data entry against tables no guest-facing route reads while the flag
   is off.
10. **Gift certificates become redeemable only after payment.** Stripe stores
    a durable attempt and generated code before hosted payment, then issues
    the certificate in atomic paid finalization. An insert failure keeps the
    captured attempt recoverable. The legacy Square route charges then inserts;
    its paid-but-unissued failure logs `CRITICAL` and returns
    `{ success: true, code: null }` for manual reconciliation.

## Conventions worth keeping

- **Fire-and-forget for leads, transactional for orders.** `/api/inquiries` writes
  Supabase first then fans out and never fails on a downstream error. Checkout is
  the opposite: ordered, and it stops when a step genuinely fails.
- **Server-side tracking.** GA4 via Measurement Protocol and Meta via CAPI, so an
  ad blocker doesn't erase a conversion.
- **Static content lives in `src/data/`**, not in the component that renders it —
  FAQ arrays there also feed `FAQPage` JSON-LD, so one edit updates both.
- **`robots.txt` and `llms.txt` are static files** in `public/`. Do not convert
  `robots.txt` to a typed route; it can't emit the Cloudflare `Content-Signal`
  line. Bump `Last-Updated` in `llms.txt` when you edit it.
