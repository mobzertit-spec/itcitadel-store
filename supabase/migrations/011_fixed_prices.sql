-- Fixed prices: the store sells every plan at the price set in the dashboard, with no offers. create_order goes back
-- to the plan's price (as in 009), and the offer columns added by 010 are dropped (they were never used).
-- The recent orders and their switch (010) stay.

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

alter table public.product_variants
  drop constraint product_variants_promo_both,
  drop column promo_price_dzd,
  drop column promo_ends_at;
