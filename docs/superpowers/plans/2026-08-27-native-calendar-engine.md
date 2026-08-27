# Native Calendar Engine (Phase 1 of 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the native scheduling engine — schema, availability computation, transactional slot claims, Square-charged booking checkout, confirmation emails, reminders — fully working behind `NEXT_PUBLIC_NATIVE_CALENDAR` with the live site unchanged.

**Architecture:** Pure-function availability engine (`src/lib/booking/engine.ts`) over DB-held schedules/blackouts/bookings in Supabase; capacity claimed by a transactional RPC *before* Square charges (exact shop pattern); everything flag-gated so routes 404 and no UI changes ship while off. Phase 2 (UX, wedding-call Meet links, admin calendar, gift-cert purchase pages) and Phase 3 (Acuity import + cutover) are separate plans built on these interfaces.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (service-role only), Square REST (`src/lib/shop/square.ts` reused), Resend, `node --test` with `--experimental-strip-types`.

**Spec:** `docs/superpowers/specs/2026-08-27-native-calendar-design.md`

## Global Constraints

- Feature flag: `NEXT_PUBLIC_NATIVE_CALENDAR` — unset/false ⇒ every new API route returns 404 and nothing renders. Live site provably unchanged.
- Money is integer cents everywhere except display (`src/lib/shop/money.ts`).
- The server is the price authority: browser sends product/slot/party only, never prices.
- Every new table: RLS on, `revoke all ... from anon, authenticated`, no policies. Every new function: `revoke all on function ... from public, anon, authenticated; grant execute ... to service_role;` (PUBLIC revoke is load-bearing — see supabase-shop.sql header).
- Timezone: all wall-clock schedule times are `America/Los_Angeles`; storage is `timestamptz` UTC. No date libraries — use the `Intl` two-pass technique in `src/lib/booking/time.ts`.
- Capacity is claimed BEFORE charging; declined ⇒ release; unknown outcome ⇒ client reuses the same idempotency key (`reuseIdempotencyKey` contract, identical to shop checkout).
- Pending holds expire after 10 minutes and are swept by cron — no permanent leaks (improves on the shop's known claim-leak gap).
- Cancellation policy copy is STRICT (all bookings final; only Highland Farms weather/safety cancellations refund). Never draft copy promising refunds/reschedules.
- Scarcity shown to users must be computed from real counts. Never invent numbers.
- SQL files at repo root are applied BY HAND to Supabase project `qhaeqklgbfvviyedxbyl` before the code that calls them deploys (repo has no migration runner). New objects are inert until the flag flips, so applying early is safe.
- Tests run via `npm test` (`node --test --experimental-strip-types`); new test files are `scripts/*.test.mts`.
- Commit style: imperative subject, body optional; every commit ends with the standing Co-Authored-By/Claude-Session trailer used in this repo.

---

### Task 1: Booking schema + transactional RPCs (`supabase-booking.sql`)

**Files:**
- Create: `supabase-booking.sql`
- Test: applied live (new objects only, inert until flag flips); verified via REST probe in Step 3

**Interfaces:**
- Consumes: nothing (first task)
- Produces: tables `booking_schedules`, `booking_schedule_exceptions`, `booking_blackouts`, `bookings`, `booking_reminders`, `gift_certificates`, `booking_audit`; RPCs `claim_booking_slots(legs jsonb, booking jsonb) returns uuid[]`, `confirm_bookings(p_ids uuid[], p_payment_id text, p_gift_code text, p_gift_cents integer) returns void`, `release_bookings(p_ids uuid[]) returns void`, `sweep_expired_booking_holds() returns integer`, `redeem_gift_certificate(p_code text, p_requested integer) returns integer`, `restore_gift_certificate(p_code text, p_units integer) returns void`

- [ ] **Step 1: Write `supabase-booking.sql`**

```sql
-- Highland Farms native booking schema (2026-08-27)
--
-- Replaces Acuity as the calendar of record. Wall-clock schedule times are
-- America/Los_Angeles strings ('HH:MM'); instants are timestamptz.
--
-- SECURITY: RLS on, no anon/authenticated grants, and every function revokes
-- PUBLIC explicitly (a new function is PUBLIC-executable by default and has no
-- RLS gate — the shop shipped that hole once; never again).

create table if not exists booking_schedules (
  id             bigserial primary key,
  product_slug   text not null,
  weekday        smallint not null check (weekday between 0 and 6), -- 0 = Sunday, Pacific
  start_times    text[] not null,          -- 'HH:MM' Pacific wall clock
  capacity       integer not null check (capacity > 0), -- units: parties (tour) / seats (spa)
  effective_from date not null default current_date,
  effective_to   date,
  created_at     timestamptz not null default now()
);

create table if not exists booking_schedule_exceptions (
  id           bigserial primary key,
  product_slug text not null,
  on_date      date not null,              -- Pacific date
  start_times  text[],                     -- null = CLOSED that day; else replaces the weekday rule
  capacity     integer,                    -- null = keep the rule's capacity
  note         text,
  created_at   timestamptz not null default now(),
  unique (product_slug, on_date)
);

create table if not exists booking_blackouts (
  id            bigserial primary key,
  kind          text not null default 'closure'
                  check (kind in ('wedding', 'closure', 'private_event')),
  starts_on     date not null,
  ends_on       date not null,
  product_slugs text[] not null default '{farm-tour,nordic-spa}',
  note          text,
  created_at    timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table if not exists bookings (
  id               uuid primary key default gen_random_uuid(),
  booking_number   text not null unique,
  product_slug     text not null,
  starts_at        timestamptz not null,
  duration_min     integer not null check (duration_min > 0),
  party_size       integer not null check (party_size > 0),
  -- units this booking consumes against slot capacity:
  -- a private tour takes the whole slot (1); a spa seat is per person (= party_size)
  units            integer not null check (units > 0),
  status           text not null default 'pending'
                     check (status in ('pending','confirmed','cancelled','completed','no_show')),
  hold_expires_at  timestamptz,
  combo_group      uuid,                   -- both legs of a Full Farm Day share this
  first_name       text not null,
  last_name        text not null,
  email            text not null,
  phone            text not null,
  amount_cents     integer not null default 0 check (amount_cents >= 0),
  square_payment_id text,
  gift_certificate_code text,
  gift_amount_cents integer not null default 0 check (gift_amount_cents >= 0),
  referral_source  text,
  policy_agreed_at timestamptz,
  location_choice  text check (location_choice in ('meet','in_person')), -- consults only
  google_event_id  text,
  meet_link        text,
  acuity_id        bigint unique,          -- set on Phase-3 imported rows
  source           text not null default 'native'
                     check (source in ('native','acuity_import','admin')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists bookings_slot_idx
  on bookings (product_slug, starts_at)
  where status in ('pending','confirmed');
create index if not exists bookings_email_idx on bookings (email);
create index if not exists bookings_starts_at_idx on bookings (starts_at);

create table if not exists booking_reminders (
  id         bigserial primary key,
  booking_id uuid not null references bookings(id) on delete cascade,
  kind       text not null check (kind in ('48h','morning_of')),
  sent_at    timestamptz not null default now(),
  unique (booking_id, kind)
);

create table if not exists gift_certificates (
  code              text primary key,
  kind              text not null check (kind in ('value','visits')),
  product_scope     text,                  -- null = any product
  initial_units     integer not null check (initial_units > 0),  -- cents (value) or visits
  remaining_units   integer not null check (remaining_units >= 0),
  purchaser_email   text,
  recipient_email   text,
  square_payment_id text,
  acuity_order_id   bigint,
  status            text not null default 'active'
                      check (status in ('active','depleted','void')),
  expires_at        timestamptz,
  created_at        timestamptz not null default now()
);

create table if not exists booking_audit (
  id         bigserial primary key,
  actor      text not null,               -- 'system' | 'admin' | admin identifier
  action     text not null,
  booking_id uuid,
  detail     jsonb,
  created_at timestamptz not null default now()
);

alter table booking_schedules            enable row level security;
alter table booking_schedule_exceptions  enable row level security;
alter table booking_blackouts            enable row level security;
alter table bookings                     enable row level security;
alter table booking_reminders            enable row level security;
alter table gift_certificates            enable row level security;
alter table booking_audit                enable row level security;

revoke all on booking_schedules, booking_schedule_exceptions, booking_blackouts,
  bookings, booking_reminders, gift_certificates, booking_audit
  from anon, authenticated;

-- Atomically hold capacity for one booking (1 leg) or a combo (2 legs).
--
-- legs: [{"product_slug","starts_at","duration_min","capacity","party_size",
--         "units","amount_cents"}, ...]  — capacity comes from the engine's
-- schedule lookup for that exact slot; the RPC enforces it under lock.
-- booking: shared customer fields.
-- Returns the created booking ids (status 'pending', 10-minute hold).
create or replace function claim_booking_slots(legs jsonb, booking jsonb)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  leg record;
  used integer;
  new_id uuid;
  ids uuid[] := '{}';
  grp uuid := null;
begin
  if jsonb_array_length(legs) > 1 then
    grp := gen_random_uuid();
  end if;

  for leg in
    select (e ->> 'product_slug')             as product_slug,
           (e ->> 'starts_at')::timestamptz   as starts_at,
           (e ->> 'duration_min')::integer    as duration_min,
           (e ->> 'capacity')::integer        as capacity,
           (e ->> 'party_size')::integer      as party_size,
           (e ->> 'units')::integer           as units,
           (e ->> 'amount_cents')::integer    as amount_cents
    from jsonb_array_elements(legs) as e
    order by 1, 2                             -- stable lock order across legs
  loop
    perform pg_advisory_xact_lock(
      hashtext(leg.product_slug || '|' || leg.starts_at::text)
    );

    select coalesce(sum(units), 0) into used
    from bookings
    where product_slug = leg.product_slug
      and starts_at = leg.starts_at
      and (status = 'confirmed'
           or (status = 'pending' and hold_expires_at > now()));

    if used + leg.units > leg.capacity then
      raise exception 'slot full for % at % (used %, capacity %)',
        leg.product_slug, leg.starts_at, used, leg.capacity
        using errcode = 'P0001';
    end if;

    insert into bookings (
      booking_number, product_slug, starts_at, duration_min, party_size, units,
      status, hold_expires_at, combo_group,
      first_name, last_name, email, phone, amount_cents,
      referral_source, policy_agreed_at, location_choice, source
    ) values (
      -- single leg keeps the bare number; combo legs get -1 / -2 suffixes so
      -- the unique constraint holds while the customer sees one number
      (booking ->> 'booking_number')
        || case when grp is null then ''
           else '-' || (coalesce(array_length(ids, 1), 0) + 1)::text end,
      leg.product_slug, leg.starts_at, leg.duration_min, leg.party_size, leg.units,
      'pending', now() + interval '10 minutes', grp,
      booking ->> 'first_name', booking ->> 'last_name',
      booking ->> 'email', booking ->> 'phone',
      leg.amount_cents,
      booking ->> 'referral_source',
      nullif(booking ->> 'policy_agreed_at', '')::timestamptz,
      nullif(booking ->> 'location_choice', ''),
      coalesce(booking ->> 'source', 'native')
    )
    returning id into new_id;

    ids := ids || new_id;
  end loop;

  return ids;
end;
$$;

-- Flip pending holds to confirmed after the money is taken.
create or replace function confirm_bookings(
  p_ids uuid[], p_payment_id text, p_gift_code text, p_gift_cents integer
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  update bookings
  set status = 'confirmed',
      hold_expires_at = null,
      square_payment_id = p_payment_id,
      gift_certificate_code = p_gift_code,
      gift_amount_cents = coalesce(p_gift_cents, 0),
      updated_at = now()
  where id = any(p_ids) and status = 'pending';
end;
$$;

-- Hand a hold back after a failed charge. Forgiving by design.
create or replace function release_bookings(p_ids uuid[])
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from bookings where id = any(p_ids) and status = 'pending';
end;
$$;

-- Cron sweep: a crash between claim and release must not leak a seat forever.
create or replace function sweep_expired_booking_holds()
returns integer
language plpgsql security definer set search_path = public
as $$
declare n integer;
begin
  delete from bookings
  where status = 'pending' and hold_expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Atomically consume gift-certificate units. Returns the units actually
-- applied (min of requested and remaining). Raises P0001 on bad/expired code.
create or replace function redeem_gift_certificate(p_code text, p_requested integer)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  cert record;
  applied integer;
begin
  select * into cert from gift_certificates
  where code = p_code
  for update;

  if not found or cert.status <> 'active'
     or (cert.expires_at is not null and cert.expires_at < now()) then
    raise exception 'gift certificate not usable' using errcode = 'P0001';
  end if;

  applied := least(cert.remaining_units, p_requested);
  if applied <= 0 then
    raise exception 'gift certificate depleted' using errcode = 'P0001';
  end if;

  update gift_certificates
  set remaining_units = remaining_units - applied,
      status = case when remaining_units - applied = 0 then 'depleted' else 'active' end
  where code = p_code;

  return applied;
end;
$$;

-- Give units back when the charge after a redemption fails.
create or replace function restore_gift_certificate(p_code text, p_units integer)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update gift_certificates
  set remaining_units = remaining_units + p_units,
      status = 'active'
  where code = p_code;
end;
$$;

revoke all on function claim_booking_slots(jsonb, jsonb)                 from public, anon, authenticated;
revoke all on function confirm_bookings(uuid[], text, text, integer)     from public, anon, authenticated;
revoke all on function release_bookings(uuid[])                          from public, anon, authenticated;
revoke all on function sweep_expired_booking_holds()                     from public, anon, authenticated;
revoke all on function redeem_gift_certificate(text, integer)            from public, anon, authenticated;
revoke all on function restore_gift_certificate(text, integer)           from public, anon, authenticated;

grant execute on function claim_booking_slots(jsonb, jsonb)              to service_role;
grant execute on function confirm_bookings(uuid[], text, text, integer)  to service_role;
grant execute on function release_bookings(uuid[])                       to service_role;
grant execute on function sweep_expired_booking_holds()                  to service_role;
grant execute on function redeem_gift_certificate(text, integer)         to service_role;
grant execute on function restore_gift_certificate(text, integer)        to service_role;
```

- [ ] **Step 2: Apply to Supabase**

Run the SQL against project `qhaeqklgbfvviyedxbyl` (Supabase dashboard SQL editor, or psql if a connection string is configured). New objects only — nothing existing is touched.

- [ ] **Step 3: Verify the PUBLIC revoke actually held**

With the ANON key (from `.env.local` `NEXT_PUBLIC_SUPABASE_ANON_KEY`):

```bash
curl -s -X POST "https://qhaeqklgbfvviyedxbyl.supabase.co/rest/v1/rpc/sweep_expired_booking_holds" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" -d '{}'
```

Expected: `42501` permission-denied error. With the SERVICE key the same call returns `0`. Both checks must pass.

- [ ] **Step 4: Commit**

```bash
git add supabase-booking.sql
git commit -m "feat(booking): native calendar schema + transactional slot RPCs"
```

---

### Task 2: Product catalog (`src/lib/booking/products.ts`)

**Files:**
- Create: `src/lib/booking/products.ts`
- Test: `scripts/booking-engine.test.mts` (created here, grown in Tasks 3–4)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type BookingKind = "private_slot" | "class" | "consult"`
  - `interface BookingProduct { slug: BookingSlug; name: string; kind: BookingKind; pricePerPersonCents: number; durationMin: number; minParty: number; maxParty: number; leadTimeMin: number; horizonDays: number }`
  - `type BookingSlug = "farm-tour" | "nordic-spa" | "wedding-call"`
  - `BOOKING_PRODUCTS: Record<BookingSlug, BookingProduct>`
  - `getBookingProduct(slug: string): BookingProduct | undefined`
  - `unitsFor(product: BookingProduct, party: number): number` — 1 for `private_slot`/`consult`, `party` for `class`
  - `COMBO = { bufferMin: 30, legs: ["farm-tour", "nordic-spa"] as const }`

- [ ] **Step 1: Update `package.json` test script to a glob**

```json
"test": "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types scripts/*.test.mts"
```

Run `npm test` — the existing daily-report suite must still pass.

- [ ] **Step 2: Write the failing test** (start `scripts/booking-engine.test.mts`)

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOOKING_PRODUCTS,
  getBookingProduct,
  unitsFor,
  COMBO,
} from "../src/lib/booking/products.ts";

test("products: tour is a private slot at $75/person, 2-6 guests", () => {
  const tour = BOOKING_PRODUCTS["farm-tour"];
  assert.equal(tour.kind, "private_slot");
  assert.equal(tour.pricePerPersonCents, 7500);
  assert.equal(tour.minParty, 2);
  assert.equal(tour.maxParty, 6);
  assert.equal(tour.durationMin, 60);
  assert.equal(unitsFor(tour, 4), 1); // a party takes the whole slot
});

test("products: spa is a shared class, seats are per person", () => {
  const spa = BOOKING_PRODUCTS["nordic-spa"];
  assert.equal(spa.kind, "class");
  assert.equal(spa.durationMin, 90);
  assert.equal(spa.minParty, 1);
  assert.equal(unitsFor(spa, 3), 3);
});

test("products: wedding call is free", () => {
  const call = BOOKING_PRODUCTS["wedding-call"];
  assert.equal(call.kind, "consult");
  assert.equal(call.pricePerPersonCents, 0);
  assert.equal(call.durationMin, 45);
});

test("products: unknown slug returns undefined; combo buffer is 30", () => {
  assert.equal(getBookingProduct("lodging"), undefined);
  assert.equal(COMBO.bufferMin, 30);
});
```

- [ ] **Step 3: Run to verify failure** — `npm test` → FAIL (module not found).

- [ ] **Step 4: Implement `src/lib/booking/products.ts`**

```ts
/**
 * The bookable products. Static and in git, like the shop catalog: the server
 * re-prices every checkout from THIS file — the browser never sends prices.
 * Availability lives in Supabase; definitions live here.
 */

export type BookingKind = "private_slot" | "class" | "consult";
export type BookingSlug = "farm-tour" | "nordic-spa" | "wedding-call";

export interface BookingProduct {
  slug: BookingSlug;
  name: string;
  kind: BookingKind;
  pricePerPersonCents: number;
  durationMin: number;
  minParty: number;
  maxParty: number;
  /** Can't book closer to the start than this. */
  leadTimeMin: number;
  /** How far ahead the calendar opens. */
  horizonDays: number;
}

export const BOOKING_PRODUCTS: Record<BookingSlug, BookingProduct> = {
  "farm-tour": {
    slug: "farm-tour",
    name: "Private Farm Tour",
    kind: "private_slot",
    pricePerPersonCents: 7500,
    durationMin: 60,
    minParty: 2,
    maxParty: 6,
    leadTimeMin: 120,
    horizonDays: 180,
  },
  "nordic-spa": {
    slug: "nordic-spa",
    name: "Nordic Forest Spa",
    kind: "class",
    pricePerPersonCents: 7500,
    durationMin: 90,
    minParty: 1,
    maxParty: 6,
    leadTimeMin: 120,
    horizonDays: 180,
  },
  "wedding-call": {
    slug: "wedding-call",
    name: "Wedding Call",
    kind: "consult",
    pricePerPersonCents: 0,
    durationMin: 45,
    minParty: 1,
    maxParty: 2,
    leadTimeMin: 720, // 12h — the team preps for these
    horizonDays: 90,
  },
};

export function getBookingProduct(slug: string): BookingProduct | undefined {
  return (BOOKING_PRODUCTS as Record<string, BookingProduct>)[slug];
}

/** Capacity units a booking consumes: whole slot for a private tour/consult, a seat per person for the spa. */
export function unitsFor(product: BookingProduct, party: number): number {
  return product.kind === "class" ? party : 1;
}

/** Full Farm Day: a tour and a spa session on the same day, ≥30 min apart, one charge. */
export const COMBO = { bufferMin: 30, legs: ["farm-tour", "nordic-spa"] } as const;
```

- [ ] **Step 5: Run tests** — `npm test` → PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/booking-engine.test.mts src/lib/booking/products.ts
git commit -m "feat(booking): product catalog + node --test glob"
```

---

### Task 3: Pacific time helpers (`src/lib/booking/time.ts`)

**Files:**
- Create: `src/lib/booking/time.ts`
- Test: append to `scripts/booking-engine.test.mts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `slotToUtc(dateStr: string, time: string): Date` — `"2026-09-05"`, `"11:00"` Pacific → UTC instant (DST-correct)
  - `pacificDateStr(utc: Date): string` — `"YYYY-MM-DD"` in Pacific
  - `pacificTimeStr(utc: Date): string` — `"HH:MM"` in Pacific
  - `pacificWeekday(dateStr: string): number` — 0=Sunday
  - `addDays(dateStr: string, n: number): string`
  - `eachDate(from: string, to: string): string[]` — inclusive

- [ ] **Step 1: Write the failing tests** (append)

```ts
import {
  slotToUtc,
  pacificDateStr,
  pacificTimeStr,
  pacificWeekday,
  addDays,
  eachDate,
} from "../src/lib/booking/time.ts";

test("time: PDT slot converts at UTC-7", () => {
  // 2026-09-05 is PDT.
  assert.equal(slotToUtc("2026-09-05", "11:00").toISOString(), "2026-09-05T18:00:00.000Z");
});

test("time: PST slot converts at UTC-8", () => {
  // 2026-12-05 is PST.
  assert.equal(slotToUtc("2026-12-05", "11:00").toISOString(), "2026-12-05T19:00:00.000Z");
});

test("time: DST fall-back day still lands on the right wall clock", () => {
  // US DST ends 2026-11-01. 11:00 that morning is PST (UTC-8).
  const d = slotToUtc("2026-11-01", "11:00");
  assert.equal(pacificDateStr(d), "2026-11-01");
  assert.equal(pacificTimeStr(d), "11:00");
});

test("time: spring-forward day", () => {
  // US DST starts 2026-03-08; 11:00 is PDT (UTC-7).
  const d = slotToUtc("2026-03-08", "11:00");
  assert.equal(pacificTimeStr(d), "11:00");
  assert.equal(d.toISOString(), "2026-03-08T18:00:00.000Z");
});

test("time: weekday + date walking", () => {
  assert.equal(pacificWeekday("2026-09-05"), 6); // Saturday
  assert.equal(addDays("2026-08-30", 3), "2026-09-02");
  assert.deepEqual(eachDate("2026-08-30", "2026-09-01"), [
    "2026-08-30", "2026-08-31", "2026-09-01",
  ]);
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Implement `src/lib/booking/time.ts`**

```ts
/**
 * Pacific wall-clock ↔ UTC without a date library.
 *
 * Two-pass conversion: guess the instant assuming a fixed offset, read back
 * what Pacific wall time that instant actually is, correct by the difference.
 * Correct across both DST transitions for any real schedule time (the farm
 * doesn't book at 2am on transition night).
 */

const TZ = "America/Los_Angeles";

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function pacificParts(utc: Date): { y: number; mo: number; d: number; h: number; mi: number } {
  const map: Record<string, string> = {};
  for (const p of partsFmt.formatToParts(utc)) map[p.type] = p.value;
  return {
    y: Number(map.year),
    mo: Number(map.month),
    d: Number(map.day),
    h: Number(map.hour === "24" ? "0" : map.hour),
    mi: Number(map.minute),
  };
}

export function pacificDateStr(utc: Date): string {
  const p = pacificParts(utc);
  return `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

export function pacificTimeStr(utc: Date): string {
  const p = pacificParts(utc);
  return `${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;
}

/** '2026-09-05' + '11:00' (Pacific) → the UTC instant. */
export function slotToUtc(dateStr: string, time: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  // First guess: pretend Pacific == UTC.
  let guess = new Date(Date.UTC(y, mo - 1, d, h, mi));
  // Correct twice — the second pass fixes a guess that crossed a DST boundary.
  for (let i = 0; i < 2; i++) {
    const got = pacificParts(guess);
    const wantMinutes = Date.UTC(y, mo - 1, d, h, mi) / 60000;
    const gotMinutes = Date.UTC(got.y, got.mo - 1, got.d, got.h, got.mi) / 60000;
    guess = new Date(guess.getTime() + (wantMinutes - gotMinutes) * 60000);
  }
  return guess;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function pacificWeekday(dateStr: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" })
    .format(slotToUtc(dateStr, "12:00"));
  return WEEKDAYS.indexOf(name);
}

export function addDays(dateStr: string, n: number): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, mo - 1, d + n));
  return next.toISOString().slice(0, 10);
}

