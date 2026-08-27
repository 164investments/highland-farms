# Native Calendar Phase 2 — Hardening, Booking UX, Meet, Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Phase 1 engine customer-usable and farm-operable: fix the seven deliberate Phase 1 ride-alongs, ship the on-page booking experience (tours, spa, combo, wedding call, gift certificates) behind the flag, wire Google Meet for wedding calls, and give Jalene an admin calendar (schedules, blackouts, manual bookings, cancels/refunds, gift certs).

**Architecture:** Four sequential stages on one branch (`feat/native-calendar-phase2`), one PR. Stage A hardens the merged engine (PR #19 / commit `30f22d3`). Stage B mounts a native `BookingFlow` on the product pages behind a server-side flag check, so flag-off pages render byte-identical (the Acuity `BookingButton` path is never edited). Stage C adds Google Calendar/Meet via DWD-impersonated service account with a graceful null fallback. Stage D extends the existing token-gated `/shop/admin` (NOT flag-gated — Jalene seeds schedules before cutover). Everything customer-facing stays invisible until Phase 3 flips `NEXT_PUBLIC_NATIVE_CALENDAR`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (service-role), Square Web Payments SDK + REST (reusing shop rail incl. `ExpressPay`), Resend, Google Calendar API (JWT/DWD, no SDK), `node --test`.

**Spec:** `docs/superpowers/specs/2026-08-27-native-calendar-design.md`
**Phase 1 record:** `docs/superpowers/plans/2026-08-27-native-calendar-engine.md` + `scripts/booking-e2e.md`

## Global Constraints

- `NEXT_PUBLIC_NATIVE_CALENDAR` unset ⇒ every customer-facing surface in this plan is invisible: new pages `notFound()`, product pages render byte-identical to today, new API routes 404. **Exception: the admin additions (Stage D) work regardless of flag** — schedules must be seedable before cutover.
- The Acuity path (`BookingButton`, `BookingModalRoot`, `highlandfarms.as.me` links) is never modified — flag-on hides it on the two product pages via a server-side conditional; flag-off renders the exact existing JSX.
- Money is integer cents; server re-prices everything from `src/lib/booking/products.ts`; the browser never sends prices.
- Product slugs from any untrusted source pass through `z.enum` before `getBookingProduct` (standing parked ruling).
- Scarcity shown to users = real counts only ("2 seats left" from `remainingUnits`), shown only when 0 < remaining ≤ 3. Sold-out slots stay visible, disabled.
- Strict cancellation policy in all copy: all bookings final; the ONLY promise is the farm-initiated weather/animal-safety refund. The string "reschedul" must appear in no customer-visible string. **No em dashes in any email-rendered string** (house rule).
- Every new email send goes through the `sendOrThrow` pattern (Resend resolves `{error}` instead of rejecting).
- Every admin mutation writes a `booking_audit` row (actor `"admin"`) and is server-authorized via the existing `SHOP_ADMIN_TOKEN` mechanics (`tokenFromRequest`/`isValidToken` from `src/lib/shop/admin-auth.ts`).
- New tables/functions (none planned) would follow the RLS + revoke-PUBLIC rules; SQL edits re-apply via the Supabase Management API (`POST /v1/projects/qhaeqklgbfvviyedxbyl/database/query`, token at `~/.supabase/access-token`) — new-object/replace-function changes only.
- Gates per task: `npm test` green, `npx tsc --noEmit`, `npm run lint`, `npm run build` clean. UI tasks additionally verify with `node ~/claude-tools/mobile-preview/shot.mjs <url> [device]` on BOTH `iPhone 14 Pro` and `"Desktop Chrome"` (never `resize_window`).
- Local dev: `.env.local` has Supabase + Resend + CRON_SECRET but NO `SQUARE_*` and NO `GOOGLE_SA_*` — paid payment paths and Meet creation are guarded and fall back locally; the wedding-call (free) flow completes end-to-end locally.
- Commits end with the standing Co-Authored-By + Claude-Session trailer used in this repo.
- GTM container triggers for the new funnel events are NOT published in this phase (server MP already reports purchases; publishing client GA4 tags now would double-count later). dataLayer pushes ship in code; container work is a Phase 3 cutover item.

---

## Stage A — Engine hardening (the Phase 1 ride-alongs)

### Task 1: Advisory-lock key hardening (SQL re-apply)

**Files:**
- Modify: `supabase-booking.sql` (the `claim_booking_slots` function only)

**Interfaces:**
- Consumes: live function `claim_booking_slots(legs jsonb, booking jsonb)`
- Produces: same signature; lock key becomes timezone-GUC-independent

- [ ] **Step 1: Edit the lock key**

In `claim_booking_slots`, replace:

```sql
    perform pg_advisory_xact_lock(
      hashtext(leg.product_slug || '|' || leg.starts_at::text)
    );
```

with:

```sql
    -- Epoch, not ::text: timestamptz text rendering follows the session
    -- TimeZone GUC, so two sessions with different settings could lock
    -- different keys for the same instant. Epoch is canonical.
    perform pg_advisory_xact_lock(
      hashtext(leg.product_slug || '|' || extract(epoch from leg.starts_at)::text)
    );
```

- [ ] **Step 2: Re-apply the whole file** via the Management API (idempotent: `create or replace function`). Expect `[]`.

- [ ] **Step 3: Re-run the capacity-race probe** — the single-query `DO $$` block recorded in `scripts/booking-e2e.md` item 6's recipe (two claims on a capacity-1 `probe-test` slot; second must raise P0001; then a malformed leg must raise P0002; delete probe rows, confirm zero). Paste output in the report.

- [ ] **Step 4: Commit**

```bash
git add supabase-booking.sql
git commit -m "fix(booking): advisory lock key uses epoch, not tz-dependent text"
```

### Task 2: Availability correctness — horizon clamp, last-day bound, duration-driven combos

**Files:**
- Modify: `src/lib/booking/engine.ts` (`comboDays` signature)
- Modify: `src/lib/booking/store.ts` (`getScheduleData` upper bound)
- Modify: `src/app/api/booking/availability/route.ts` (horizon clamp + new `comboDays` call)
- Modify: `src/app/api/booking/checkout/route.ts` (buffer check reads durations from legs)
- Test: `scripts/booking-engine.test.mts`

**Interfaces:**
- Produces (changed): `comboDays(tour: DayAvailability[], spa: DayAvailability[], opts: { tourUnitsNeeded: number; spaUnitsNeeded: number; bufferMin: number; tourDurationMin: number; spaDurationMin: number }): { date: string; pairs: { tour: Slot; spa: Slot }[] }[]` — the 60/90 hardcodes are deleted; durations always flow from `BOOKING_PRODUCTS[..].durationMin`.

- [ ] **Step 1: Update the combo tests to the new signature and add a horizon-blind regression note**

In `scripts/booking-engine.test.mts`, change every `comboDays(tourDays, spaDays, 1, 2, 30)`-style call to:

```ts
  const combos = comboDays(tourDays, spaDays, {
    tourUnitsNeeded: 1,
    spaUnitsNeeded: 2,
    bufferMin: 30,
    tourDurationMin: BOOKING_PRODUCTS["farm-tour"].durationMin,
    spaDurationMin: BOOKING_PRODUCTS["nordic-spa"].durationMin,
  });
```

Add one new test proving durations drive the pairing:

```ts
test("engine: comboDays derives overlap from the provided durations", () => {
  const tourDays = [{ date: "2026-09-05", slots: [
    { startsAt: "2026-09-05T17:00:00.000Z", time: "10:00", capacity: 1, remainingUnits: 1 },
  ]}];
  const spaDays = [{ date: "2026-09-05", slots: [
    { startsAt: "2026-09-05T18:30:00.000Z", time: "11:30", capacity: 6, remainingUnits: 6 },
  ]}];
  // Tour 10:00 + 60min ends 11:00; spa 11:30 → gap 30 = OK at bufferMin 30.
  assert.equal(comboDays(tourDays, spaDays, {
    tourUnitsNeeded: 1, spaUnitsNeeded: 1, bufferMin: 30,
    tourDurationMin: 60, spaDurationMin: 90,
  })[0]?.pairs.length ?? 0, 1);
  // With a 90-min tour the same pair overlaps and disappears.
  assert.equal(comboDays(tourDays, spaDays, {
    tourUnitsNeeded: 1, spaUnitsNeeded: 1, bufferMin: 30,
    tourDurationMin: 90, spaDurationMin: 90,
  }).length, 0);
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → combo tests FAIL on the old signature.

- [ ] **Step 3: Implement**

`engine.ts` — replace `comboDays`'s parameter list and delete the constants:

```ts
export function comboDays(
  tour: DayAvailability[],
  spa: DayAvailability[],
  opts: {
    tourUnitsNeeded: number;
    spaUnitsNeeded: number;
    bufferMin: number;
    tourDurationMin: number;
    spaDurationMin: number;
  },
): { date: string; pairs: { tour: Slot; spa: Slot }[] }[] {
  const { tourUnitsNeeded, spaUnitsNeeded, bufferMin, tourDurationMin, spaDurationMin } = opts;
  const spaByDate = new Map(spa.map((d) => [d.date, d.slots]));
  const out: { date: string; pairs: { tour: Slot; spa: Slot }[] }[] = [];
  for (const day of tour) {
    const spaSlots = spaByDate.get(day.date) ?? [];
    const pairs: { tour: Slot; spa: Slot }[] = [];
    for (const t of day.slots) {
      if (t.remainingUnits < tourUnitsNeeded) continue;
      for (const s of spaSlots) {
        if (s.remainingUnits < spaUnitsNeeded) continue;
        const tStart = Date.parse(t.startsAt);
        const sStart = Date.parse(s.startsAt);
        const tourThenSpa = sStart - (tStart + tourDurationMin * 60000);
        const spaThenTour = tStart - (sStart + spaDurationMin * 60000);
        if (tourThenSpa >= bufferMin * 60000 || spaThenTour >= bufferMin * 60000) {
          pairs.push({ tour: t, spa: s });
        }
      }
    }
    if (pairs.length) out.push({ date: day.date, pairs });
  }
  return out;
}
```

`store.ts` — fix the bound and the comment (import `addDays` from `./time`):

```ts
      // One extra UTC day so a Pacific evening slot on `to` (which lands on
      // the NEXT UTC date) still has its booked units counted.
      .lte("starts_at", `${addDays(to, 1)}T23:59:59Z`)
```

`availability/route.ts` — clamp `hi` to the product horizon (after the existing 62-day clamp; combo uses the tighter of the two legs):

```ts
    const horizonDaysFor = (slugs: BookingSlug[]) =>
      Math.min(...slugs.map((s) => BOOKING_PRODUCTS[s].horizonDays));
    const horizonSlugs: BookingSlug[] =
      slug === "combo" ? ["farm-tour", "nordic-spa"] : [slug];
    const horizonCap = addDays(today, horizonDaysFor(horizonSlugs));
    const hiClamped = hi > horizonCap ? horizonCap : hi;
    if (hiClamped < lo) {
      return NextResponse.json({ days: [] }, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
      });
    }
