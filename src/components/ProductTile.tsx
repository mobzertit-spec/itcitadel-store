import { Check, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { waLink } from '@/config'
import { fill } from '@/i18n/strings'
import type { Catalog, Product } from '@/lib/catalog'
import { href, pick, useLang, useT } from '@/lib/lang'
import { morphFrom, stagger } from '@/lib/motion'
import { addToCart } from './AddedToast'
import { ProductMark } from './BrandLogo'
import { FromPrice } from './Price'

/** Grid columns for n tiles on wide screens: one even row up to six products, rows of five after that. */
export const tileGrid = (n: number) => `grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 ${n <= 6 ? 'xl:grid-cols-6' : 'xl:grid-cols-5'}`

/**
 * A store tile: the official logo on a neutral stage, the name, the price, and "+" for the default plan.
 * It appears as it scrolls in (`i`: its place in the grid), lights up under the mouse, and its logo grows into
 * the product page when opened.
 */
export function ProductTile({ product, catalog, i = 0 }: { product: Product; catalog: Catalog; i?: number }) {
  const lang = useLang()
  const t = useT()
  const stage = useRef<HTMLDivElement>(null)
  const [added, setAdded] = useState(false)
  const category = catalog.categories.find((c) => c.id === product.category_id)
  const plan = product.product_variants[0]

  useEffect(() => {
    if (!added) return
    const timer = setTimeout(() => setAdded(false), 1200)
    return () => clearTimeout(timer)
  }, [added])

  return (
    <article
      data-fly-scope
      className="glow lift reveal group relative flex flex-col gap-3.5 rounded-3xl border border-line bg-surface p-2.5"
      style={{ ...stagger(i % 6), viewTransitionName: `tile-${product.slug}` }}
    >
      <div ref={stage} data-fly className="logo-stage aspect-[1.25] overflow-hidden *:transition *:duration-500 *:ease-smooth group-hover:*:scale-[1.08]">
        <ProductMark product={product} size={60} />
      </div>
      <div className="flex flex-col gap-0.5 px-2">
        {category && <span className="text-sm text-faint">{pick(category, 'name', lang)}</span>}
        <h3 className="latin text-lg leading-snug font-semibold">
          {/* the whole tile opens the product; the buttons below sit above this link */}
          <Link
            to={href(lang, `p/${product.slug}`)}
            viewTransition
            onClick={() => morphFrom(stage.current, product.slug)}
            className="ltr-iso before:absolute before:inset-0 before:z-[1] before:rounded-3xl"
          >
            {product.name}
          </Link>
        </h3>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 px-2 pb-2">
        <FromPrice product={product} />
        {product.quote_only || !plan ? (
          <a href={waLink(product.name)} target="_blank" rel="noopener" className="relative z-[2] text-sm text-fg underline underline-offset-4">
            {t.cta.askPrice}
          </a>
        ) : (
          <button
            type="button"
            onClick={(e) => setAdded(addToCart(product, plan, 1, lang, e.currentTarget))}
            className="relative z-[2] inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-fg text-bg transition hover:bg-white active:scale-90"
            aria-label={fill(t.cta.add, { name: product.name })}
          >
            {added ? <Check key="added" className="size-5 animate-pop" strokeWidth={2.4} /> : <Plus className="size-5" strokeWidth={2.2} />}
          </button>
        )}
      </div>
    </article>
  )
}
