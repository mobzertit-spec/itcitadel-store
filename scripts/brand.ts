/**
 * Every image of the ITCITADEL identity, drawn from the mark in src/components/logo-mark.ts:
 * the favicon, the app and notification icons, the share image (og.png) and the brand files in docs/brand/.
 * Run after changing the mark: `npm run brand` (commits the results; the build does not run it).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from '@playwright/test'
import { LOGOS, type LogoKey } from '../src/components/brand-logos.ts'
import { MARK, markSvg } from '../src/components/logo-mark.ts'

const root = path.resolve(import.meta.dirname, '..')
const out = (p: string) => path.join(root, p)
const font = (file: string) => `data:font/woff2;base64,${readFileSync(out(`node_modules/${file}`)).toString('base64')}`
const FONTS = `
@font-face { font-family: Inter; src: url(${font('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: Zain; src: url(${font('@fontsource/zain/files/zain-arabic-400-normal.woff2')}) format('woff2'); font-weight: 400; }
@font-face { font-family: Zain; src: url(${font('@fontsource/zain/files/zain-arabic-800-normal.woff2')}) format('woff2'); font-weight: 800; }`

const WHITE = '#F5F5F7'
const BLACK = '#0B0B0C'

/** The mark centred in a size×size box, `fill` of its height. */
const centred = (color: string, size: number, fill: number, light?: string) =>
  markSvg(color, `width="${size}" height="${size * fill}" style="display:block"`, light)

/** "IT" light and "CITADEL" bold, spaced out, as in the site's header. */
const lockup = (color: string, mark: number) => `
  <div id="lockup" style="display:inline-flex;align-items:center;gap:${mark * 0.33}px;padding:${mark * 0.25}px;color:${color}">
    ${markSvg(color, `height="${mark}" width="${(mark * 40) / 42}"`)}
    <span style="font-family:Inter;font-size:${mark * 0.56}px;font-weight:300;letter-spacing:.18em">IT<b style="font-weight:700">CITADEL</b></span>
  </div>`

async function shoot(page: Page, html: string, file: string, size: { width: number; height: number }, transparent = false) {
  await page.setViewportSize(size)
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${FONTS} html,body{margin:0;background:transparent}</style></head><body>${html}</body></html>`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: out(file), omitBackground: transparent })
  console.log(file)
}

/** The share image: the promise in Arabic, the logo, and the products' logos. */
function og() {
  const products: LogoKey[] = ['openai', 'claude', 'gemini', 'adobe', 'canva', 'google', 'microsoft', 'zoom']
  const tiles = products
    .map((k) => `<span class="tile"><svg viewBox="${LOGOS[k].viewBox}" width="54" height="54">${LOGOS[k].svg}</svg></span>`)
    .join('')
  return `
  <style>
    .og { position: relative; width: 1200px; height: 630px; overflow: hidden; color: ${WHITE};
      background: radial-gradient(70% 90% at 88% 8%, #2a2a2d 0%, #0d0d0e 48%, #000 78%); }
    .brand { position: absolute; left: 54px; top: 50px; }
    .copy { position: absolute; right: 72px; top: 158px; direction: rtl; text-align: right; font-family: Zain; }
    h1 { margin: 0; font-size: 104px; font-weight: 800; line-height: .98; letter-spacing: -.01em; }
    p { margin: 22px 0 0; font-size: 34px; color: #A1A1A6; }
    p i { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${MARK.orange}; margin-left: 14px; vertical-align: middle; }
    .row { position: absolute; left: 72px; bottom: 64px; display: flex; gap: 16px; }
    .tile { width: 106px; height: 106px; border-radius: 24px; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(180deg, #1c1c1f, #0f0f11); border: 1px solid rgb(255 255 255 / .08); }
  </style>
  <div class="og">
    <div class="brand">${lockup(WHITE, 54)}</div>
    <div class="copy"><h1>اشتراكاتك الرسمية،<br>تدفعها بالدينار.</h1><p><i></i>اطلب أونلاين · ادفع نقداً في مكتبنا بأولاد سمار</p></div>
    <div class="row">${tiles}</div>
  </div>`
}

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })

// the browser tab: the mark on a black tile, so it shows on light and dark tab bars alike
writeFileSync(
  out('public/favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#000"/>` +
    markSvg(WHITE, 'x="13" y="12" width="38" height="40"').replace(' xmlns="http://www.w3.org/2000/svg"', '') +
    `</svg>\n`,
)
console.log('public/favicon.svg')

// app icons: black, the mark at half the height (inside the safe zone of "maskable" icons)
const icon = (size: number) => `<div style="width:${size}px;height:${size}px;background:#000;display:flex;align-items:center;justify-content:center">${centred(WHITE, size * 0.5, 1)}</div>`
for (const size of [192, 512]) await shoot(page, icon(size), `public/icon-${size}.png`, { width: size, height: size })
// Android draws the notification badge from its transparency only: the mark in white
await shoot(page, `<div style="width:96px;height:96px;display:flex;align-items:center;justify-content:center">${centred('#fff', 70, 1, '#fff')}</div>`, 'public/badge-96.png', { width: 96, height: 96 }, true)
await shoot(page, og(), 'public/og.png', { width: 1200, height: 630 })

// brand files for the owner: print, social media, signs
mkdirSync(out('docs/brand'), { recursive: true })
writeFileSync(out('docs/brand/itcitadel-mark-white.svg'), markSvg(WHITE) + '\n')
writeFileSync(out('docs/brand/itcitadel-mark-black.svg'), markSvg(BLACK) + '\n')
await shoot(page, icon(1024), 'docs/brand/itcitadel-icon-1024.png', { width: 1024, height: 1024 })
for (const [name, color] of [['white', WHITE], ['black', BLACK]] as const) {
  await page.setViewportSize({ width: 1800, height: 600 })
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${FONTS} html,body{margin:0;background:transparent}</style></head><body>${lockup(color, 240)}</body></html>`)
  await page.evaluate(() => document.fonts.ready)
  await page.locator('#lockup').screenshot({ path: out(`docs/brand/itcitadel-logo-${name}.png`), omitBackground: true })
  console.log(`docs/brand/itcitadel-logo-${name}.png`)
}
await browser.close()