```

(then use `hiClamped` everywhere `hi` was used below; import `BookingSlug` type from products). Update the combo call:

```ts
      const days = comboDays(tour, spa, {
        tourUnitsNeeded: unitsFor(BOOKING_PRODUCTS["farm-tour"], party),
        spaUnitsNeeded: unitsFor(BOOKING_PRODUCTS["nordic-spa"], party),
        bufferMin: COMBO.bufferMin,
        tourDurationMin: BOOKING_PRODUCTS["farm-tour"].durationMin,
        spaDurationMin: BOOKING_PRODUCTS["nordic-spa"].durationMin,
      });
```

`checkout/route.ts` — the combo buffer check drops its 60/90 literals; the legs already carry the durations:

```ts
    if (isCombo) {
      const [tourLeg, spaLeg] = legs;
      const t = Date.parse(tourLeg.startsAt);
      const s = Date.parse(spaLeg.startsAt);
      const ok =
        s - (t + tourLeg.durationMin * 60000) >= COMBO.bufferMin * 60000 ||
        t - (s + spaLeg.durationMin * 60000) >= COMBO.bufferMin * 60000;
      if (!ok) return bad("Those two times overlap. Leave at least 30 minutes between them.");
    }
```

(Note: `legs` is built in `legDefs` order — tour first for combo — so the destructure is safe; add a one-line comment saying so.)

- [ ] **Step 4: Gate** — `npm test` (all green incl. new test), `npx tsc --noEmit`, `npm run lint`, `npm run build`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/booking/engine.ts src/lib/booking/store.ts src/app/api/booking/availability/route.ts src/app/api/booking/checkout/route.ts scripts/booking-engine.test.mts
git commit -m "fix(booking): horizon clamp in availability, last-day UTC bound, duration-driven combos"
```

### Task 3: Checkout durability — confirm fallback, number-collision retry, free-consult event

**Files:**
- Modify: `src/lib/booking/store.ts`
- Modify: `src/app/api/booking/checkout/route.ts`

**Interfaces:**
- Produces: `forceConfirmBookings(ids, paymentId, giftCode, giftCents): Promise<void>` (direct table update fallback; throws on error); `auditBooking(action: string, bookingId: string | null, detail: Record<string, unknown>): Promise<void>` (best-effort `booking_audit` insert, actor `"system"`); `ClaimSlotsResult` gains `reason: "number_collision"`.

- [ ] **Step 1: store.ts additions**

Extend the claim error mapping (insert BEFORE the generic error branch):

```ts
  if (error?.code === "23505") {
    // booking_number unique collision (4-digit suffix); caller regenerates once.
    return { ok: false, reason: "number_collision", message: "" };
  }
```

and widen the type: `reason: "slot_full" | "number_collision" | "error"`.

Add:

```ts
/**
 * Direct-update fallback for confirm_bookings. Used only when the RPC throws
 * AFTER a successful charge: at that point the customer has paid, the pending
 * rows are on a 10-minute fuse before the sweep deletes them, and one more
 * RPC attempt is not a plan. Same effect as the RPC (gift stamped on the
 * first id only).
 */
export async function forceConfirmBookings(
  ids: string[],
  paymentId: string | null,
  giftCode: string | null,
  giftCents: number,
): Promise<void> {
  const supa = db();
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supa
      .from("bookings")
      .update({
        status: "confirmed",
        hold_expires_at: null,
        square_payment_id: paymentId,
        gift_certificate_code: i === 0 ? giftCode : null,
        gift_amount_cents: i === 0 ? giftCents : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ids[i])
      .eq("status", "pending");
    if (error) throw new Error(`forceConfirm failed on ${ids[i]}: ${error.message}`);
  }
}

/** Best-effort audit write. Never throws — auditing must not break a booking. */
export async function auditBooking(
  action: string,
  bookingId: string | null,
  detail: Record<string, unknown>,
): Promise<void> {
  const { error } = await db().from("booking_audit").insert({
    actor: "system",
    action,
    booking_id: bookingId,
    detail,
  });
  if (error) console.error("[booking] audit write failed:", action, error.message);
}
```

- [ ] **Step 2: checkout route — collision retry**

Wrap the claim in a two-attempt loop:

```ts
    let bookingNumber = generateBookingNumber();
    let claim = await claimSlots(legs, buildCustomer(bookingNumber));
    if (!claim.ok && claim.reason === "number_collision") {
      bookingNumber = generateBookingNumber();
      claim = await claimSlots(legs, buildCustomer(bookingNumber));
    }
    if (!claim.ok) {
      return bad(
        claim.message || "We couldn't confirm that time. Your card has not been charged.",
        claim.reason === "slot_full" ? 409 : 503,
      );
    }
```

