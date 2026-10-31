import { Link, useSearchParams } from 'react-router-dom'
import { Meta } from '@/components/Meta'
import { ProductTile, tileGrid } from '@/components/ProductTile'
import { fill } from '@/i18n/strings'
import { useCatalog } from '@/lib/catalog'
import { href, pick, useLang, useT } from '@/lib/lang'
import { rankProducts } from '@/lib/search'

export default function Catalog() {
  const lang = useLang()
  const t = useT()
  const { catalog } = useCatalog()
  const [params] = useSearchParams()
  const active = params.get('c')
  const q = params.get('q')?.trim() ?? ''
  // the same search as the header's suggestions (lib/search.ts): names first, Arabic spellings of the brands too
  const inCategory = catalog.products.filter((p) => !active || p.category_id === active)
  const products = q ? rankProducts(inCategory, catalog.categories, q) : inCategory

  return (
    <div className="container-x pt-10 sm:pt-14">
      <Meta title={t.meta.catalogTitle} description={t.meta.catalogDescription} />
      <h1 className="h-section">{q ? fill(t.catalog.results, { q }) : t.catalog.title}</h1>
      <p className="mt-3 text-lg text-muted">{t.catalog.lead}</p>

      <nav className="-mx-4 mt-8 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" aria-label={t.footer.store}>
        <Link to={href(lang, 'products')} viewTransition className="pill" aria-current={!active && !q ? 'page' : undefined}>
          {t.catalog.all}
        </Link>
        {catalog.categories.map((c) => (
          <Link key={c.id} to={`${href(lang, 'products')}?c=${c.id}`} viewTransition className="pill" aria-current={active === c.id ? 'page' : undefined}>
            {pick(c, 'name', lang)}
          </Link>
        ))}
      </nav>

      {products.length ? (
        <div className={`mt-8 ${tileGrid(catalog.products.length)}`}>
          {products.map((p, i) => (
            <ProductTile key={p.id} product={p} catalog={catalog} i={i} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-lg text-muted">{q ? fill(t.catalog.noResults, { q }) : t.catalog.empty}</p>
      )}
    </div>
  )
}
