import { useMemo } from 'react'
import { fill } from '@/i18n/strings'
import { billing, savings } from '@/lib/billing'
import type { Product } from '@/lib/catalog'
import { dzd } from '@/lib/format'
import { pick, useLang, useT } from '@/lib/lang'
import { Money } from './Price'

/**
 * A product's plans, for its page and its quick view: the monthly/yearly switch when both exist for a tier, then
 * each plan with its price and what a year saves on twelve months.
 */
export function PlanPicker({ product, value, onChange, name, legend }: { product: Product; value?: string; onChange: (id: string) => void; name: string; legend: string }) {
  const lang = useLang()
  const t = useT()
  const variants = product.product_variants
  const periods = useMemo(() => billing(variants), [variants])
  const selected = variants.find((v) => v.id === value) ?? variants[0]
  const buyable = !product.quote_only
  const period = periods && selected?.months === 12 ? 12 : 1
  const shown = periods ? variants.filter((v) => v.months === period || (v.months !== 1 && v.months !== 12)) : variants
  // the best saving a year offers, for the switch
  const pct = periods
    ? Math.max(
        0,
        ...periods.yearly.map((y) => {
          const m = periods.other.get(y.id)
          return m && m.price_dzd > 0 ? Math.round((savings(y, m) / (m.price_dzd * 12)) * 100) : 0
        }),
      )
    : 0

  function switchTo(p: 1 | 12) {
    if (!periods || p === period) return
    const target = (selected && periods.other.get(selected.id)) ?? (p === 12 ? periods.yearly[0] : periods.monthly[0])
    onChange(target.id)
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 font-bold">{legend}</legend>
      {periods && buyable && (
        <div role="group" aria-label={t.period.label} className="mb-1 inline-flex w-fit rounded-full border border-line bg-surface p-1">
          {([1, 12] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={p === period}
              onClick={() => switchTo(p)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${p === period ? 'bg-fg text-bg' : 'text-fg-2 hover:text-fg'}`}
            >
              {p === 1 ? t.period.month : t.period.year}
              {p === 12 && pct > 0 && <span className="ms-2 text-xs opacity-80">{fill(t.period.upTo, { pct })}</span>}
            </button>
          ))}
        </div>
      )}
      {shown.map((v) => {
        const on = v.id === selected?.id
        const monthly = periods && v.months === 12 ? periods.other.get(v.id) : undefined
        const saved = monthly ? savings(v, monthly) : 0
        return (
          <label
            key={v.id}
            className={`flex cursor-pointer items-center justify-between gap-3 rounded-[20px] bg-surface px-5 py-4 transition active:scale-[0.99] ${on ? 'border-2 border-fg' : 'border border-line-strong/60 hover:border-fg/50'}`}
          >
            <span className="flex items-center gap-3.5">
              <input type="radio" name={name} value={v.id} checked={on} onChange={() => onChange(v.id)} className="size-5 accent-fg" />
              <span className="flex flex-col">
                <span className="text-lg font-bold">{pick(v, 'label', lang)}</span>
                {buyable && saved > 0 && <span className="text-sm text-fg-2">{fill(t.period.save, { amount: dzd(saved, lang) })}</span>}
              </span>
            </span>
            {buyable && (
              <span key={period} className="animate-rise-fast">
                <Money value={v.price_dzd} className="text-xl" />
              </span>
            )}
          </label>
        )
      })}
    </fieldset>
  )
}
