import { expect, test, type Locator, type Page } from '@playwright/test'
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

/** Taps a button on a floating card: brought to the middle of the screen, without waiting for the card to stand still. */
async function tapFloating(button: Locator) {
  // once the app runs (it replaces the prerendered page)
  await button.page().waitForFunction(() => Object.keys(document.querySelector('main') ?? {}).some((k) => k.startsWith('__react')))
  await button.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await button.click({ force: true })
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

test('prices are the plans’ own: nothing struck through, no countdown', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto(`/ar/p/${paired.slug}/`)
  const picker = page.getByRole('group', { name: 'المدة', exact: true })
  await expect(picker.getByRole('radio', { name: new RegExp(`^${escape(month.label_ar)}`) })).toBeChecked()
  await expect(picker.getByText(grouped(month.price_dzd), { exact: true })).toBeVisible()
  await expect(page.locator('main s')).toHaveCount(0)
  await expect(page.getByRole('timer')).toHaveCount(0)
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

  test('the logo opens from the gate into ITCITADEL and back, every 10 seconds; adding to the cart flashes its light', async ({ page }) => {
    await fakeSupabase(page)
    await page.goto('/fr/')
    const logo = page.locator('header .lg')
    // the gate, the light and the seven other letters, all on one 10-second loop
    const loops = () => logo.evaluate((el) => el.getAnimations({ subtree: true }).map((a) => [a.effect?.getTiming().duration, a.effect?.getTiming().iterations]))
    await expect.poll(async () => (await loops()).length).toBe(9)
    expect(new Set((await loops()).map(String))).toEqual(new Set(['10000,Infinity']))
    await expect(page.locator('header').getByRole('link', { name: 'ITCITADEL', exact: true })).toBeVisible()
    const light = page.locator('header .lg-i')
    const flashes = () => light.evaluate((el) => el.getAnimations().filter((a) => !(a instanceof CSSAnimation)).length)
    expect(await flashes()).toBe(0)
    await tapFloating(page.getByRole('button', { name: `Ajouter ${paired.name} au panier` }))
    await expect.poll(flashes).toBe(1)
  })

  test('product cards float, each at its own moment, and stand still under the mouse', async ({ page, isMobile }) => {
    await fakeSupabase(page)
    await page.goto('/fr/products/')
    const card = page.locator('main article').first()
    const bob = () => card.evaluate((el) => el.getAnimations().find((a) => a instanceof CSSAnimation && a.animationName === 'bob')?.playState)
    await expect.poll(bob).toBe('running')
    const delays = await page.locator('main article').evaluateAll((els) => els.slice(0, 3).map((el) => getComputedStyle(el).animationDelay))
    expect(new Set(delays).size).toBe(3)
    test.skip(isMobile, 'no mouse on a phone')
    // the card moves; the mouse rests on its cell
    await card.locator('..').hover()
    await expect.poll(bob).toBe('paused')
  })
})

test('asked for less motion, the logo is the word ITCITADEL and the cards stand still', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto('/fr/')
  const logo = page.locator('header .lg')
  await expect(logo).toHaveText('TITADEL')
  expect(await logo.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0)
  for (const letter of await logo.locator('.lg-l').all()) await expect(letter).toHaveCSS('opacity', '1')
  expect(await page.locator('main article').first().evaluate((el) => el.getAnimations().length)).toBe(0)
})

test('the owner switches the recent-order notices off from the dashboard', async ({ page }) => {
  const sent = await fakeSupabase(page)
  await page.goto('/admin/products')
  await page.getByLabel('البريد الإلكتروني').fill('owner@itcitadel.dz')
  await page.getByLabel('كلمة المرور').fill('secret-password')
  await page.getByRole('button', { name: 'دخول' }).click()
  await expect(page.getByRole('button', { name: 'مفعّلة' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'مفعّلة' }).click()
  await expect(page.getByRole('button', { name: 'متوقفة' })).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(() => sent.find((r) => r.url.includes('store_settings') && r.method === 'PATCH')?.body).toMatchObject({ recent_orders: false })
})
