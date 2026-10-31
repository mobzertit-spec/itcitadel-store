import { Search, ShoppingBag } from 'lucide-react'
import type { FormEvent } from 'react'
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { BUSINESS, telLink } from '@/config'
import { useCart } from '@/lib/cart'
import { href, useLang, useT } from '@/lib/lang'
import { LangSwitch } from './LangSwitch'
import { Logo } from './Logo'

export function Header() {
  const lang = useLang()
  const t = useT()
  const lines = useCart()

  return (
    <>
      <div className="border-b border-line bg-surface px-4 py-2 text-center text-sm text-muted">
        <span className="me-2.5 inline-block size-1.5 rounded-full bg-accent align-middle" aria-hidden="true" />
        {t.topBar}
        <span className="hidden sm:inline">
          {' · '}
          <a href={telLink(BUSINESS.phones[0])} className="ltr-iso hover:text-fg">
            {BUSINESS.phones[0]}
          </a>
        </span>
      </div>
      <header className="header-scroll sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl [view-transition-name:header]">
        <div className="container-x flex h-[72px] items-center gap-4 lg:gap-8">
          <Link to={href(lang)} viewTransition aria-label="ITCITADEL" className="shrink-0">
            <Logo animated />
          </Link>
          <nav className="hidden items-center gap-7 lg:flex" aria-label={t.nav.menu}>
            <NavLink to={href(lang, 'products')} viewTransition className={({ isActive }) => `text-[1.05rem] transition hover:text-fg ${isActive ? 'text-fg' : 'text-muted'}`}>
              {t.nav.store}
            </NavLink>
            {/* sections of the home page: never "current", even on the home page */}
            <Link to={`${href(lang)}#how`} className="text-[1.05rem] text-muted transition hover:text-fg">
              {t.nav.how}
            </Link>
            <Link to={`${href(lang)}#office`} className="text-[1.05rem] text-muted transition hover:text-fg">
              {t.nav.office}
            </Link>
          </nav>
          <SearchBox className="hidden flex-1 md:flex" />
          <div className="ms-auto flex items-center gap-2 md:ms-0">
            <LangSwitch />
            <Link
              to={href(lang, 'cart')}
              viewTransition
              data-cart-target
              className="relative inline-flex size-11 items-center justify-center rounded-full bg-raised transition hover:bg-white/10 active:scale-95"
              aria-label={`${t.nav.cart} (${lines.length})`}
            >
              <ShoppingBag className="size-5" strokeWidth={1.8} aria-hidden="true" />
              {lines.length > 0 && (
                <span key={lines.length} className="latin absolute -top-1 -end-1 inline-flex size-5 animate-pop items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-ink">
                  {lines.length}
                </span>
              )}
            </Link>
          </div>
        </div>
        <div className="container-x pb-3 md:hidden">
          <SearchBox className="flex" />
        </div>
      </header>
    </>
  )
}

/** Searches the store: goes to the catalog with ?q=, which filters by name, description and category. */
function SearchBox({ className = '' }: { className?: string }) {
  const lang = useLang()
  const t = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim()
    navigate(q ? `${href(lang, 'products')}?q=${encodeURIComponent(q)}` : href(lang, 'products'))
  }
  return (
    <form role="search" onSubmit={onSubmit} className={`h-11 items-center gap-2.5 rounded-full border border-line bg-raised px-4 focus-within:border-line-strong ${className}`}>
      <Search className="size-[18px] shrink-0 text-faint" aria-hidden="true" />
      <input
        key={params.get('q') ?? ''}
        type="search"
        name="q"
        defaultValue={params.get('q') ?? ''}
        placeholder={t.nav.search}
        aria-label={t.nav.searchLabel}
        className="min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-faint"
      />
    </form>
  )
}
