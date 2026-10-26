import { Calculator, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CURRENCIES, costInDzd, DEFAULT_RULES, rulePrice, type Currency, type PricingRules } from '@shared/pricing'
import { amount as fmt } from '@/lib/format'
import { db } from './db'

/** One plan of the price list: what it costs us, what it sells for. */
type Row = { variantId: string; product: string; plan: string; active: boolean; price: number; cost: string; currency: Currency }

const parseCost = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))

/**
 * The owner's price sheet: exchange rates and margin, then every plan with its purchase price, the rule's price,
 * the selling price (which the owner may set differently) and the profit.
 */
export default function Pricing() {
  const [rules, setRules] = useState<PricingRules>(DEFAULT_RULES)
  const [rows, setRows] = useState<Row[]>([])
  const [saved, setSaved] = useState<{ rules: PricingRules; rows: Row[] } | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([
      db.from('pricing_rules').select('usd_rate,eur_rate,margin_percent').single(),
      db.from('products').select('name,sort,product_variants(id,label_ar,price_dzd,sort,active)').order('sort'),
      db.from('variant_costs').select('variant_id,amount,currency'),
    ]).then(([r, p, c]) => {
      const failed = r.error ?? p.error ?? c.error
      if (failed) return setError(failed.message)
      const loadedRules = r.data ? { usd_rate: Number(r.data.usd_rate), eur_rate: Number(r.data.eur_rate), margin_percent: Number(r.data.margin_percent) } : DEFAULT_RULES
      const costs = new Map((c.data as { variant_id: string; amount: number; currency: Currency }[]).map((x) => [x.variant_id, x]))
      type Variant = { id: string; label_ar: string; price_dzd: number; sort: number; active: boolean }
      const loadedRows = (p.data as { name: string; product_variants: Variant[] }[]).flatMap((product) =>
        [...product.product_variants]
          .sort((a, b) => a.sort - b.sort)
          .map((v) => {
            const cost = costs.get(v.id)
            return { variantId: v.id, product: product.name, plan: v.label_ar, active: v.active, price: v.price_dzd, cost: cost ? String(Number(cost.amount)) : '', currency: cost?.currency ?? 'USD' }
          }),
      )
      setRules(loadedRules)
      setRows(loadedRows)
      setSaved({ rules: loadedRules, rows: loadedRows })
    })
  }, [])

  const setRow = (id: string, patch: Partial<Row>) => setRows((list) => list.map((r) => (r.variantId === id ? { ...r, ...patch } : r)))
  const suggested = (r: Row) => {
    const cost = parseCost(r.cost)
    return cost === null || Number.isNaN(cost) ? null : rulePrice(cost, r.currency, rules)
  }
  const applyAll = () => {
    setRows((list) => list.map((r) => ({ ...r, price: suggested(r) ?? r.price })))
    setNotice('طُبّقت القاعدة على كل الخطط التي لها تكلفة. راجع الأسعار ثم اضغط «حفظ».')
  }

  async function save() {
    if (!saved) return
    if (rows.some((r) => Number.isNaN(parseCost(r.cost)) || (parseCost(r.cost) ?? 0) < 0)) return setError('تكلفة غير صحيحة: اكتب رقماً، مثل 19.99.')
    setBusy(true)
    setError('')
    setNotice('')
    const now = new Date().toISOString()
    const before = new Map(saved.rows.map((r) => [r.variantId, r]))
    const jobs: PromiseLike<{ error: { message: string } | null }>[] = []
    if (JSON.stringify(rules) !== JSON.stringify(saved.rules)) jobs.push(db.from('pricing_rules').update({ ...rules, updated_at: now }).eq('id', true))
    for (const r of rows) {
      const b = before.get(r.variantId)!
      if (r.price !== b.price) jobs.push(db.from('product_variants').update({ price_dzd: r.price }).eq('id', r.variantId))
      if (r.cost !== b.cost || r.currency !== b.currency) {
        const cost = parseCost(r.cost)
        jobs.push(
          cost === null
            ? db.from('variant_costs').delete().eq('variant_id', r.variantId)
            : db.from('variant_costs').upsert({ variant_id: r.variantId, amount: cost, currency: r.currency, updated_at: now }),
        )
      }
    }
    const results = await Promise.all(jobs)
    setBusy(false)
    const failed = results.find((x) => x.error)
    if (failed?.error) return setError(failed.error.message)
    setSaved({ rules, rows })
    setNotice(jobs.length ? 'حُفظت التغييرات. الأسعار الجديدة تظهر في المتجر فوراً.' : 'لا تغييرات للحفظ.')
  }

  const rateField = (key: keyof PricingRules, label: string) => (
    <label>
      <span className="field-label">{label}</span>
      <input
        type="number"
        min={0}
        step="any"
        dir="ltr"
        className="field-input"
        value={rules[key]}
        onChange={(e) => setRules({ ...rules, [key]: Math.max(0, Number(e.target.value) || 0) })}
      />
    </label>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">التسعير والأرباح</h1>
        <p className="mt-2 text-sm text-muted">
          سعر البيع = سعر الشراء × سعر الصرف × (1 + الهامش)، مقرّباً لأقرب 500 دج، ولأقرب 1 000 دج فوق 100 000. يمكنك دائماً كتابة سعر مختلف حسب الربح.
        </p>
      </div>

      <section className="card grid gap-5 p-6 sm:grid-cols-3">
        {rateField('usd_rate', 'سعر الدولار (دج)')}
        {rateField('eur_rate', 'سعر اليورو (دج)')}
        {rateField('margin_percent', 'هامش الربح (%)')}
        <div className="flex flex-wrap gap-3 sm:col-span-3">
          <button className="btn-outline" onClick={applyAll} disabled={!saved}>
            <Calculator className="size-4" /> طبّق القاعدة على كل الأسعار
          </button>
          <button className="btn-light" onClick={save} disabled={!saved || busy}>
            <Save className="size-4" /> {busy ? '…' : 'حفظ'}
          </button>
        </div>
      </section>

      {error && <p className="rounded-xl border border-danger/40 p-3 text-sm text-danger">{error}</p>}
      {notice && <p className="rounded-xl border border-line p-3 text-sm text-fg-2">{notice}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="text-start text-muted">
            <tr className="border-b border-line">
              <th className="p-3 text-start font-semibold">المنتج والخطة</th>
              <th className="p-3 text-start font-semibold">سعر الشراء</th>
              <th className="p-3 text-start font-semibold">التكلفة بالدينار</th>
              <th className="p-3 text-start font-semibold">سعر القاعدة</th>
              <th className="p-3 text-start font-semibold">سعر البيع (دج)</th>
              <th className="p-3 text-start font-semibold">الربح</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cost = parseCost(r.cost)
              const costDzd = cost === null || Number.isNaN(cost) ? null : costInDzd(cost, r.currency, rules)
              const rule = suggested(r)
              const profit = costDzd === null ? null : r.price - costDzd
              return (
                <tr key={r.variantId} className={`border-b border-line last:border-0 ${r.active ? '' : 'opacity-50'}`}>
                  <td className="p-3">
                    <b className="ltr-iso block">{r.product}</b>
                    <span className="text-muted">{r.plan}</span>
                  </td>
                  <td className="p-3">
                    <span className="flex gap-2" dir="ltr">
                      <input
                        inputMode="decimal"
                        className="field-input h-10! w-24 px-3"
                        value={r.cost}
                        placeholder="—"
                        aria-label={`سعر الشراء: ${r.product} ${r.plan}`}
                        onChange={(e) => setRow(r.variantId, { cost: e.target.value })}
                      />
                      <select className="field-input h-10! w-24 px-2" value={r.currency} aria-label="العملة" onChange={(e) => setRow(r.variantId, { currency: e.target.value as Currency })}>
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </span>
                  </td>
                  <td className="latin p-3 text-muted">{costDzd === null ? '—' : fmt(Math.round(costDzd))}</td>
                  <td className="p-3">
                    {rule === null ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="latin">{fmt(rule)}</span>
                        {rule !== r.price && (
                          <button className="text-xs text-fg underline underline-offset-4" onClick={() => setRow(r.variantId, { price: rule })}>
                            طبّق
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min={0}
                      step={500}
                      dir="ltr"
                      className={`field-input h-10! w-32 px-3 ${rule !== null && rule !== r.price ? 'border-accent/60' : ''}`}
                      value={r.price}
                      aria-label={`سعر البيع: ${r.product} ${r.plan}`}
                      onChange={(e) => setRow(r.variantId, { price: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                    />
                  </td>
                  <td className={`latin p-3 ${profit !== null && profit < 0 ? 'text-danger' : ''}`}>
                    {profit === null ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <>
                        {fmt(Math.round(profit))} <span className="text-xs text-muted">({costDzd ? Math.round((profit / costDzd) * 100) : 0}%)</span>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">الخطط بدون سعر شراء (مثل Kaspersky الآن) تبقى بسعرها الحالي حتى تكتب تكلفتها. أسعار الشراء لا تظهر للزوار أبداً.</p>
    </div>
  )
}
