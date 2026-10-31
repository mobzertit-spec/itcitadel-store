-- Offers with a countdown, set per plan in the dashboard, and the store's recent orders (shown as small notices).
-- The offer price is charged by create_order while the offer runs: the browser only ever displays it.

alter table public.product_variants
  add column promo_price_dzd integer check (promo_price_dzd >= 0),
  add column promo_ends_at timestamptz,
  add constraint product_variants_promo_both check ((promo_price_dzd is null) = (promo_ends_at is null));

-- ── create_order: as in 009, at the price in force (the offer price while the offer runs) ─
create or replace function public.create_order(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  v record;
  o record;
  qty integer;
  lines jsonb := '[]'::jsonb;
  total integer := 0;
begin
  for item in select value from jsonb_array_elements(coalesce(p -> 'items', '[]'::jsonb)) loop
    qty := (item ->> 'quantity')::integer;
    select pv.id,
           case when pv.promo_price_dzd is not null and pv.promo_ends_at > now() then pv.promo_price_dzd else pv.price_dzd end as price_dzd,
           pv.label_ar, pv.months, pr.id as product_id, pr.name
      into v
      from public.product_variants pv
      join public.products pr on pr.id = pv.product_id
     where pv.id = (item ->> 'variant_id')::uuid and pv.active and pr.active and not pr.quote_only;
    if not found then
      return jsonb_build_object('error', 'unavailable');
    end if;
    total := total + v.price_dzd * qty;
    lines := lines || jsonb_build_object(
      'product_id', v.product_id, 'variant_id', v.id, 'product_name', v.name, 'variant_label', v.label_ar,
      'unit_price', v.price_dzd, 'quantity', qty, 'line_total', v.price_dzd * qty, 'months', v.months
    );
  end loop;
  if jsonb_array_length(lines) = 0 then
    return jsonb_build_object('error', 'unavailable');
  end if;

  insert into public.orders (lang, customer_name, phone, email, customer_type, payment_method, notes, total_dzd)
  values (p ->> 'lang', p ->> 'customer_name', p ->> 'phone', p ->> 'email', 'person', 'office_cash', coalesce(p ->> 'notes', ''), total)
  returning id, number, track_token into o;

  insert into public.order_items (order_id, product_id, variant_id, product_name, variant_label, unit_price_dzd, quantity, months)
  select o.id, (l ->> 'product_id')::uuid, (l ->> 'variant_id')::uuid, l ->> 'product_name', l ->> 'variant_label',
         (l ->> 'unit_price')::integer, (l ->> 'quantity')::integer, (l ->> 'months')::smallint
    from jsonb_array_elements(lines) l;

  return jsonb_build_object('number', o.number, 'total', total, 'lines', lines, 'track', o.track_token);
end;
$$;
revoke all on function public.create_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;

-- ── The store's switches, set by the owner in the dashboard ───────────────────
create table public.store_settings (
  id boolean primary key default true check (id),
  recent_orders boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.store_settings default values;
alter table public.store_settings enable row level security;
create policy "store settings: admins read" on public.store_settings
  for select to authenticated using ((select private.is_admin()));
create policy "store settings: admins update" on public.store_settings
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
revoke all on public.store_settings from anon;

-- ── Recent orders, for the store's notices: real orders of the last 72 hours, never cancelled ones,
-- the first product of each and when it was ordered: no customer, number or amount. Empty when switched off.
create or replace function public.recent_orders()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x order by x.at desc), '[]'::jsonb)
  from (
    select pr.slug, i.product_name as name, o.created_at as at
      from public.orders o
      join lateral (
        select oi.product_id, oi.product_name from public.order_items oi where oi.order_id = o.id order by oi.id limit 1
      ) i on true
      join public.products pr on pr.id = i.product_id and pr.active
     where o.created_at > now() - interval '72 hours'
       and o.status <> 'cancelled'
       and (select s.recent_orders from public.store_settings s where s.id)
     order by o.created_at desc
     limit 8
  ) x
$$;
revoke all on function public.recent_orders() from public;
grant execute on function public.recent_orders() to anon, authenticated, service_role;
