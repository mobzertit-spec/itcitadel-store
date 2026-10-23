import { Link, useSearchParams } from 'react-router-dom'
import { Meta } from '@/components/Meta'
import { ProductCard } from '@/components/ProductCard'
import { useCatalog } from '@/lib/catalog'
import { href, pick, useLang, useT } from '@/lib/lang'

export default function Catalog() {
  const lang = useLang()
  const t = useT()
  const { catalog } = useCatalog()
  const [params] = useSearchParams()
  const active = params.get('c')
  const products = active ? catalog.products.filter((p) => p.category_id === active) : catalog.products

  const chip = (on: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-semibold transition ${on ? 'border-ink bg-ink text-white' : 'border-line bg-card text-ink-2 hover:border-ink/30'}`

  return (
    <div className="container-x pt-12">
      <Meta title={t.meta.catalogTitle} description={t.meta.catalogDescription} />
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.catalog.title}</h1>
      <p className="mt-3 text-lg text-ink-2">{t.catalog.lead}</p>

      <nav className="mt-8 flex flex-wrap gap-2" aria-label={t.home.categoriesTitle}>
        <Link to={href(lang, 'products')} className={chip(!active)} aria-current={!active ? 'page' : undefined}>
          {t.catalog.all}
        </Link>
        {catalog.categories.map((c) => (
          <Link key={c.id} to={`${href(lang, 'products')}?c=${c.id}`} className={chip(active === c.id)} aria-current={active === c.id ? 'page' : undefined}>
            {pick(c, 'name', lang)}
          </Link>
        ))}
      </nav>

      {products.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-muted">{t.catalog.empty}</p>
      )}
    </div>
  )
}
