import { useEffect, type ReactNode } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import type { Lang } from '@shared/validate'
import { isLang, LangContext } from '@/lib/lang'
import { STRINGS } from '@/i18n/strings'
import NotFound from '@/pages/NotFound'
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
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = STRINGS[lang].dir
  }, [lang])
  // new page → top; "#how" / "#contact" → that section
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <LangContext.Provider value={lang}>
      <div lang={lang} dir={STRINGS[lang].dir} className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-white">
          Skip
        </a>
        <Header />
        <main id="main" className="flex-1">
          {content}
        </main>
        <Footer />
        <WhatsAppFab />
      </div>
    </LangContext.Provider>
  )
}
