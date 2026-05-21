-- Run this in your Supabase SQL Editor (supabase.com > your project > SQL Editor)

create table event_inquiries (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  phone text,
  event_type text not null,
  preferred_date text,
  message text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table event_inquiries enable row level security;

-- Allow inserts from the anon key (public form submissions)
create policy "Allow public inserts" on event_inquiries
  for insert
  with check (true);

-- Only allow authenticated users (you) to read submissions
create policy "Allow authenticated reads" on event_inquiries
  for select
  using (auth.role() = 'authenticated');

-- Additive tracking fields used by the website attribution pipeline.
alter table event_inquiries
  add column if not exists guest_count text,
  add column if not exists referral_source text,
  add column if not exists consent_marketing_sms boolean default false,
  add column if not exists consent_appointment_sms boolean default false,
  add column if not exists attribution jsonb;

-- Durable dedupe for server-side conversion webhooks. The application inserts
-- before sending GA4 / Meta CAPI events; duplicate event_key rows are skipped.
create table if not exists tracking_events (
  id uuid default gen_random_uuid() primary key,
  event_key text not null unique,
  event_name text not null,
  source text not null,
  created_at timestamptz default now()
);

alter table tracking_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tracking_events'
      and policyname = 'Service role manages tracking events'
  ) then
    create policy "Service role manages tracking events" on tracking_events
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end
$$;
