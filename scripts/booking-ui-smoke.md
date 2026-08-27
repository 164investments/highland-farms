# Booking UI smoke pass — visual + interaction QA (mobile first)

Task 10 of Phase 2. Flag-on dev server (`NEXT_PUBLIC_NATIVE_CALENDAR=true`,
`RESEND_API_KEY=disabled-for-e2e`), device-emulated captures (`iPhone 14 Pro`
+ `Desktop Chrome`, real UA/DPR/touch via Playwright device descriptors — the
same approach as `~/claude-tools/mobile-preview/shot.mjs`, extended with a
custom driver script for the interaction states that a static screenshot
tool can't reach: day-open, slot-picked, details-filled, combo-pairs,
scarcity). Screenshots kept in the session scratchpad (not committed); paths
below.

Driver script: `/private/tmp/claude-501/-Users-haydenlaverty/59b9b522-486f-48f7-b7cf-a0b5c23bf59c/scratchpad/qa-shots.mjs`
Screenshots: `/private/tmp/claude-501/-Users-haydenlaverty/59b9b522-486f-48f7-b7cf-a0b5c23bf59c/scratchpad/shots/`

## Setup

Killed one stray `next-server` (PID 55543, 20h uptime, `cwd` pointed at a
deleted project directory `~/projects/hf-ab`) that was squatting on both
ports 3000 and 3099 — the checkout route's dev-only origin allowlist only
accepts those two, so this was necessary before anything could run.

Seeded via the Supabase Management API (schedule ids 27/28/29, cleaned up
after):
```sql
insert into booking_schedules (product_slug, weekday, start_times, capacity, effective_from) values
  ('farm-tour', 6, ARRAY['10:00','13:00'], 2, '2026-01-01'),
  ('nordic-spa', 6, ARRAY['11:00','14:00'], 6, '2026-01-01'),
  ('wedding-call', 6, ARRAY['09:00','10:00','11:00'], 1, '2026-01-01');
```
Scarcity: inserted one `confirmed` nordic-spa booking (`units=4`, capacity 6)
on the 2026-09-05 14:00 slot -> `remainingUnits=2`, which also shows through
on the combo pair that uses that spa leg. Row deleted after.

## Carried findings (from Tasks 5/6/7/8)

### 1. Policy paragraph doubled with the widget's own checkbox copy (Task 5)

Confirmed: with the flag on, `farm-tours` and `nordic-spa` both showed the
static "Strict cancellation policy: all bookings are final..." paragraph
*and* `BookingFlow`'s own policy checkbox ("I understand all bookings are
final: no refunds, credits, or transfers...") — same message, twice. The
paragraph sat directly adjacent to the (already flag-gated) `BookingButton`
in both pages, matching the brief's "IF and only if it sits adjacent" case.

**Fix:** moved the static paragraph inside the same
`{!nativeCalendarEnabled() && ...}` block as the `BookingButton`.
- `src/app/farm-tours/page.tsx`: button + paragraph were already contiguous,
  wrapped both in a fragment inside the existing conditional.
- `src/app/nordic-spa/page.tsx`: the "Spa runs Tue/Wed/Fri/Sat/Sun" line sits
  *between* the button and the policy paragraph and is not flag-redundant
  (it's schedule info, not policy), so it stays unconditional; only the
  policy paragraph itself got its own `{!nativeCalendarEnabled() && ...}}` so
  the flag-off DOM order is unchanged (button, schedule line, policy line —
  same order as before).

**Flag-off byte-identity:** confirmed by reading the JSX diff directly —
every wrap is `{!nativeCalendarEnabled() && (...)}`, so with the flag unset
`!nativeCalendarEnabled()` is `true` on both branches and every wrapped node
renders exactly as it did before, in the same order. `npm run build` (flag
unset, see Gate below) still lists `/farm-tours` and `/nordic-spa` as static
routes with no route-shape change.

### 2. Party change after picking a slot didn't clear the stale selection (Task 6)

Confirmed and fixed in `src/components/booking/BookingFlow.tsx`: added a
`changeParty(next)` helper that no-ops if the value didn't change (min/max
clamp), otherwise sets `party` and — if a slot is currently selected — clears
`slot`/`spaTime` and bumps `refreshNonce` so `DatePicker`/`ComboPicker`
refetch against the new party size instead of leaving a selection that may
no longer fit (capacity or the combo buffer). Wired both Guests +/− buttons
to it.

