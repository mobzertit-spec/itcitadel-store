-- Live order tracking and phone notifications (Web Push).
-- Each order gets a secret tracking code; its page shows the products, the amount and the status (never the
-- customer's name, phone or email) and updates the moment the owner changes the status. Status changes and, every
-- morning, subscriptions ending within 3 days go to an outbox that the notify Edge Function empties.

create extension if not exists pg_cron;

-- ── Orders: tracking code, activation date; plans: how many months they last ─
alter table public.orders
  add column track_token uuid not null default gen_random_uuid() unique,
  add column activated_at timestamptz;

alter table public.product_variants add column months smallint check (months between 1 and 60);
-- from the plan names: "1 month", "3 months", "1 year", "Standard · 1 device · 1 year"…
update public.product_variants set months = case
  when label_en ~ '[0-9]+ ?[Yy]ears?' then 12 * substring(label_en from '([0-9]+) ?[Yy]ears?')::int
  when label_en ~ '[0-9]+ ?[Mm]onths?' then substring(label_en from '([0-9]+) ?[Mm]onths?')::int
end;

-- a line keeps the length it was sold with, whatever the plan becomes later
alter table public.order_items add column months smallint;
update public.order_items i set months = v.months from public.product_variants v where v.id = i.variant_id;

-- the activation date is set when the owner marks the order activated
create or replace function private.order_activated()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'activated' and old.status is distinct from 'activated' and new.activated_at is null then
    new.activated_at := now();
  end if;
  return new;
end;
$$;
create trigger orders_activated before update of status on public.orders
  for each row execute function private.order_activated();

-- ── create_order: as in 007, plus the plan length on each line and the tracking code in the reply ─
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
    select pv.id, pv.price_dzd, pv.label_ar, pv.months, pr.id as product_id, pr.name
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

-- ── The tracking page's view of an order: no name, phone, email or notes ─────
create or replace function public.order_track(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'number', o.number, 'status', o.status, 'lang', o.lang, 'created_at', o.created_at, 'updated_at', o.updated_at,
    'activated_at', o.activated_at, 'total', o.total_dzd,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name,
        'slug', pr.slug,
        'labels', jsonb_build_object('ar', coalesce(v.label_ar, i.variant_label), 'fr', coalesce(v.label_fr, i.variant_label), 'en', coalesce(v.label_en, i.variant_label)),
        'quantity', i.quantity,
        'line_total', i.unit_price_dzd * i.quantity,
        'months', i.months,
        'ends_at', case when o.activated_at is not null and i.months is not null then o.activated_at + make_interval(months => i.months) end
      ) order by i.id)
      from public.order_items i
      left join public.product_variants v on v.id = i.variant_id
      left join public.products pr on pr.id = i.product_id
      where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.track_token = p_token
$$;
revoke all on function public.order_track(uuid) from public;
grant execute on function public.order_track(uuid) to anon, authenticated, service_role;

-- ── Web Push: the browsers to notify for each order, and the store's VAPID keys ─
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  endpoint text not null check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now(),
  unique (order_id, endpoint)
);
-- one row, created by the push function the first time it runs; the private key never leaves the server
create table public.push_keys (
  id boolean primary key default true check (id),
  public_key text not null,
  private_jwk jsonb not null
);