export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
```

- [ ] **Step 4: Run tests** — `npm test` → PASS (all 5 time tests + earlier suites).

- [ ] **Step 5: Commit**

```bash
git add src/lib/booking/time.ts scripts/booking-engine.test.mts
git commit -m "feat(booking): Pacific time helpers with DST-safe slot conversion"
```

---

### Task 4: Availability engine (`src/lib/booking/engine.ts`)

**Files:**
- Create: `src/lib/booking/engine.ts`
- Test: append to `scripts/booking-engine.test.mts`

**Interfaces:**
- Consumes: `BookingProduct`, `unitsFor` (Task 2); `slotToUtc`, `pacificDateStr`, `pacificWeekday`, `eachDate` (Task 3)
- Produces:
  - `interface ScheduleRule { productSlug: string; weekday: number; startTimes: string[]; capacity: number; effectiveFrom: string; effectiveTo: string | null }`
  - `interface ScheduleException { productSlug: string; onDate: string; startTimes: string[] | null; capacity: number | null }`
  - `interface Blackout { kind: string; startsOn: string; endsOn: string; productSlugs: string[] }`
  - `interface BookedUnits { productSlug: string; startsAtIso: string; units: number }`
  - `interface Slot { startsAt: string; time: string; capacity: number; remainingUnits: number }`
  - `interface DayAvailability { date: string; slots: Slot[] }`
  - `computeAvailability(opts: { product: BookingProduct; from: string; to: string; schedules: ScheduleRule[]; exceptions: ScheduleException[]; blackouts: Blackout[]; booked: BookedUnits[]; now: Date }): DayAvailability[]`
  - `comboDays(tour: DayAvailability[], spa: DayAvailability[], tourUnitsNeeded: number, spaUnitsNeeded: number, bufferMin: number): { date: string; pairs: { tour: Slot; spa: Slot }[] }[]`
  - `slotCapacity(opts: { product: BookingProduct; dateStr: string; time: string; schedules: ScheduleRule[]; exceptions: ScheduleException[]; blackouts: Blackout[]; now: Date }): number | null` — capacity if that exact slot is legitimately offered, else `null` (checkout's authority check)

- [ ] **Step 1: Write the failing tests** (append; a shared fixture keeps them readable)

```ts
import {
  computeAvailability,
  comboDays,
  slotCapacity,
  type ScheduleRule,
  type Blackout,
} from "../src/lib/booking/engine.ts";
import { BOOKING_PRODUCTS, unitsFor } from "../src/lib/booking/products.ts";