**Live verification** (nordic-spa, mobile): picked the scarce 2:00 PM slot
(day Sept 5, remainingUnits=2), tapped "+" on Guests. Before the fix this
left the contact form open with the now-possibly-invalid slot still selected
and totals unrefreshed; after the fix the flow drops straight back to the
day/slot picker with no slot highlighted — confirmed via
`input[placeholder="First name"]` going from visible to not-present, the
Guests row disappearing (it only renders when `slot` is set), and the
screenshot: `shots/party-change-clears-selection.png`.

### 3. Desktop header-nav text overlap ("WEDDINGS"/"GIFT CERTIFICATES") — reproduced and diagnosed as a real bug introduced by this branch, fixed

Tasks 7/8 flagged this as "pre-existing, not investigated further." Task 10
diagnosed it properly:

- The site `Header` (`src/components/layout/Header.tsx`) is `position:
  fixed`, transparent-over-hero, and never pushes page content down — every
  page is expected to reserve its own top clearance.
- `/weddings` (pre-existing, completely untouched by this branch) at the
  exact same scroll position renders perfectly clean —
  `shots/weddings-static-top.png` — because its hero image section is tall
  enough that the eyebrow/H1 sit well below the fixed header.
- `/wedding-call` and `/gift-certificates` (both new pages, Tasks 7 and 8 of
  *this* branch) used `<Container className="py-16">` (64px top padding) at
  the page root with no hero image, so the page's own eyebrow text
  ("WEDDINGS AT HIGHLAND FARMS" / "GIFT CERTIFICATES") rendered directly
  under/through the fixed nav row and visually collided with it — reproduced
  on both mobile and desktop, at page load, no scroll needed. This is a real
  bug, not a screenshot-tool artifact, and it's caused by this branch (Tasks
  7/8 didn't reserve header clearance) — the brief's disposition for that
  case is "fix."
- The site already has an established pattern for non-hero content pages
  reserving header clearance: `privacy`, `terms`, and `accessibility` all use
  `pt-32` at the page root. Applied the same fix to both new pages:
  `<Container className="py-16">` -> `<Container className="pt-32 pb-16
  lg:pb-20">` in `src/app/wedding-call/page.tsx` and
  `src/app/gift-certificates/page.tsx`.
- **Verified fixed**, both devices, before/after crops:
  `shots/wedding-call-idle-desktop-top-crop-v2.png`,
  `shots/gift-certificates-idle-desktop-top-crop-v2.png` (desktop nav now
  fully legible, eyebrow clear underneath) and
  `shots/gift-certificates-idle-mobile-top-crop-v2.png` (mobile, same).
  Full re-shots: `shots/wedding-call-idle-{mobile,desktop}.png`,
  `shots/gift-certificates-idle-{mobile,desktop}.png`.

## Surfaces reviewed

All captured on both `iPhone 14 Pro` and `Desktop Chrome`. Verdicts below.

