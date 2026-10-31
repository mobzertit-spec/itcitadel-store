import { expect, test, type Page } from '@playwright/test'
import catalog from '../src/data/catalog.json' with { type: 'json' }
import { fakeSupabase } from './supabase.ts'

// products from the catalog, as the dashboard left them: one sold monthly and yearly, one sold yearly only
const months = (v: { months?: number | null }) => v.months ?? 0
const paired = catalog.products.find((p) => !p.quote_only && p.product_variants.some((v) => months(v) === 1) && p.product_variants.some((v) => months(v) === 12))!
const month = paired.product_variants.find((v) => months(v) === 1)!
const year = paired.product_variants.find((v) => months(v) === 12)!
const yearlyOnly = catalog.products.find((p) => !p.quote_only && p.product_variants.length > 0 && p.product_variants.every((v) => months(v) === 12))
const grouped = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, ' ')
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const NOW = new Date('2026-11-01T10:00:00Z')

/** A clock standing still at NOW: time moves only when the test says so. */
async function stillClock(page: Page) {
  await page.clock.install({ time: new Date(NOW.getTime() - 1000) })
  await page.clock.pauseAt(NOW)
}

/** The app has taken over the prerendered page (what is typed into the static HTML before that is lost). */
const appRunning = (page: Page) => page.waitForFunction(() => Object.keys(document.querySelector('main') ?? {}).some((k) => k.startsWith('__react')))

/** The store's search box in the header (the one on screen: the header has one for phones and one for wider screens). */
const searchBox = (page: Page) => page.getByRole('combobox').filter({ visible: true })

test('the eye on a tile opens the product’s plans; adding from there slides the cart in', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto('/ar/')
  await page.getByRole('button', { name: `معاينة سريعة لـ ${paired.name}` }).first().click()
  const quick = page.getByRole('dialog', { name: paired.name })
  await expect(quick).toBeVisible()
  // monthly first; the switch shows the year, with what it saves on twelve months
  await expect(quick.getByRole('radio', { name: new RegExp(`^${escape(month.label_ar)}`) })).toBeChecked()
  await quick.getByRole('button', { name: /سنوي/ }).click()
  await expect(quick.getByRole('button', { name: /سنوي/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(quick.getByRole('radio', { name: new RegExp(`^${escape(year.label_ar)}`) })).toBeChecked()
  await expect(quick.getByText(`وفّر ${grouped(month.price_dzd * 12 - year.price_dzd)}`)).toBeVisible()
  await quick.getByRole('button', { name: 'أضف إلى السلة' }).click()

  await expect(quick).toBeHidden()
  const drawer = page.getByRole('dialog', { name: /سلتك/ })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText(year.label_ar)).toBeVisible()
  await expect(drawer.getByText(grouped(year.price_dzd)).first()).toBeVisible()
  // the drawer says it all: no "added" notice over it
  await expect(page.getByText('أُضيف إلى السلة')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(page.getByRole('link', { name: 'السلة (1)' })).toBeVisible()
})

test('the cart icon slides the cart in; "complete the order" leads to the order form', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto('/fr/')
  await page.getByRole('button', { name: `Ajouter ${paired.name} au panier` }).click()
  await page.getByRole('link', { name: 'Panier (1)' }).filter({ visible: true }).click()
  const drawer = page.getByRole('dialog', { name: /Votre panier/ })
  await expect(drawer).toBeVisible()
  await expect(page).toHaveURL(/\/fr\/$/)
  // quantities and removal work in the drawer too
  await drawer.getByRole('button', { name: '+' }).click()
  await expect(drawer.getByText(grouped(month.price_dzd * 2)).first()).toBeVisible()
  await drawer.getByRole('link', { name: 'Finaliser la commande' }).click()
  await expect(page).toHaveURL(/\/fr\/cart\/$/)
  await expect(drawer).toBeHidden()
  await expect(page.getByLabel('Nom complet')).toBeVisible()
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the cart icon is a plain link to the cart page', async ({ page }) => {
    await page.goto('/ar/')
    await expect(page.getByRole('link', { name: /^السلة/ }).first()).toHaveAttribute('href', /\/ar\/cart\/$/)
  })
})

test('the search suggests products as one types, Arabic spellings of the brands included', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto('/ar/')
  await appRunning(page)
  const box = searchBox(page)
  await box.fill('كلود')
  const claude = catalog.products.find((p) => p.slug === 'claude-pro')!
  const options = page.getByRole('listbox', { name: 'نتائج البحث' }).getByRole('option')
  await expect(options.first()).toContainText(claude.name)
  await expect(options.last()).toHaveText('عرض كل النتائج لـ «كلود»')
  // the keyboard: down to the first product, Enter opens it
  await box.press('ArrowDown')
  await expect(options.first()).toHaveAttribute('aria-selected', 'true')
  await box.press('Enter')
  await expect(page).toHaveURL(new RegExp(`/ar/p/${claude.slug}/$`))
})