const TOUR = BOOKING_PRODUCTS["farm-tour"];
const SPA = BOOKING_PRODUCTS["nordic-spa"];

// Sept 2026: 5th is a Saturday, 6th a Sunday, 7th a Monday.
const rules: ScheduleRule[] = [
  { productSlug: "farm-tour", weekday: 6, startTimes: ["10:00", "12:00", "14:00"], capacity: 1, effectiveFrom: "2026-01-01", effectiveTo: null },
  { productSlug: "nordic-spa", weekday: 6, startTimes: ["11:00", "13:00", "15:00"], capacity: 6, effectiveFrom: "2026-01-01", effectiveTo: null },
];
const NOW = new Date("2026-08-28T17:00:00Z"); // late Aug — horizon/lead time satisfied

test("engine: weekday rule yields slots only on that weekday", () => {
  const days = computeAvailability({
    product: TOUR, from: "2026-09-05", to: "2026-09-07",
    schedules: rules, exceptions: [], blackouts: [], booked: [], now: NOW,
  });
  const byDate = Object.fromEntries(days.map((d) => [d.date, d.slots.length]));
  assert.equal(byDate["2026-09-05"], 3); // Saturday
  assert.equal(byDate["2026-09-06"] ?? 0, 0);
  assert.equal(byDate["2026-09-07"] ?? 0, 0);
});

test("engine: a wedding blackout removes the whole day", () => {
  const blackout: Blackout = {
    kind: "wedding", startsOn: "2026-09-05", endsOn: "2026-09-05",
    productSlugs: ["farm-tour", "nordic-spa"],
  };
  const days = computeAvailability({
    product: TOUR, from: "2026-09-05", to: "2026-09-05",
    schedules: rules, exceptions: [], blackouts: [blackout], booked: [], now: NOW,
  });
  assert.equal(days[0].slots.length, 0);
});

test("engine: an exception closes a day; another adds a one-off session", () => {
  const days = computeAvailability({
    product: SPA, from: "2026-09-05", to: "2026-09-07",
    schedules: rules,
    exceptions: [
      { productSlug: "nordic-spa", onDate: "2026-09-05", startTimes: null, capacity: null },   // closed
      { productSlug: "nordic-spa", onDate: "2026-09-07", startTimes: ["17:00"], capacity: 4 }, // pop-up Monday
    ],
    blackouts: [], booked: [], now: NOW,
  });
  const byDate = Object.fromEntries(days.map((d) => [d.date, d.slots]));
  assert.equal(byDate["2026-09-05"].length, 0);
  assert.equal(byDate["2026-09-07"].length, 1);
  assert.equal(byDate["2026-09-07"][0].capacity, 4);
});

test("engine: booked units reduce remaining; full slots are still listed at 0", () => {
  const spa1100 = "2026-09-05T18:00:00.000Z"; // 11:00 PDT
  const days = computeAvailability({
    product: SPA, from: "2026-09-05", to: "2026-09-05",
    schedules: rules, exceptions: [], blackouts: [],
    booked: [
      { productSlug: "nordic-spa", startsAtIso: spa1100, units: 4 },
      { productSlug: "nordic-spa", startsAtIso: spa1100, units: 2 },
    ],
    now: NOW,
  });
  const s = days[0].slots.find((x) => x.time === "11:00")!;
  assert.equal(s.remainingUnits, 0);
  assert.equal(days[0].slots.find((x) => x.time === "13:00")!.remainingUnits, 6);
});

test("engine: lead time hides slots starting too soon", () => {
  const nearNow = new Date("2026-09-05T16:30:00Z"); // 09:30 PDT that Saturday
  const days = computeAvailability({
    product: TOUR, from: "2026-09-05", to: "2026-09-05",
    schedules: rules, exceptions: [], blackouts: [], booked: [], now: nearNow,
  });
  // 10:00 is 30 min out (< 120 lead) → hidden. 12:00 and 14:00 remain.
  assert.deepEqual(days[0].slots.map((s) => s.time), ["12:00", "14:00"]);
});

