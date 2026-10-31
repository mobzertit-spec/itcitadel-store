import { Check, Clock3, Mail, MapPin, MessageCircle, ShoppingBag } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addToCart } from '@/components/AddedToast'
import { BrandLogo, ProductMark } from '@/components/BrandLogo'
import { logoFor } from '@/components/brand-logos'
import { Meta } from '@/components/Meta'
import { PlanPicker } from '@/components/PlanPicker'
import { PlanPrice } from '@/components/Price'
import { ProductTile } from '@/components/ProductTile'
import { Stepper } from '@/components/Stepper'
import { waLink } from '@/config'
import { fill } from '@/i18n/strings'
import { useCatalog, type Catalog, type Product } from '@/lib/catalog'
import { href, pick, pickList, useLang, useT } from '@/lib/lang'
import { stagger, useMorphTarget, useTilt } from '@/lib/motion'
import { priceOf } from '@/lib/offers'
import { productJsonLd } from '@/lib/pages'
import { track } from '@/lib/track'
import NotFound from './NotFound'

/**
 * Has the element scrolled up out of sight, under the sticky header? (Not while it is on screen or below it.) The
 * watched area reaches far below the screen, so a jump from below to above still counts as leaving it.
 */
function useScrolledPast(ref: RefObject<HTMLElement | null>) {
  const [past, setPast] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver !== 'function') return
    const observer = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting), { rootMargin: '-140px 0px 100000px 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return past
}

const INFO_ICONS = [Clock3, Mail, MapPin]

export default function ProductPage() {
  const { slug } = useParams()
  const { catalog, settled } = useCatalog()
  const product = catalog.products.find((p) => p.slug === slug)
  if (!product) return settled ? <NotFound /> : <div className="container-x min-h-[60vh] pt-12" aria-busy="true" />
  return <ProductView key={product.id} product={product} catalog={catalog} />
}

