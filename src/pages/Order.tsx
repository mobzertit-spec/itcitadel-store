import { Building2, Lock, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { validateOrder, type FieldErrors } from '@shared/validate'
import { Field, Honeypot, TextArea } from '@/components/Field'
import { Meta } from '@/components/Meta'
import { ProductVisual } from '@/components/ProductVisual'
import { submit } from '@/lib/api'
import { useCatalog } from '@/lib/catalog'
import { dzd } from '@/lib/format'
import { href, pick, useLang, useT } from '@/lib/lang'
import { track } from '@/lib/track'
import NotFound from './NotFound'
import { Stepper } from './Product'

export const DONE_KEY = 'itc:last-order'

export default function OrderPage() {
  const lang = useLang()
  const t = useT()
  const navigate = useNavigate()
  const { slug } = useParams()
  const [params] = useSearchParams()
  const { catalog, settled } = useCatalog()
  const product = catalog.products.find((p) => p.slug === slug)

  const [variantId, setVariantId] = useState(params.get('v') ?? '')
  const [qty, setQty] = useState(Math.min(500, Math.max(1, Math.floor(Number(params.get('q')) || 1))))
  const [type, setType] = useState<'person' | 'company'>('person')
  const [payment, setPayment] = useState<'office_cash' | 'bank_transfer'>('office_cash')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [problem, setProblem] = useState('')
  const [sending, setSending] = useState(false)

  const variant = product?.product_variants.find((v) => v.id === variantId) ?? product?.product_variants[0]
  const total = (variant?.price_dzd ?? 0) * qty

  useEffect(() => {
    if (product) track('InitiateCheckout', { content_name: product.name, value: total })
    // once per visit of the form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id])

  if (!product) return settled ? <NotFound /> : <div className="container-x min-h-[60vh] pt-12" aria-busy="true" />
  // quote-only products have no public price: the business form handles them
  if (product.quote_only || !variant) return <Navigate to={`${href(lang, 'business')}?p=${product.slug}`} replace />

  const message = (field: string) => {
    const code = errors[field]
    if (!code) return undefined
    if (code === 'invalid' && field === 'phone') return t.errors.phone
    if (code === 'invalid' && field === 'email') return t.errors.email
    return t.errors[code]
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (sending || !product || !variant) return
    const form = new FormData(e.currentTarget)
    const body = {
      ...Object.fromEntries(form.entries()),
      lang,
      variant_id: variant.id,
      quantity: qty,
      customer_type: type,
      payment_method: payment,
    }
    const check = validateOrder(body)
    if (!check.ok) {
      setErrors(check.errors)
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    setErrors({})
    setProblem('')
    setSending(true)
    const res = await submit('place-order', body)
    setSending(false)
    if (res.ok) {
      track('Lead', { content_name: product.name, value: total })
      const done = { kind: 'order', number: res.number, phone: check.value.phone }
      try {
        sessionStorage.setItem(DONE_KEY, JSON.stringify(done))
      } catch {
        /* private mode: the state below is enough */
      }
      navigate(href(lang, 'order/done'), { state: done })
    } else if (res.kind === 'fields') setErrors(res.errors)
    else setProblem(t.errors[res.kind])
  }

  return (
    <div className="container-x pt-10">
      <Meta title={t.meta.orderTitle} />
      <h1 className="text-3xl font-extrabold tracking-tight">{t.order.title}</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        <form onSubmit={onSubmit} noValidate className="card relative space-y-6 p-6 sm:p-8">
          <Honeypot />
          <Field label={t.order.name} name="customer_name" autoComplete="name" required error={message('customer_name')} />
          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              label={t.order.phone}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0661 23 45 67"
              dir="ltr"
              required
              hint={t.order.phoneHint}
              error={message('phone')}
            />
            <Field label={t.order.email} name="email" type="email" autoComplete="email" dir="ltr" required hint={t.order.emailHint} error={message('email')} />
          </div>

          <fieldset>
            <legend className="field-label">{t.order.type}</legend>
            <div className="grid grid-cols-2 gap-3">
              <Choice checked={type === 'person'} onChange={() => setType('person')} name="customer_type_ui" icon={<UserRound className="size-5" />} label={t.order.person} />
              <Choice checked={type === 'company'} onChange={() => setType('company')} name="customer_type_ui" icon={<Building2 className="size-5" />} label={t.order.company} />
            </div>
          </fieldset>

          {type === 'company' && (
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label={t.order.companyName} name="company_name" autoComplete="organization" required error={message('company_name')} />
              <Field label={t.order.nif} name="nif" dir="ltr" error={message('nif')} />
            </div>
          )}

          <fieldset>
            <legend className="field-label">{t.order.payment}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Choice checked={payment === 'office_cash'} onChange={() => setPayment('office_cash')} name="payment_ui" label={t.order.office_cash} hint={t.order.office_cash_hint} />
              <Choice checked={payment === 'bank_transfer'} onChange={() => setPayment('bank_transfer')} name="payment_ui" label={t.order.bank_transfer} hint={t.order.bank_transfer_hint} />
            </div>
          </fieldset>

          <TextArea label={t.order.notes} name="notes" maxLength={1000} error={message('notes')} />

          {problem && (
            <p className="rounded-xl bg-red-50 p-4 font-medium text-danger" role="alert">
              {problem}
            </p>
          )}
          <button type="submit" className="btn-primary w-full !py-3.5 text-base" disabled={sending}>
            {sending ? t.order.sending : t.order.submit}
          </button>
          <p className="flex items-center justify-center gap-2 text-center text-sm text-muted">
            <Lock className="size-4" aria-hidden="true" />
            {t.order.reassure}
          </p>
        </form>

        <aside className="card order-first p-6 lg:sticky lg:top-24 lg:order-none">
          <h2 className="font-bold">{t.order.summary}</h2>
          <Link to={href(lang, `p/${product.slug}`)} className="mt-4 flex items-center gap-3">
            <ProductVisual product={product} />
            <span className="font-bold">
<span className="ltr-iso">{product.name}</span>
</span>
          </Link>
          <label className="mt-5 block">
            <span className="field-label">{t.order.plan}</span>
            <select value={variant.id} onChange={(e) => setVariantId(e.target.value)} className="field-input">
              {product.product_variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {pick(v, 'label', lang)} — {dzd(v.price_dzd, lang)}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 flex items-center justify-between">
            <span className="font-semibold">{product.per_user ? t.order.users : t.order.quantity}</span>
            <Stepper value={qty} onChange={setQty} />
          </div>
          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-muted">{t.order.total}</span>
            <span className="text-2xl font-extrabold">{dzd(total, lang)}</span>
          </div>
          <p className="mt-1 text-end text-xs text-muted">{t.price.ttc}</p>
        </aside>
      </div>
    </div>
  )
}

function Choice({ checked, onChange, name, label, hint, icon }: { checked: boolean; onChange: () => void; name: string; label: string; hint?: string; icon?: ReactNode }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${checked ? 'border-brand bg-brand-50 ring-2 ring-brand/20' : 'border-line bg-white hover:border-ink/30'}`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 size-4 accent-brand" />
      <span className="flex flex-col">
        <span className="flex items-center gap-2 font-semibold">
          {icon}
          {label}
        </span>
        {hint && <span className="text-sm text-muted">{hint}</span>}
      </span>
    </label>
  )
}
