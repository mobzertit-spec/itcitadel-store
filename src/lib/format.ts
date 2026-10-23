import type { Lang } from '@shared/validate'

/** 5500 → "5 500 DA" (French grouping is the norm in Algeria; Arabic pages use "دج"). */
export function dzd(n: number, lang: Lang) {
  const num = new Intl.NumberFormat('fr-FR').format(n).replace(/[  ]/g, ' ')
  return lang === 'ar' ? `${num} دج` : `${num} DA`
}

/** "0661601838" → "0661 60 18 38" */
export const prettyPhone = (p: string) => p.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4')
