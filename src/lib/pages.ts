/**
 * Every URL that gets its own prerendered HTML file, with its title and description,
 * plus the structured data (JSON-LD) search engines read.
 */
import { LANGS, type Lang } from '@shared/validate'
import { BUSINESS } from '@/config'
import { fill, STRINGS } from '@/i18n/strings'
import { lowestPrice, type Catalog, type Product } from './catalog'
import { pick } from './lang'

export type Page = { path: string; lang: Lang; title: string; description: string; index: boolean; alternates?: Record<Lang, string> }

const forEachLang = (page: (lang: Lang) => Omit<Page, 'lang' | 'alternates'>): Page[] => {
  const pages = LANGS.map((lang) => ({ ...page(lang), lang }))
  const alternates = Object.fromEntries(pages.map((p) => [p.lang, p.path])) as Record<Lang, string>
  return pages.map((p) => ({ ...p, alternates }))
}

export function pages(catalog: Catalog): Page[] {
  const m = (lang: Lang) => STRINGS[lang].meta
  return [
    { path: '/', lang: 'ar', title: m('ar').homeTitle, description: m('ar').homeDescription, index: false },
    ...forEachLang((l) => ({ path: `/${l}/`, title: m(l).homeTitle, description: m(l).homeDescription, index: true })),
    ...forEachLang((l) => ({ path: `/${l}/products/`, title: m(l).catalogTitle, description: m(l).catalogDescription, index: true })),
    ...forEachLang((l) => ({ path: `/${l}/legal/`, title: m(l).legalTitle, description: m(l).legalDescription, index: true })),
    ...catalog.products.flatMap((p) =>
      forEachLang((l) => ({ path: `/${l}/p/${p.slug}/`, title: fill(m(l).productTitle, { name: p.name }), description: pick(p, 'tagline', l), index: true })),
    ),
    // the cart and the thank-you page: real pages (HTTP 200) but kept out of search results
    ...forEachLang((l) => ({ path: `/${l}/cart/`, title: m(l).cartTitle, description: m(l).homeDescription, index: false })),
    ...forEachLang((l) => ({ path: `/${l}/order/done/`, title: m(l).doneTitle, description: m(l).homeDescription, index: false })),
  ]
}

const json = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')

export function productJsonLd(p: Product, lang: Lang) {
  const prices = p.product_variants.map((v) => v.price_dzd)
  return json({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: pick(p, 'description', lang),
    category: p.category_id,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'DZD',
      lowPrice: lowestPrice(p),
      highPrice: Math.max(...prices),
      offerCount: prices.length,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: BUSINESS.name },
    },
  })
}

export function businessJsonLd(lang: Lang, url: string) {
  return json({
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: BUSINESS.name,
    url,
    email: BUSINESS.email,
    telephone: BUSINESS.phones.map((p) => `+213${p.replace(/\s/g, '').slice(1)}`),
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Cité Ali Khodja, Lot 46',
      addressLocality: 'Oued Smar',
      addressRegion: lang === 'ar' ? 'الجزائر العاصمة' : 'Alger',
      addressCountry: 'DZ',
    },
    currenciesAccepted: 'DZD',
    paymentAccepted: 'Cash',
    openingHours: BUSINESS.openingHours,
  })
}