where `buildCustomer` is a small local closure over `body` returning the existing `ClaimCustomer` object (extract the current inline object into it).

- [ ] **Step 3: checkout route — confirm durability**

Replace the confirm try/catch:

```ts
    try {
      await confirmBookings(claim.ids, paymentId, giftApplied > 0 ? giftCode : null, giftApplied);
    } catch {
      try {
        await forceConfirmBookings(claim.ids, paymentId, giftApplied > 0 ? giftCode : null, giftApplied);
        await auditBooking("confirm_rpc_failed_fallback_applied", claim.ids[0], {
          booking_number: bookingNumber, payment_id: paymentId, ids: claim.ids,
        });
      } catch (err2) {
        // Paid booking is now on the sweep's fuse. Loudest possible trace.
        console.error(
          `[booking] CRITICAL: confirm AND fallback failed. PAID booking pending deletion by sweep. booking=${bookingNumber} payment=${paymentId} ids=${claim.ids.join(",")}`,
          err2,
        );
        await auditBooking("confirm_failed_paid_booking_at_risk", claim.ids[0], {
          booking_number: bookingNumber, payment_id: paymentId, ids: claim.ids,
        });
      }
    }
```

- [ ] **Step 4: checkout route — free wedding-call server event**

Change the tracking gate so consults report a zero-value conversion (Acuity's webhook used to emit `book_wedding_call`; the wedding pipeline report reads it):

```ts
        const fresh = await claimTrackingEvent(`native_${bookingNumber}`, "purchase", "native-booking");
        const isConsult = body.product === "wedding-call";
        if (fresh && (dueCents > 0 || isConsult)) {
          await sendBookingPurchase({
            transaction_id: bookingNumber,
            value: dueCents / 100,
            ...
```

(`sendMetaPurchase` stays inside `dueCents > 0` — Meta skips value ≤ 0 anyway; guard it explicitly: wrap the Meta call in `if (dueCents > 0) { ... }`.)

- [ ] **Step 5: Gate + e2e note** — full gate clean; append to `scripts/booking-e2e.md` a new item 12 recipe: "collision retry" (insert a booking row with a known `booking_number`, temporarily monkey-can't — instead: verified by unit reasoning + the 23505 mapping; record as code-inspected) and item 13: free wedding-call books ⇒ GA4 event path taken (assert via dev-server log line; run with flag-on dev server, then clean up rows).

- [ ] **Step 6: Commit**

```bash
git add src/lib/booking/store.ts src/app/api/booking/checkout/route.ts scripts/booking-e2e.md
git commit -m "fix(booking): paid-confirm fallback + audit, number-collision retry, consult conversion event"
```

---

## Stage B — Public booking experience (flag-gated)

### Task 4: Booking client library

**Files:**
- Create: `src/lib/booking/client.ts`

**Interfaces:**
- Produces (all client-safe, no server imports):
  - `interface UiSlot { startsAt: string; time: string; capacity: number; remainingUnits: number }`
  - `interface UiDay { date: string; slots: UiSlot[] }`
  - `interface UiComboDay { date: string; pairs: { tour: UiSlot; spa: UiSlot }[] }`
  - `fetchAvailability(product: string, from: string, to: string, party: number): Promise<UiDay[]>`
  - `fetchComboAvailability(from: string, to: string, party: number): Promise<UiComboDay[]>`
  - `interface BookingSubmission { product: string; date: string; time: string; spaTime?: string; partySize: number; customer: { firstName: string; lastName: string; email: string; phone: string }; referralSource: string; policyAgreed: true; locationChoice?: "meet" | "in_person"; giftCode?: string; sourceId?: string }`
  - `submitBooking(payload: BookingSubmission): Promise<{ ok: true; bookingNumber: string; amountCents: number } | { ok: false; status: number; error: string }>` — manages the idempotency key internally: fresh key per logical attempt, **reused** when the server answered 402 with `reuseIdempotencyKey: true`, rotated otherwise.
  - `formatSlotTime(time: string): string` — `"13:00"` → `"1:00 PM"`.

- [ ] **Step 1: Implement**

```ts
"use client";

import { getClientAttribution } from "@/lib/attribution";

export interface UiSlot { startsAt: string; time: string; capacity: number; remainingUnits: number }
export interface UiDay { date: string; slots: UiSlot[] }
export interface UiComboDay { date: string; pairs: { tour: UiSlot; spa: UiSlot }[] }

export async function fetchAvailability(
  product: string, from: string, to: string, party: number,
): Promise<UiDay[]> {
  const res = await fetch(
    `/api/booking/availability?product=${product}&from=${from}&to=${to}&party=${party}`,
  );
  if (!res.ok) throw new Error("availability unavailable");
  return (await res.json()).days as UiDay[];
}

export async function fetchComboAvailability(
  from: string, to: string, party: number,
): Promise<UiComboDay[]> {
  const res = await fetch(
    `/api/booking/availability?product=combo&from=${from}&to=${to}&party=${party}`,
  );
  if (!res.ok) throw new Error("availability unavailable");
  return (await res.json()).days as UiComboDay[];
}

export interface BookingSubmission {
  product: string;
  date: string;
  time: string;
  spaTime?: string;
  partySize: number;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  referralSource: string;
  policyAgreed: true;
  locationChoice?: "meet" | "in_person";
  giftCode?: string;
  sourceId?: string;
}

let idempotencyKey: string | null = null;
let reuseKey = false;

export async function submitBooking(payload: BookingSubmission): Promise<
  { ok: true; bookingNumber: string; amountCents: number } | { ok: false; status: number; error: string }
> {
  if (!idempotencyKey || !reuseKey) idempotencyKey = crypto.randomUUID();
  reuseKey = false;

  const attribution = getClientAttribution();
  const cookies = typeof document === "undefined" ? "" : document.cookie;
  const fbp = cookies.match(/_fbp=([^;]+)/)?.[1];
  const fbc = cookies.match(/_fbc=([^;]+)/)?.[1];
  const gaCookie = cookies.match(/_ga=GA\d+\.\d+\.(.+?)(;|$)/)?.[1];

  const res = await fetch("/api/booking/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      idempotencyKey,
      attribution,
      clientId: gaCookie,
      fbp,
      fbc,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.success) {
    idempotencyKey = null;
    return { ok: true, bookingNumber: data.bookingNumber, amountCents: data.amountCents };
  }
  // 402 with reuseIdempotencyKey means Square's outcome is unknown: the SAME
  // key must be replayed so Square returns the original payment, never a
  // second charge. Any other failure rotates.
  reuseKey = res.status === 402 && data.reuseIdempotencyKey === true;
  return { ok: false, status: res.status, error: data.error ?? "Something went wrong. Please try again." };
}

export function formatSlotTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}:00 ${period}` : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
```

- [ ] **Step 2: Gate** — `npx tsc --noEmit && npm run lint` clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/booking/client.ts
git commit -m "feat(booking): client library — availability fetch + idempotency-aware submit"
```

### Task 5: BookingFlow — the on-page booking widget (tours + spa)

**Files:**
- Create: `src/components/booking/NativeBookingSection.tsx` (server)
- Create: `src/components/booking/BookingFlow.tsx` (client)
- Create: `src/components/booking/DatePicker.tsx` (client)
- Create: `src/components/booking/BookingPayment.tsx` (client)
- Modify: `src/app/farm-tours/page.tsx`, `src/app/nordic-spa/page.tsx` (flag-conditional mount only)

**Interfaces:**
- Consumes: Task 4 client lib; `ExpressPay` from `@/app/shop/checkout/ExpressPay` (props `{ payments, totalCents, disabled, onToken, onError }`); `Button` from `@/components/ui/Button`; `formatCents` from `@/lib/shop/money`; site tokens `forest`/`sage` per `Button.tsx`.
- Produces: `<NativeBookingSection product="farm-tour" | "nordic-spa" />` — renders nothing when the flag is off; `<BookingFlow product children copy>` used again by Tasks 6/7.

- [ ] **Step 1: `NativeBookingSection.tsx`** (server component — this is the ONLY thing product pages import):

```tsx
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { BookingFlow } from "./BookingFlow";

export function NativeBookingSection({ product }: { product: "farm-tour" | "nordic-spa" }) {
  if (!nativeCalendarEnabled()) return null;
  return (
    <section id="book" className="mx-auto max-w-2xl px-4 py-12">
      <BookingFlow product={product} />
    </section>
  );
}
```

- [ ] **Step 2: `DatePicker.tsx`** — a two-week strip with load-more, real scarcity, sold-out days visible:

```tsx
"use client";

import { useEffect, useState } from "react";
import { fetchAvailability, formatSlotTime, type UiDay, type UiSlot } from "@/lib/booking/client";

function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
}
function plusDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const DAY_LABEL = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC", weekday: "short", month: "short", day: "numeric",
});

export function DatePicker({
  product, party, selected, onSelect,
}: {
  product: string;
  party: number;
  selected: UiSlot | null;
  onSelect: (slot: UiSlot, date: string) => void;
}) {
  const [days, setDays] = useState<UiDay[]>([]);
  const [windowStart, setWindowStart] = useState(todayStr());
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let dead = false;
    setLoading(true);
    fetchAvailability(product, windowStart, plusDays(windowStart, 13), party)
      .then((d) => { if (!dead) { setDays(d); setError(false); } })
      .catch(() => { if (!dead) setError(true); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [product, party, windowStart]);

  if (error) {
    return <p className="text-sm text-red-700">We couldn&apos;t load the calendar. Refresh to try again, or call (971) 563-1921.</p>;
  }

  const openDay = days.find((d) => d.date === openDate);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const open = d.slots.some((s) => s.remainingUnits > 0);
          return (
            <button
              key={d.date}
              type="button"
              disabled={!open}
              onClick={() => setOpenDate(d.date)}
              className={`rounded-lg border px-1 py-2 text-center text-xs transition ${
                openDate === d.date
                  ? "border-forest bg-forest text-white"
                  : open
                    ? "border-forest/25 text-forest hover:border-forest/60"
                    : "border-stone-200 text-stone-300"
              }`}
            >
              <span className="block font-sans">{DAY_LABEL.format(new Date(`${d.date}T12:00:00Z`)).split(",")[0]}</span>
              <span className="block text-sm font-medium">{Number(d.date.slice(8))}</span>
              {!open && <span className="block text-[10px]">Booked</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between font-sans text-xs">
        <button type="button" className="text-forest underline disabled:text-stone-300"
          disabled={windowStart === todayStr()}
          onClick={() => setWindowStart(plusDays(windowStart, -14))}>Earlier</button>
        <button type="button" className="text-forest underline"
          onClick={() => setWindowStart(plusDays(windowStart, 14))}>Later dates</button>
      </div>
      {loading && <p className="mt-3 font-sans text-sm text-stone-500">Checking the calendar…</p>}
      {openDay && (
        <div className="mt-4 flex flex-wrap gap-2">
          {openDay.slots.map((s) => {
            const full = s.remainingUnits <= 0;
            const scarce = !full && s.remainingUnits <= 3 && s.capacity > 1;
            return (
              <button
                key={s.startsAt}
                type="button"
                disabled={full}
                onClick={() => onSelect(s, openDay.date)}
                className={`rounded-lg border px-3 py-2 font-sans text-sm ${
                  selected?.startsAt === s.startsAt
                    ? "border-forest bg-forest text-white"
                    : full
                      ? "border-stone-200 text-stone-300 line-through"
                      : "border-forest/30 text-forest hover:bg-forest/5"
                }`}
              >
                {formatSlotTime(s.time)}
                {scarce && <span className="ml-1.5 text-xs opacity-80">{s.remainingUnits} left</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `BookingPayment.tsx`** — Square card + wallets with a graceful "call the farm" fallback when Square env is absent (mirror `CheckoutBody`'s SDK bootstrap — read `src/app/shop/checkout/CheckoutBody.tsx` and copy its `payments()` init + card `attach` sequence verbatim, adapted to these props):

```tsx
"use client";

// Props contract (implement the body by mirroring CheckoutBody's Square init):
//   totalCents: number            — rebuild wallets on change (stale request = wrong amount)
//   disabled: boolean
//   onToken: (sourceId: string) => void   — card tokenize or wallet token
//   onError: (message: string) => void
// Renders: <ExpressPay .../> above a Square card container + a pay Button
// labeled `Pay ${formatCents(totalCents)}`.
// When NEXT_PUBLIC_SQUARE_APPLICATION_ID is absent: render the fallback
// paragraph "Online payment isn't available right now. Call or text (971)
// 563-1921 and we'll book you by phone." and never load the SDK.
```

The implementer writes this file by transplanting the working SDK code from `CheckoutBody.tsx` (script load, `window.Square.payments(appId, locationId)`, `card()` + `attach`, tokenize on submit) — that code is proven in production; do not re-derive it. `ExpressPay` is imported from `@/app/shop/checkout/ExpressPay` unchanged.

- [ ] **Step 4: `BookingFlow.tsx`** — the state machine:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatCents } from "@/lib/shop/money";
import { submitBooking, formatSlotTime, type UiSlot } from "@/lib/booking/client";
import { DatePicker } from "./DatePicker";
import { BookingPayment } from "./BookingPayment";

const PRICES: Record<string, number> = { "farm-tour": 7500, "nordic-spa": 7500, combo: 15000, "wedding-call": 0 };
const PARTY: Record<string, [number, number]> = { "farm-tour": [2, 6], "nordic-spa": [1, 6], combo: [2, 6], "wedding-call": [1, 2] };
const TITLES: Record<string, string> = {
  "farm-tour": "Book your private tour",
  "nordic-spa": "Reserve your spa session",
  combo: "Book a Full Farm Day",
  "wedding-call": "Schedule your wedding call",
};
const REFERRALS = ["Instagram", "TikTok", "Facebook", "Google", "Friend or word of mouth", "Airbnb", "Other"];

declare global { interface Window { dataLayer?: Record<string, unknown>[] } }
function push(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

export function BookingFlow({
  product,
  locationToggle = false,
}: {
  product: "farm-tour" | "nordic-spa" | "wedding-call";
  locationToggle?: boolean;
}) {
  const [slot, setSlot] = useState<UiSlot | null>(null);
  const [date, setDate] = useState<string>("");
  const [party, setParty] = useState(PARTY[product][0] === 2 ? 2 : PARTY[product][0]);
  const [first, setFirst] = useState(""); const [last, setLast] = useState("");
  const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
  const [referral, setReferral] = useState("");
  const [policy, setPolicy] = useState(false);
  const [location, setLocation] = useState<"meet" | "in_person">("meet");
  const [giftCode, setGiftCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ bookingNumber: string; amountCents: number } | null>(null);

  const totalCents = PRICES[product] * party;
  const isFree = totalCents === 0;
  const [min, max] = PARTY[product];
  const detailsComplete = Boolean(
    slot && first.trim() && last.trim() && /.+@.+\..+/.test(email) && phone.trim().length >= 7 && referral && policy,
  );

  useEffect(() => push("booking_view_item", { booking_product: product }), [product]);

  async function submit(sourceId?: string) {
    if (!slot || submitting) return;
    setSubmitting(true);
    setError("");
    push("booking_begin_checkout", { booking_product: product, value: totalCents / 100 });
    const result = await submitBooking({
      product, date, time: slot.time, partySize: party,
      customer: { firstName: first.trim(), lastName: last.trim(), email: email.trim(), phone: phone.trim() },
      referralSource: referral, policyAgreed: true,
      locationChoice: locationToggle ? location : undefined,
      giftCode: giftCode.trim() || undefined,
      sourceId,
    });
    setSubmitting(false);
    if (result.ok) {
      push("booking_purchase", {
        booking_product: product, value: result.amountCents / 100,
        transaction_id: result.bookingNumber, event_id: `native_${result.bookingNumber}`,
      });
      setDone(result);
    } else {
      setError(result.error);
      if (result.status === 409) setSlot(null); // slot gone: back to the calendar
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-forest/20 bg-sage/10 p-6 text-center">
        <h3 className="text-2xl text-forest">You&apos;re booked.</h3>
        <p className="mt-2 font-sans text-sm text-stone-700">
          Booking <strong>{done.bookingNumber}</strong>. A confirmation is on its way to {email}.
        </p>
        <p className="mt-2 font-sans text-sm text-stone-700">
          We&apos;re in Brightwood at the base of Mt. Hood, about 50 minutes from Portland.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-forest/15 p-5 sm:p-7">
      <h3 className="text-2xl text-forest">{TITLES[product]}</h3>
      <p className="mt-1 font-sans text-sm text-stone-600">
        {isFree ? "Free. 45 minutes with our events team." : `No fees. $75 per person. That's it.`}
      </p>

      <div className="mt-5">
        <DatePicker product={product} party={party}
          selected={slot}
          onSelect={(s, d) => { setSlot(s); setDate(d); push("booking_select_time", { booking_product: product, slot: s.time, date: d }); }} />
      </div>

      {slot && max > 1 && (
        <div className="mt-5 flex items-center gap-4">
          <span className="font-sans text-sm text-stone-700">Guests</span>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Fewer guests" onClick={() => setParty(Math.max(min, party - 1))}
              className="h-9 w-9 rounded-full border border-forest/30 text-forest">−</button>
            <span className="w-6 text-center font-sans">{party}</span>
            <button type="button" aria-label="More guests" onClick={() => setParty(Math.min(max, party + 1))}
              className="h-9 w-9 rounded-full border border-forest/30 text-forest">+</button>
          </div>
          {!isFree && <span className="ml-auto font-sans text-sm text-stone-700">Total <strong>{formatCents(totalCents)}</strong></span>}
        </div>
      )}

      {slot && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className="rounded-lg border border-stone-300 px-3 py-2.5 font-sans text-sm" placeholder="First name"
            autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} />
          <input className="rounded-lg border border-stone-300 px-3 py-2.5 font-sans text-sm" placeholder="Last name"
            autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)} />
          <input className="rounded-lg border border-stone-300 px-3 py-2.5 font-sans text-sm" placeholder="Email" type="email"
            autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="rounded-lg border border-stone-300 px-3 py-2.5 font-sans text-sm" placeholder="Phone" type="tel"
            autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <select className="rounded-lg border border-stone-300 px-3 py-2.5 font-sans text-sm sm:col-span-2"
            value={referral} onChange={(e) => setReferral(e.target.value)}>
            <option value="">How did you hear about us?</option>
            {REFERRALS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {locationToggle && (
            <div className="flex gap-2 sm:col-span-2">
              {([["meet", "Google Meet video call"], ["in_person", "In person at the farm"]] as const).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setLocation(v)}
                  className={`flex-1 rounded-lg border px-3 py-2.5 font-sans text-sm ${location === v ? "border-forest bg-forest text-white" : "border-forest/30 text-forest"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {!isFree && (
            <input className="rounded-lg border border-stone-300 px-3 py-2.5 font-sans text-sm sm:col-span-2"
              placeholder="Gift certificate code (optional)" value={giftCode} onChange={(e) => setGiftCode(e.target.value)} />
          )}
          <label className="flex items-start gap-2.5 font-sans text-xs text-stone-600 sm:col-span-2">
            <input type="checkbox" className="mt-0.5" checked={policy} onChange={(e) => setPolicy(e.target.checked)} />
            <span>
              I understand all bookings are final: no refunds, credits, or transfers, including no-shows.
              If Highland Farms cancels for weather or animal safety, I get a full refund or first pick of new dates.
            </span>
          </label>
        </div>
      )}

      {error && <p className="mt-4 font-sans text-sm text-red-700">{error}</p>}

      {slot && isFree && (
        <Button className="mt-5 w-full" onClick={() => detailsComplete && submit()} type="button">
          {submitting ? "Booking…" : `Book ${formatSlotTime(slot.time)}`}
        </Button>
      )}
      {slot && !isFree && detailsComplete && (
        <div className="mt-5">
          <BookingPayment totalCents={totalCents} disabled={submitting}
            onToken={(sourceId) => submit(sourceId)} onError={(m) => setError(m)} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Mount on the product pages.** In `src/app/farm-tours/page.tsx` and `src/app/nordic-spa/page.tsx`, import `nativeCalendarEnabled` + `NativeBookingSection`. Directly above each page's PRIMARY pricing-card `BookingButton` (farm-tours line ~142; nordic-spa's equivalent), change nothing structural — add:

```tsx
        <NativeBookingSection product="farm-tour" />
```

and wrap ONLY the primary Acuity `BookingButton` instance(s) in `{!nativeCalendarEnabled() && (…existing JSX unchanged…)}`. Flag off ⇒ `NativeBookingSection` returns null and the conditional renders the identical existing JSX; verify with Step 6.

- [ ] **Step 6: Byte-identical proof.** Build twice and diff the rendered pages: with the flag unset, `curl` the local prod-server output of `/farm-tours` and `/nordic-spa` before this task's commit and after, and `diff` the HTML (ignore the build-id line). Must be identical apart from build hashes. Record in the report.

- [ ] **Step 7: Gate + visual check** — full gate; then flag-on dev server and `node ~/claude-tools/mobile-preview/shot.mjs http://localhost:3000/farm-tours "iPhone 14 Pro" --full` + `"Desktop Chrome"`; eyeball the widget renders sanely (full design pass is Task 10).

- [ ] **Step 8: Commit**

```bash
git add src/components/booking/ src/app/farm-tours/page.tsx src/app/nordic-spa/page.tsx
git commit -m "feat(booking): on-page BookingFlow for tours + spa behind flag"
```

### Task 6: Full Farm Day (combo) flow

**Files:**
- Create: `src/components/booking/ComboPicker.tsx`
- Modify: `src/components/booking/BookingFlow.tsx` (combo mode), `src/lib/booking/client.ts` (move `todayStr`/`plusDays` here from `DatePicker` and export them — both pickers need them), `src/components/booking/DatePicker.tsx` (import the moved helpers), `src/components/booking/NativeBookingSection.tsx` (render the combo entry under the single-product flow)

**Interfaces:**
- Consumes: `fetchComboAvailability`, `submitBooking` (product `"combo"`, `time` = tour leg, `spaTime` = spa leg), `BookingPayment`, `formatSlotTime`.
- Produces: `<ComboFlow />` — collapsed CTA "Make it a Full Farm Day: tour + spa, $150 per person" that expands into a date list of valid pairs.

- [ ] **Step 1: Implement `ComboFlow.tsx`** — same contact/payment sections as `BookingFlow` (extract them? No: `BookingFlow` gains an optional `comboPair` mode instead of a new near-duplicate — CHOSEN APPROACH: extend `BookingFlow` with `product: "combo"` support):
  - In `BookingFlow.tsx`, when `product === "combo"`: replace `DatePicker` with a `ComboPicker` (new small component in the same file or `ComboPicker.tsx`): fetches `fetchComboAvailability(todayStr(), +13d, party)`, renders days, and each day's pairs as buttons labeled `"${formatSlotTime(pair.tour.time)} tour + ${formatSlotTime(pair.spa.time)} spa"`; selection stores `{ date, time: pair.tour.time, spaTime: pair.spa.time }`; scarcity badge when the spa leg has ≤3 seats. Party changes refetch (pairs depend on units).
  - `submitBooking` payload includes `spaTime`.
  - `NativeBookingSection` renders, under the primary flow: `product === "farm-tour" || product === "nordic-spa"` ⇒ a `<details>`-style expander mounting `<BookingFlow product="combo" />` titled "Make it a Full Farm Day". Same section, no new page.
- [ ] **Step 2: dataLayer** — the existing pushes fire with `booking_product: "combo"` for free.
- [ ] **Step 3: Gate + shots** (both devices, expander open).
- [ ] **Step 4: Commit** — `feat(booking): Full Farm Day combo picker`.

### Task 7: Wedding-call page (Calendly-style)

**Files:**
- Create: `src/app/wedding-call/page.tsx`

**Interfaces:**
- Consumes: `nativeCalendarEnabled`, `BookingFlow` with `product="wedding-call"` + `locationToggle`.

- [ ] **Step 1: Implement**

```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Schedule a Wedding Call | Highland Farms",
  description:
    "Pick a time for a free 45-minute wedding call with our events team. Google Meet or in person at the farm in Brightwood, Oregon.",
};

export default function WeddingCallPage() {
  if (!nativeCalendarEnabled()) notFound();
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <p className="font-sans text-xs uppercase tracking-[0.28em] text-forest/70">Weddings at Highland Farms</p>
        <h1 className="mt-3 text-4xl text-forest">Let&apos;s talk about your wedding.</h1>
        <p className="mt-3 font-sans text-stone-600">
          A free 45-minute call with our events team: your date, your guest count,
          and whether William Wallace Lodge is the right fit. Video call on Google
          Meet, or come walk the property with us.
        </p>
        <div className="mt-8">
          <BookingFlow product="wedding-call" locationToggle />
        </div>
      </div>
    </Container>
  );
}
```

(Adjust `Container` usage to its actual props if they differ — check `src/components/ui/Container.tsx`.)

- [ ] **Step 2: Local end-to-end** — flag-on dev server (Resend key set to `disabled-for-e2e`), seed a wedding-call schedule row, complete the flow in the rendered page via a Playwright-driven pass or manual curl of the same payload the UI produces; verify a `confirmed` row with `location_choice` set; clean up rows + seeds.
- [ ] **Step 3: Gate + shots** (both devices).
- [ ] **Step 4: Commit** — `feat(booking): wedding-call scheduling page`.

### Task 8: Gift certificates — purchase page + issuance

**Files:**
- Create: `src/app/gift-certificates/page.tsx` + `src/app/gift-certificates/GiftBody.tsx` (client)
- Create: `src/app/api/booking/gift/checkout/route.ts`
- Create: `src/lib/booking/gift.ts` (products + code generation + issuance)
- Create: `src/lib/booking/gift-email.ts`
- Modify: `src/lib/booking/store.ts` (add `insertGiftCertificate`)

**Interfaces:**
- Produces:
  - `GIFT_PRODUCTS` in `gift.ts`: `[{ id: "tour-for-two", name: "Farm Tour for Two", amountCents: 15000, kind: "value", productScope: "farm-tour", units: 15000 }, { id: "spa-for-two", name: "Nordic Spa for Two", amountCents: 20000, kind: "value", productScope: "nordic-spa", units: 20000 }, { id: "spa-3-visit", name: "Spa 3-Visit Pack", amountCents: 19900, kind: "visits", productScope: "nordic-spa", units: 3 }]`
  - `generateGiftCode(): string` — `HFGC-XXXX-XXXX` from alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L)
  - `store.insertGiftCertificate(row): Promise<void>` — throws on error; caller retries once on 23505 (code collision) with a fresh code
  - `POST /api/booking/gift/checkout` — `{ productId, idempotencyKey, sourceId, purchaser: {name, email}, recipientEmail?, message?, website? }` → `{ success, code }`; flag off ⇒ 404; origin/rate/honeypot copied from the booking checkout; server prices from `GIFT_PRODUCTS`; charge via `chargeCard` (same idempotency contract, `reuseIdempotencyKey` on unknown); on success insert cert (status active, `square_payment_id`), then `after()` email the code (to recipient if given, else purchaser; purchaser always gets a receipt copy) via `sendOrThrow`-patterned `gift-email.ts`.
- Email copy rules: no em dashes, no expiry claimed (certs don't expire), physical address footer, plain warm voice ("A gift from {purchaser name}" + the code + "book at highlandfarmsoregon.com" + how to redeem).

- [ ] **Step 1: `gift.ts` + store fn** (write in full: products const, code gen with `crypto.randomInt`, `issueGiftCertificate({product, purchaserEmail, recipientEmail, paymentId})` that generates, inserts, retries once on 23505, returns the code).
- [ ] **Step 2: Route** — mirror the booking checkout's guard stack; charge exact `amountCents` for the zod-enum'd `productId`; no capacity claims involved.
- [ ] **Step 3: `GiftBody.tsx` page UI** — three cards (name, price, one-line what-it's-for), purchaser fields, optional recipient email + short message (max 280), `BookingPayment` reuse for the charge, success panel showing the code with "we've emailed it too". `page.tsx` is a thin server wrapper: `if (!nativeCalendarEnabled()) notFound();`.
- [ ] **Step 4: e2e additions** to `scripts/booking-e2e.md`: gift purchase with Square unconfigured → 503 (no cert row inserted); honeypot fake-success; (paid-path verification joins the Phase 3 real-charge test).
- [ ] **Step 5: Gate + shots both devices. Commit** — `feat(booking): gift certificate purchase + issuance`.

### Task 9: dataLayer completeness pass

**Files:**
- Modify: `src/components/booking/BookingFlow.tsx`, `DatePicker.tsx` (only if events below are missing after Tasks 5–8)

- [ ] **Step 1:** Verify (grep) the full event set fires exactly once per action across all flows: `booking_view_item` (section mount), `booking_select_time` (slot/pair pick), `booking_begin_checkout` (submit pressed / payment tokenize started), `booking_purchase` (success, with `transaction_id` + `event_id: native_<bookingNumber>`). Add `booking_select_date` on day-open in `DatePicker` (`push("booking_select_date", { booking_product: product, date: d.date })` — pass `product` into `DatePicker` props if not already). Gift flow: `gift_view`, `gift_purchase` with `value`.
- [ ] **Step 2:** Add a comment block at the top of `BookingFlow.tsx`:

```ts
// GTM NOTE: these events have NO container triggers yet, deliberately. The
// server (checkout route) already sends GA4 MP + Meta CAPI purchases; binding
// a GA4 purchase tag to booking_purchase without deduplication would double
// count revenue. Container work happens at Phase 3 cutover.
```

- [ ] **Step 3:** Gate. Commit — `feat(booking): complete client funnel events (no GTM triggers yet)`.

### Task 10: Visual + interaction QA pass (mobile first)

**Files:**
- Create: `scripts/booking-ui-smoke.md` (findings + screenshot index)
- Modify: whatever the pass finds (booking components only)

- [ ] **Step 1:** Flag-on dev server. Capture with the device-emulation tool (NEVER `resize_window`): `/farm-tours` (widget idle, day open, slot picked, details filled), `/nordic-spa` (incl. a scarce "2 left" state — seed a spa session with 4 booked units to force it, clean up after), combo expander open, `/wedding-call`, `/gift-certificates` — each on `iPhone 14 Pro` AND `"Desktop Chrome"`; `--full` where the page scrolls.
- [ ] **Step 2:** Review every shot against: thumb-reachable primary actions, no horizontal scroll, legible scarcity badges, policy checkbox tappable, error states readable, widget doesn't fight the page's existing hero/pricing sections. Fix what fails (components only; product-page structure untouched). Re-shoot after fixes.
- [ ] **Step 3:** Complete one full wedding-call booking through the real rendered mobile-size page (free path works locally); verify the confirmed row + clean up.
- [ ] **Step 4:** Write `scripts/booking-ui-smoke.md` (what was checked, what was fixed, screenshot filenames in the scratchpad). Full gate. Commit — `fix(booking): mobile-first QA pass on booking surfaces`.

---

## Stage C — Wedding-call Google Meet

### Task 11: Google Calendar + Meet integration (graceful fallback)

**Files:**
- Create: `src/lib/booking/google-calendar.ts`
- Create: `src/lib/booking/ics.ts`
- Modify: `src/app/api/booking/checkout/route.ts` (consult post-confirm hook)
- Modify: `src/lib/booking/confirmation-email.ts` (`meetLink?: string` + ICS attachment)
- Modify: `src/lib/booking/store.ts` (`setBookingCalendarInfo(id, eventId, meetLink)`)

**Interfaces:**
- Produces:
  - `isCalendarConfigured(): boolean` — `GOOGLE_SA_EMAIL` + `GOOGLE_SA_PRIVATE_KEY` present
  - `createWeddingCallEvent(opts: { startIso: string; durationMin: number; guestEmail: string; guestName: string; locationChoice: "meet" | "in_person"; bookingNumber: string }): Promise<{ eventId: string; meetLink: string | null } | null>` — never throws; null on any failure (logged)
  - `buildIcs(opts: { uid: string; startIso: string; durationMin: number; summary: string; description: string; location: string }): string`
  - `BookingEmailData` gains `meetLink?: string | null`

- [ ] **Step 1: `google-calendar.ts`** — JWT auth WITHOUT an SDK, mirroring the signing approach in `src/lib/ga4-data.ts` (read it first; reuse its RS256 sign helper pattern), with two differences: scope `https://www.googleapis.com/auth/calendar.events` and **`sub: "events@highlandfarms-oregon.com"`** in the JWT claims (domain-wide delegation impersonation — a service account's own calendar cannot create Meet links). Token exchange at `https://oauth2.googleapis.com/token`, then:
  - `POST https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all` with body: summary `"Wedding Call: {guestName} + Highland Farms"`, start/end from `startIso`+`durationMin` (timeZone America/Los_Angeles), attendees `[{email: guestEmail}]`, description including the booking number, and — only when `locationChoice === "meet"` — `conferenceData: { createRequest: { requestId: bookingNumber, conferenceSolutionKey: { type: "hangoutsMeet" } } }`; when in_person, `location: "Highland Farms, Brightwood, OR"` instead.
  - Return `{ eventId, meetLink: hangoutLink ?? null }`; any non-2xx or thrown error → `console.error("[booking] calendar event failed", bookingNumber, …)` and return null.
- [ ] **Step 2: `ics.ts`** — pure string builder (VCALENDAR/VEVENT, UTC DTSTART/DTEND, escaped text, `UID: {uid}@highlandfarmsoregon.com`). Test in `scripts/booking-engine.test.mts`: correct DTSTART for a known instant, CRLF line endings, escaped comma in description.
- [ ] **Step 3: checkout wiring** — in the `after()` block, before emails, for consult bookings: `if (body.product === "wedding-call" && isCalendarConfigured()) { const ev = await createWeddingCallEvent(...); if (ev) { await setBookingCalendarInfo(claim.ids[0], ev.eventId, ev.meetLink); emailData.meetLink = ev.meetLink; } }`. Email render: when `meetLink` present, a "Join on Google Meet" link line; when consult + no link + meet chosen, the line "We'll email your Google Meet link before the call." (a real promise the events team keeps — flag it in the farm notification email: "MEET LINK NEEDED" when creation failed or wasn't configured). Attach the ICS to the customer email for ALL products (`attachments: [{ filename: "highland-farms.ics", content: Buffer.from(buildIcs(...)).toString("base64") }]` per Resend's attachment shape — verify against the resend package types in node_modules before writing).
- [ ] **Step 4: DWD live probe** — with Vercel's `GOOGLE_SA_EMAIL`/`GOOGLE_SA_PRIVATE_KEY` (pull via `vercel env` if linked, else run this step against prod-like env and note if locally impossible): attempt one real `createWeddingCallEvent` for a synthetic slot on the events@ calendar; if it succeeds, delete the event and record success. If it fails with `unauthorized_client`/403: record VERBATIM the pending manual step — "In admin.google.com (highlandfarms-oregon.com) → Security → API Controls → Domain-wide delegation: authorize the service account's client ID with scope https://www.googleapis.com/auth/calendar.events" — in the report AND in `memory`-bound notes for the controller. The fallback path ships either way; DO NOT block the task on the grant.
- [ ] **Step 5:** Gate (incl. new ICS tests). Commit — `feat(booking): Google Meet for wedding calls + ICS attachments, fallback-safe`.

---

## Stage D — Admin calendar (NOT flag-gated)

### Task 12: Admin booking APIs + Square refunds

**Files:**
- Modify: `src/lib/shop/square.ts` (add `refundPayment`)
- Modify: `src/lib/booking/store.ts` (admin queries)
- Create: `src/app/api/shop/admin/booking/route.ts` (GET bookings + blackouts + schedules for a range)
- Create: `src/app/api/shop/admin/booking/blackouts/route.ts` (POST create / DELETE remove)
- Create: `src/app/api/shop/admin/booking/schedules/route.ts` (POST upsert / DELETE remove)
- Create: `src/app/api/shop/admin/booking/manual/route.ts` (POST manual booking)
- Create: `src/app/api/shop/admin/booking/cancel/route.ts` (POST cancel + optional refund)
- Create: `src/app/api/shop/admin/booking/certs/route.ts` (GET lookup / POST issue / POST void)

**Interfaces:**
- Every route: `tokenFromRequest` + `isValidToken` else 401 (exact pattern of `src/app/api/shop/admin/inventory/route.ts` — read it and mirror). Every mutation writes `booking_audit` with actor `"admin"` and a detail payload naming what changed. **No flag gating.**
- `refundPayment({ paymentId, amountCents, idempotencyKey, reason }): Promise<{ ok: boolean; refundId?: string; error?: string }>` — `POST https://connect.squareup.com/v2/refunds` with `{ idempotency_key, payment_id, amount_money: { amount, currency: "USD" }, reason }`, same auth/config helpers as `chargeCard`.
- store additions (service-role, typed rows): `listBookingsRange(fromIso, toIso)` (all statuses, ordered by starts_at), `cancelBooking(id)` (`status='cancelled'`, only from confirmed), `insertBlackout/deleteBlackout`, `listSchedules/upsertScheduleRule/deleteScheduleRule` (upsert = insert new row; editing = delete + insert; the engine's latest-effectiveFrom rule handles overlaps), `lookupGiftCertificate(code)`, `voidGiftCertificate(code)`.
- Cancel route semantics (STRICT policy — these are FARM-initiated cancels only): body `{ id, refund: boolean, reason: string }`; sets cancelled (freeing capacity implicitly — only pending/confirmed count), refunds `amount_cents - gift_amount_cents` via `refundPayment` when `refund && square_payment_id` (idempotency key `refund_{bookingId}`), restores gift units to the cert when one was used (`restore_gift_certificate`), emails the guest ("We had to cancel… full refund is on its way / your gift certificate has been restored. First pick of new dates is yours: call or reply."; no em dashes; via `sendOrThrow` pattern), audits with the reason.
- Manual booking route: `{ product, date, time, partySize, customer{...}, note }` — validates via `slotCapacity` + `claimSlots` (capacity respected, `source: 'admin'` — pass through a widened `ClaimCustomer`/booking jsonb `source` field, already supported by the SQL), immediately `confirmBookings(ids, null, null, 0)`; `amount_cents` recorded from server pricing but NO charge (phone bookings pay on site); referral `"phone"`.

- [ ] **Step 1:** `refundPayment` + store additions (full code, mirroring existing patterns; `listBookingsRange` selects the columns the UI needs incl. customer fields + status + product + party + amount + gift + payment id).
- [ ] **Step 2:** Routes (full code each; zod-validate every body; product via `z.enum(["farm-tour","nordic-spa","wedding-call"])`).
- [ ] **Step 3:** e2e additions to `scripts/booking-e2e.md`: every admin route 401 without token; blackout create → availability route hides the day → delete restores it; manual booking respects capacity (second manual on a full slot → 409-equivalent error); cert issue → lookup → void → redeemGiftCertificate returns null on the voided code. Run against flag-ON dev server + live DB with cleanup (schedules/blackouts/bookings/certs), record outputs.
- [ ] **Step 4:** Gate. Commit — `feat(booking): admin booking APIs — blackouts, schedules, manual, cancel+refund, certs`.

### Task 13: Admin calendar UI

**Files:**
- Modify: `src/app/shop/admin/AdminBody.tsx` (Tab union + tab bar + render)
- Create: `src/app/shop/admin/CalendarTab.tsx`
- Create: `src/app/shop/admin/SchedulesTab.tsx`
- Create: `src/app/shop/admin/CertsTab.tsx`

**Interfaces:**
- `type Tab = "stock" | "count" | "orders" | "square" | "calendar" | "schedules" | "certs"` — tab bar labels: `Calendar`, `Schedules`, `Gift certs` appended after `Square link`.
- New tabs are self-fetching client components (they call the Task 12 GET/POST routes with `credentials: "include"` — the admin cookie authorizes; on 401 they render the "session expired, reload with your admin link" line). They take only `{ token }: { token: string }` if the existing tabs pass a token prop — mirror how `CountSheet.tsx` authorizes its POSTs and do the same.
- `CalendarTab`: week navigation (prev/this/next), bookings grouped by Pacific day (time, product, name, party, amount, status chip, phone/email), per-booking **two-step inline cancel** (button → "Refund $X and cancel? [Confirm cancel] [Keep]" — never `window.confirm`, it blocks headless drivers), blackout bar at top: date-range picker + kind select (`wedding` preselected, one-tap "Wedding" chip) + note + Add; existing blackouts listed with remove. A "Phone booking" button opens an inline `ManualBookingForm` (product select, date+time text inputs validated server-side, party, name/email/phone, note).
- `SchedulesTab`: per product (tabs or sections for farm-tour / nordic-spa / wedding-call): current rules table (weekday, times, capacity, effective range) from the GET; add-rule form (weekday select, comma-separated `HH:MM` times validated client-side by `/^\d{2}:\d{2}$/` each, capacity, effective-from defaulting today); delete per row. Copy hint under the form: "New rules take effect from their start date. The newest rule for a weekday wins."
- `CertsTab`: issue form (product select from the three gift products + free-form value cert with cents + scope; purchaser email), result shows the generated code; lookup by code (kind, remaining, status, purchaser); void with two-step confirm.

- [ ] **Step 1:** Extend `AdminBody.tsx` (minimal diff: union, labels array, three render lines).
- [ ] **Step 2:** Implement the three tab components in full.
- [ ] **Step 3:** Browser verification on the flag-agnostic admin: dev server (flag can be off — proves admin independence), token cookie set, walk: create a schedule rule → see it in `SchedulesTab` → blackout a Saturday → `CalendarTab` shows it → manual booking on an open slot → appears in the week view → cancel it (no refund — no payment) → status flips → issue a cert → look it up → void it. Clean everything up (rows + audit rows may stay; they're the point). Shots on `"Desktop Chrome"` AND `iPhone 14 Pro` (Jalene uses a phone).
- [ ] **Step 4:** Gate. Commit — `feat(booking): admin calendar, schedules, and gift-cert tabs`.

### Task 14: Docs, final gate, and cutover-readiness notes

**Files:**
- Modify: `ARCHITECTURE.md` (Booking section: admin surface, gift certs, calendar integration, audit rule; add: "Admin booking screens are NOT flag-gated by design")
- Modify: `CLAUDE.md` (new routes/pages/libs in Key Paths; `GOOGLE_SA_*` note for Meet; Phase 2 plan pointer)
- Modify: `scripts/booking-e2e.md` (fold in the Stage B/C/D verification items as the standing cutover matrix, renumbered)
- Modify: `public/llms.txt` — NO change yet (pages 404 while flagged off); add instead a comment line in the task report that llms.txt + sitemap + GTM + GBP links are Phase 3 items.

- [ ] **Step 1:** Doc edits per above (verbatim rules stay; add the new rules: "7. Every admin mutation writes booking_audit." and "8. Meet-link creation is best-effort; a wedding-call booking NEVER fails on calendar errors.").
- [ ] **Step 2:** Full gate: `npm test && npm run lint && npm run build`; plus the flag-off byte-identical re-proof of `/farm-tours` + `/nordic-spa` from Task 5 Step 6 (re-run now that all stages are in).
- [ ] **Step 3:** Commit — `docs(booking): Phase 2 architecture + cutover matrix consolidation`. Push branch; PR body mirrors PR #19's framing (flag-off-safe, admin additive) and lists the Phase 3 remainder: Acuity config scrape + Jalene schedule confirmation, historical archive + 191-appointment import, gift-cert balance export/import (normalize code case!), daily-report rewrite, GTM container work, sitemap/llms.txt/GBP updates, RwG withdrawal, flag flip, Acuity cancellation.

---

### Task 15: Handoff email to Jalene + Connor (AFTER the Phase 2 PR merges and prod is verified)

> **Controller-level step, not a subagent dispatch.** Hayden pre-authorized this email on 2026-08-27 ("If it goes live please email her and Connor details of what went live and detailed instructions of how to use it") — recipients and content are specified, so send without re-asking once the preconditions hold. Nothing customer-facing goes live in Phase 2; what "goes live" for the farm is the ADMIN surface.

**Preconditions (all three, verified, before sending):**
1. The Phase 2 PR is merged and deployed.
2. `https://admin.highlandfarmsoregon.com` serves the new Calendar / Schedules / Gift certs tabs in production (verify by loading it with the token).
3. The e2e admin walk (Task 13 Step 3) has been re-run once against PROD (create + delete a test blackout; nothing else).

**Send:** via the Gmail API as Hayden (`gmail_send.py`, per `shared/gmail-api.md`), To: `Jalene@highlandfarms-oregon.com`, Cc: `mcwilliamscc2@gmail.com` (Connor).

**Content requirements (apply the email-voice rules — no em dashes, contractions, plain sentences, no corporate sign-off):**
- What went live: new tabs in the farm-store admin they already use — Calendar, Schedules, Gift certs — reachable at the same admin link (include the `?token=` link, same as the 2026-08-26 farm-store email precedent).
- What did NOT change: guest booking still runs through Acuity today; the new booking system takes over later, and nothing they do in these tabs affects guests until then — EXCEPT that schedules they enter now are exactly what the new system will sell when it flips on, which is why we need them filled in.
- The ask: enter the real weekly schedule for tours and the spa (days, start times, seats) in the Schedules tab, and block out every booked wedding date in the Calendar tab.
- Instructions, step by step, one short numbered list per tab: Schedules (add a rule: weekday, times, capacity; newest rule for a weekday wins), Calendar (week view; add a wedding or closure block; phone bookings via the Phone booking button; cancel with the two-step confirm — refunds go back to the guest's card automatically), Gift certs (issue, look up, void).
- One question for Jalene, carried from the spec's open items: for the Spa 3-Visit Pack, is one credit one person for one session? (Needed before old certificates are imported.)
- Plain close, no signature block beyond Hayden's name.

**After sending:** record the message id in the task report and update `memory/highland-farms/` (pending-manual-tasks: schedules + wedding blackouts entry by Jalene; the 3-Visit Pack answer).

---

## Deferred to Phase 3 (do NOT build here)
Acuity data migration and archive, schedule scrape + Jalene confirmation, daily-report rewrite, GTM trigger publication, sitemap/llms.txt entries, pointing site nav/GBP at `/wedding-call`, flag flip, straggler webhook window, Acuity cancellation, and the one real card charge end-to-end (also covers the farm store's open item).