test("engine: slotCapacity is the checkout authority — null off-schedule", () => {
  const ok = slotCapacity({
    product: SPA, dateStr: "2026-09-05", time: "11:00",
    schedules: rules, exceptions: [], blackouts: [], now: NOW,
  });
  assert.equal(ok, 6);
  const off = slotCapacity({
    product: SPA, dateStr: "2026-09-05", time: "11:30",
    schedules: rules, exceptions: [], blackouts: [], now: NOW,
  });
  assert.equal(off, null);
});

test("engine: combo pairs respect the 30-min buffer in either order", () => {
  const tourDays = computeAvailability({
    product: TOUR, from: "2026-09-05", to: "2026-09-05",
    schedules: rules, exceptions: [], blackouts: [], booked: [], now: NOW,
  });
  const spaDays = computeAvailability({
    product: SPA, from: "2026-09-05", to: "2026-09-05",
    schedules: rules, exceptions: [], blackouts: [], booked: [], now: NOW,
  });
  const combos = comboDays(tourDays, spaDays, 1, 2, 30);
  assert.equal(combos.length, 1);
  const pairs = combos[0].pairs.map((p) => `${p.tour.time}+${p.spa.time}`);
  // Tour 10:00-11:00 → spa 13:00/15:00 OK (11:00 violates buffer: gap 0).
  assert.ok(pairs.includes("10:00+13:00"));
  assert.ok(!pairs.includes("10:00+11:00"));
  // Spa-first also allowed: spa 11:00-12:30 → tour 14:00 (gap 90) OK, 12:00 (overlap) not.
  assert.ok(pairs.includes("14:00+11:00"));
  assert.ok(!pairs.includes("12:00+11:00"));
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Implement `src/lib/booking/engine.ts`**

```ts
/**
 * Pure availability computation. No I/O — callers fetch rules/blackouts/booked
 * units (src/lib/booking/store.ts) and hand them in, which is what makes this
 * the most heavily unit-tested file in the booking system.
 *
 * The DB RPC is the final capacity authority under lock; this engine is the
 * schedule authority (is that slot even offered?) and the display layer's
 * source of remaining-seat truth.
 */
import { type BookingProduct } from "./products";
import { slotToUtc, pacificWeekday, eachDate } from "./time";

export interface ScheduleRule {
  productSlug: string;
  weekday: number; // 0 = Sunday, Pacific
  startTimes: string[];
  capacity: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface ScheduleException {
  productSlug: string;
  onDate: string;
  /** null = closed that day; otherwise replaces the weekday rule's times */
  startTimes: string[] | null;
  capacity: number | null;
}

export interface Blackout {
  kind: string;
  startsOn: string;
  endsOn: string;
  productSlugs: string[];
}

export interface BookedUnits {
  productSlug: string;
  startsAtIso: string;
  units: number;
}

export interface Slot {
  /** UTC ISO instant */
  startsAt: string;
  /** Pacific wall clock 'HH:MM' */
  time: string;
  capacity: number;
  remainingUnits: number;
}

export interface DayAvailability {
  date: string;
  slots: Slot[];
}

function isBlackedOut(
  productSlug: string,
  dateStr: string,
  blackouts: Blackout[],
): boolean {
  return blackouts.some(
    (b) =>
      b.productSlugs.includes(productSlug) &&
      dateStr >= b.startsOn &&
      dateStr <= b.endsOn,
  );
}

/** The offered times+capacity for one product on one date, or null when closed. */
function dayPlan(
  productSlug: string,
  dateStr: string,
  schedules: ScheduleRule[],
  exceptions: ScheduleException[],
  blackouts: Blackout[],
): { times: string[]; capacity: number } | null {
  if (isBlackedOut(productSlug, dateStr, blackouts)) return null;

  const exception = exceptions.find(
    (e) => e.productSlug === productSlug && e.onDate === dateStr,
  );
  const weekday = pacificWeekday(dateStr);
  const rule = schedules.find(
    (r) =>
      r.productSlug === productSlug &&
      r.weekday === weekday &&
      r.effectiveFrom <= dateStr &&
      (r.effectiveTo === null || r.effectiveTo >= dateStr),
  );

  if (exception) {
    if (exception.startTimes === null) return null; // closed
    return {
      times: exception.startTimes,
      capacity: exception.capacity ?? rule?.capacity ?? 1,
    };
  }
  if (!rule) return null;
  return { times: rule.startTimes, capacity: rule.capacity };
}

export function computeAvailability(opts: {
  product: BookingProduct;
  from: string;
  to: string;
  schedules: ScheduleRule[];
  exceptions: ScheduleException[];
  blackouts: Blackout[];
  booked: BookedUnits[];
  now: Date;
}): DayAvailability[] {
  const { product, schedules, exceptions, blackouts, booked, now } = opts;
  const usedBySlot = new Map<string, number>();
  for (const b of booked) {
    if (b.productSlug !== product.slug) continue;
    const key = new Date(b.startsAtIso).toISOString();
    usedBySlot.set(key, (usedBySlot.get(key) ?? 0) + b.units);
  }
  const earliest = new Date(now.getTime() + product.leadTimeMin * 60000);

  return eachDate(opts.from, opts.to).map((date) => {
    const plan = dayPlan(product.slug, date, schedules, exceptions, blackouts);
    if (!plan) return { date, slots: [] };
    const slots: Slot[] = [];
    for (const time of [...plan.times].sort()) {
      const startsAt = slotToUtc(date, time);
      if (startsAt < earliest) continue;
      const used = usedBySlot.get(startsAt.toISOString()) ?? 0;
      slots.push({
        startsAt: startsAt.toISOString(),
        time,
        capacity: plan.capacity,
        remainingUnits: Math.max(0, plan.capacity - used),
      });
    }
    return { date, slots };
  });
}

/**
 * Checkout's schedule authority: capacity for that exact slot if it is
 * legitimately offered (on schedule, not blacked out, not inside lead time),
 * else null. The DB re-checks capacity under lock; this checks legitimacy.
 */
export function slotCapacity(opts: {
  product: BookingProduct;
  dateStr: string;
  time: string;
  schedules: ScheduleRule[];
  exceptions: ScheduleException[];
  blackouts: Blackout[];
  now: Date;
}): number | null {
  const plan = dayPlan(
    opts.product.slug, opts.dateStr, opts.schedules, opts.exceptions, opts.blackouts,
  );
  if (!plan || !plan.times.includes(opts.time)) return null;
  const startsAt = slotToUtc(opts.dateStr, opts.time);
  const earliest = new Date(opts.now.getTime() + opts.product.leadTimeMin * 60000);
  if (startsAt < earliest) return null;
  const horizon = new Date(opts.now.getTime() + opts.product.horizonDays * 86400000);
  if (startsAt > horizon) return null;
  return plan.capacity;
}

/** Days where a tour and a spa session can both be booked ≥ bufferMin apart, either order. */
export function comboDays(
  tour: DayAvailability[],
  spa: DayAvailability[],
  tourUnitsNeeded: number,
  spaUnitsNeeded: number,
  bufferMin: number,
): { date: string; pairs: { tour: Slot; spa: Slot }[] }[] {
  const spaByDate = new Map(spa.map((d) => [d.date, d.slots]));
  const TOUR_MIN = 60;
  const SPA_MIN = 90;
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
        const tourThenSpa = sStart - (tStart + TOUR_MIN * 60000);
        const spaThenTour = tStart - (sStart + SPA_MIN * 60000);
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

- [ ] **Step 4: Run tests** — `npm test` → all engine tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/booking/engine.ts scripts/booking-engine.test.mts
git commit -m "feat(booking): pure availability engine — rules, exceptions, blackouts, combos"
```

---

### Task 5: Flag + Supabase store (`src/lib/booking/flag.ts`, `src/lib/booking/store.ts`)

**Files:**
- Create: `src/lib/booking/flag.ts`
- Create: `src/lib/booking/store.ts`

**Interfaces:**
- Consumes: engine types (Task 4), `claim_booking_slots`/`confirm_bookings`/`release_bookings`/`redeem_gift_certificate`/`restore_gift_certificate` RPCs (Task 1)
- Produces:
  - `nativeCalendarEnabled(): boolean`
  - `interface ClaimLeg { productSlug: string; startsAt: string; durationMin: number; capacity: number; partySize: number; units: number; amountCents: number }`
  - `interface ClaimCustomer { bookingNumber: string; firstName: string; lastName: string; email: string; phone: string; referralSource: string; policyAgreedAt: string | null; locationChoice: "meet" | "in_person" | null }`
  - `claimSlots(legs: ClaimLeg[], customer: ClaimCustomer): Promise<{ ok: true; ids: string[] } | { ok: false; reason: "slot_full" | "error"; message: string }>`
  - `confirmBookings(ids: string[], paymentId: string | null, giftCode: string | null, giftCents: number): Promise<void>`
  - `releaseBookings(ids: string[]): Promise<void>`
  - `getGiftCertificate(code: string): Promise<{ kind: "value" | "visits"; productScope: string | null; remainingUnits: number } | null>` — read-only lookup; the redeem RPC re-checks under lock, so this is for shaping the request, not authorization
  - `redeemGiftCertificate(code: string, requested: number): Promise<number | null>` — applied units (cents for `value`, seats for `visits`), or `null` when unusable
  - `restoreGiftCertificate(code: string, units: number): Promise<void>`
  - `getScheduleData(productSlugs: string[], from: string, to: string): Promise<{ schedules: ScheduleRule[]; exceptions: ScheduleException[]; blackouts: Blackout[]; booked: BookedUnits[] }>`

- [ ] **Step 1: Implement `src/lib/booking/flag.ts`**

```ts
/** Native calendar kill switch. Off ⇒ routes 404 and no UI mounts. */
export function nativeCalendarEnabled(): boolean {
  return process.env.NEXT_PUBLIC_NATIVE_CALENDAR === "true";
}
```

- [ ] **Step 2: Implement `src/lib/booking/store.ts`** (mirrors `src/lib/shop/orders.ts` — lazy service-role client, RPC wrappers that map errcodes to typed results)

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Blackout, BookedUnits, ScheduleException, ScheduleRule,
} from "./engine";

let client: SupabaseClient | undefined;

function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Booking store needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export interface ClaimLeg {
  productSlug: string;
  startsAt: string; // UTC ISO
  durationMin: number;
  capacity: number;
  partySize: number;
  units: number;
  amountCents: number;
}

export interface ClaimCustomer {
  bookingNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  referralSource: string;
  policyAgreedAt: string | null;
  locationChoice: "meet" | "in_person" | null;
}

export type ClaimSlotsResult =
  | { ok: true; ids: string[] }
  | { ok: false; reason: "slot_full" | "error"; message: string };

export async function claimSlots(
  legs: ClaimLeg[],
  customer: ClaimCustomer,
): Promise<ClaimSlotsResult> {
  const { data, error } = await db().rpc("claim_booking_slots", {
    legs: legs.map((l) => ({
      product_slug: l.productSlug,
      starts_at: l.startsAt,
      duration_min: l.durationMin,
      capacity: l.capacity,
      party_size: l.partySize,
      units: l.units,
      amount_cents: l.amountCents,
    })),
    booking: {
      booking_number: customer.bookingNumber,
      first_name: customer.firstName,
      last_name: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      referral_source: customer.referralSource,
      policy_agreed_at: customer.policyAgreedAt ?? "",
      location_choice: customer.locationChoice ?? "",
    },
  });

  if (!error && Array.isArray(data)) return { ok: true, ids: data as string[] };

  if (error?.code === "P0001" || /slot full/i.test(error?.message ?? "")) {
    return {
      ok: false,
      reason: "slot_full",
      message:
        "That time was just booked by someone else. Your card has not been charged — pick another time.",
    };
  }
  console.error("[booking] claim_booking_slots failed:", error?.code, error?.message);
  return {
    ok: false,
    reason: "error",
    message: "We couldn't confirm that time. Your card has not been charged.",
  };
}

export async function confirmBookings(
  ids: string[],
  paymentId: string | null,
  giftCode: string | null,
  giftCents: number,
): Promise<void> {
  const { error } = await db().rpc("confirm_bookings", {
    p_ids: ids,
    p_payment_id: paymentId,
    p_gift_code: giftCode,
    p_gift_cents: giftCents,
  });
  if (error) {
    // The money is taken by the time this runs — scream, never surface.
    console.error("[booking] confirm_bookings FAILED:", ids, error.message);
    throw new Error(`confirm_bookings failed: ${error.message}`);
  }
}

export async function releaseBookings(ids: string[]): Promise<void> {
  const { error } = await db().rpc("release_bookings", { p_ids: ids });
  if (error) {
    console.error("[booking] release_bookings FAILED — holds leak until sweep:", ids, error.message);
  }
}

/** Read-only cert lookup — shapes the redemption request; never authorizes it. */
export async function getGiftCertificate(code: string): Promise<{
  kind: "value" | "visits";
  productScope: string | null;
  remainingUnits: number;
} | null> {
  const { data, error } = await db()
    .from("gift_certificates")
    .select("kind, product_scope, remaining_units, status, expires_at")
    .eq("code", code)
    .maybeSingle();
  if (error || !data || data.status !== "active") return null;
  if (data.expires_at && data.expires_at < new Date().toISOString()) return null;
  return {
    kind: data.kind,
    productScope: data.product_scope,
    remainingUnits: data.remaining_units,
  };
}

/** Applied units, or null when the code is unusable (bad/expired/depleted). */
export async function redeemGiftCertificate(
  code: string,
  requested: number,
): Promise<number | null> {
  const { data, error } = await db().rpc("redeem_gift_certificate", {
    p_code: code,
    p_requested: requested,
  });
  if (error) {
    if (error.code === "P0001") return null;
    console.error("[booking] redeem_gift_certificate failed:", error.message);
    return null;
  }
  return data as number;
}

export async function restoreGiftCertificate(code: string, units: number): Promise<void> {
  const { error } = await db().rpc("restore_gift_certificate", {
    p_code: code,
    p_units: units,
  });
  if (error) {
    console.error("[booking] restore_gift_certificate FAILED:", code, units, error.message);
  }
}

/** Everything the engine needs for a product set + date range, in 4 queries. */
export async function getScheduleData(
  productSlugs: string[],
  from: string,
  to: string,
): Promise<{
  schedules: ScheduleRule[];
  exceptions: ScheduleException[];
  blackouts: Blackout[];
  booked: BookedUnits[];
}> {
  const supa = db();
  const [schedules, exceptions, blackouts, booked] = await Promise.all([
    supa.from("booking_schedules").select("*").in("product_slug", productSlugs),
    supa.from("booking_schedule_exceptions").select("*")
      .in("product_slug", productSlugs).gte("on_date", from).lte("on_date", to),
    supa.from("booking_blackouts").select("*")
      .lte("starts_on", to).gte("ends_on", from),
    supa.from("bookings").select("product_slug, starts_at, units, status, hold_expires_at")
      .in("product_slug", productSlugs)
      .gte("starts_at", `${from}T00:00:00Z`)
      // slack day so Pacific evening slots inside `to` aren't cut off by UTC
      .lte("starts_at", `${to}T23:59:59Z`)
      .in("status", ["pending", "confirmed"]),
  ]);

  for (const r of [schedules, exceptions, blackouts, booked]) {
    if (r.error) throw new Error(`booking schedule read failed: ${r.error.message}`);
  }

  const nowIso = new Date().toISOString();
  return {
    schedules: (schedules.data ?? []).map((r) => ({
      productSlug: r.product_slug,
      weekday: r.weekday,
      startTimes: r.start_times,
      capacity: r.capacity,
      effectiveFrom: r.effective_from,
      effectiveTo: r.effective_to,
    })),
    exceptions: (exceptions.data ?? []).map((r) => ({
      productSlug: r.product_slug,
      onDate: r.on_date,
      startTimes: r.start_times,
      capacity: r.capacity,
    })),
    blackouts: (blackouts.data ?? []).map((r) => ({
      kind: r.kind,
      startsOn: r.starts_on,
      endsOn: r.ends_on,
      productSlugs: r.product_slugs,
    })),
    booked: (booked.data ?? [])
      .filter((r) => r.status === "confirmed" || (r.hold_expires_at ?? "") > nowIso)
      .map((r) => ({
        productSlug: r.product_slug,
        startsAtIso: r.starts_at,
        units: r.units,
      })),
  };
}
```

- [ ] **Step 3: Typecheck + lint** — `npx tsc --noEmit && npm run lint` → clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/booking/flag.ts src/lib/booking/store.ts
git commit -m "feat(booking): flag gate + service-role store with typed claim results"
```

---

### Task 6: Availability API (`src/app/api/booking/availability/route.ts`)

**Files:**
- Create: `src/app/api/booking/availability/route.ts`

**Interfaces:**
- Consumes: `nativeCalendarEnabled` (Task 5), `getScheduleData` (Task 5), `computeAvailability`/`comboDays` (Task 4), `getBookingProduct`/`unitsFor`/`COMBO`/`BOOKING_PRODUCTS` (Task 2)
- Produces: `GET /api/booking/availability?product=<slug|combo>&from=YYYY-MM-DD&to=YYYY-MM-DD&party=N` → `{ days: DayAvailability[] }` or `{ days: { date, pairs }[] }` for combo. Flag off ⇒ 404.

- [ ] **Step 1: Implement the route**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { getScheduleData } from "@/lib/booking/store";
import { computeAvailability, comboDays } from "@/lib/booking/engine";
import {
  BOOKING_PRODUCTS, COMBO, getBookingProduct, unitsFor,
} from "@/lib/booking/products";
import { addDays, pacificDateStr } from "@/lib/booking/time";

const querySchema = z.object({
  product: z.enum(["farm-tour", "nordic-spa", "wedding-call", "combo"]),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  party: z.coerce.number().int().min(1).max(6).default(2),
});

export async function GET(request: Request) {
  if (!nativeCalendarEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad query" }, { status: 400 });
  }
  const { product: slug, from, to, party } = parsed.data;
  const now = new Date();

  // Clamp: never in the past (Pacific today) and at most 62 days per request.
  const today = pacificDateStr(now);
  const lo = from < today ? today : from;
  const hi = to > addDays(lo, 62) ? addDays(lo, 62) : to;
  if (hi < lo) return NextResponse.json({ days: [] });

  try {
    if (slug === "combo") {
      const data = await getScheduleData(["farm-tour", "nordic-spa"], lo, hi);
      const tour = computeAvailability({
        product: BOOKING_PRODUCTS["farm-tour"], from: lo, to: hi, now, ...data,
      });
      const spa = computeAvailability({
        product: BOOKING_PRODUCTS["nordic-spa"], from: lo, to: hi, now, ...data,
      });
      const days = comboDays(
        tour, spa,
        unitsFor(BOOKING_PRODUCTS["farm-tour"], party),
        unitsFor(BOOKING_PRODUCTS["nordic-spa"], party),
        COMBO.bufferMin,
      );
      return NextResponse.json({ days }, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
      });
    }

    const product = getBookingProduct(slug)!;
    const data = await getScheduleData([slug], lo, hi);
    const days = computeAvailability({ product, from: lo, to: hi, now, ...data });
    return NextResponse.json({ days }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (err) {
    console.error("[booking] availability error:", err);
    return NextResponse.json({ error: "Availability unavailable" }, { status: 503 });
  }
}
```

- [ ] **Step 2: Verify flag gating locally**

```bash
npm run dev   # NEXT_PUBLIC_NATIVE_CALENDAR unset
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/booking/availability?product=farm-tour&from=2026-09-01&to=2026-09-07"
```

Expected: `404`. Then restart with `NEXT_PUBLIC_NATIVE_CALENDAR=true npm run dev`, seed one schedule row by hand in Supabase (`insert into booking_schedules (product_slug, weekday, start_times, capacity) values ('farm-tour', 6, '{10:00,12:00,14:00}', 1);`), re-curl → `200` with Saturday slots. Delete the seed row after.

- [ ] **Step 3: Build check** — `npm run build` → clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/booking/availability/route.ts
git commit -m "feat(booking): availability API, flag-gated with combo pairing"
```

---

### Task 7: Booking checkout API (`src/app/api/booking/checkout/route.ts`)

**Files:**
- Create: `src/app/api/booking/checkout/route.ts`
- Create: `src/lib/booking/booking-number.ts`

**Interfaces:**
- Consumes: everything above, plus `chargeCard`/`isSquareConfigured` (`src/lib/shop/square.ts`), `escapeHtml` pattern not needed here, `sendBookingEmails` (Task 8 — wired in Task 8's steps; until then the route compiles with the email call commented in), `claimTrackingEvent` (`src/lib/tracking-dedupe.ts`), `sendBookingPurchase` (`src/lib/ga4.ts`), `sendMetaPurchase` (`src/lib/meta.ts`)
- Produces:
  - `POST /api/booking/checkout` — request `{ sourceId?, idempotencyKey, product: "farm-tour"|"nordic-spa"|"combo"|"wedding-call", date: "YYYY-MM-DD", time: "HH:MM", spaTime?: "HH:MM", partySize, customer: {firstName,lastName,email,phone}, referralSource, policyAgreed: true, locationChoice?, giftCode?, attribution?, clientId?, fbp?, fbc?, website? }`
  - responses: `{ success: true, bookingNumber, amountCents }` · 402 `{ error, reuseIdempotencyKey }` · 409 slot-full · 400/403/404/429/503
  - `generateBookingNumber(now?: Date): string` — `HFB-YYMMDD-NNNN`

- [ ] **Step 1: Implement `src/lib/booking/booking-number.ts`**

```ts
/** Human-facing booking id: HFB-260905-4821. Readable over the phone. */
export function generateBookingNumber(now = new Date()): string {
  const stamp = [
    String(now.getUTCFullYear()).slice(2),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `HFB-${stamp}-${suffix}`;
}
```

- [ ] **Step 2: Implement the route** — same skeleton as `src/app/api/shop/checkout/route.ts` (copy its origin allowlist, rate limiter, `bad()`, `isAllowedOrigin()` verbatim; they are deliberately identical):

```ts
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import {
  BOOKING_PRODUCTS, COMBO, getBookingProduct, unitsFor,
} from "@/lib/booking/products";
import { slotCapacity } from "@/lib/booking/engine";
import { slotToUtc } from "@/lib/booking/time";
import {
  claimSlots, confirmBookings, releaseBookings,
  getGiftCertificate, redeemGiftCertificate, restoreGiftCertificate,
  getScheduleData, type ClaimLeg,
} from "@/lib/booking/store";
import { generateBookingNumber } from "@/lib/booking/booking-number";
import { chargeCard, isSquareConfigured } from "@/lib/shop/square";
import { claimTrackingEvent } from "@/lib/tracking-dedupe";
import { sendBookingPurchase } from "@/lib/ga4";
import { sendMetaPurchase } from "@/lib/meta";
import { sendBookingEmails } from "@/lib/booking/confirmation-email";

// [origin allowlist + rate limiter + bad() + isAllowedOrigin() copied verbatim
//  from src/app/api/shop/checkout/route.ts — same hosts, same 12/15min limit]

const checkoutSchema = z.object({
  sourceId: z.string().min(1).max(2048).optional(),
  idempotencyKey: z.string().min(8).max(128),
  product: z.enum(["farm-tour", "nordic-spa", "combo", "wedding-call"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  spaTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), // combo's second leg
  partySize: z.number().int().min(1).max(6),
  customer: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().min(7).max(40),
  }),
  referralSource: z.string().trim().min(1).max(200),
  policyAgreed: z.literal(true),
  locationChoice: z.enum(["meet", "in_person"]).optional(),
  giftCode: z.string().trim().max(64).optional(),
  attribution: z.record(z.string(), z.string()).optional(),
  clientId: z.string().max(64).optional(),
  fbp: z.string().max(128).optional(),
  fbc: z.string().max(256).optional(),
  website: z.string().max(200).optional(), // honeypot
});

export async function POST(request: Request) {
  if (!nativeCalendarEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    // [cleanupRateLimit + origin check + ip/rate-limit — verbatim shop pattern]

    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) {
      return bad("That booking didn't look right. Please check your details and try again.");
    }
    const body = parsed.data;
    if (body.website) {
      return NextResponse.json({ success: true, bookingNumber: generateBookingNumber(), amountCents: 0 });
    }

    // ---- Resolve legs. The server re-derives every price and slot. ----
    const isCombo = body.product === "combo";
    const legDefs = isCombo
      ? [
          { slug: "farm-tour" as const, time: body.time },
          { slug: "nordic-spa" as const, time: body.spaTime! },
        ]
      : [{ slug: body.product as Exclude<typeof body.product, "combo">, time: body.time }];
    if (isCombo && !body.spaTime) return bad("Pick a spa time for your Full Farm Day.");

    const slugs = legDefs.map((l) => l.slug);
    const data = await getScheduleData(slugs, body.date, body.date);
    const now = new Date();

    const legs: ClaimLeg[] = [];
    for (const def of legDefs) {
      const product = BOOKING_PRODUCTS[def.slug];
      if (body.partySize < product.minParty || body.partySize > product.maxParty) {
        return bad(`${product.name} is for ${product.minParty}-${product.maxParty} guests.`);
      }
      const capacity = slotCapacity({
        product, dateStr: body.date, time: def.time,
        schedules: data.schedules, exceptions: data.exceptions,
        blackouts: data.blackouts, now,
      });
      if (capacity === null) {
        return bad("That time isn't offered on that date. Please pick from the calendar.", 409);
      }
      legs.push({
        productSlug: product.slug,
        startsAt: slotToUtc(body.date, def.time).toISOString(),
        durationMin: product.durationMin,
        capacity,
        partySize: body.partySize,
        units: unitsFor(product, body.partySize),
        amountCents: product.pricePerPersonCents * body.partySize,
      });
    }

    // Combo buffer, either order (mirror of engine.comboDays).
    if (isCombo) {
      const t = Date.parse(legs[0].startsAt);
      const s = Date.parse(legs[1].startsAt);
      const ok =
        s - (t + 60 * 60000) >= COMBO.bufferMin * 60000 ||
        t - (s + 90 * 60000) >= COMBO.bufferMin * 60000;
      if (!ok) return bad("Those two times overlap. Leave at least 30 minutes between them.");
    }

    const totalCents = legs.reduce((sum, l) => sum + l.amountCents, 0);
    const isFree = totalCents === 0;
    if (!isFree && !isSquareConfigured()) {
      console.error("[booking] checkout hit with Square unconfigured");
      return bad("Online payment isn't available right now. Please call the farm.", 503);
    }

    // ---- Hold the slot(s) BEFORE money moves ----
    const bookingNumber = generateBookingNumber();
    const claim = await claimSlots(legs, {
      bookingNumber,
      firstName: body.customer.firstName,
      lastName: body.customer.lastName,
      email: body.customer.email,
      phone: body.customer.phone,
      referralSource: body.referralSource,
      policyAgreedAt: new Date().toISOString(),
      locationChoice: body.locationChoice ?? null,
    });
    if (!claim.ok) return bad(claim.message, claim.reason === "slot_full" ? 409 : 503);

    // ---- Gift certificate ----
    // `value` certs hold cents; `visits` certs (the Spa 3-Visit Pack) hold
    // per-person session credits. The units the redeem RPC consumes therefore
    // DIFFER by kind — decrementing a visits cert by cents would vaporize it.
    let giftApplied = 0;        // cents credited toward this booking
    let giftUnitsUsed = 0;      // raw units consumed (for restore on failure)
    const giftCode = body.giftCode?.toUpperCase() ?? null;
    if (giftCode && totalCents > 0) {
      const cert = await getGiftCertificate(giftCode);
      // visits certs MUST be product-scoped (a visit credit is a seat in ONE
      // product); value certs may be scoped or universal.
      const scopeOk =
        cert &&
        (cert.kind === "visits"
          ? cert.productScope !== null &&
            legs.every((l) => l.productSlug === cert.productScope)
          : cert.productScope === null ||
            legs.every((l) => l.productSlug === cert.productScope));
      if (!cert || !scopeOk) {
        await releaseBookings(claim.ids);
        return bad(
          cert
            ? "That gift code is for a different experience."
            : "That gift code isn't valid. Check it and try again.",
          400,
        );
      }
      const requested =
        cert.kind === "visits" ? body.partySize /* seats */ : totalCents;
      const applied = await redeemGiftCertificate(giftCode, requested);
      if (applied === null) {
        await releaseBookings(claim.ids);
        return bad("That gift code isn't valid. Check it and try again.", 400);
      }
      giftUnitsUsed = applied;
      // A visit credit = one seat at the scoped product's per-person price
      // (single-leg here — visits certs are scope-checked above, and combo has
      // two products so it can never match a scoped cert).
      const perSeatCents = totalCents / body.partySize;
      giftApplied =
        cert.kind === "visits"
          ? Math.min(applied * perSeatCents, totalCents)
          : applied;
    }
    const dueCents = totalCents - giftApplied;

    // ---- Charge (skipped when free or fully covered) ----
    let paymentId: string | null = null;
    if (dueCents > 0) {
      if (!body.sourceId) {
        if (giftUnitsUsed > 0 && giftCode) await restoreGiftCertificate(giftCode, giftUnitsUsed);
        await releaseBookings(claim.ids);
        return bad("Please add a payment method.");
      }
      const charge = await chargeCard({
        sourceId: body.sourceId,
        amountCents: dueCents,
        idempotencyKey: body.idempotencyKey,
        orderNumber: bookingNumber,
        buyerEmail: body.customer.email,
        note: `Highland Farms booking ${bookingNumber} (${body.product})`,
      });
      if (!charge.ok || !charge.paymentId) {
        if (giftUnitsUsed > 0 && giftCode) await restoreGiftCertificate(giftCode, giftUnitsUsed);
        await releaseBookings(claim.ids);
        return bad(charge.error ?? "That payment didn't go through.", 402, {
          reuseIdempotencyKey: charge.outcome === "unknown",
        });
      }
      if (typeof charge.amountCents === "number" && charge.amountCents !== dueCents) {
        console.error(
          `[booking] AMOUNT MISMATCH booking=${bookingNumber} square_payment=${charge.paymentId} expected=${dueCents} captured=${charge.amountCents}`,
        );
      }
      paymentId = charge.paymentId;
    }

    // ---- Money taken (or free). Nothing below may fail the request. ----
    try {
      await confirmBookings(claim.ids, paymentId, giftApplied > 0 ? giftCode : null, giftApplied);
    } catch {
      console.error(
        `[booking] CONFIRM FAILED after payment. booking=${bookingNumber} payment=${paymentId} ids=${claim.ids.join(",")}`,
      );
    }

    const emailData = {
      bookingNumber,
      product: body.product,
      legs: legs.map((l) => ({
        productSlug: l.productSlug,
        startsAt: l.startsAt,
        durationMin: l.durationMin,
      })),
      partySize: body.partySize,
      customerName: `${body.customer.firstName} ${body.customer.lastName}`,
      customerEmail: body.customer.email,
      customerPhone: body.customer.phone,
      totalCents,
      giftAppliedCents: giftApplied,
      paidCents: dueCents,
      locationChoice: body.locationChoice ?? null,
    };

    after(async () => {
      try {
        await sendBookingEmails(emailData);
      } catch (err) {
        console.error("[booking] confirmation emails threw:", err);
      }
      try {
        // Track CASH COLLECTED (dueCents), not the pre-gift total: gift-cert
        // revenue is tracked when the certificate is sold — counting it again
        // at redemption would double-count and inflate ad ROAS.
        const fresh = await claimTrackingEvent(`native_${bookingNumber}`, "purchase", "native-booking");
        if (fresh && dueCents > 0) {
          await sendBookingPurchase({
            transaction_id: bookingNumber,
            value: dueCents / 100,
            booking_type: body.product === "nordic-spa" ? "nordic_spa" : body.product.replace(/-/g, "_"),
            items: legs.map((l) => ({
              item_id: l.productSlug,
              item_name: BOOKING_PRODUCTS[l.productSlug as keyof typeof BOOKING_PRODUCTS].name,
              price: l.amountCents / 100,
              quantity: 1,
            })),
            referral_source: body.referralSource,
            attribution: body.attribution,
            client_id: body.clientId,
          });
          await sendMetaPurchase({
            transaction_id: `native_${bookingNumber}`,
            value: dueCents / 100,
            content_name: emailData.legs.map((l) => l.productSlug).join("+"),
            content_category: "booking",
            email: body.customer.email,
            phone: body.customer.phone,
            fbc: body.fbc,
            fbp: body.fbp,
            referral_source: body.referralSource,
          });
        }
      } catch (err) {
        console.error("[booking] tracking threw:", err);
      }
    });

    return NextResponse.json({ success: true, bookingNumber, amountCents: dueCents });
  } catch (err) {
    console.error("[booking] checkout error:", err);
    return bad("Something went wrong. Please try again, or call the farm.", 500);
  }
}
```

Note: until Task 8 lands, stub `sendBookingEmails` import by creating the Task 8 file first if executing out of order — otherwise execute Task 8 before this compiles. (Tasks 7 and 8 commit together if needed; see Task 8 Step 4.)

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit` → the only error should be the missing `confirmation-email` module (resolved by Task 8).

- [ ] **Step 4: Commit deferred to Task 8** (route + emails land as one buildable unit).

---

### Task 8: Confirmation emails (`src/lib/booking/confirmation-email.ts`)

**Files:**
- Create: `src/lib/booking/confirmation-email.ts`
- Modify: none

**Interfaces:**
- Consumes: `formatCents` (`src/lib/shop/money.ts`), `escapeHtml` (`src/lib/html.ts`), Resend pattern from `src/lib/shop/order-email.ts` (`FROM = "Highland Farms <notifications@highlandfarmsoregon.com>"`, farm copy to `info@highlandfarms-oregon.com`)
- Produces:
  - `interface BookingEmailData { bookingNumber: string; product: string; legs: { productSlug: string; startsAt: string; durationMin: number }[]; partySize: number; customerName: string; customerEmail: string; customerPhone: string; totalCents: number; giftAppliedCents: number; paidCents: number; locationChoice: "meet" | "in_person" | null }`
  - `sendBookingEmails(data: BookingEmailData): Promise<void>` — customer confirmation + farm notification
  - `renderBookingConfirmation(data: BookingEmailData): string` (exported for tests)

- [ ] **Step 1: Write the failing tests** (append to `scripts/booking-engine.test.mts`)

```ts
import { renderBookingConfirmation } from "../src/lib/booking/confirmation-email.ts";

test("email: confirmation carries the strict policy and the weather promise", () => {
  const html = renderBookingConfirmation({
    bookingNumber: "HFB-260905-1234",
    product: "farm-tour",
    legs: [{ productSlug: "farm-tour", startsAt: "2026-09-05T17:00:00.000Z", durationMin: 60 }],
    partySize: 2,
    customerName: "Ada Lovelace",
    customerEmail: "ada@example.com",
    customerPhone: "555-0100",
    totalCents: 15000,
    giftAppliedCents: 0,
    paidCents: 15000,
    locationChoice: null,
  });
  assert.match(html, /HFB-260905-1234/);
  assert.match(html, /all bookings are final/i);
  assert.match(html, /weather or animal|guest safety/i);
  assert.match(html, /Saturday, September 5/);
  assert.match(html, /10:00 AM/);          // Pacific wall clock, not UTC
  assert.match(html, /\$150\.00/);
  assert.doesNotMatch(html, /reschedul/i); // never promise what the policy denies
});

test("email: gift line renders only when a gift was applied", () => {
  const base = {
    bookingNumber: "HFB-260905-5678",
    product: "nordic-spa" as const,
    legs: [{ productSlug: "nordic-spa", startsAt: "2026-09-05T18:00:00.000Z", durationMin: 90 }],
    partySize: 2,
    customerName: "A", customerEmail: "a@b.c", customerPhone: "5550100",
    totalCents: 15000, giftAppliedCents: 0, paidCents: 15000, locationChoice: null,
  };
  assert.doesNotMatch(renderBookingConfirmation(base), /gift/i);
  assert.match(
    renderBookingConfirmation({ ...base, giftAppliedCents: 5000, paidCents: 10000 }),
    /Gift certificate.*\$50\.00/s,
  );
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Implement `src/lib/booking/confirmation-email.ts`**

```ts
import { Resend } from "resend";
import { escapeHtml } from "@/lib/html";
import { formatCents } from "@/lib/shop/money";
import { getBookingProduct } from "./products";

/**
 * Booking confirmation (customer) + notification (farm).
 *
 * Copy rules: the strict policy is restated in full — this email is the
 * point-of-sale disclosure's receipt-side twin — and NOTHING in here may
 * promise a refund, reschedule, credit, or transfer. The one promise we DO
 * make: if the FARM cancels for weather or animal/guest safety, full refund
 * or first pick of new dates.
 */

let resend: Resend | undefined;
function getResend(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

const FROM = "Highland Farms <notifications@highlandfarmsoregon.com>";
const FARM_RECIPIENTS = ["info@highlandfarms-oregon.com"];
const TZ = "America/Los_Angeles";

export interface BookingEmailData {
  bookingNumber: string;
  product: string;
  legs: { productSlug: string; startsAt: string; durationMin: number }[];
  partySize: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalCents: number;
  giftAppliedCents: number;
  paidCents: number;
  locationChoice: "meet" | "in_person" | null;
}

function legLine(leg: BookingEmailData["legs"][number]): string {
  const product = getBookingProduct(leg.productSlug);
  const when = new Date(leg.startsAt);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(when);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour: "numeric", minute: "2-digit",
  }).format(when);
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #eee"><strong>${escapeHtml(product?.name ?? leg.productSlug)}</strong></td>
    <td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(day)} · ${escapeHtml(time)} (${leg.durationMin} min)</td>
  </tr>`;
}

export function renderBookingConfirmation(data: BookingEmailData): string {
  const giftRow = data.giftAppliedCents > 0
    ? `<tr><td style="padding:4px 0">Gift certificate</td>
         <td style="padding:4px 0;text-align:right">−${formatCents(data.giftAppliedCents)}</td></tr>`
    : "";
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2d2a26">
    <h1 style="font-size:22px">You're booked, ${escapeHtml(data.customerName.split(" ")[0])}.</h1>
    <p>Booking <strong>${escapeHtml(data.bookingNumber)}</strong> · ${data.partySize} ${data.partySize === 1 ? "guest" : "guests"}</p>
    <table style="width:100%;border-collapse:collapse">${data.legs.map(legLine).join("")}</table>
    <table style="width:100%;border-collapse:collapse;margin-top:12px">
      <tr><td style="padding:4px 0">Total</td>
          <td style="padding:4px 0;text-align:right">${formatCents(data.totalCents)}</td></tr>
      ${giftRow}
      <tr><td style="padding:4px 0"><strong>Paid</strong></td>
          <td style="padding:4px 0;text-align:right"><strong>${formatCents(data.paidCents)}</strong></td></tr>
    </table>
    <h2 style="font-size:16px;margin-top:24px">Getting here</h2>
    <p>Highland Farms, Brightwood, OR — at the base of Mt. Hood, about 50 minutes
    from Portland. Leave Portland an hour before your time and you'll arrive with
    ten minutes to spare. Wear closed-toe shoes; dress for the weather.</p>
    <h2 style="font-size:16px;margin-top:24px">Our booking policy</h2>
    <p>All bookings are final — no refunds, credits, or transfers, including
    no-shows. Please double-check your date, time, and guest count now.
    The one exception is ours: if we cancel for weather or animal/guest
    safety, you get a full refund or first pick of new dates. Your call.</p>
    <p style="margin-top:24px">Questions? Reply to this email or call (971) 563-1921.</p>
    <p style="color:#8a8378;font-size:12px;margin-top:24px">Highland Farms · Brightwood, Oregon</p>
  </div>`;
}

export async function sendBookingEmails(data: BookingEmailData): Promise<void> {
  const client = getResend();
  await client.emails.send({
    from: FROM,
    to: data.customerEmail,
    subject: `You're booked — ${data.bookingNumber}`,
    html: renderBookingConfirmation(data),
  });
  await client.emails.send({
    from: FROM,
    to: FARM_RECIPIENTS,
    subject: `New booking: ${data.legs.map((l) => l.productSlug).join(" + ")} · ${data.bookingNumber}`,
    html: `<p>${escapeHtml(data.customerName)} (${escapeHtml(data.customerEmail)},
      ${escapeHtml(data.customerPhone)}) booked ${escapeHtml(data.bookingNumber)} —
      ${data.partySize} guests, paid ${formatCents(data.paidCents)}.</p>
      ${renderBookingConfirmation(data)}`,
  });
}
```

- [ ] **Step 4: Run tests, typecheck, build** — `npm test && npx tsc --noEmit && npm run build` → all clean (Task 7's route now compiles).

- [ ] **Step 5: Commit Tasks 7+8 together**

```bash
git add src/app/api/booking/checkout/route.ts src/lib/booking/booking-number.ts src/lib/booking/confirmation-email.ts scripts/booking-engine.test.mts
git commit -m "feat(booking): checkout API — claim, gift certs, Square charge, confirm, emails, tracking"
```

---

### Task 9: Reminders + hold sweep cron (`/api/cron/booking-reminders`)

**Files:**
- Create: `src/app/api/cron/booking-reminders/route.ts`
- Create: `src/lib/booking/reminder-email.ts`
- Modify: `vercel.json` (add cron entry)

**Interfaces:**
- Consumes: `bookings`/`booking_reminders` tables, `sweep_expired_booking_holds` RPC, Resend `FROM` pattern (Task 8), `pacificDateStr` (Task 3)
- Produces: `GET /api/cron/booking-reminders` (hourly, `CRON_SECRET`-authed like `/api/cron/daily-report`): sweeps expired holds, sends the `48h` reminder (starts_at within 42–54h) and `morning_of` reminder (Pacific-today bookings, 6 AM–noon Pacific runs), stamping `booking_reminders` BEFORE sending.

- [ ] **Step 1: Implement `src/lib/booking/reminder-email.ts`**

```ts
import { Resend } from "resend";
import { escapeHtml } from "@/lib/html";
import { getBookingProduct } from "./products";

let resend: Resend | undefined;
function getResend(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}
const FROM = "Highland Farms <notifications@highlandfarmsoregon.com>";
const TZ = "America/Los_Angeles";

export interface ReminderBooking {
  id: string;
  booking_number: string;
  product_slug: string;
  starts_at: string;
  party_size: number;
  first_name: string;
  email: string;
}

export async function sendReminder(
  b: ReminderBooking,
  kind: "48h" | "morning_of",
): Promise<void> {
  const product = getBookingProduct(b.product_slug);
  const when = new Date(b.starts_at);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, weekday: "long", month: "long", day: "numeric",
  }).format(when);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour: "numeric", minute: "2-digit",
  }).format(when);
  const subject =
    kind === "48h"
      ? `See you ${day} — ${product?.name ?? b.product_slug}`
      : `Today at ${time} — ${product?.name ?? b.product_slug}`;
  await getResend().emails.send({
    from: FROM,
    to: b.email,
    subject,
    html: `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2d2a26">
      <p>Hi ${escapeHtml(b.first_name)},</p>
      <p>Your ${escapeHtml(product?.name ?? b.product_slug)} for ${b.party_size}
      is ${kind === "48h" ? `coming up ${escapeHtml(day)}` : "today"} at
      <strong>${escapeHtml(time)}</strong> (booking ${escapeHtml(b.booking_number)}).</p>
      <p>We're in Brightwood at the base of Mt. Hood — about 50 minutes from
      Portland. Leave an hour before your time. Closed-toe shoes; dress for the
      weather.</p>
      <p>Questions? Reply here or call (971) 563-1921.</p>
    </div>`,
  });
}
```

- [ ] **Step 2: Implement the cron route**

```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { pacificDateStr } from "@/lib/booking/time";
import { sendReminder, type ReminderBooking } from "@/lib/booking/reminder-email";

