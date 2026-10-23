import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { href, useLang, useT } from '@/lib/lang'
import { LangSwitch } from './LangSwitch'
import { Logo } from './Logo'

export function Header() {
  const lang = useLang()
  const t = useT()
  const [open, setOpen] = useState(false)

  const links = [
    { to: href(lang, 'products'), label: t.nav.products },
    { to: href(lang, 'business'), label: t.nav.business },
    { to: `${href(lang)}#how`, label: t.nav.how },
    { to: `${href(lang)}#contact`, label: t.nav.contact },
  ]
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3.5 py-2 text-[0.95rem] font-medium transition hover:bg-stone ${isActive ? 'text-ink' : 'text-ink-2'}`

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link to={href(lang)} aria-label="ITCITADEL">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label={t.nav.menu}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass} end>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LangSwitch />
          <Link to={href(lang, 'products')} className="btn-primary hidden !px-4 !py-2.5 sm:inline-flex">
            {t.cta.browse}
          </Link>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-card lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={t.nav.menu}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-menu" className="border-t border-line bg-paper lg:hidden" aria-label={t.nav.menu}>
          <div className="container-x flex flex-col py-3">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base font-medium hover:bg-stone">
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