| Surface | State | Verdict |
|---|---|---|
| `/farm-tours` | widget idle (coexists with hero/pricing) | PASS — `farm-tours-idle-{mobile,desktop}.png` |
| `/farm-tours` | day open | PASS — `farm-tours-day-open-{mobile,desktop}.png` |
| `/farm-tours` | slot picked | PASS — `farm-tours-slot-picked-{mobile,desktop}.png` |
| `/farm-tours` | details filled (top: guests/contact, bottom: checkbox/CTA) | PASS — `farm-tours-details-filled-{top,bottom}-{mobile,desktop}.png` |
| `/farm-tours` | combo expander open with pairs | PASS — `farm-tours-combo-pairs-{mobile,desktop}.png` |
| `/nordic-spa` | widget idle | PASS — `nordic-spa-idle-{mobile,desktop}.png` |
| `/nordic-spa` | day open, scarcity day | PASS — `nordic-spa-day-open-scarcity-{mobile,desktop}.png` |
| `/nordic-spa` | "2 left" scarcity slot picked | PASS — `nordic-spa-scarcity-slot-picked-{mobile,desktop}.png` |
| `/wedding-call` | idle, then a full free booking through checkout | PASS (fixed header overlap) — `wedding-call-idle-{mobile,desktop}.png`, `wedding-call-confirmed-mobile.png` |
| `/gift-certificates` | idle | PASS (fixed header overlap) — `gift-certificates-idle-{mobile,desktop}.png` |

Review checklist applied to every state above:
- **Thumb-reachable primary actions:** all CTAs (day/slot buttons, Guests
  +/−, submit) sit within a single-column flow at natural thumb height on
  mobile; nothing pinned out of reach.
- **No horizontal scroll:** checked programmatically
  (`document.documentElement.scrollWidth` vs `clientWidth`) on all 4 booking
  pages, both devices — all 8 combinations `false` (no overflow).
- **Legible scarcity badges:** "2 left" / "N spa seats left" render inline
  in the slot/pair button with clear contrast in both the outline and
  selected (filled green, white text) states — see the nordic-spa scarcity
  screenshots above.
- **Tappable policy checkbox:** native `<input type="checkbox">` inside a
  `<label>` wrapping both the box and the full paragraph — the whole text
  block is a tap target, not just the 16px box.
