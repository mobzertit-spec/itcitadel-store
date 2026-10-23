import { Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { validateQuote, type FieldErrors } from '@shared/validate'
import { Field, Honeypot, TextArea } from '@/components/Field'
import { Meta } from '@/components/Meta'
import { submit } from '@/lib/api'
import { useCatalog } from '@/lib/catalog'
import { href, pick, useLang, useT } from '@/lib/lang'
import { track } from '@/lib/track'
import { DONE_KEY } from './Order'

export default function Business() {
  const lang = useLang()
  const t = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { catalog } = useCatalog()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [problem, setProblem] = useState('')
  const [sending, setSending] = useState(false)

  // coming from a quote-only product: start the message with it
  const product = catalog.products.find((p) => p.slug === params.get('p'))
  const variant = product?.product_variants.find((v) => v.id === params.get('v'))
  const preset = product ? `${product.name}${variant ? ` — ${pick(variant, 'label', lang)}` : ''}\n` : ''

  const message = (field: string) => {
    const code = errors[field]
    if (!code) return undefined
    if (code === 'invalid' && field === 'phone') return t.errors.phone
    if (code === 'invalid' && field === 'email') return t.errors.email
    return t.errors[code]
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (sending) return
    const body = { ...Object.fromEntries(new FormData(e.currentTarget).entries()), lang }
    const check = validateQuote(body)
    if (!check.ok) {
      setErrors(check.errors)
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    setErrors({})
    setProblem('')
    setSending(true)
    const res = await submit('request-quote', body)
    setSending(false)
    if (res.ok) {
      track('Lead', { content_name: 'quote' })
      const done = { kind: 'quote', number: res.number, phone: check.value.phone }
      try {
        sessionStorage.setItem(DONE_KEY, JSON.stringify(done))
      } catch {
        /* private mode */
      }
      navigate(href(lang, 'order/done'), { state: done })
    } else if (res.kind === 'fields') setErrors(res.errors)
    else setProblem(t.errors[res.kind])
  }

  return (
    <div className="container-x pt-12">
      <Meta title={t.meta.businessTitle} description={t.meta.businessDescription} />
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div>
          <p className="eyebrow">{t.nav.business}</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">{t.business.title}</h1>
          <p className="mt-4 text-lg text-ink-2">{t.business.lead}</p>
          <ul className="mt-8 space-y-4">
            {t.business.perks.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand">
                  <Check className="size-4" aria-hidden="true" />
                </span>
                <span className="pt-0.5 font-medium">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={onSubmit} noValidate className="card relative space-y-6 p-6 sm:p-8">
          <h2 className="text-xl font-bold">{t.business.formTitle}</h2>
          <Honeypot />
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label={t.business.companyName} name="company_name" autoComplete="organization" required error={message('company_name')} />
            <Field label={t.business.contactName} name="contact_name" autoComplete="name" required error={message('contact_name')} />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label={t.order.phone} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0661 23 45 67" dir="ltr" required error={message('phone')} />
            <Field label={t.order.email} name="email" type="email" autoComplete="email" dir="ltr" required error={message('email')} />
          </div>
          <TextArea
            label={t.business.message}
            name="message"
            rows={5}
            maxLength={3000}
            defaultValue={preset}
            placeholder={t.business.messageHint}
            hint={t.business.messageHint}
            required
            error={message('message')}
          />
          {problem && (
            <p className="rounded-xl bg-red-50 p-4 font-medium text-danger" role="alert">
              {problem}
            </p>
          )}
          <button type="submit" className="btn-primary w-full !py-3.5 text-base" disabled={sending}>
            {sending ? t.order.sending : t.business.submit}
          </button>
        </form>
      </div>
    </div>
  )
}