test('a search that finds nothing says so, and Enter still searches the store', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto('/fr/')
  await appRunning(page)
  const box = searchBox(page)
  await box.fill('zzqx')
  await expect(page.getByRole('status').getByText('Aucun résultat pour « zzqx »')).toBeVisible()
  await expect(box).toHaveAttribute('aria-expanded', 'false')
  await box.press('Escape')
  await expect(page.getByText('Aucun résultat pour « zzqx »')).toHaveCount(0)
  await box.press('Enter')
  await expect(page).toHaveURL(/\/fr\/products\/\?q=zzqx$/)
})

test('an offer shows the old price struck through and a countdown, and ends on screen without a reload', async ({ page }) => {
  await stillClock(page)
  // the month's offer ends in 2 days, 3 hours, 4 minutes and 5 seconds
  const ends = new Date(NOW.getTime() + ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000).toISOString()
  const offer = month.price_dzd - 1000
  await fakeSupabase(page, { offers: { [month.id]: { promo_price_dzd: offer, promo_ends_at: ends } } })
  await page.goto('/ar/')
  const tile = page.locator('article', { has: page.getByRole('link', { name: paired.name, exact: true }) })
  await expect(tile.getByText('عرض')).toBeVisible()
  await expect(tile.getByText(`2ي 03س`)).toBeVisible()

  await page.goto(`/ar/p/${paired.slug}/`)
  const plan = page.getByRole('radio', { name: new RegExp(`^${escape(month.label_ar)}`) })
  await expect(plan).toBeChecked()
  const picker = page.getByRole('group', { name: 'المدة', exact: true })
  await expect(picker.locator('s', { hasText: grouped(month.price_dzd) })).toBeVisible()
  await expect(picker.getByText(grouped(offer), { exact: true })).toBeVisible()
  const timer = page.getByRole('timer')
  await expect(timer).toContainText('ينتهي العرض خلال')
  await expect(timer).toContainText('02يوم')
  await expect(timer).toContainText('03ساعة')

  // the offer's last second passes: the normal price is back, the countdown gone
  await page.clock.fastForward(((2 * 24 + 3) * 3600 + 4 * 60 + 6) * 1000)
  await expect(page.getByRole('timer')).toHaveCount(0)
  await expect(picker.locator('s')).toHaveCount(0)
  await expect(picker.getByText(grouped(month.price_dzd), { exact: true })).toBeVisible()
})

test('the monthly/yearly switch shows each period’s plans; a product sold one way has none', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto(`/fr/p/${paired.slug}/`)
  const picker = page.getByRole('group', { name: 'Durée', exact: true })
  await expect(picker.getByRole('button', { name: 'Mensuel' })).toHaveAttribute('aria-pressed', 'true')
  await expect(picker.getByRole('radio', { name: new RegExp(`^${escape(year.label_fr)}`) })).toHaveCount(0)
  await picker.getByRole('button', { name: /Annuel/ }).click()
  await expect(picker.getByRole('radio', { name: new RegExp(`^${escape(year.label_fr)}`) })).toBeChecked()
  await expect(picker.getByRole('radio', { name: new RegExp(`^${escape(month.label_fr)}`) })).toHaveCount(0)
  await expect(picker.getByText(/^Économisez/).first()).toBeVisible()

  test.skip(!yearlyOnly, 'no product sold yearly only')
  await page.goto(`/fr/p/${yearlyOnly!.slug}/`)
  await expect(page.getByRole('button', { name: 'Mensuel' })).toHaveCount(0)
  await expect(page.getByText(/^Économisez/)).toHaveCount(0)
  await expect(page.getByRole('radio')).toHaveCount(yearlyOnly!.product_variants.length)
})

test('a real recent order shows as a small notice a while after the page opens, then goes', async ({ page }) => {
  await stillClock(page)
  const at = new Date(NOW.getTime() - 3 * 3600_000).toISOString()
  await fakeSupabase(page, { recent: [{ slug: paired.slug, name: paired.name, at }] })
  await page.goto('/ar/products/')
  await page.waitForLoadState('networkidle')
  const notice = page.getByRole('link', { name: new RegExp(`طُلب ${escape(paired.name)}`) })
  await page.clock.runFor(11_000)
  await expect(notice).toHaveCount(0)
  await page.clock.runFor(2_000)
  await expect(notice).toBeVisible()
  await expect(notice).toContainText('قبل 3 ساعات')
  await page.clock.runFor(6_500)
  await expect(notice).toHaveCount(0)
  // the next one, closed by the visitor: no more for this visit
  await page.clock.runFor(30_000)
  await expect(notice).toBeVisible()
  await page.getByRole('button', { name: 'إخفاء' }).click()
  await expect(notice).toHaveCount(0)
  await page.clock.runFor(120_000)
  await expect(notice).toHaveCount(0)
})

