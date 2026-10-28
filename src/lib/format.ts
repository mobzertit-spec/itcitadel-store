import type { Lang } from '@shared/validate'

/** 5500 → "5 500" (French grouping is the norm in Algeria). */
export const amount = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/[  ]/g, ' ')

/** Arabic pages write "دج", French and English pages "DA". */
export const currency = (lang: Lang) => (lang === 'ar' ? 'دج' : 'DA')

/** 5500 → "5 500 دج" / "5 500 DA" */
export const dzd = (n: number, lang: Lang) => `${amount(n)} ${currency(lang)}`

/** "0661601838" → "0661 60 18 38" */
export const prettyPhone = (p: string) => p.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4')

/** A date in the page's language, in Algiers time: "28 octobre 2026". */
export const day = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat({ ar: 'ar-DZ', fr: 'fr-DZ', en: 'en-GB' }[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' }).format(new Date(iso))