export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Sweep abandoned holds even while the flag is off — imports may create them.
  const { data: swept } = await db.rpc("sweep_expired_booking_holds");
  if (!nativeCalendarEnabled()) {
    return NextResponse.json({ swept: swept ?? 0, reminders: 0, disabled: true });
  }

  const now = new Date();
  const in42h = new Date(now.getTime() + 42 * 3600000).toISOString();
  const in54h = new Date(now.getTime() + 54 * 3600000).toISOString();

  const { data: candidates, error } = await db
    .from("bookings")
    .select("id, booking_number, product_slug, starts_at, party_size, first_name, email")
    .eq("status", "confirmed")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", in54h);
  if (error) {
    console.error("[booking] reminder query failed:", error.message);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }

  const today = pacificDateStr(now);
  const pacificHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles", hour: "numeric", hour12: false,
    }).format(now),
  );

  let sent = 0;
  for (const b of (candidates ?? []) as ReminderBooking[]) {
    // Date.parse both sides — Supabase returns "+00:00" offsets, our window
    // strings end in "Z"; comparing those lexicographically is wrong.
    const kind: "48h" | "morning_of" | null =
      Date.parse(b.starts_at) >= Date.parse(in42h)
        ? "48h"
        : pacificDateStr(new Date(b.starts_at)) === today &&
            pacificHour >= 6 && pacificHour < 12
          ? "morning_of"
          : null;
    if (!kind) continue;

    // Stamp BEFORE sending: a crash costs one reminder, never sends two.
    const { error: stampErr } = await db
      .from("booking_reminders")
      .insert({ booking_id: b.id, kind });
    if (stampErr) continue; // 23505 = already sent — exactly what we want

    try {
      await sendReminder(b, kind);
      sent++;
    } catch (err) {
      console.error(`[booking] reminder send failed ${b.booking_number}:`, err);
    }
  }

  return NextResponse.json({ swept: swept ?? 0, reminders: sent });
}
```

- [ ] **Step 3: Add the cron to `vercel.json`**

```json
{ "path": "/api/cron/booking-reminders", "schedule": "20 * * * *" }
```

- [ ] **Step 4: Verify** — `npm run build` clean; `curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/cron/booking-reminders` → `401` without the header.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/booking-reminders/route.ts src/lib/booking/reminder-email.ts vercel.json
git commit -m "feat(booking): reminder cron — 48h + morning-of, stamp-before-send, hold sweep"
```

