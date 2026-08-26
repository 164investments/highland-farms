-- Highland Farms — stock counting + Square matching, in the app (2026-08-26)
--
-- Replaces the "email a spreadsheet around" workflow. A count entered here
-- writes straight to shop_inventory and leaves an audit row behind, so the farm
-- can see who counted what and what it was before. A spreadsheet loses both.

create table if not exists shop_stock_counts (
  id           bigserial primary key,
  variant_id   text not null,
  previous     integer,          -- what the system thought before this count
  counted      integer not null check (counted >= 0),
  counted_by   text not null,
  counted_at   timestamptz not null default now()
);

create index if not exists shop_stock_counts_variant_idx
  on shop_stock_counts (variant_id, counted_at desc);
create index if not exists shop_stock_counts_at_idx
  on shop_stock_counts (counted_at desc);

alter table shop_stock_counts enable row level security;
revoke all on shop_stock_counts from public, anon, authenticated;

-- Apply a whole counting session in one transaction.
--
-- Takes [{"variant_id":"...","counted":n}, ...]. Records the prior value on
-- every row before overwriting it, so a miscount can always be traced back.
-- Either the whole count lands or none of it does — a half-applied count is
-- worse than no count, because nobody can tell which half is real.
create or replace function apply_stock_count(p_counted_by text, p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  line record;
  prior integer;
  applied integer := 0;
begin
  if coalesce(trim(p_counted_by), '') = '' then
    raise exception 'counted_by is required' using errcode = 'P0001';
  end if;

  for line in
    select (e ->> 'variant_id') as variant_id,
           (e ->> 'counted')::integer as counted
    from jsonb_array_elements(p_items) as e
    order by 1
  loop
    select stock into prior from shop_inventory
    where variant_id = line.variant_id for update;

    if not found then
      raise exception 'unknown variant %', line.variant_id using errcode = 'P0002';
    end if;

    insert into shop_stock_counts (variant_id, previous, counted, counted_by)
    values (line.variant_id, prior, line.counted, p_counted_by);

    update shop_inventory
    set stock = line.counted, updated_at = now()
    where variant_id = line.variant_id;

    applied := applied + 1;
  end loop;

  return applied;
end;
$$;

revoke all on function apply_stock_count(text, jsonb) from public, anon, authenticated;
grant execute on function apply_stock_count(text, jsonb) to service_role;