- **Readable error states:** the local Square-unconfigured fallback ("Online
  payment isn't available right now. Call or text (971) 563-1921...") reads
  clearly at both sizes — `farm-tours-details-filled-bottom-{mobile,desktop}.png`.
  This is the expected local-dev state (no `SQUARE_*` vars set), matching
  `scripts/booking-e2e.md` item 5, not a bug.
- **Widget vs. hero/pricing coexistence:** both `/farm-tours` and
  `/nordic-spa` place the native widget directly under the existing "Tour/
  Session Details & Pricing" card, same visual rhythm, no fighting for
  space — see the full idle screenshots.

## Step 3 — full wedding-call booking through the rendered mobile page

Ran end to end against `http://localhost:3000/wedding-call` at `iPhone 14
Pro` emulation: opened Sat 8/29, picked 9:00 AM, filled QA/Smoketest /
`e2e-test@example.com` / phone / referral / checked the policy box, tapped
**Book 9:00 AM**. Confirmation screen rendered ("You're booked. Booking
HFB-260827-8549...") — `shots/wedding-call-confirmed-mobile.png`. DB check:
```
booking_number=HFB-260827-8549, product_slug=wedding-call,
status=confirmed, amount_cents=0, first_name=QA, last_name=Smoketest,
email=e2e-test@example.com, starts_at=2026-08-29 16:00:00+00
```
Matches the picked slot and party (free path, no Square dependency).

## Non-issues (investigated, not fixed, not regressions)

- **Next.js dev-mode "1 Issue" badge**, bottom-left corner, visible in
  several screenshots. Confirmed present on a plain page load with zero
  interaction (`check-issue.mjs`), and the dev-server log shows no new
  warnings/errors beyond the two already-known pre-existing ones (see
  below). This is Turbopack's dev-only indicator — never renders in a
  production build (confirmed: `npm run build` output has no dev overlay,
  it's a client-only dev-mode script). Not investigated further; disappears
  in prod.
- **Pre-existing console noise** (unchanged from Tasks 7-9): `BookedIQWidget`'s
  non-standard `onLoad` string-prop warning, and two `422` responses from an
  unrelated third-party call. Present on every page load in this pass, not
  introduced by Task 10's changes — confirmed by grepping
  `src/components/layout/BookedIQWidget.tsx` (unchanged).
- **Site's own sticky-mobile "Book Your Farm/Tour Session" CTA still links
  to Acuity** even with the flag on (`BookingStickyCTA` in
  `farm-tours`/`nordic-spa` page.tsx, unconditional). This is Task 5's
  explicit, documented scope decision ("Other `BookingButton` instances...
  are untouched and still link to Acuity regardless of flag — out of scope
  for this task per the 'primary pricing-card' instruction") — confirmed
  still true, not something Task 10 introduced or was asked to revisit.
  Flagging it here as a UX observation for a future task: on mobile, a
  guest scrolling the native widget still has this fixed Acuity-routed CTA
  floating at the bottom of the screen the whole time, which is a second,
  competing "Book" path. Not fixed — out of scope (predates Task 10,
  explicitly scoped out by Task 5).
- **`/wedding-call` has no `#book` wrapper id** — `NativeBookingSection`
  (which sets `id="book"`) only wraps the `farm-tour`/`nordic-spa` flows;
  `wedding-call/page.tsx` renders `<BookingFlow product="wedding-call" />`
  directly. No functional impact (nothing links to `#book` on that page),
  just noted since it tripped up the QA driver script's selectors initially.

## Gate (all clean)

```
npm test          -> 34/34 pass
npx tsc --noEmit  -> clean
npm run lint      -> clean
npm run build     -> Compiled successfully; /wedding-call and
                      /gift-certificates still static (flag off at build,
                      both render their notFound() shell as expected)
```

## Cleanup — verified zero

```sql
delete from bookings where email = 'e2e-test@example.com'
  or booking_number in ('E2E-SCARCITY-TEST','HFB-260827-8549');
delete from booking_schedules where id in (27,28,29);
```
Post-cleanup: `leftover_bookings: 0, leftover_schedules: 0`. Availability
re-checked empty for the seeded dates. Dev server stopped, port 3000 free.

## Follow-up: gated the sticky mobile CTA behind the flag

Post-review, the coordinator flagged the "sticky CTA still routes to Acuity"
non-issue above as worth fixing after all: with the flag on it's a second,
contradictory booking path fixed to the bottom of the screen on mobile,
competing with the on-page native widget.

Wrapped both `BookingStickyCTA` mounts (`src/app/farm-tours/page.tsx`,
`src/app/nordic-spa/page.tsx`) in the same `{!nativeCalendarEnabled() &&
(...)}` conditional already used for the primary `BookingButton`. Verified
live (`iPhone 14 Pro`, flag on, scrolled to page bottom on both pages): the
sticky CTA's `div.fixed.bottom-0.left-0.right-0` wrapper count goes from 1
to 0, and the footer renders cleanly with no dead gap or overlap where it
used to sit —
`shots/farm-tours-footer-no-sticky-mobile.png`, `shots/nordic-spa-footer-no-sticky-mobile.png`.
The unconditional `<div className="h-20 lg:hidden" />` spacer at the end of
both pages (originally there so the sticky bar never covers the last bit of
content) was left untouched per the fix's scope — with the CTA gone it's
just ~80px of ordinary-looking footer padding, not a visible defect.

Re-ran Task 5's exact flag-off byte-diff method (stash to the pre-fix
commit, build+curl both routes, restore the fix, build+curl again, diff
normalized for build-id noise) since the conditionals in these two files
had now been touched twice in this task. Result: **byte-identical (modulo
build-id) for both `/farm-tours` and `/nordic-spa`**, flag off — raw file
sizes matched exactly, and a full string-equality check passed after
normalization.

Gate re-run clean: `npm test` 34/34, `tsc` clean, `lint` clean, `build`
clean. All dev/start servers and ports (3000, 3099, 3801, 3802) stopped and
confirmed free.
