import { Search, ShoppingBag } from 'lucide-react'
import { useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { BUSINESS, telLink } from '@/config'
import { fill } from '@/i18n/strings'
import { useCart } from '@/lib/cart'
import { useCatalog } from '@/lib/catalog'
import { href, pick, useLang, useT } from '@/lib/lang'
import { openDrawerInstead } from '@/lib/overlays'
import { rankProducts } from '@/lib/search'
import { ProductMark } from './BrandLogo'
import { LangSwitch } from './LangSwitch'
import { LogoLoop } from './Logo'
import { FromPrice } from './Price'

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
          <Link to={href(lang)} viewTransition aria-label="ITCITADEL" className="logo-link shrink-0">
            <LogoLoop />
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
              onClick={openDrawerInstead}
              aria-haspopup="dialog"
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

/**
 * Searches the store as you type: up to six products (logo, category, price), then "all results", which goes to
 * the catalog with ?q=. Arrows move through them, Enter opens one (or searches the store), Escape closes the list.
 */
function SearchBox({ className = '' }: { className?: string }) {
  const lang = useLang()
  const t = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { catalog } = useCatalog()
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  // the box shows the catalog's search, and follows it when it changes
  const urlQ = params.get('q') ?? ''
  const [q, setQ] = useState(urlQ)
  const [fromUrl, setFromUrl] = useState(urlQ)
  if (urlQ !== fromUrl) {
    setFromUrl(urlQ)
    setQ(urlQ)
  }
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const query = q.trim()
  const results = useMemo(() => rankProducts(catalog.products, catalog.categories, query).slice(0, 6), [catalog, query])
  const count = results.length ? results.length + 1 : 0 // the products, then "all results"
  const listed = open && !!query && count > 0
  const none = open && !!query && !count
  const list = `${id}-list`
  const option = (i: number) => `${id}-${i}`
  const searchUrl = `${href(lang, 'products')}?q=${encodeURIComponent(query)}`

  const done = () => {
    setOpen(false)
    setActive(-1)
    input.current?.blur()
  }
  const choose = (i: number) => {
    done()
    if (i < results.length) {
      setQ('')
      navigate(href(lang, `p/${results[i].slug}`), { viewTransition: true })
    } else navigate(searchUrl)
  }
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    done()
    navigate(query ? searchUrl : href(lang, 'products'))
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && count) {
      e.preventDefault()
      setOpen(true)
      if (e.key === 'ArrowDown') setActive((a) => (a < count - 1 ? a + 1 : 0))
      else setActive((a) => (a > 0 ? a - 1 : count - 1))
    } else if (e.key === 'Enter' && listed && active >= 0) {
      e.preventDefault()
      choose(active)
    } else if (e.key === 'Escape' && (listed || none)) {
      e.preventDefault()
      setOpen(false)
      setActive(-1)
    }
  }

  const row = (i: number) =>
    `flex items-center gap-3 rounded-2xl p-2 transition-colors ${i === active ? 'bg-white/10' : 'hover:bg-white/5'}`

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setOpen(false)}
      className={`relative ${className}`}
    >
      <div className="flex h-11 w-full items-center gap-2.5 rounded-full border border-line bg-raised px-4 focus-within:border-line-strong">
        <Search className="size-[18px] shrink-0 text-faint" aria-hidden="true" />
        <input
          ref={input}
          type="search"
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t.nav.search}
          aria-label={t.nav.searchLabel}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={listed}
          aria-controls={list}
          aria-activedescendant={listed && active >= 0 ? option(active) : undefined}
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-faint"
        />
      </div>
      {(listed || none) && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 animate-rise-fast rounded-3xl border border-line-strong/60 bg-surface p-2 shadow-[0_30px_60px_-20px_rgb(0_0_0)] md:min-w-[24rem]">
          {listed ? (
            // a click on a row must not blur the box first
            <div id={list} role="listbox" aria-label={t.find.results} onMouseDown={(e) => e.preventDefault()}>
              {results.map((p, i) => {
                const category = catalog.categories.find((c) => c.id === p.category_id)
                return (
                  <Link
                    key={p.id}
                    id={option(i)}
                    role="option"
                    aria-selected={i === active}
                    tabIndex={-1}
                    to={href(lang, `p/${p.slug}`)}
                    viewTransition
                    onClick={() => {
                      done()
                      setQ('')
                    }}
                    onMouseMove={() => setActive(i)}
                    className={row(i)}
                  >
                    <span className="logo-stage size-11 shrink-0 rounded-xl">
                      <ProductMark product={p} size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="latin block truncate font-semibold">
                        <span className="ltr-iso">{p.name}</span>
                      </b>
                      {category && <span className="block truncate text-sm text-faint">{pick(category, 'name', lang)}</span>}
                    </span>
                    <span className="shrink-0">
                      <FromPrice product={p} size="text-base" />
                    </span>
                  </Link>
                )
              })}
              <Link
                id={option(results.length)}
                role="option"
                aria-selected={active === results.length}
                tabIndex={-1}
                to={searchUrl}
                onClick={done}
                onMouseMove={() => setActive(results.length)}
                className={`${row(results.length)} justify-center py-3 text-sm text-muted`}
              >
                {fill(t.find.all, { q: query })}
              </Link>
            </div>
          ) : (
            <p role="status" className="p-4 text-muted">
              {fill(t.find.none, { q: query })}
            </p>
          )}
        </div>
      )}
    </form>
  )
}
