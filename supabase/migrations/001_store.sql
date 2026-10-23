-- ITCITADEL store — catalog, orders, quote requests and the admin role.
-- Visitors read the active catalog only. Orders and quote requests are written by the Edge Functions
-- (service role) after they validate the input and look the prices up here, never through the API.

create schema if not exists private;

-- ── Admins ────────────────────────────────────────────────────────────────────
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
grant usage on schema private to authenticated;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- a signed-in user may only see whether they are an admin themselves
create policy "admins: read own row" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── Catalog ───────────────────────────────────────────────────────────────────
create table public.categories (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name_ar text not null,
  name_fr text not null,
  name_en text not null,
  sort integer not null default 0
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  category_id text not null references public.categories (id),
  name text not null, -- brand names read the same in every language
  tagline_ar text not null default '',
  tagline_fr text not null default '',
  tagline_en text not null default '',
  description_ar text not null default '',
  description_fr text not null default '',
  description_en text not null default '',
  features_ar text[] not null default '{}',
  features_fr text[] not null default '{}',
  features_en text[] not null default '{}',
  requirements_ar text not null default '', -- "what we need from you"
  requirements_fr text not null default '',
  requirements_en text not null default '',
  image_url text,
  per_user boolean not null default false, -- the quantity is a number of users, not of subscriptions
  quote_only boolean not null default false, -- no public price: the button asks for a quote
  featured boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create trigger products_touch before update on public.products
  for each row execute function private.touch_updated_at();

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label_ar text not null,
  label_fr text not null,
  label_en text not null,
  price_dzd integer not null default 0 check (price_dzd >= 0), -- all taxes included (TTC)
  active boolean not null default true,
  sort integer not null default 0
);
create index product_variants_product_idx on public.product_variants (product_id);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;

create policy "categories: anyone reads" on public.categories
  for select to anon, authenticated using (true);
create policy "categories: admins write" on public.categories
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "products: anyone reads active" on public.products
  for select to anon, authenticated using (active or (select private.is_admin()));
create policy "products: admins write" on public.products
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "variants: anyone reads active" on public.product_variants
  for select to anon, authenticated using (
    (active and exists (select 1 from public.products p where p.id = product_id and p.active))
    or (select private.is_admin())
  );
create policy "variants: admins write" on public.product_variants
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- ── Orders ────────────────────────────────────────────────────────────────────
create type public.order_status as enum ('new', 'confirmed', 'paid', 'activated', 'cancelled');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001) unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.order_status not null default 'new',
  lang text not null check (lang in ('ar', 'fr', 'en')),
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  phone text not null check (phone ~ '^0[567][0-9]{8}$'),
  email text not null check (char_length(email) <= 200 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  customer_type text not null check (customer_type in ('person', 'company')),
  company_name text check (char_length(company_name) <= 160),
  nif text check (char_length(nif) <= 40),
  payment_method text not null check (payment_method in ('office_cash', 'bank_transfer')),
  notes text not null default '' check (char_length(notes) <= 1000),
  total_dzd integer not null check (total_dzd >= 0),
  admin_note text not null default ''
);
create index orders_status_idx on public.orders (status, created_at desc);
create trigger orders_touch before update on public.orders
  for each row execute function private.touch_updated_at();

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null, -- copied at order time, so later catalog edits do not rewrite old orders
  variant_label text not null,
  unit_price_dzd integer not null check (unit_price_dzd >= 0),
  quantity integer not null check (quantity between 1 and 500)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 501) unique,
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'contacted', 'won', 'lost')),
  lang text not null check (lang in ('ar', 'fr', 'en')),
  company_name text not null check (char_length(company_name) between 2 and 160),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  phone text not null check (phone ~ '^0[567][0-9]{8}$'),
  email text not null check (char_length(email) <= 200 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  message text not null check (char_length(message) between 5 and 3000),
  admin_note text not null default ''
);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.quote_requests enable row level security;

create policy "orders: admins read" on public.orders
  for select to authenticated using ((select private.is_admin()));
create policy "orders: admins update" on public.orders
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "orders: admins delete" on public.orders
  for delete to authenticated using ((select private.is_admin()));
create policy "order items: admins read" on public.order_items
  for select to authenticated using ((select private.is_admin()));
create policy "quotes: admins read" on public.quote_requests
  for select to authenticated using ((select private.is_admin()));
create policy "quotes: admins update" on public.quote_requests
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "quotes: admins delete" on public.quote_requests
  for delete to authenticated using ((select private.is_admin()));

-- defence in depth: visitors hold no privileges on customer data at all, and cannot write the catalog
revoke all on public.orders, public.order_items, public.quote_requests, public.admins from anon;
revoke insert, update, delete, truncate on public.categories, public.products, public.product_variants from anon;
revoke insert, update, delete, truncate on public.admins from authenticated;
revoke insert, truncate on public.orders, public.order_items, public.quote_requests from authenticated;
revoke update, delete on public.order_items from authenticated;

-- ── Rate limits (used by the Edge Functions) ─────────────────────────────────
-- A daily counter per one-way hashed visitor key (never an IP address) plus one global counter.
create table private.rate_usage (
  day date not null,
  key text not null,
  count integer not null default 0,
  primary key (day, key)
);
alter table private.rate_usage enable row level security;

-- Counts one request and says whether it is allowed (per visitor and in total, per day).
create or replace function public.rate_hit(p_key text, p_per_key integer, p_global integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  total integer;
  mine integer;
begin
  delete from private.rate_usage where day < current_date - 2;

  insert into private.rate_usage (day, key, count) values (current_date, '*', 1)
  on conflict (day, key) do update set count = private.rate_usage.count + 1
  returning count into total;
  if total > p_global then
    return false;
  end if;

  insert into private.rate_usage (day, key, count) values (current_date, p_key, 1)
  on conflict (day, key) do update set count = private.rate_usage.count + 1
  returning count into mine;
  return mine <= p_per_key;
end;
$$;
revoke all on function public.rate_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_hit(text, integer, integer) to service_role;

-- ── Product images ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "product images: admins upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and (select private.is_admin()));
create policy "product images: admins update" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and (select private.is_admin()));
create policy "product images: admins delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and (select private.is_admin()));
