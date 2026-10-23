-- Creates an order and its line in one transaction, priced from the catalog — never from what the browser sent.
-- Only the place-order Edge Function (service role) may call it.
create or replace function public.create_order(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  o record;
  qty integer := (p ->> 'quantity')::integer;
begin
  select pv.id, pv.price_dzd, pv.label_ar, pr.id as product_id, pr.name
    into v
    from public.product_variants pv
    join public.products pr on pr.id = pv.product_id
   where pv.id = (p ->> 'variant_id')::uuid and pv.active and pr.active and not pr.quote_only;
  if not found then
    return jsonb_build_object('error', 'unavailable');
  end if;

  insert into public.orders (lang, customer_name, phone, email, customer_type, company_name, nif, payment_method, notes, total_dzd)
  values (
    p ->> 'lang', p ->> 'customer_name', p ->> 'phone', p ->> 'email', p ->> 'customer_type',
    nullif(p ->> 'company_name', ''), nullif(p ->> 'nif', ''), p ->> 'payment_method', coalesce(p ->> 'notes', ''),
    v.price_dzd * qty
  )
  returning id, number into o;

  insert into public.order_items (order_id, product_id, variant_id, product_name, variant_label, unit_price_dzd, quantity)
  values (o.id, v.product_id, v.id, v.name, v.label_ar, v.price_dzd, qty);

  return jsonb_build_object('number', o.number, 'product_name', v.name, 'variant_label', v.label_ar, 'total', v.price_dzd * qty);
end;
$$;
revoke all on function public.create_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;
