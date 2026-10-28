import { expect, test } from '@playwright/test'
import catalog from '../src/data/catalog.json' with { type: 'json' }
import { fakeSupabase } from './supabase.ts'

// the catalog changes from the dashboard (and CI refreshes it before testing): read products and prices from it
const buyable = catalog.products.filter((p) => !p.quote_only && p.product_variants.length > 0)
const priced = buyable[0]
const plan = priced.product_variants.at(-1)!
const second = buyable[1]
const quoteOnly = catalog.products.find((p) => p.quote_only)
const grouped = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, ' ')
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

test('the Arabic home page reads right to left and lists the products with their logos', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto('/ar/')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('بالدينار')
  await expect(page.getByRole('link', { name: new RegExp(escape(priced.name)) }).first()).toBeVisible()
  expect(await page.locator('symbol[id^="lg-"]').count()).toBeGreaterThan(5)
  // individuals only, cash at the office: no company or bank transfer wording anywhere
  await expect(page.locator('body')).not.toContainText(/للشركات|تحويل بنكي|فاتورة/)
  // no sideways scrolling, in either direction
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('the language switch keeps the visitor on the same page', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto(`/ar/p/${priced.slug}/`)
  await page.getByRole('link', { name: 'FR', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/fr/p/${priced.slug}/$`))
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.getByRole('button', { name: 'Ajouter au panier' })).toBeVisible()
})

test('buying sends the chosen plans and quantities, never a price, and shows the order number', async ({ page }) => {
  const sent = await fakeSupabase(page)
  await page.goto(`/ar/p/${priced.slug}/`)
  // the radio's name is "<plan> <price>"
  await page.getByRole('radio', { name: new RegExp(`^${escape(plan.label_ar)}`) }).check()
  await page.getByRole('button', { name: '+' }).click()
  await page.getByRole('button', { name: 'اشترِ الآن' }).click()

  await expect(page).toHaveURL(/\/ar\/cart\/$/)
  await expect(page.getByText(grouped(plan.price_dzd * 2)).first()).toBeVisible()
  await page.getByRole('button', { name: 'أرسل الطلب' }).click()
  await expect(page.getByText('هذا الحقل مطلوب').first()).toBeVisible()

  await page.getByLabel('الاسم الكامل').fill('أمين بن علي')
  await page.getByLabel('رقم الهاتف').fill('0661 23 45 67')
  await page.getByLabel('البريد الإلكتروني').fill('amine@example.dz')
  await page.getByRole('button', { name: 'أرسل الطلب' }).click()

  await expect(page.getByText('شكراً! وصلنا طلبك')).toBeVisible()
  await expect(page.getByText('#1007')).toBeVisible()
  const order = sent.find((r) => r.url.includes('place-order') && r.method === 'POST')!.body as Record<string, unknown>
  expect(order).toMatchObject({ items: [{ variant_id: plan.id, quantity: 2 }], lang: 'ar', phone: '0661 23 45 67' })
  expect(JSON.stringify(order)).not.toMatch(/price|total|company|payment/)

  // the cart is emptied once the order is sent
  await page.goto('/ar/cart/')
  await expect(page.getByText('سلتك فارغة')).toBeVisible()
})

test('two products added from the store end up in one cart, kept across visits', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto('/fr/')
  await page.getByRole('button', { name: `Ajouter ${priced.name} au panier` }).click()
  await expect(page.getByText('Ajouté au panier')).toBeVisible()
  await page.getByRole('button', { name: `Ajouter ${second.name} au panier` }).click()
  await expect(page.getByRole('link', { name: 'Panier (2)' })).toBeVisible()

  await page.goto('/fr/cart/')
  await expect(page.getByRole('link', { name: priced.name, exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: second.name, exact: true })).toBeVisible()
  const total = priced.product_variants[0].price_dzd + second.product_variants[0].price_dzd
  await expect(page.getByText(grouped(total), { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Retirer' }).first().click()
  await page.reload()
  await expect(page.getByText('1 produit')).toBeVisible()
})

test('a product without a public price asks for it on WhatsApp, and cannot be added to the cart', async ({ page }) => {
  test.skip(!quoteOnly, 'no quote-only product in the catalog')
  await fakeSupabase(page)
  await page.goto(`/fr/p/${quoteOnly!.slug}/`)
  const ask = page.getByRole('link', { name: 'Demander le prix' })
  await expect(ask).toHaveAttribute('href', new RegExp(`^https://wa\\.me/213\\d+\\?text=${encodeURIComponent(quoteOnly!.name).replace(/%20/g, '(%20|\\+)')}`))
  await expect(page.getByRole('button', { name: 'Ajouter au panier' })).toHaveCount(0)
})

// the products at the top of the home page: the owner's pick, then two more (as heroProducts() picks them)
const hero = catalog.products.find((p) => p.hero) ?? catalog.products[0]
const others = catalog.products.filter((p) => p !== hero && !p.quote_only)
const featured = [hero, ...[...others.filter((p) => p.featured), ...others.filter((p) => !p.featured)].slice(0, 2)]

test('the top of the home page shows the featured products one at a time, and the visitor picks one', async ({ page, request }) => {
  // prerendered: the first one is in the page before any script runs
  const html = await (await request.get('/fr/')).text()
  expect(html).toContain('aria-roledescription="carousel"')
  expect(html).toContain(hero.name)

  await fakeSupabase(page)
  await page.goto('/fr/')
  const tabs = page.getByRole('tab')
  await expect(tabs).toHaveCount(featured.length)
  await expect(page.getByRole('tab', { selected: true })).toHaveAccessibleName(hero.name)
  // only the product in front is offered to screen readers
  await expect(page.getByRole('tabpanel')).toHaveCount(1)
  await expect(page.getByRole('tabpanel').getByRole('heading', { level: 2 })).toHaveText(hero.name)

  await tabs.nth(1).click()
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel').getByRole('heading', { level: 2 })).toHaveText(featured[1].name)
  // asked for less motion (the tests' default): nothing turns, so there is nothing to pause
  await expect(page.getByRole('button', { name: /défilement automatique/ })).toHaveCount(0)
})

test.describe('with motion', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

  test('the top of the home page turns by itself until paused', async ({ page }) => {
    await fakeSupabase(page)
    await page.goto('/fr/')
    await expect(page.getByRole('tab', { selected: true })).toHaveAccessibleName(hero.name)
    await expect(page.getByRole('tab', { selected: true })).toHaveAccessibleName(featured[1].name, { timeout: 10_000 })
    await page.getByRole('button', { name: 'Arrêter le défilement automatique' }).click()
    await expect(page.getByRole('button', { name: 'Relancer le défilement automatique' })).toBeVisible()
    await expect(page.locator('[role="tab"][aria-selected="true"] [style*="progress"]')).toHaveCount(0)
  })

  test('adding a product sends its logo flying into the cart', async ({ page }) => {
    await fakeSupabase(page)
    await page.goto('/fr/')
    await page.getByRole('button', { name: `Ajouter ${priced.name} au panier` }).click()
    await expect(page.locator('[data-flying]')).toHaveCount(1)
    await expect(page.locator('[data-flying]')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Panier (1)' })).toBeVisible()
    await expect(page.getByText('Ajouté au panier')).toBeVisible()
  })
})

test('asked for less motion, adding a product just updates the cart', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto('/fr/')
  await page.getByRole('button', { name: `Ajouter ${priced.name} au panier` }).click()
  await expect(page.getByText('Ajouté au panier')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Panier (1)' })).toBeVisible()
  await expect(page.locator('[data-flying]')).toHaveCount(0)
})

test('the owner signs in, sees a new order with all its lines and confirms it', async ({ page }) => {
  const sent = await fakeSupabase(page, {
    orders: [
      {
        id: 'o1',
        number: 1001,
        created_at: '2026-10-24T09:00:00Z',
        status: 'new',
        lang: 'fr',
        customer_name: 'Nadia Benali',
        phone: '0550610084',
        email: 'nadia@example.dz',
        customer_type: 'person',
        company_name: null,
        nif: null,
        notes: '',
        total_dzd: 17990,
        admin_note: '',
        order_items: [
          { id: 1, product_name: 'ChatGPT Plus', variant_label: 'شهر واحد', unit_price_dzd: 5500, quantity: 2 },
          { id: 2, product_name: 'Kaspersky', variant_label: 'Premium · 5 أجهزة · سنة', unit_price_dzd: 6990, quantity: 1 },
        ],
      },
    ],
  })
  await page.goto('/admin/')
  await page.getByLabel('البريد الإلكتروني').fill('owner@itcitadel.dz')
  await page.getByLabel('كلمة المرور').fill('secret-password')
  await page.getByRole('button', { name: 'دخول' }).click()
  await page.getByRole('button', { name: /#1001/ }).click()
  await expect(page.getByText('Nadia Benali').last()).toBeVisible()
  await expect(page.getByText('Kaspersky', { exact: true }).last()).toBeVisible()
  await page.getByRole('button', { name: 'مؤكَّد', exact: true }).click()
  await expect.poll(() => sent.find((r) => r.method === 'PATCH')?.body).toEqual({ status: 'confirmed' })
})

test('the owner changes a price from the dashboard', async ({ page }) => {
  const sent = await fakeSupabase(page)
  await page.goto('/admin/products')
  await page.getByLabel('البريد الإلكتروني').fill('owner@itcitadel.dz')
  await page.getByLabel('كلمة المرور').fill('secret-password')
  await page.getByRole('button', { name: 'دخول' }).click()
  await expect(page.getByRole('heading', { name: 'المنتجات والأسعار' })).toBeVisible()
  await page.getByRole('link', { name: new RegExp(escape(priced.name)) }).first().click()
  await page.getByLabel('السعر', { exact: true }).first().fill('5900')
  await page.getByRole('button', { name: 'حفظ', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/products$/)
  const upsert = sent.find((r) => r.url.includes('product_variants') && r.method === 'POST')!.body as { price_dzd: number }[]
  expect(upsert[0].price_dzd).toBe(5900)
})

test('the owner adds a real customer review', async ({ page }) => {
  const sent = await fakeSupabase(page)
  await page.goto('/admin/reviews')
  await page.getByLabel('البريد الإلكتروني').fill('owner@itcitadel.dz')
  await page.getByLabel('كلمة المرور').fill('secret-password')
  await page.getByRole('button', { name: 'دخول' }).click()
  await page.getByLabel('اسم الزبون').fill('سارة')
  await page.getByLabel('نص الرأي كما كتبه').fill('تفعيل سريع وخدمة محترمة.')
  await page.getByLabel('نشره الآن').check()
  await page.getByRole('button', { name: 'إضافة الرأي' }).click()
  await expect(page.getByText('«تفعيل سريع وخدمة محترمة.»')).toBeVisible()
  const insert = sent.find((r) => r.url.includes('/rest/v1/reviews') && r.method === 'POST')!.body
  expect(insert).toMatchObject({ author: 'سارة', body: 'تفعيل سريع وخدمة محترمة.', published: true })
})

test('the owner raises the margin and reprices every plan with a purchase price by the rule', async ({ page }) => {
  const claude = catalog.products.find((p) => p.slug === 'claude-pro') ?? priced
  const month = claude.product_variants[0]
  const sent = await fakeSupabase(page, { costs: [{ variant_id: month.id, amount: 20, currency: 'USD' }] })
  await page.goto('/admin/pricing')
  await page.getByLabel('البريد الإلكتروني').fill('owner@itcitadel.dz')
  await page.getByLabel('كلمة المرور').fill('secret-password')
  await page.getByRole('button', { name: 'دخول' }).click()
  await expect(page.getByRole('heading', { name: 'التسعير والأرباح' })).toBeVisible()
  // 20 $ × 245 × 1.4 = 6 860 → 7 000
  await page.getByLabel('هامش الربح (%)').fill('40')
  await page.getByRole('button', { name: 'طبّق القاعدة على كل الأسعار' }).click()
  await expect(page.getByLabel(`سعر البيع: ${claude.name} ${month.label_ar}`)).toHaveValue('7000')
  await page.getByRole('button', { name: 'حفظ' }).click()
  await expect(page.getByText('حُفظت التغييرات')).toBeVisible()
  expect(sent.find((r) => r.url.includes('pricing_rules') && r.method === 'PATCH')?.body).toMatchObject({ margin_percent: 40 })
  const repriced = sent.find((r) => r.url.includes(`product_variants?id=eq.${month.id}`) && r.method === 'PATCH')
  expect(repriced?.body).toEqual({ price_dzd: 7000 })
})
