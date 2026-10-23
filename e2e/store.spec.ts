import { expect, test } from '@playwright/test'
import catalog from '../src/data/catalog.json' with { type: 'json' }
import { fakeSupabase } from './supabase.ts'

// the catalog changes from the dashboard (and CI refreshes it before testing): read products and prices from it
const priced = catalog.products.find((p) => !p.quote_only && p.product_variants.length > 0)!
const plan = priced.product_variants.at(-1)!
const quoteOnly = catalog.products.find((p) => p.quote_only)
const grouped = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, ' ')

test('the Arabic home page reads right to left and lists the products', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto('/ar/')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('بالدينار')
  await expect(page.getByRole('link', { name: new RegExp(priced.name) }).first()).toBeVisible()
  // no sideways scrolling, in either direction
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('the language switch keeps the visitor on the same page', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto(`/ar/p/${priced.slug}/`)
  await page.getByRole('link', { name: 'FR' }).click()
  await expect(page).toHaveURL(new RegExp(`/fr/p/${priced.slug}/$`))
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.getByText('Choisissez la formule')).toBeVisible()
})

test('ordering sends the chosen plan and quantity, never a price, and shows the order number', async ({ page }) => {
  const sent = await fakeSupabase(page)
  await page.goto(`/ar/p/${priced.slug}/`)
  // the radio's name is "<plan> <price>"
  await page.getByRole('radio', { name: new RegExp(`^${plan.label_ar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).check()
  await page.getByRole('button', { name: '+' }).click()
  await expect(page.getByText(grouped(plan.price_dzd * 2)).first()).toBeVisible()
  await page.getByRole('button', { name: 'اطلب الآن' }).click()

  await page.getByRole('button', { name: 'تأكيد الطلب' }).click()
  await expect(page.getByText('هذا الحقل مطلوب').first()).toBeVisible()

  await page.getByLabel('الاسم الكامل').fill('أمين بن علي')
  await page.getByLabel('رقم الهاتف').fill('0661 23 45 67')
  await page.getByLabel('البريد الإلكتروني').fill('amine@example.dz')
  await page.getByRole('button', { name: 'تأكيد الطلب' }).click()

  await expect(page.getByText('شكراً! وصلنا طلبك')).toBeVisible()
  await expect(page.getByText('#1007')).toBeVisible()
  const order = sent.find((r) => r.url.includes('place-order') && r.method === 'POST')!.body as Record<string, unknown>
  expect(order).toMatchObject({ variant_id: plan.id, quantity: 2, lang: 'ar', phone: '0661 23 45 67' })
  expect(Object.keys(order).some((k) => /price|total/.test(k))).toBe(false)
})

test('a quote-only product leads to the business form, already filled in', async ({ page }) => {
  test.skip(!quoteOnly, 'no quote-only product in the catalog')
  const sent = await fakeSupabase(page)
  await page.goto(`/fr/p/${quoteOnly!.slug}/`)
  await page.getByRole('button', { name: 'Demander le prix' }).click()
  await expect(page).toHaveURL(new RegExp(`/fr/business/\\?p=${quoteOnly!.slug}`))
  await expect(page.getByLabel('De quoi avez-vous besoin ?')).toHaveValue(new RegExp(quoteOnly!.name))
  await page.getByLabel('Raison sociale').fill('SARL Atlas')
  await page.getByLabel('Nom du contact').fill('Nadia')
  await page.getByLabel('Téléphone').fill('0550 61 00 84')
  await page.getByLabel('E-mail').fill('nadia@atlas.dz')
  await page.getByRole('button', { name: 'Envoyer la demande de devis' }).click()
  await expect(page.getByText('Votre demande de devis est bien reçue')).toBeVisible()
  expect(sent.some((r) => r.url.includes('request-quote') && (r.body as { company_name: string }).company_name === 'SARL Atlas')).toBe(true)
})

test('the owner signs in, sees a new order and confirms it', async ({ page }) => {
  const sent = await fakeSupabase(page, {
    orders: [
      {
        id: 'o1',
        number: 1001,
        created_at: '2026-10-23T09:00:00Z',
        status: 'new',
        lang: 'fr',
        customer_name: 'Nadia',
        phone: '0550610084',
        email: 'n@atlas.dz',
        customer_type: 'company',
        company_name: 'SARL Atlas',
        nif: '000123',
        payment_method: 'bank_transfer',
        notes: '',
        total_dzd: 20400,
        admin_note: '',
        order_items: [{ id: 1, product_name: 'Google Workspace', variant_label: 'Business Starter · شهر', unit_price_dzd: 1700, quantity: 12 }],
      },
    ],
  })
  await page.goto('/admin/')
  await page.getByLabel('البريد الإلكتروني').fill('owner@itcitadel.dz')
  await page.getByLabel('كلمة المرور').fill('secret-password')
  await page.getByRole('button', { name: 'دخول' }).click()
  await page.getByRole('button', { name: /#1001/ }).click()
  await expect(page.getByText('SARL Atlas')).toBeVisible()
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
  await page.getByRole('link', { name: new RegExp(priced.name) }).first().click()
  await page.getByLabel('السعر', { exact: true }).first().fill('5900')
  await page.getByRole('button', { name: 'حفظ', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/products$/)
  const upsert = sent.find((r) => r.url.includes('product_variants') && r.method === 'POST')!.body as { price_dzd: number }[]
  expect(upsert[0].price_dzd).toBe(5900)
})
