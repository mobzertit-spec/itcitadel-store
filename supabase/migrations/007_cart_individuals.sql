-- The store sells to individuals only, who pay cash at the office; a visitor can order several products at once (the cart).
-- Also: real customer reviews the owner publishes, and the one product shown at the top of the home page.

-- ── Orders: one kind of customer, one way to pay ─────────────────────────────
-- the columns stay for the orders taken before this change
alter table public.orders alter column customer_type set default 'person';
alter table public.orders alter column payment_method set default 'office_cash';

-- Creates an order with one line per cart item, priced from the catalog — never from what the browser sent.
-- p.items: [{variant_id, quantity}]; any plan that is hidden, removed or quote-only makes the whole order unavailable.
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
    select pv.id, pv.price_dzd, pv.label_ar, pr.id as product_id, pr.name
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
      'unit_price', v.price_dzd, 'quantity', qty, 'line_total', v.price_dzd * qty
    );
  end loop;
  if jsonb_array_length(lines) = 0 then
    return jsonb_build_object('error', 'unavailable');
  end if;

  insert into public.orders (lang, customer_name, phone, email, customer_type, payment_method, notes, total_dzd)
  values (p ->> 'lang', p ->> 'customer_name', p ->> 'phone', p ->> 'email', 'person', 'office_cash', coalesce(p ->> 'notes', ''), total)
  returning id, number into o;

  insert into public.order_items (order_id, product_id, variant_id, product_name, variant_label, unit_price_dzd, quantity)
  select o.id, (l ->> 'product_id')::uuid, (l ->> 'variant_id')::uuid, l ->> 'product_name', l ->> 'variant_label',
         (l ->> 'unit_price')::integer, (l ->> 'quantity')::integer
    from jsonb_array_elements(lines) l;

  return jsonb_build_object('number', o.number, 'total', total, 'lines', lines);
end;
$$;
revoke all on function public.create_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;

-- ── The product at the top of the home page (at most one) ────────────────────
alter table public.products add column hero boolean not null default false;
create unique index products_one_hero on public.products ((true)) where hero;
update public.products set hero = true where slug = 'chatgpt-plus';

-- ── Customer reviews: shown only once the owner publishes them ──────────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  author text not null check (char_length(author) between 2 and 80),
  detail text not null default '' check (char_length(detail) <= 120), -- profession · wilaya
  body text not null check (char_length(body) between 5 and 600),
  product_id uuid references public.products (id) on delete set null,
  published boolean not null default false,
  sort integer not null default 0
);
alter table public.reviews enable row level security;
create policy "reviews: anyone reads published" on public.reviews
  for select to anon, authenticated using (published or (select private.is_admin()));
create policy "reviews: admins write" on public.reviews
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
revoke insert, update, delete, truncate on public.reviews from anon;

-- ── Words for individuals (no companies, no invoices) ────────────────────────
update public.categories set name_ar = 'الإنتاجية والعمل', name_fr = 'Productivité', name_en = 'Productivity' where id = 'collab';

update public.products set
  tagline_ar = 'Photoshop وIllustrator وPremiere Pro وباقي تطبيقات Adobe، مفعّلة على حسابك.',
  tagline_fr = 'Photoshop, Illustrator, Premiere Pro et toutes les applications Adobe, activés sur votre compte.',
  tagline_en = 'Photoshop, Illustrator, Premiere Pro and the rest of Adobe''s apps, activated on your account.',
  description_ar = 'نوفّر اشتراكات Adobe Creative Cloud مفعّلة على حسابك. يتغير السعر حسب الخطة، لذلك راسلنا على واتساب بالخطة التي تريدها ونعطيك السعر الدقيق.',
  description_fr = 'Nous fournissons les abonnements Adobe Creative Cloud, activés sur votre compte. Le prix dépend de la formule : écrivez-nous sur WhatsApp et nous vous donnons le prix exact.',
  description_en = 'We provide Adobe Creative Cloud subscriptions, activated on your account. The price depends on the plan: message us on WhatsApp and we''ll give you the exact price.',
  features_ar = array['كل تطبيقات Adobe أو تطبيق واحد حسب حاجتك', 'مساحة تخزين سحابية', 'الدفع بالدينار في مكتبنا', 'مساعدة في التثبيت'],
  features_fr = array['Toutes les applications Adobe ou une seule, selon votre besoin', 'Stockage cloud', 'Paiement en dinars à notre bureau', 'Aide à l''installation'],
  features_en = array['Every Adobe app, or just the one you need', 'Cloud storage', 'Pay in dinars at our office', 'Help with installation']
where slug = 'adobe-creative-cloud';

update public.products set
  tagline_ar = 'بريد مهني باسم نطاقك، مع Drive وMeet ومستندات Google.',
  tagline_en = 'Professional email on your own domain, with Drive, Meet and Google Docs.',
  description_ar = 'نجهّز لك Google Workspace كاملاً: ربط نطاقك، وإنشاء حسابك، ونقل بريدك القديم إن وُجد. الإعداد مجاني مع كل اشتراك. السعر للمستخدم الواحد في الشهر.',
  description_fr = 'Nous installons Google Workspace pour vous : configuration de votre domaine, création de votre compte et migration de votre ancienne messagerie si besoin. La mise en place est offerte. Prix par utilisateur et par mois.',
  description_en = 'We set up Google Workspace for you: your domain, your account, and migration of your old mailbox if you have one. Setup is free with every subscription. Prices are per user per month.',
  features_ar = array['بريد مهني @نطاقك.dz', 'إعداد مجاني للنطاق والحساب', 'Gmail وDrive وMeet وDocs', 'الدفع بالدينار في مكتبنا'],
  features_fr = array['E-mail professionnel @votredomaine.dz', 'Configuration du domaine et du compte offerte', 'Gmail, Drive, Meet et Docs', 'Paiement en dinars à notre bureau'],
  features_en = array['Professional email @yourdomain.dz', 'Free domain and account setup', 'Gmail, Drive, Meet and Docs', 'Pay in dinars at our office'],
  requirements_ar = 'اسم نطاقك (أو نساعدك في حجزه)، وعدد المستخدمين.',
  requirements_fr = 'Votre nom de domaine (ou nous vous aidons à le réserver) et le nombre d''utilisateurs.',
  requirements_en = 'Your domain name (or we help you register one) and the number of users.'
where slug = 'google-workspace';

update public.products set
  features_ar = array['رخصة أصلية لمدة سنة', 'Windows وmacOS وAndroid وiOS', 'مساعدة في التثبيت', 'الدفع بالدينار في مكتبنا'],
  features_fr = array['Licence officielle d''un an', 'Windows, macOS, Android et iOS', 'Aide à l''installation', 'Paiement en dinars à notre bureau'],
  features_en = array['Genuine one-year licence', 'Windows, macOS, Android and iOS', 'Help with installation', 'Pay in dinars at our office']
where slug = 'kaspersky';
