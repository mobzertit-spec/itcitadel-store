import { ArrowLeft, ArrowRight, Check, Info, MessageCircle, Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Meta } from '@/components/Meta'
import { ProductVisual } from '@/components/ProductVisual'
import { waLink } from '@/config'
import { fill } from '@/i18n/strings'
import { useCatalog, type Product } from '@/lib/catalog'
import { dzd } from '@/lib/format'
import { href, pick, pickList, useLang, useT } from '@/lib/lang'
import { productJsonLd } from '@/lib/pages'
import { track } from '@/lib/track'
import NotFound from './NotFound'

export default function ProductPage() {
  const { slug } = useParams()
  const { catalog, settled } = useCatalog()
  const product = catalog.products.find((p) => p.slug === slug)
  if (!product) return settled ? <NotFound /> : <div className="container-x min-h-[60vh] pt-12" aria-busy="true" />
  return <ProductView key={product.id} product={product} />
}

function ProductView({ product }: { product: Product }) {
  const lang = useLang()
  const t = useT()
  const navigate = useNavigate()
  const Back = t.dir === 'rtl' ? ArrowRight : ArrowLeft
  const variants = product.product_variants
  const [variantId, setVariantId] = useState(variants[0]?.id)
  const [qty, setQty] = useState(1)
  const variant = variants.find((v) => v.id === variantId) ?? variants[0]
  const tagline = pick(product, 'tagline', lang)

  useEffect(() => {
    track('ViewContent', { content_name: product.name, value: variant?.price_dzd })
    // once per product page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  const order = () => {
    if (!variant) return
    if (product.quote_only) navigate(`${href(lang, 'business')}?p=${product.slug}&v=${variant.id}`)
    else navigate(`${href(lang, `order/${product.slug}`)}?v=${variant.id}&q=${qty}`)
  }
  const waText = `${product.name}${variant ? ` — ${pick(variant, 'label', lang)}` : ''}`

  return (
    <div className="container-x pt-8">
      <Meta title={fill(t.meta.productTitle, { name: product.name })} description={tagline} />
      {!product.quote_only && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd(product, lang) }} />}

      <Link to={href(lang, 'products')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-brand">
        <Back className="size-4" aria-hidden="true" />
        {t.product.back}
      </Link>

      <div className="mt-6 flex items-center gap-5">
        <ProductVisual product={product} size="lg" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
<span className="ltr-iso">{product.name}</span>
</h1>
          <p className="mt-2 text-lg text-ink-2">{tagline}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-start">
        <article>
          <p className="text-lg leading-relaxed text-ink-2">{pick(product, 'description', lang)}</p>

          <h2 className="mt-10 text-xl font-bold">{t.product.included}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {pickList(product, 'features', lang).map((f) => (
              <li key={f} className="flex items-start gap-3 rounded-xl border border-line bg-card p-4">
                <Check className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {pick(product, 'requirements', lang) && (
            <div className="mt-8 flex gap-3 rounded-xl bg-gold-50 p-5">
              <Info className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
              <div>
                <h2 className="font-bold">{t.product.needs}</h2>
                <p className="mt-1 text-ink-2">{pick(product, 'requirements', lang)}</p>
              </div>
            </div>
          )}
        </article>

        {/* Buy box */}
        <aside className="card order-first p-6 lg:sticky lg:top-24 lg:order-none">
          <fieldset>
            <legend className="font-bold">{t.product.choosePlan}</legend>
            <div className="mt-3 space-y-2">
              {variants.map((v) => (
                <label
                  key={v.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 transition ${
                    v.id === variant?.id ? 'border-brand bg-brand-50 ring-2 ring-brand/20' : 'border-line hover:border-ink/30'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input type="radio" name="variant" value={v.id} checked={v.id === variant?.id} onChange={() => setVariantId(v.id)} className="size-4 accent-brand" />
                    <span className="font-medium">{pick(v, 'label', lang)}</span>
                  </span>
                  {!product.quote_only && <span className="font-bold whitespace-nowrap">{dzd(v.price_dzd, lang)}</span>}
                </label>
              ))}
            </div>
          </fieldset>

          {product.quote_only ? (
            <p className="mt-5 text-sm text-muted">{t.product.quoteNote}</p>
          ) : (
            <>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="font-semibold">{product.per_user ? t.order.users : t.order.quantity}</span>
                <Stepper value={qty} onChange={setQty} />
              </div>
              <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
                <span className="text-muted">{t.order.total}</span>
                <span className="text-2xl font-extrabold">{dzd((variant?.price_dzd ?? 0) * qty, lang)}</span>
              </div>
              <p className="mt-1 text-end text-xs text-muted">{t.price.ttc}</p>
            </>
          )}

          <button type="button" onClick={order} className="btn-primary mt-5 w-full">
            {product.quote_only ? t.cta.askPrice : t.cta.order}
          </button>
          <a href={waLink(waText)} target="_blank" rel="noopener" onClick={() => track('Contact')} className="btn-ghost mt-3 w-full">
            <MessageCircle className="size-4" aria-hidden="true" />
            {t.cta.whatsapp}
          </a>
          {!product.quote_only && <p className="mt-4 text-center text-sm text-muted">{t.product.payNote}</p>}
        </aside>
      </div>
    </div>
  )
}

export function Stepper({ value, onChange, max = 500 }: { value: number; onChange: (n: number) => void; max?: number }) {
  const btn = 'inline-flex size-9 items-center justify-center rounded-full border border-line bg-card transition hover:border-ink/30 disabled:opacity-40'
  return (
    <div className="flex items-center gap-2" dir="ltr">
      <button type="button" className={btn} onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="−">
        <Minus className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(1, Math.floor(Number(e.target.value) || 1))))}
        className="w-14 rounded-lg border border-line bg-white py-1.5 text-center font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="#"
      />
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="+">
        <Plus className="size-4" />
      </button>
    </div>
  )
}
