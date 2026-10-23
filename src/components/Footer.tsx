import { Link } from 'react-router-dom'
import { BUSINESS, telLink } from '@/config'
import { href, useLang, useT } from '@/lib/lang'
import { Logo } from './Logo'

const YEAR = new Date().getFullYear()

export function Footer() {
  const lang = useLang()
  const t = useT()
  return (
    <footer className="mt-24 border-t border-line bg-stone/60">
      <div className="container-x grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-muted">{t.brandTagline}</p>
          <p className="mt-4 text-sm text-ink-2">{BUSINESS.address[lang]}</p>
        </div>
        <div>
          <h2 className="text-sm font-bold">{t.nav.products}</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            <li>
              <Link to={href(lang, 'products')} className="hover:text-brand">
                {t.catalog.title}
              </Link>
            </li>
            <li>
              <Link to={href(lang, 'business')} className="hover:text-brand">
                {t.nav.business}
              </Link>
            </li>
            <li>
              <Link to={href(lang, 'legal')} className="hover:text-brand">
                {t.footer.legal}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold">{t.nav.contact}</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            {BUSINESS.phones.map((p) => (
              <li key={p}>
                <a href={telLink(p)} className="ltr-iso hover:text-brand">
                  {p}
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${BUSINESS.email}`} className="hover:text-brand">
                {BUSINESS.email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:justify-between">
          <p>
            © {YEAR} ITCITADEL. {t.footer.rights}
          </p>
          <p>{t.footer.disclaimer}</p>
        </div>
      </div>
    </footer>
  )
}