test('no recent orders, or the owner switched them off: no notice at all', async ({ page }) => {
  await stillClock(page)
  const sent = await fakeSupabase(page)
  await page.goto('/ar/')
  await expect.poll(() => sent.some((r) => r.url.includes('rpc/recent_orders'))).toBe(true)
  await page.clock.runFor(120_000)
  await expect(page.getByRole('link', { name: /طُلب/ })).toHaveCount(0)
})

test('no recent-order notice on the cart page', async ({ page }) => {
  await stillClock(page)
  await fakeSupabase(page, { recent: [{ slug: paired.slug, name: paired.name, at: NOW.toISOString() }] })
  await page.goto('/ar/cart/')
  await page.waitForLoadState('networkidle')
  await page.clock.runFor(120_000)
  await expect(page.getByRole('link', { name: /طُلب/ })).toHaveCount(0)
})

test('on a phone, the plan, its price and "add" follow once the buy buttons scroll away', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the bar is for phones')
  await fakeSupabase(page)
  await page.goto(`/ar/p/${paired.slug}/`)
  const bar = page.getByRole('button', { name: `أضف ${paired.name} إلى السلة` })
  await expect(bar).toHaveCount(0)
  await page.getByRole('heading', { name: 'ما تحصل عليه' }).scrollIntoViewIfNeeded()
  await expect(bar).toBeVisible()
  await bar.click()
  await expect(page.getByRole('link', { name: 'السلة (1)' })).toBeVisible()
  // back up to the buttons: the bar goes
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(bar).toHaveCount(0)
})

test('the logos under the hero list every product once for screen readers, each opening its page', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto('/fr/')
  const marquee = page.getByRole('region', { name: 'Tous nos abonnements' })
  await expect(marquee.getByRole('link')).toHaveCount(catalog.products.length)
  await marquee.getByRole('link', { name: paired.name, exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/fr/p/${paired.slug}/$`))
})

test.describe('with motion', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

  test('the logos glide, and stop under the mouse', async ({ page, isMobile }) => {
    await fakeSupabase(page)
    await page.goto('/fr/')
    const track = page.locator('.marquee-track')
    const state = () => track.evaluate((el) => el.getAnimations()[0]?.playState)
    await expect.poll(state).toBe('running')
    test.skip(isMobile, 'no mouse on a phone')
    // the track moves; the mouse rests on the band around it
    await page.getByRole('region', { name: 'Tous nos abonnements' }).hover()
    await expect.poll(state).toBe('paused')
  })

  test('the logo’s light flashes when something is added to the cart', async ({ page }) => {
    await fakeSupabase(page)
    await page.goto('/fr/')
    const light = page.locator('header .logo-light')
    await expect.poll(() => light.evaluate((el) => el.getAnimations().length)).toBe(0)
    await page.getByRole('button', { name: `Ajouter ${paired.name} au panier` }).click()
    await expect.poll(() => light.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0)
  })
})

test('the owner puts a plan on offer until a date, and the dashboard refuses an offer above the price', async ({ page }) => {
  const sent = await fakeSupabase(page)
  await page.goto('/admin/products')
  await page.getByLabel('البريد الإلكتروني').fill('owner@itcitadel.dz')
  await page.getByLabel('كلمة المرور').fill('secret-password')
  await page.getByRole('button', { name: 'دخول' }).click()
  await expect(page.getByRole('button', { name: 'مفعّلة' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('link', { name: new RegExp(escape(paired.name)) }).first().click()

  const first = paired.product_variants[0]
  await page.getByLabel('سعر العرض').first().fill(String(first.price_dzd + 500))
  await page.getByLabel('نهاية العرض').first().fill('2031-06-15T12:00')
  await page.getByRole('button', { name: 'حفظ', exact: true }).click()
  await expect(page.getByText('سعر العرض يجب أن يكون أقل من السعر العادي.')).toBeVisible()

  await page.getByLabel('سعر العرض').first().fill(String(first.price_dzd - 1000))
  await page.getByRole('button', { name: 'حفظ', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/products$/)
  const upsert = sent.find((r) => r.url.includes('product_variants') && r.method === 'POST')!.body as { id: string; promo_price_dzd: number | null; promo_ends_at: string | null }[]
  const saved = upsert.find((v) => v.id === first.id)!
  expect(saved.promo_price_dzd).toBe(first.price_dzd - 1000)
  expect(new Date(saved.promo_ends_at!).getFullYear()).toBe(2031)
})
