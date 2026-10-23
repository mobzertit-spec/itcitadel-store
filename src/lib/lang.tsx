import { createContext, useContext } from 'react'
import { LANGS, type Lang } from '@shared/validate'
import { STRINGS } from '@/i18n/strings'

export const LangContext = createContext<Lang>('ar')
export const useLang = () => useContext(LangContext)
export const useT = () => STRINGS[useLang()]

export const isLang = (s: string | undefined): s is Lang => LANGS.includes(s as Lang)

/** Router path for a page in a language: href('fr', 'products') → "/fr/products/". */
export const href = (lang: Lang, page = '') => `/${lang}/${page ? page.replace(/\/?$/, '/') : ''}`

/** The localized column of a database row: pick(product, 'tagline', 'fr') → product.tagline_fr. */
export function pick<T extends object, K extends string>(row: T, field: K, lang: Lang): string {
  return (row as Record<string, unknown>)[`${field}_${lang}`] as string
}
export function pickList<T extends object>(row: T, field: string, lang: Lang): string[] {
  return ((row as Record<string, unknown>)[`${field}_${lang}`] as string[] | undefined) ?? []
}

const SAVED = 'itc:lang'
export function savedLang(): Lang | null {
  try {
    const v = localStorage.getItem(SAVED) ?? undefined
    return isLang(v) ? v : null
  } catch {
    return null
  }
}
export function saveLang(lang: Lang) {
  try {
    localStorage.setItem(SAVED, lang)
  } catch {
    /* private mode */
  }
}

/** First visit: the visitor's saved choice, else their browser language, else Arabic. */
export function preferredLang(): Lang {
  const saved = savedLang()
  if (saved) return saved
  for (const l of navigator.languages ?? [navigator.language]) {
    const code = l.slice(0, 2).toLowerCase()
    if (isLang(code)) return code
  }
  return 'ar'
}
