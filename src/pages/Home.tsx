import { BadgeCheck, Building2, Check, ChevronDown, Clock3, FileText, MapPin, Phone, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CategoryIcon } from '@/components/CategoryIcon'
import { Meta } from '@/components/Meta'
import { ProductCard } from '@/components/ProductCard'
import { BUSINESS, telLink } from '@/config'
import { useCatalog } from '@/lib/catalog'
import { href, pick, useLang, useT } from '@/lib/lang'
import { businessJsonLd } from '@/lib/pages'

const TRUST_ICONS = [UserRound, FileText, Clock3, MapPin]

export default function Home() {
  const lang = useLang()
  const t = useT()
  const { catalog } = useCatalog()
  const featured = catalog.products.filter((p) => p.featured).slice(0, 6)

  return (
    <>
      <Meta title={t.meta.homeTitle} description={t.meta.homeDescription} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: businessJsonLd(lang, (import.meta.env.VITE_SITE_URL as string) || '') }} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_85%_-10%,rgb(11_122_82/0.10),transparent_60%)]" />
        <div className="container-x relative grid items-center gap-12 pt-12 pb-16 sm:pt-16 lg:grid-cols-[1.15fr_1fr] lg:pt-20 lg:pb-24">
          <div>
            <p className="eyebrow">{t.home.eyebrow}</p>
            <h1 className="mt-4 text-4xl leading-[1.15] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]">{t.home.title}</h1>
            <p className="mt-5 max-w-xl text-lg text-ink-2 text-pretty">{t.home.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={href(lang, 'products')} className="btn-primary">
                {t.cta.browse}
              </Link>
              <Link to={href(lang, 'business')} className="btn-ghost">
                <Building2 className="size-4" aria-hidden="true" />
                {t.cta.quote}
              </Link>
            </div>
          </div>
          <HeroCards />
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-line bg-card">
        <ul className="container-x grid grid-cols-2 gap-x-6 gap-y-6 py-7 lg:grid-cols-4">
          {t.home.trust.map((item, i) => {
            const Icon = TRUST_ICONS[i]
            return (
              <li key={item.title} className="flex items-start gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-bold">{item.title}</span>
                  <span className="block text-sm text-muted">{item.text}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Featured */}
      <section className="container-x pt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="h-section">{t.home.featuredTitle}</h2>
          <Link to={href(lang, 'products')} className="text-sm font-semibold text-brand hover:underline">
            {t.home.allProducts}
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container-x pt-24">
        <h2 className="h-section">{t.home.howTitle}</h2>
        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.how.map((step, i) => (
            <li key={step.title} className="card relative p-6">
              <span className="text-5xl leading-none font-extrabold text-brand/15" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Categories */}
      <section className="container-x pt-24">
        <h2 className="h-section">{t.home.categoriesTitle}</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {catalog.categories.map((c) => {
            const names = catalog.products.filter((p) => p.category_id === c.id).map((p) => p.name)
            return (
              <Link
                key={c.id}
                to={`${href(lang, 'products')}?c=${c.id}`}
                className="card flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
              >
                <CategoryIcon id={c.id} />
                <span>
                  <span className="block font-bold">{pick(c, 'name', lang)}</span>
                  <span className="block text-sm text-muted">
<span className="ltr-iso">{names.join(' · ')}</span>
</span>
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Why us */}
      <section className="container-x pt-24">
        <div className="rounded-[1.75rem] bg-ink px-6 py-12 text-white sm:px-10 lg:px-14">
          <h2 className="h-section">{t.home.whyTitle}</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            {t.home.why.map((w) => (
              <div key={w.title} className="flex gap-4">
                <BadgeCheck className="mt-0.5 size-6 shrink-0 text-[#3ccf8e]" aria-hidden="true" />
                <div>
                  <h3 className="text-lg font-bold">{w.title}</h3>
                  <p className="mt-1 text-white/70">{w.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business */}
      <section className="container-x pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">{t.nav.business}</p>
            <h2 className="h-section mt-3">{t.home.businessTitle}</h2>
            <p className="mt-4 text-lg text-ink-2">{t.home.businessLead}</p>
            <Link to={href(lang, 'business')} className="btn-dark mt-7">
              {t.cta.quote}
            </Link>
          </div>
          <div className="card p-7">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-6 text-brand" aria-hidden="true" />
              <h3 className="text-xl font-bold">{t.home.packTitle}</h3>
            </div>
            <ul className="mt-5 space-y-3">
              {t.home.pack.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-brand" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ — <details> works without JavaScript */}
      <section className="container-x pt-24">
        <h2 className="h-section">{t.home.faqTitle}</h2>
        <div className="mt-8 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-card">
          {t.home.faq.map((f) => (
            <details key={f.q} className="group px-5 py-1 sm:px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="size-5 shrink-0 text-muted transition group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="pb-5 text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="container-x pt-24">
        <h2 className="h-section">{t.home.contactTitle}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="card p-6">
            <MapPin className="size-5 text-brand" aria-hidden="true" />
            <h3 className="mt-3 font-bold">{t.contact.address}</h3>
            <p className="mt-1 text-ink-2">{BUSINESS.address[lang]}</p>
            <a href={BUSINESS.mapUrl} target="_blank" rel="noopener" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
              {t.contact.map}
            </a>
          </div>
          <div className="card p-6">
            <Phone className="size-5 text-brand" aria-hidden="true" />
            <h3 className="mt-3 font-bold">{t.contact.phone}</h3>
            <ul className="mt-1 space-y-1">
              {BUSINESS.phones.map((p) => (
                <li key={p}>
                  <a href={telLink(p)} className="ltr-iso text-lg font-semibold hover:text-brand">
                    {p}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <Mail className="size-5 text-brand" aria-hidden="true" />
            <h3 className="mt-3 font-bold">{t.contact.email}</h3>
            <a href={`mailto:${BUSINESS.email}`} className="mt-1 inline-block text-lg font-semibold hover:text-brand">
              {BUSINESS.email}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}

/** Three subscription "cards" fanned out: the service at a glance (official, on your account, active). */
function HeroCards() {
  const t = useT()
  const cards = [
    { name: 'ChatGPT Plus', cat: 'ai', tilt: 'lg:-rotate-3 lg:translate-x-6' },
    { name: 'Google Workspace', cat: 'collab', tilt: 'lg:rotate-2 lg:-translate-x-4' },
    { name: 'Kaspersky Premium', cat: 'security', tilt: 'lg:-rotate-1 lg:translate-x-10' },
  ]
  return (
    <div className="relative mx-auto hidden w-full max-w-md sm:block" aria-hidden="true">
      <div className="flex flex-col gap-4">
        {cards.map((c) => (
          <div key={c.name} className={`card flex items-center gap-4 p-4 ${c.tilt}`}>
            <CategoryIcon id={c.cat} />
            <div className="min-w-0 flex-1">
              <p className="font-bold">
<span className="ltr-iso">{c.name}</span>
</p>
              <p className="mt-0.5 h-2 w-24 rounded-full bg-stone" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand">
              <Check className="size-4" />
              {t.home.activated}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
