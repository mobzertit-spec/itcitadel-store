/**
 * The owner's pricing rule: purchase price × exchange rate × (1 + margin), rounded to the nearest 500 DZD
 * (1 000 DZD from 100 000 up). The owner may still set a different final price; the dashboard shows the profit.
 * Plain TypeScript with no imports, like validate.ts.
 */

export const CURRENCIES = ['USD', 'EUR', 'DZD'] as const
export type Currency = (typeof CURRENCIES)[number]

/** DZD per dollar and per euro, and the margin in percent (30 → selling price = cost × 1.3). */
export type PricingRules = { usd_rate: number; eur_rate: number; margin_percent: number }

export const DEFAULT_RULES: PricingRules = { usd_rate: 245, eur_rate: 285, margin_percent: 30 }

/** The purchase price in dinars. */
export function costInDzd(amount: number, currency: Currency, rules: PricingRules): number {
  const rate = currency === 'USD' ? rules.usd_rate : currency === 'EUR' ? rules.eur_rate : 1
  return Math.round(amount * rate * 100) / 100
}

/** The selling price the rule gives, in dinars. */
export function rulePrice(amount: number, currency: Currency, rules: PricingRules): number {
  // two decimals first, so 4 165 × 1.3 is 5 414.5 and not 5 414.499999…
  const raw = Math.round(costInDzd(amount, currency, rules) * (100 + rules.margin_percent)) / 100
  const step = raw >= 100_000 ? 1000 : 500
  return Math.round(raw / step) * step
}
