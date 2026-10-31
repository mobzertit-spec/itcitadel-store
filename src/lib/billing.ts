/**
 * Monthly or yearly: products sold both ways for the same tier (Claude Pro, Canva Pro, Microsoft 365 Personal…)
 * get a switch, and each year shows what it saves on twelve months. Lengths come from the plans' `months`.
 */
import { priceOf, type Priced } from './offers.ts'

export type Billed = Priced & { id: string; label_en: string; months?: number | null }

/** A plan's tier without its length: "Premium · 1 year" → "premium", "12 months" → "". */
export const tierOf = (label: string) =>
  label
    .replace(/(\s*·\s*)?\d+\s*(months?|years?)\b/gi, '')
    .replace(/^\s*·\s*|\s*·\s*$/g, '')
    .trim()
    .toLowerCase()

export type Billing<T> = { monthly: T[]; yearly: T[]; /** each plan's counterpart of the same tier, both ways */ other: Map<string, T> }

/** The two periods of a product, or null when it has no monthly and yearly plan of the same tier. */
export function billing<T extends Billed>(variants: T[]): Billing<T> | null {
  const monthly = variants.filter((v) => v.months === 1)
  const yearly = variants.filter((v) => v.months === 12)
  const other = new Map<string, T>()
  for (const y of yearly) {
    const m = monthly.find((x) => tierOf(x.label_en) === tierOf(y.label_en))
    if (m) {
      other.set(y.id, m)
      other.set(m.id, y)
    }
  }
  return other.size ? { monthly, yearly, other } : null
}

/** What a year costs less than twelve months of the same tier, at today's prices (offers included). */
export const savings = (yearly: Priced, monthly: Priced, now = Date.now()) => Math.max(0, priceOf(monthly, now) * 12 - priceOf(yearly, now))