---

### Task 10: End-to-end API verification + docs

**Files:**
- Modify: `ARCHITECTURE.md` (new "Booking (native calendar)" section)
- Modify: `CLAUDE.md` (env var + key-paths entries)
- Create: `scripts/booking-e2e.md` (the manual test recipe, kept for cutover re-runs)

**Interfaces:**
- Consumes: everything above
- Produces: a documented, executed verification matrix

- [ ] **Step 1: Run the e2e matrix locally** (dev server with `NEXT_PUBLIC_NATIVE_CALENDAR=true`, real Supabase, `BOOKING_DRY_RUN` is NOT a thing in this build — Square unconfigured locally ⇒ paid paths expect 503, which verifies the guard; the charge path itself is exercised in Phase 2's browser pass and the one real-card test). Record each result in `scripts/booking-e2e.md`:

1. Flag off: availability + checkout + reminders (unauthed) → 404 / 404 / 401.
2. Seed one Saturday tour schedule + one spa schedule (SQL insert), GET availability → correct slots, remaining = capacity.
3. Insert a wedding blackout covering that Saturday → both products return zero slots that day; combo returns no pairs.
4. Checkout `wedding-call` (free, no sourceId, after seeding a wedding-call schedule) → `success:true`, row `confirmed`, `amount_cents=0`, confirmation email received.
5. Checkout `farm-tour` with Square unconfigured → 503, zero rows left pending (release ran).
6. Capacity race: two parallel wedding-call checkouts for the same slot (capacity 1, free ⇒ no Square needed) → exactly one `success`, the other 409, exactly one row.
7. Value gift cert: seed `('TESTCERT','value',null,15000,15000,...)`, spa checkout party 2 with `giftCode=TESTCERT` → success with no charge, cert `remaining_units=0`, `status='depleted'`; second use → 400 "isn't valid"; booking row has `gift_amount_cents=15000`.
7b. Visits gift cert: seed `('TESTPACK','visits','nordic-spa',3,3,...)`, spa checkout party 2 with `giftCode=TESTPACK` → success with no charge, cert `remaining_units=1`, booking `gift_amount_cents=15000`; then a farm-tour checkout with `giftCode=TESTPACK` → 400 "different experience", tour hold released.
8. Honeypot `website:"x"` → fake success, zero rows.
9. Foreign origin → 403.
10. Expired-hold sweep: insert a pending row with `hold_expires_at` in the past, hit the cron with the secret → `swept ≥ 1`.
11. Delete every seed/test row when done.

- [ ] **Step 2: Update `ARCHITECTURE.md`** — add under a new `## Booking (native calendar)` heading: the directory block (`src/lib/booking/*`, `src/app/api/booking/*`, `supabase-booking.sql`), and these rules verbatim:

```markdown
1. **The engine is pure; the RPC is the authority.** `engine.ts` decides what's
   offered; `claim_booking_slots` enforces capacity under an advisory lock.
   Availability shown to users is real counts — scarcity is never invented.
2. **Slots are held BEFORE the card is charged** (10-min pending hold), released
   on decline, swept by cron if a crash leaks one.
3. **The server derives every price from `products.ts`.** The browser sends
   product/date/time/party only.
4. **All schedule wall-times are America/Los_Angeles**; storage is timestamptz.
   Conversion happens only in `time.ts`.
5. **A wedding is a blackout** (`booking_blackouts.kind='wedding'`) that blocks
   tours + spa. Weddings are not bookings.
6. **Everything is behind `NEXT_PUBLIC_NATIVE_CALENDAR`** until cutover
   (Phase 3). Acuity remains the live calendar of record until then.
```

- [ ] **Step 3: Update `CLAUDE.md`** — add `NEXT_PUBLIC_NATIVE_CALENDAR` to Public env vars; add `src/lib/booking/` + `/api/booking/*` + `/api/cron/booking-reminders` to Key Paths; one-line pointer to the spec + this plan.

- [ ] **Step 4: Full gate** — `npm test && npm run lint && npm run build` → all clean.

- [ ] **Step 5: Commit + push + PR**

```bash
git add ARCHITECTURE.md CLAUDE.md scripts/booking-e2e.md
git commit -m "feat(booking): e2e verification recipe + architecture docs"
git push -u origin feat/native-calendar-engine
gh pr create --title "Native calendar engine (Phase 1, behind flag)" --body "..."
```

PR body must state: entirely behind `NEXT_PUBLIC_NATIVE_CALENDAR` (off in prod), SQL already applied (inert), live site unchanged — and link the spec.

---

## Deferred to Phase 2 plan (do NOT build here)
Booking UI on product pages, wallets, wedding-call Google Meet integration, gift-certificate purchase pages, admin calendar tabs, sitemap, GTM funnel events for booking pages.

## Deferred to Phase 3 plan (do NOT build here)
Acuity config scrape + Jalene confirmation, historical archive, 191-appointment import, gift-cert balance import, daily-report rewrite, Acuity webhook straggler net, flag flip + RwG withdrawal + Acuity cancellation.
