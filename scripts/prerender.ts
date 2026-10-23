/**
 * Build step 2 (after `vite build`): prerender every public page, in every language, to static HTML.
 *
 * Why: visitors and search engines get real content at once, before any JavaScript runs.
 * Output: dist/<lang>/<page>/index.html for each page, dist/admin/index.html (the bare app shell),
 * robots.txt and — when VITE_SITE_URL is set — sitemap.xml with hreflang alternates and canonical links.
 * dist/404.html stays the plain app shell, so unknown URLs still work (the app takes over).
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createServer, loadEnv } from 'vite'

type Lang = 'ar' | 'fr' | 'en'
type Page = { path: string; lang: Lang; title: string; description: string; index: boolean; alternates?: Record<Lang, string> }
type ServerEntry = { pages: () => Page[]; render: (path: string) => Promise<string> }

const root = path.resolve(import.meta.dirname, '..')
const dist = path.resolve(root, 'dist')
const env = loadEnv('production', root, 'VITE_')
const site = env.VITE_SITE_URL ? env.VITE_SITE_URL.replace(/\/?$/, '/') : ''
const base = env.VITE_BASE ? env.VITE_BASE.replace(/\/?$/, '/') : '/'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const urlFor = (p: string) => site + p.replace(/^\//, '')

// 404.html is the untouched app shell written by `vite build` (see vite.config.ts) — the template for every page
const template = readFileSync(path.join(dist, '404.html'), 'utf8')
if (!template.includes('<div id="root"></div>')) throw new Error('dist/404.html has no empty #root — run `vite build` first')

function headFor(page: Page) {
  const tags: string[] = []
  if (site) {
    tags.push(`<link rel="canonical" href="${urlFor(page.path === '/' ? '/ar/' : page.path)}" />`, `<meta property="og:url" content="${urlFor(page.path)}" />`)
    if (page.alternates) {
      for (const [lang, p] of Object.entries(page.alternates)) tags.push(`<link rel="alternate" hreflang="${lang}" href="${urlFor(p)}" />`)
      tags.push(`<link rel="alternate" hreflang="x-default" href="${urlFor(page.alternates.ar)}" />`)
    }
  }
  if (!page.index) tags.push('<meta name="robots" content="noindex" />')
  return tags
}

function fill(page: Page, app: string) {
  return template
    .replace(/<html lang="[^"]*" dir="[^"]*">/, `<html lang="${page.lang}" dir="${page.lang === 'ar' ? 'rtl' : 'ltr'}">`)
    .replace(/<title>.*?<\/title>/, `<title>${esc(page.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(page.description)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(page.title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(page.description)}`)
    .replace('</head>', `    ${headFor(page).join('\n    ')}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${app}</div>`)
}

function write(urlPath: string, html: string) {
  const dir = path.join(dist, urlPath)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'index.html'), html)
}

const vite = await createServer({
  root,
  mode: 'production',
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, ws: false },
})
try {
  const entry = (await vite.ssrLoadModule('/src/entry-server.tsx')) as ServerEntry
  const pages = entry.pages()
  for (const page of pages) {
    const app = await entry.render(page.path)
    if (app.length < 500) throw new Error(`${page.path}: prerendered HTML looks empty`)
    write(page.path, fill(page, app))
  }

  // the dashboard: a real page (HTTP 200) with no prerendered content, never indexed
  write('/admin/', template.replace('</head>', '    <meta name="robots" content="noindex" />\n  </head>').replace(/<title>.*?<\/title>/, '<title>ITCITADEL · Admin</title>'))

  writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: ${base}admin/\n${site ? `\nSitemap: ${site}sitemap.xml\n` : ''}`)
  if (site) {
    const today = new Date().toISOString().slice(0, 10)
    const urls = pages
      .filter((p) => p.index)
      .map((p) => {
        const alt = Object.entries(p.alternates ?? {})
          .map(([lang, a]) => `\n    <xhtml:link rel="alternate" hreflang="${lang}" href="${urlFor(a)}" />`)
          .join('')
        return `  <url>\n    <loc>${urlFor(p.path)}</loc>\n    <lastmod>${today}</lastmod>${alt}\n  </url>`
      })
      .join('\n')
    writeFileSync(
      path.join(dist, 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
    )
  }
  if (existsSync(path.join(dist, '.vite'))) rmSync(path.join(dist, '.vite'), { recursive: true, force: true })
  console.log(`prerendered ${pages.length} pages${site ? ` for ${site}` : ''}`)
} finally {
  await vite.close()
}
