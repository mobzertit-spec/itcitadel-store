import { Check, Clock3, Mail, MapPin, MessageCircle, ShoppingBag } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addToCart } from '@/components/AddedToast'
import { BrandLogo, ProductMark } from '@/components/BrandLogo'
import { logoFor } from '@/components/brand-logos'
import { Meta } from '@/components/Meta'
import { Money } from '@/components/Price'
import { ProductTile } from '@/components/ProductTile'
import { Stepper } from '@/components/Stepper'
import { waLink } from '@/config'
import { fill } from '@/i18n/strings'
import { useCatalog, type Catalog, type Product } from '@/lib/catalog'
import { href, pick, pickList, useLang, useT } from '@/lib/lang'
import { productJsonLd } from '@/lib/pages'
import { track } from '@/lib/track'
import NotFound from './NotFound'

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
    track('ViewContent', { content_name: product.name, value: variant?.price_dzd })
    // once per product page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  const buyNow = () => {
    if (variant && addToCart(product, variant, qty, lang)) navigate(href(lang, 'cart'))
  }
  const waText = `${product.name}${variant ? ` — ${pick(variant, 'label', lang)}` : ''}`

  return (
    <div className="container-x pt-6">
      <Meta title={fill(t.meta.productTitle, { name: product.name })} description={tagline} />
      {buyable && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd(product, lang) }} />}

      <nav aria-label={t.nav.menu} className="flex flex-wrap gap-2.5 text-sm text-muted">
        <Link to={href(lang, 'products')} className="hover:text-fg">
          {t.nav.store}
        </Link>
        {category && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={`${href(lang, 'products')}?c=${category.id}`} className="hover:text-fg">
              {pick(category, 'name', lang)}
            </Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="ltr-iso text-fg">{product.name}</span>
      </nav>

      <section className="mt-6 grid items-start gap-8 lg:mt-8 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <div className="spotlight flex aspect-[1.1] items-center justify-center rounded-[36px] border border-line bg-surface lg:sticky lg:top-28">
          <div className="glass flex size-[58%] items-center justify-center rounded-[22%]">
            <span className="scale-[0.6] sm:scale-100">
              <ProductMark product={product} size={140} />
            </span>
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

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 font-bold">{t.product.plan}</legend>
            {variants.map((v) => {
              const on = v.id === variant?.id
              return (
                <label
                  key={v.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-[20px] bg-surface px-5 py-4 transition ${on ? 'border-2 border-fg' : 'border border-line-strong/60 hover:border-fg/50'}`}
                >
                  <span className="flex items-center gap-3.5">
                    <input type="radio" name="variant" value={v.id} checked={on} onChange={() => setVariantId(v.id)} className="size-5 accent-fg" />
                    <span className="text-lg font-bold">{pick(v, 'label', lang)}</span>
                  </span>
                  {buyable && <Money value={v.price_dzd} className="text-xl" />}
                </label>
              )
            })}
          </fieldset>

          {buyable && variant ? (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Stepper value={qty} onChange={setQty} label={product.per_user ? t.product.users : t.product.quantity} />
                <button type="button" className="btn-accent h-14 flex-1" onClick={() => addToCart(product, variant, qty, lang)}>
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

          <ul className="card px-6 py-1.5">
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
          <h2 className="text-3xl font-extrabold sm:text-4xl">{t.product.included}</h2>
          <p className="text-lg text-muted">{pick(product, 'description', lang)}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {pickList(product, 'features', lang).map((f) => (
              <li key={f} className="card flex items-start gap-3 rounded-3xl p-5">
                <Check className="mt-1 size-5 shrink-0" aria-hidden="true" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        {pick(product, 'requirements', lang) && (
          <div className="flex flex-col gap-6">
            <h2 className="text-3xl font-extrabold sm:text-4xl">{t.product.needs}</h2>
            <p className="card p-6 text-lg text-fg-2">{pick(product, 'requirements', lang)}</p>
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-24 flex flex-col gap-7">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{t.product.related}</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {related.map((p) => (
              <ProductTile key={p.id} product={p} catalog={catalog} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
