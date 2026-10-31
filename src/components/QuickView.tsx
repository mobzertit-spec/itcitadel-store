import { ArrowLeft, ArrowRight, MessageCircle, ShoppingBag, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { waLink } from '@/config'
import { useCatalog, type Catalog, type Product } from '@/lib/catalog'
import { href, pick, useLang, useT } from '@/lib/lang'
import { cartDrawer, quickView, useQuickView } from '@/lib/overlays'
import { track } from '@/lib/track'
import { addToCart } from './AddedToast'
import { ProductMark } from './BrandLogo'
import { PlanPicker } from './PlanPicker'
import { Sheet } from './Sheet'
import { Stepper } from './Stepper'

/**
 * A product's plans, prices and quantity without leaving the page (the eye on a tile opens it): from the bottom on
 * phones, in the middle on wide screens. Adding closes it and slides the cart in.
 */
export function QuickView() {
  const slug = useQuickView()
  const { catalog } = useCatalog()
  // the last product stays drawn while the sheet slides away
  const [kept, setKept] = useState(slug)
  if (slug && slug !== kept) setKept(slug)
  const product = catalog.products.find((p) => p.slug === kept)
  return (
    <Sheet open={!!slug && !!product} onClose={quickView.close} labelledBy="quick-title" className="quick">
      {product && <QuickBody key={product.id} product={product} catalog={catalog} />}
    </Sheet>
  )
}

function QuickBody({ product, catalog }: { product: Product; catalog: Catalog }) {
  const lang = useLang()
  const t = useT()
  const variants = product.product_variants
  const [variantId, setVariantId] = useState(variants[0]?.id)
  const [qty, setQty] = useState(1)
  const variant = variants.find((v) => v.id === variantId) ?? variants[0]
  const category = catalog.categories.find((c) => c.id === product.category_id)
  const buyable = !product.quote_only && !!variant
  const Arrow = lang === 'ar' ? ArrowLeft : ArrowRight

  const add = () => {
    if (variant && addToCart(product, variant, qty, lang)) {
      quickView.close()
      cartDrawer.open()
    }
  }

  return (
    <div className="flex max-h-[inherit] flex-col">
      <div className="flex items-start gap-4 p-5 sm:p-7">
        <span className="logo-stage size-20 shrink-0 rounded-[22px] sm:size-24">
          <ProductMark product={product} size={44} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {category && <span className="text-sm text-faint">{pick(category, 'name', lang)}</span>}
          <h2 id="quick-title" className="latin text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">
            <span className="ltr-iso">{product.name}</span>
          </h2>
          <p className="text-muted">{pick(product, 'tagline', lang)}</p>
        </div>
        <button
          type="button"
          onClick={quickView.close}
          aria-label={t.quick.close}
          className="-me-1 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-raised transition hover:bg-white/10 active:scale-95"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-2 sm:px-7">
        <PlanPicker product={product} value={variant?.id} onChange={setVariantId} name="quick-plan" legend={t.product.plan} />
      </div>

      <div className="flex flex-col gap-3 border-t border-line p-5 sm:px-7">
        {buyable && variant ? (
          <div className="flex gap-3">
            <Stepper value={qty} onChange={setQty} label={product.per_user ? t.product.users : t.product.quantity} />
            <button type="button" className="btn-accent h-14 flex-1" onClick={add}>
              <ShoppingBag className="size-5" aria-hidden="true" />
              {t.cta.addToCart}
            </button>
          </div>
        ) : (
          <a href={waLink(product.name)} target="_blank" rel="noopener" onClick={() => track('Contact')} className="btn-light h-14">
            <MessageCircle className="size-5" aria-hidden="true" />
            {t.cta.askPrice}
          </a>
        )}
        <Link to={href(lang, `p/${product.slug}`)} viewTransition className="inline-flex items-center justify-center gap-2 py-1 text-muted hover:text-fg">
          {t.quick.details}
          <Arrow className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
