import { House, LayoutGrid, MessageCircle, ShoppingBag } from 'lucide-react'
import { useLayoutEffect, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import type { Lang } from '@shared/validate'
import { waLink } from '@/config'
import { useCart } from '@/lib/cart'
import { href, isLang, LangContext, useLang, useT } from '@/lib/lang'
import { useSpotlight } from '@/lib/motion'
import { track } from '@/lib/track'
import { STRINGS } from '@/i18n/strings'
import NotFound from '@/pages/NotFound'
import { AddedToast } from './AddedToast'
import { LogoSprite } from './BrandLogo'
import { Footer } from './Footer'
import { Header } from './Header'
import { WhatsAppFab } from './WhatsAppFab'

/** Pages under /ar/, /fr/ and /en/: sets the language and direction of the whole document. */
export function LangLayout() {
  const { lang } = useParams()
  if (!isLang(lang)) return <Shell lang="ar" content={<NotFound />} />
  return <Shell lang={lang} content={<Outlet />} />
}

export function Shell({ lang, content }: { lang: Lang; content: ReactNode }) {
  const { pathname, hash } = useLocation()
  useSpotlight()
  useLayoutEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = STRINGS[lang].dir
  }, [lang])
  // new page → top; "#how" / "#office" → that section. Before paint, so a page transition shows the new page from its top
  useLayoutEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <LangContext.Provider value={lang}>
      <div lang={lang} dir={STRINGS[lang].dir} className="flex min-h-dvh flex-col pb-24 lg:pb-0">
        <LogoSprite />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded-lg focus:bg-fg focus:px-3 focus:py-2 focus:text-bg">
          Skip
        </a>
        <Header />
        <main id="main" className="flex-1">
          {content}
        </main>
        <Footer />
        <TabBar />
        <WhatsAppFab />
        <AddedToast />
      </div>
    </LangContext.Provider>
  )
}

/** Phones: the store's main places under the thumb, on a glass bar. */
function TabBar() {
  const lang = useLang()
  const t = useT()
  const lines = useCart()
  const item = ({ isActive }: { isActive: boolean }) => `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-fg' : 'text-faint'}`
  return (
    <nav aria-label={t.nav.menu} className="glass fixed inset-x-4 bottom-4 z-40 flex h-[68px] items-center justify-around rounded-[26px] [view-transition-name:tabbar] lg:hidden">
      <NavLink to={href(lang)} end viewTransition className={item}>
        <House className="size-[22px]" strokeWidth={1.8} aria-hidden="true" />
        {t.nav.home}
      </NavLink>
      <NavLink to={href(lang, 'products')} viewTransition className={item}>
        <LayoutGrid className="size-[22px]" strokeWidth={1.8} aria-hidden="true" />
        {t.nav.store}
      </NavLink>
      <NavLink to={href(lang, 'cart')} viewTransition className={item}>
        <span className="relative" data-cart-target>
          <ShoppingBag className="size-[22px]" strokeWidth={1.8} aria-hidden="true" />
          {lines.length > 0 && (
            <span key={lines.length} className="latin absolute -top-1.5 -end-2 inline-flex size-[18px] animate-pop items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-ink">
              {lines.length}
            </span>
          )}
        </span>
        {t.nav.cart}
      </NavLink>
      <a href={waLink()} target="_blank" rel="noopener" onClick={() => track('Contact')} className="flex flex-col items-center gap-0.5 text-xs text-faint">
        <MessageCircle className="size-[22px]" strokeWidth={1.8} aria-hidden="true" />
        {t.cta.whatsapp}
      </a>
    </nav>
  )
}