-- saves a browser for the order with this tracking code; false if there is no such order
create or replace function public.save_push_subscription(p_token uuid, p_endpoint text, p_p256dh text, p_auth text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_order uuid;
begin
  select id into found_order from public.orders where track_token = p_token;
  if not found then
    return false;
  end if;
  -- a handful of devices per order is plenty
  if (select count(*) from public.push_subscriptions s where s.order_id = found_order) >= 10 then
    return true;
  end if;
  insert into public.push_subscriptions (order_id, endpoint, p256dh, auth)
  values (found_order, p_endpoint, p_p256dh, p_auth)
  on conflict (order_id, endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth;
  return true;
end;
$$;
revoke all on function public.save_push_subscription(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.save_push_subscription(uuid, text, text, text) to service_role;

-- ── The outbox: one row per notification to send, each kind at most once per order (or order line) ─
create table public.notifications (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  item_id bigint references public.order_items (id) on delete cascade,
  kind text not null check (kind in ('confirmed', 'paid', 'activated', 'cancelled', 'renewal')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique nulls not distinct (order_id, kind, item_id)
);
create index notifications_pending_idx on public.notifications (id) where sent_at is null;

-- server-side only: no policies, no grants to the browser roles
alter table public.push_subscriptions enable row level security;
alter table public.push_keys enable row level security;
alter table public.notifications enable row level security;
revoke all on public.push_subscriptions, public.push_keys, public.notifications from anon, authenticated;

-- wakes the notify Edge Function (after this transaction commits: pg_net sends from its queue)
create or replace function private.kick_notify()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://gkrbvpncamkcuxhvzjax.supabase.co/functions/v1/notify',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
exception when others then
  raise warning 'notify not reached: %', sqlerrm;
end;
$$;

-- a status change: tell open tracking pages, and queue the customer's notification
create or replace function private.order_status_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    return null;
  end if;
  begin
    perform realtime.send(jsonb_build_object('status', new.status), 'status', 'order:' || new.track_token::text, false);
  exception when others then
    -- the tracking page also refreshes on its own; never block the owner's change
    raise warning 'realtime not reached: %', sqlerrm;
  end;
  if new.status <> 'new' then
    insert into public.notifications (order_id, kind) values (new.id, new.status::text) on conflict do nothing;
    if found then
      perform private.kick_notify();
    end if;
  end if;
  return null;
end;
$$;
create trigger orders_status_changed after update of status on public.orders
  for each row execute function private.order_status_changed();

-- every morning: subscriptions ending within 3 days (Algiers time), one reminder per order line
create or replace function private.queue_renewals()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Africa/Algiers')::date;
  added integer;
begin
  insert into public.notifications (order_id, item_id, kind)
  select o.id, i.id, 'renewal'
    from public.orders o
    join public.order_items i on i.order_id = o.id
   where o.status = 'activated' and o.activated_at is not null and i.months is not null
     and ((o.activated_at + make_interval(months => i.months)) at time zone 'Africa/Algiers')::date between today and today + 3
  on conflict do nothing;
  get diagnostics added = row_count;
  if added > 0 then
    perform private.kick_notify();
  end if;
  return added;
end;
$$;

revoke all on function private.order_activated(), private.kick_notify(), private.order_status_changed(), private.queue_renewals() from public, anon, authenticated;

-- 08:00 UTC = 09:00 in Algiers
select cron.schedule('itc-renewals', '0 8 * * *', 'select private.queue_renewals()');

-- ── The notify function takes the pending rows, with what it needs to write and send them ─
create or replace function public.claim_notifications()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed jsonb;
begin
  with picked as (
    select n.id from public.notifications n
     where n.sent_at is null and n.created_at > now() - interval '7 days'
     order by n.id
     limit 200
     for update skip locked
  ), marked as (
    update public.notifications n set sent_at = now()
      from picked where n.id = picked.id
    returning n.id, n.order_id, n.item_id, n.kind
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'kind', m.kind,
    'number', o.number,
    'lang', o.lang,
    'track', o.track_token,
    'customer_name', o.customer_name,
    'phone', o.phone,
    'products', (select jsonb_agg(x.product_name order by x.id) from public.order_items x where x.order_id = o.id),
    'product_name', i.product_name,
    'labels', case when i.id is null then null else
      jsonb_build_object('ar', coalesce(v.label_ar, i.variant_label), 'fr', coalesce(v.label_fr, i.variant_label), 'en', coalesce(v.label_en, i.variant_label)) end,
    'ends_at', case when i.id is not null and o.activated_at is not null and i.months is not null then o.activated_at + make_interval(months => i.months) end,
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
        from public.push_subscriptions s where s.order_id = o.id
    ), '[]'::jsonb)
  ) order by m.id), '[]'::jsonb)
  into claimed
  from marked m
  join public.orders o on o.id = m.order_id
  left join public.order_items i on i.id = m.item_id
  left join public.product_variants v on v.id = i.variant_id;
  return claimed;
end;
$$;
revoke all on function public.claim_notifications() from public, anon, authenticated;
grant execute on function public.claim_notifications() to service_role;
