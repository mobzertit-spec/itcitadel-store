-- Visitors (anon) cannot run private.is_admin(), so the public read policies must not call it.
-- Admins still see hidden products and plans through the "admins write" policies, which cover select too.
alter policy "products: anyone reads active" on public.products
  using (active);

alter policy "variants: anyone reads active" on public.product_variants
  using (active and exists (select 1 from public.products p where p.id = product_id and p.active));
