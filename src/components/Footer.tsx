import { Link } from 'react-router-dom'
import { BUSINESS, telLink } from '@/config'
import { useCatalog } from '@/lib/catalog'
import { href, pick, useLang, useT } from '@/lib/lang'
import { Logo } from './Logo'

const YEAR = new Date().getFullYear()

export function Footer() {
  const lang = useLang()
  const t = useT()
  const { catalog } = useCatalog()
  const link = 'text-muted transition hover:text-fg'
  return (
    <footer className="mt-28 border-t border-line bg-[#050505]">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1.2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-muted">{t.brandTagline}</p>
        </div>
        <nav aria-label={t.footer.store}>
          <h2 className="font-bold">{t.footer.store}</h2>
          <ul className="mt-3 space-y-2">
            {catalog.categories.map((c) => (
              <li key={c.id}>
                <Link to={`${href(lang, 'products')}?c=${c.id}`} className={link}>
                  {pick(c, 'name', lang)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="font-bold">{t.footer.office}</h2>
          <ul className="mt-3 space-y-2 text-muted">
            <li>{BUSINESS.address[lang]}</li>
            <li>{t.office.hoursValue}</li>
            <li>
              <a href={BUSINESS.mapUrl} target="_blank" rel="noopener" className={`${link} underline underline-offset-4`}>
                {t.cta.map}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-bold">{t.footer.help}</h2>
          <ul className="mt-3 space-y-2">
            {BUSINESS.phones.map((p) => (
              <li key={p}>
                <a href={telLink(p)} className={`ltr-iso ${link}`}>
                  {p}
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${BUSINESS.email}`} className={link}>
                {BUSINESS.email}
              </a>
            </li>
            <li>
              <Link to={href(lang, 'orders')} className={link}>
                {t.track.mine}
              </Link>
            </li>
            <li>
              <Link to={href(lang, 'legal')} className={link}>
                {t.footer.legal}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-2 py-6 text-sm text-faint sm:flex-row sm:justify-between">
          <p>
            © {YEAR} ITCITADEL. {t.footer.rights}
          </p>
          <p>{t.footer.disclaimer}</p>
        </div>
      </div>
    </footer>
  )
}
