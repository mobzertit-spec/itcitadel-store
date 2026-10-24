import { Link, useLocation } from 'react-router-dom'
import { LANGS, type Lang } from '@shared/validate'
import { STRINGS } from '@/i18n/strings'
import { saveLang, useLang, useT } from '@/lib/lang'

const SHORT: Record<Lang, string> = { ar: 'ع', fr: 'FR', en: 'EN' }

/** Same page, another language: swaps the first path segment and keeps the query (selected plan, filters). */
export function LangSwitch() {
  const lang = useLang()
  const t = useT()
  const { pathname, search } = useLocation()
  const rest = pathname.replace(/^\/(ar|fr|en)(?=\/|$)/, '')
  return (
    <div className="flex items-center rounded-full bg-raised p-0.5" role="group" aria-label={t.nav.language} dir="ltr">
      {LANGS.map((l) => (
        <Link
          key={l}
          to={`/${l}${rest || '/'}${search}`}
          onClick={() => saveLang(l)}
          hrefLang={l}
          lang={l}
          title={STRINGS[l].langName}
          aria-current={l === lang ? 'true' : undefined}
          className={`min-w-9 rounded-full px-2.5 py-1.5 text-center text-sm font-semibold transition ${l === lang ? 'bg-fg text-bg' : 'text-muted hover:text-fg'}`}
        >
          {SHORT[l]}
        </Link>
      ))}
    </div>
  )
}