function ProductView({ product, catalog }: { product: Product; catalog: Catalog }) {
  const lang = useLang()
  const t = useT()
  const navigate = useNavigate()
  const variants = product.product_variants
  const [variantId, setVariantId] = useState(variants[0]?.id)
  const [qty, setQty] = useState(1)
  const logoTile = useRef<HTMLDivElement>(null)
  const buyBox = useRef<HTMLDivElement>(null)
  const pastBuyBox = useScrolledPast(buyBox)
  const tilt = useTilt<HTMLDivElement>(10)
  useMorphTarget(logoTile, product.slug)
  const variant = variants.find((v) => v.id === variantId) ?? variants[0]
  const category = catalog.categories.find((c) => c.id === product.category_id)
  const logo = logoFor(product.slug)
  const tagline = pick(product, 'tagline', lang)
  const buyable = !product.quote_only && !!variant
  const related = [
    ...catalog.products.filter((p) => p.id !== product.id && p.category_id === product.category_id),
    ...catalog.products.filter((p) => p.id !== product.id && p.category_id !== product.category_id),
  ].slice(0, 3)

  useEffect(() => {
    track('ViewContent', { content_name: product.name, value: variant && priceOf(variant) })
    // once per product page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  const buyNow = () => {
    if (variant && addToCart(product, variant, qty, lang)) navigate(href(lang, 'cart'), { viewTransition: true })
  }
  const waText = `${product.name}${variant ? ` — ${pick(variant, 'label', lang)}` : ''}`

  return (
    <div className="container-x pt-6">
      <Meta title={fill(t.meta.productTitle, { name: product.name })} description={tagline} />
      {buyable && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd(product, lang) }} />}

      <nav aria-label={t.nav.menu} className="flex flex-wrap gap-2.5 text-sm text-muted">
        <Link to={href(lang, 'products')} viewTransition className="hover:text-fg">
          {t.nav.store}
        </Link>
        {category && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={`${href(lang, 'products')}?c=${category.id}`} viewTransition className="hover:text-fg">
              {pick(category, 'name', lang)}
            </Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="ltr-iso text-fg">{product.name}</span>
      </nav>

      <section className="mt-6 grid items-start gap-8 lg:mt-8 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <div data-fly-scope className="spotlight flex aspect-[1.1] items-center justify-center rounded-[36px] border border-line bg-surface lg:sticky lg:top-28">
          <div className="flex size-[58%] animate-float items-center justify-center">
            <div ref={tilt} className="size-full">
              <div ref={logoTile} data-fly className="glass flex size-full items-center justify-center rounded-[22%]">
                <span className="scale-[0.6] sm:scale-100">
                  <ProductMark product={product} size={140} />
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-3">
            <span className="eyebrow flex items-center gap-2.5">
              {logo && <BrandLogo logo={logo} size={20} />}
              {category && pick(category, 'name', lang)}
            </span>
            <h1 className="latin text-5xl leading-[1.02] font-extrabold tracking-[-0.03em] sm:text-6xl">
              <span className="ltr-iso">{product.name}</span>
            </h1>
            <p className="text-xl text-muted">{tagline}</p>
          </div>

          <PlanPicker product={product} value={variant?.id} onChange={setVariantId} name="variant" legend={t.product.plan} />

          {buyable && variant ? (
            <div ref={buyBox} className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Stepper value={qty} onChange={setQty} label={product.per_user ? t.product.users : t.product.quantity} />
                <button type="button" className="btn-accent h-14 flex-1" onClick={(e) => addToCart(product, variant, qty, lang, e.currentTarget)}>
                  <ShoppingBag className="size-5" aria-hidden="true" />
                  {t.cta.addToCart}
                </button>
              </div>
              <button type="button" className="btn-outline h-14" onClick={buyNow}>
                {t.cta.buyNow}
              </button>
              <p className="text-end text-sm text-faint">{t.price.ttc}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-muted">{t.product.quoteNote}</p>
              <a href={waLink(waText)} target="_blank" rel="noopener" onClick={() => track('Contact')} className="btn-light h-14">
                <MessageCircle className="size-5" aria-hidden="true" />
                {t.cta.askPrice}
              </a>
            </div>
          )}

          <ul className="card reveal px-6 py-1.5">
            {t.product.info.map((info, i) => {
              const Icon = INFO_ICONS[i]
              return (
                <li key={info.title} className="flex gap-4 border-b border-line py-4 last:border-0">
                  <Icon className="mt-1 size-5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
                  <span>
                    <b className="block">{info.title}</b>
                    <span className="text-sm text-muted">{info.text}</span>
                  </span>
                </li>
              )
            })}
          </ul>

          {buyable && (
            <a href={waLink(waText)} target="_blank" rel="noopener" onClick={() => track('Contact')} className="flex items-center gap-2.5 text-muted hover:text-fg">
              <MessageCircle className="size-5" aria-hidden="true" />
              {t.cta.whatsappAsk}
            </a>
          )}
        </div>
      </section>

      <section className="mt-24 grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-6">
          <h2 className="reveal text-3xl font-extrabold sm:text-4xl">{t.product.included}</h2>
          <p className="reveal text-lg text-muted">{pick(product, 'description', lang)}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {pickList(product, 'features', lang).map((f, i) => (
              <li key={f} className="card reveal flex items-start gap-3 rounded-3xl p-5" style={stagger(i % 2)}>
                <Check className="mt-1 size-5 shrink-0" aria-hidden="true" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        {pick(product, 'requirements', lang) && (
          <div className="flex flex-col gap-6">
            <h2 className="reveal text-3xl font-extrabold sm:text-4xl">{t.product.needs}</h2>
            <p className="card reveal p-6 text-lg text-fg-2">{pick(product, 'requirements', lang)}</p>
          </div>
        )}
      </section>

      {buyable && variant && pastBuyBox && (
        // phones: once the buy buttons have scrolled away, the plan, its price and "add" stay above the tab bar
        <div data-fly-scope data-sticky-buy className="fixed inset-x-4 bottom-[96px] z-30 animate-rise-fast lg:hidden">
          <div className="glass flex items-center gap-3 rounded-[22px] p-2 ps-2.5">
            <span data-fly className="logo-stage size-11 shrink-0 rounded-[14px]">
              <ProductMark product={product} size={24} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col items-start">
              <b className="latin max-w-full truncate text-sm font-semibold">
                <span className="ltr-iso">{product.name}</span>
              </b>
              <PlanPrice variant={variant} className="text-base" />
            </span>
            <button type="button" className="btn-accent h-11 shrink-0 px-4" onClick={(e) => addToCart(product, variant, qty, lang, e.currentTarget)} aria-label={fill(t.cta.add, { name: product.name })}>
              <ShoppingBag className="size-5" aria-hidden="true" />
              {t.cta.addShort}
            </button>
          </div>
        </div>
      )}

      {related.length > 0 && (
        <section className="mt-24 flex flex-col gap-7">
          <h2 className="reveal text-3xl font-extrabold sm:text-4xl">{t.product.related}</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {related.map((p, i) => (
              <ProductTile key={p.id} product={p} catalog={catalog} i={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
