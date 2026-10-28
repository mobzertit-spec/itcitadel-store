import { ChevronDown, Clock3, Headset, Mail, MapPin, Phone, ShieldCheck, Store } from 'lucide-react'
import { useState } from 'react'
import { BrandLogo } from '@/components/BrandLogo'
import { logoFor } from '@/components/brand-logos'
import { HeroCarousel } from '@/components/HeroCarousel'
import { Meta } from '@/components/Meta'
import { ProductTile, tileGrid } from '@/components/ProductTile'
import { BUSINESS, telLink } from '@/config'
import { heroProducts, useCatalog } from '@/lib/catalog'
import { pick, useLang, useT } from '@/lib/lang'
import { stagger, withViewTransition } from '@/lib/motion'
import { businessJsonLd } from '@/lib/pages'

const TRUST_ICONS = [ShieldCheck, Clock3, Store, Headset]

export default function Home() {
  const lang = useLang()
  const t = useT()
  const { catalog } = useCatalog()
  const { hero, side } = heroProducts(catalog)
  const [category, setCategory] = useState<string | null>(null)
  const shown = category ? catalog.products.filter((p) => p.category_id === category) : catalog.products
  // the tiles glide to their new places when a category is picked
  const filter = (id: string | null) => withViewTransition(() => setCategory(id))

  return (
    <>
      <Meta title={t.meta.homeTitle} description={t.meta.homeDescription} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: businessJsonLd(lang, (import.meta.env.VITE_SITE_URL as string) || '') }} />
      <h1 className="sr-only">{t.brandTagline}</h1>

      <div className="container-x flex flex-col gap-24 pt-6 sm:gap-28 sm:pt-8">
        {hero && <HeroCarousel products={[hero, ...side]} catalog={catalog} />}

        <ul className="grid grid-cols-2 gap-x-6 border-y border-line lg:grid-cols-4">
          {t.home.trust.map((item, i) => {
            const Icon = TRUST_ICONS[i]
            return (
              <li key={item.title} className="reveal flex items-center gap-4 py-6 sm:py-7" style={stagger(i)}>
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
            <h2 className="h-section reveal">{t.home.allTitle}</h2>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={t.footer.store}>
              <button type="button" className="pill" aria-pressed={!category} onClick={() => filter(null)}>
                {t.catalog.all}
              </button>
              {catalog.categories.map((c) => (
                <button key={c.id} type="button" className="pill" aria-pressed={category === c.id} onClick={() => filter(c.id)}>
                  {pick(c, 'name', lang)}
                </button>
              ))}
            </div>
          </div>
          <div className={tileGrid(catalog.products.length)}>
            {shown.map((p, i) => (
              <ProductTile key={p.id} product={p} catalog={catalog} i={i} />
            ))}
          </div>
        </section>

        <section id="how" className="flex flex-col gap-9">
          <h2 className="h-section reveal">{t.home.howTitle}</h2>
          <ol className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {t.home.how.map((step, i) => (
              <li key={step.title} className="reveal flex flex-col gap-2 border-t border-line pt-6" style={stagger(i)}>
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
              <h2 className="h-section reveal">{t.home.reviewsTitle}</h2>
              <p className="text-lg text-muted">{t.home.reviewsLead}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {catalog.reviews.map((r, i) => {
                const product = catalog.products.find((p) => p.id === r.product_id)
                const logo = product && logoFor(product.slug)
                return (
                  <figure key={r.id} className="card reveal flex flex-col gap-5 p-7" style={stagger(i % 3)}>
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
          <h2 className="h-section reveal">{t.home.faqTitle}</h2>
          <div className="reveal divide-y divide-line border-y border-line">
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

/** Where the customer pays: the office, with its hours and the map. */
export function OfficeSection() {
  const lang = useLang()
  const t = useT()
  const row = 'flex gap-4 border-b border-line pb-5 last:border-0 last:pb-0'
  return (
    <section id="office" className="spotlight reveal grid items-center gap-10 overflow-hidden rounded-[36px] border border-line bg-surface px-6 py-10 sm:px-12 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:px-[72px] lg:py-16">
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
