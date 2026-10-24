import { ChevronDown, Clock3, Headset, Mail, MapPin, Phone, ShieldCheck, Store } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addToCart } from '@/components/AddedToast'
import { BrandLogo, ProductMark } from '@/components/BrandLogo'
import { logoFor } from '@/components/brand-logos'
import { Meta } from '@/components/Meta'
import { FromPrice, Money } from '@/components/Price'
import { ProductTile, tileGrid } from '@/components/ProductTile'
import { BUSINESS, telLink } from '@/config'
import { heroProducts, lowestPrice, useCatalog, type Catalog, type Product } from '@/lib/catalog'
import { href, pick, useLang, useT } from '@/lib/lang'
import { businessJsonLd } from '@/lib/pages'

const TRUST_ICONS = [ShieldCheck, Clock3, Store, Headset]

export default function Home() {
  const lang = useLang()
  const t = useT()
  const { catalog } = useCatalog()
  const { hero, side } = heroProducts(catalog)
  const [category, setCategory] = useState<string | null>(null)
  const shown = category ? catalog.products.filter((p) => p.category_id === category) : catalog.products

  return (
    <>
      <Meta title={t.meta.homeTitle} description={t.meta.homeDescription} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: businessJsonLd(lang, (import.meta.env.VITE_SITE_URL as string) || '') }} />
      <h1 className="sr-only">{t.brandTagline}</h1>

      <div className="container-x flex flex-col gap-24 pt-6 sm:gap-28 sm:pt-8">
        {hero && (
          <section className="flex flex-col gap-4">
            <HeroPanel product={hero} catalog={catalog} />
            {side.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {side.map((p) => (
                  <SideTile key={p.id} product={p} catalog={catalog} />
                ))}
              </div>
            )}
          </section>
        )}

        <ul className="grid grid-cols-2 gap-x-6 border-y border-line lg:grid-cols-4">
          {t.home.trust.map((item, i) => {
            const Icon = TRUST_ICONS[i]
            return (
              <li key={item.title} className="flex items-center gap-4 py-6 sm:py-7">
                <Icon className="size-7 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span>
                  <b className="block">{item.title}</b>
                  <span className="block text-sm text-muted">{item.text}</span>
                </span>
              </li>
            )
          })}
        </ul>

        <section id="store" className="flex flex-col gap-7">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <h2 className="h-section">{t.home.allTitle}</h2>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={t.footer.store}>
              <button type="button" className="pill" aria-pressed={!category} onClick={() => setCategory(null)}>
                {t.catalog.all}
              </button>
              {catalog.categories.map((c) => (
                <button key={c.id} type="button" className="pill" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
                  {pick(c, 'name', lang)}
                </button>
              ))}
            </div>
          </div>
          <div className={tileGrid(catalog.products.length)}>
            {shown.map((p) => (
              <ProductTile key={p.id} product={p} catalog={catalog} />
            ))}
          </div>
        </section>

        <section id="how" className="flex flex-col gap-9">
          <h2 className="h-section">{t.home.howTitle}</h2>
          <ol className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {t.home.how.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-2 border-t border-line pt-6">
                <span className="latin text-4xl font-light text-faint" aria-hidden="true">
                  0{i + 1}
                </span>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <OfficeSection />

        {catalog.reviews.length > 0 && (
          <section className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h2 className="h-section">{t.home.reviewsTitle}</h2>
              <p className="text-lg text-muted">{t.home.reviewsLead}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {catalog.reviews.map((r) => {
                const product = catalog.products.find((p) => p.id === r.product_id)
                const logo = product && logoFor(product.slug)
                return (
                  <figure key={r.id} className="card flex flex-col gap-5 p-7">
                    <blockquote className="text-lg leading-relaxed text-fg-2">«{r.body}»</blockquote>
                    <figcaption className="mt-auto flex items-center justify-between gap-4 border-t border-line pt-4">
                      <span>
                        <b className="block">{r.author}</b>
                        {r.detail && <span className="text-sm text-muted">{r.detail}</span>}
                      </span>
                      {logo && <BrandLogo logo={logo} size={24} label />}
                    </figcaption>
                  </figure>
                )
              })}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-6">
          <h2 className="h-section">{t.home.faqTitle}</h2>
          <div className="divide-y divide-line border-y border-line">
            {t.home.faq.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-6 text-lg font-bold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="size-5 shrink-0 text-muted transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="max-w-3xl pb-6 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

/** The product the owner puts first: huge name, price, and its logo on a lit glass tile. */
function HeroPanel({ product, catalog }: { product: Product; catalog: Catalog }) {
  const lang = useLang()
  const t = useT()
  const category = catalog.categories.find((c) => c.id === product.category_id)
  const plan = product.product_variants[0]
  const buyable = !product.quote_only && plan
  return (
    <div className="spotlight relative grid items-center gap-6 overflow-hidden rounded-[36px] border border-line bg-surface px-6 pt-8 pb-9 sm:px-12 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-[72px] lg:py-16">
      <div className="relative flex h-56 items-center justify-center sm:h-80 lg:order-2 lg:h-[440px]">
        <div className="glass flex size-40 items-center justify-center rounded-[44px] sm:size-64 sm:rounded-[66px] lg:size-[300px] lg:rounded-[78px]">
          <span className="scale-[0.55] sm:scale-[0.85] lg:scale-100">
            <ProductMark product={product} size={150} />
          </span>
        </div>
        <span className="glass absolute start-0 top-10 hidden items-center gap-2 rounded-full px-4 py-2 text-sm sm:inline-flex lg:start-2">
          <ShieldCheck className="size-4" aria-hidden="true" />
          {t.home.onYourAccount}
        </span>
        <span className="glass absolute end-0 bottom-14 hidden items-center gap-2 rounded-full px-4 py-2 text-sm sm:inline-flex">
          <Clock3 className="size-4" aria-hidden="true" />
          {t.home.activation}
        </span>
      </div>
      <div className="flex flex-col gap-5 lg:order-1">
        {category && <span className="eyebrow">{pick(category, 'name', lang)}</span>}
        <h2 className="latin text-[3.4rem] leading-[0.98] font-extrabold tracking-[-0.035em] text-balance sm:text-7xl lg:text-[5.75rem]">
          <span className="ltr-iso">{product.name}</span>
        </h2>
        <p className="max-w-md text-xl text-fg-2 sm:text-2xl">{pick(product, 'tagline', lang)}</p>
        {buyable && (
          <p className="flex flex-wrap items-baseline gap-x-3 text-muted">
            <Money value={lowestPrice(product)} className="text-4xl" />
            <span>{product.product_variants.length > 1 ? `· ${pick(plan, 'label', lang)}` : ''}</span>
          </p>
        )}
        <div className="mt-1 flex flex-wrap gap-3">
          {buyable && (
            <button type="button" className="btn-accent h-14 px-8" onClick={() => addToCart(product, plan, 1, lang)}>
              {t.cta.addToCart}
            </button>
          )}
          <Link to={href(lang, `p/${product.slug}`)} className="btn-outline h-14 px-7">
            {t.cta.details}
          </Link>
        </div>
      </div>
    </div>
  )
}

function SideTile({ product, catalog }: { product: Product; catalog: Catalog }) {
  const lang = useLang()
  const category = catalog.categories.find((c) => c.id === product.category_id)
  return (
    <Link
      to={href(lang, `p/${product.slug}`)}
      className="flex items-center justify-between gap-5 rounded-[30px] border border-line bg-surface p-6 transition hover:border-line-strong sm:p-8"
    >
      <span className="flex min-w-0 flex-col gap-1.5">
        {category && <span className="eyebrow">{pick(category, 'name', lang)}</span>}
        <b className="latin text-2xl font-bold sm:text-3xl">
          <span className="ltr-iso">{product.name}</span>
        </b>
        <span className="line-clamp-1 text-muted">{pick(product, 'tagline', lang)}</span>
        <span className="mt-2">
          <FromPrice product={product} size="text-2xl" />
        </span>
      </span>
      <span className="logo-stage size-24 shrink-0 rounded-[28px] sm:size-[120px]">
        <ProductMark product={product} size={52} />
      </span>
    </Link>
  )
}

/** Where the customer pays: the office, with its hours and the map. */
export function OfficeSection() {
  const lang = useLang()
  const t = useT()
  const row = 'flex gap-4 border-b border-line pb-5 last:border-0 last:pb-0'
  return (
    <section id="office" className="spotlight grid items-center gap-10 overflow-hidden rounded-[36px] border border-line bg-surface px-6 py-10 sm:px-12 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:px-[72px] lg:py-16">
      <div className="flex flex-col gap-5">
        <span className="eyebrow">{t.home.officeLabel}</span>
        <h2 className="text-4xl leading-tight font-extrabold whitespace-pre-line sm:text-6xl">{t.home.officeTitle}</h2>
        <p className="max-w-md text-lg text-muted">{t.home.officeLead}</p>
        <div className="mt-1 flex flex-wrap gap-3">
          <a href={BUSINESS.mapUrl} target="_blank" rel="noopener" className="btn-light h-14 px-7">
            {t.cta.map}
          </a>
          <a href={telLink(BUSINESS.phones[0])} className="btn-outline latin h-14 px-7" dir="ltr">
            {BUSINESS.phones[0]}
          </a>
        </div>
      </div>
      <dl className="glass flex flex-col gap-5 rounded-[28px] p-6 sm:p-8">
        <div className={row}>
          <MapPin className="mt-1 size-5 shrink-0" aria-hidden="true" />
          <div>
            <dt className="font-bold">{t.office.address}</dt>
            <dd className="text-muted">{BUSINESS.address[lang]}</dd>
          </div>
        </div>
        <div className={row}>
          <Clock3 className="mt-1 size-5 shrink-0" aria-hidden="true" />
          <div>
            <dt className="font-bold">{t.office.hours}</dt>
            <dd className="text-muted">{t.office.hoursValue}</dd>
          </div>
        </div>
        <div className={row}>
          <Phone className="mt-1 size-5 shrink-0" aria-hidden="true" />
          <div>
            <dt className="font-bold">{t.office.phone}</dt>
            <dd className="flex flex-wrap gap-x-4 text-muted">
              {BUSINESS.phones.map((p) => (
                <a key={p} href={telLink(p)} className="ltr-iso hover:text-fg">
                  {p}
                </a>
              ))}
            </dd>
          </div>
        </div>
        <div className={row}>
          <Mail className="mt-1 size-5 shrink-0" aria-hidden="true" />
          <div>
            <dt className="font-bold">{t.office.email}</dt>
            <dd>
              <a href={`mailto:${BUSINESS.email}`} className="text-muted hover:text-fg">
                {BUSINESS.email}
              </a>
            </dd>
          </div>
        </div>
      </dl>
    </section>
  )
}
