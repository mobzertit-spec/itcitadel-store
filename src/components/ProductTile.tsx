import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { waLink } from '@/config'
import { fill } from '@/i18n/strings'
import type { Catalog, Product } from '@/lib/catalog'
import { href, pick, useLang, useT } from '@/lib/lang'
import { addToCart } from './AddedToast'
import { ProductMark } from './BrandLogo'
import { FromPrice } from './Price'

/** Grid columns for n tiles on wide screens: one even row up to six products, rows of five after that. */
export const tileGrid = (n: number) => `grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 ${n <= 6 ? 'xl:grid-cols-6' : 'xl:grid-cols-5'}`

/** A store tile: the official logo on a neutral stage, the name, the price, and "+" for the default plan. */
export function ProductTile({ product, catalog }: { product: Product; catalog: Catalog }) {
  const lang = useLang()
  const t = useT()
  const category = catalog.categories.find((c) => c.id === product.category_id)
  const plan = product.product_variants[0]
  return (
    <article className="group relative flex flex-col gap-3.5 rounded-3xl border border-line bg-surface p-2.5 transition hover:border-line-strong">
      <div className="logo-stage aspect-[1.25] transition group-hover:brightness-125">
        <ProductMark product={product} size={60} />
      </div>
      <div className="flex flex-col gap-0.5 px-2">
        {category && <span className="text-sm text-faint">{pick(category, 'name', lang)}</span>}
        <h3 className="latin text-lg leading-snug font-semibold">
          {/* the whole tile opens the product; the buttons below sit above this link */}
          <Link to={href(lang, `p/${product.slug}`)} className="ltr-iso before:absolute before:inset-0 before:rounded-3xl">
            {product.name}
          </Link>
        </h3>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 px-2 pb-2">
        <FromPrice product={product} />
        {product.quote_only || !plan ? (
          <a href={waLink(product.name)} target="_blank" rel="noopener" className="relative text-sm text-fg underline underline-offset-4">
            {t.cta.askPrice}
          </a>
        ) : (
          <button
            type="button"
            onClick={() => addToCart(product, plan, 1, lang)}
            className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-fg text-bg transition hover:bg-white"
            aria-label={fill(t.cta.add, { name: product.name })}
          >
            <Plus className="size-5" strokeWidth={2.2} />
          </button>
        )}
      </div>
    </article>
  )
}
