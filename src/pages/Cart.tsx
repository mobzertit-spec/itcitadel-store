import { Lock, MapPin, ShoppingBag } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { validateOrder, type FieldErrors } from '@shared/validate'
import { ProductMark } from '@/components/BrandLogo'
import { Field, Honeypot, TextArea } from '@/components/Field'
import { Meta } from '@/components/Meta'
import { Money } from '@/components/Price'
import { Stepper } from '@/components/Stepper'
import { BUSINESS } from '@/config'
import { submit } from '@/lib/api'
import { cart, resolve, useCart } from '@/lib/cart'
import { useCatalog } from '@/lib/catalog'
import { rememberOrder } from '@/lib/orders'
import { href, pick, useLang, useT } from '@/lib/lang'
import { withViewTransition } from '@/lib/motion'
import { track } from '@/lib/track'

export const DONE_KEY = 'itc:last-order'

export default function CartPage() {
  const lang = useLang()
  const t = useT()
  const navigate = useNavigate()
  const { catalog } = useCatalog()
  const lines = resolve(useCart(), catalog)
  const total = lines.reduce((sum, l) => sum + (l.variant ? l.variant.price_dzd * l.q : 0), 0)
  const blocked = lines.some((l) => !l.product)

  const [errors, setErrors] = useState<FieldErrors>({})
  const [problem, setProblem] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (lines.length) track('InitiateCheckout', { value: total })
    // once per visit of the cart
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const message = (field: string) => {
    const code = errors[field]
    if (!code) return undefined
    if (code === 'invalid' && field === 'phone') return t.errors.phone
    if (code === 'invalid' && field === 'email') return t.errors.email
    return t.errors[code]
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (sending || blocked) return
    const body = {
      ...Object.fromEntries(new FormData(e.currentTarget).entries()),
      lang,
      items: lines.map((l) => ({ variant_id: l.v, quantity: l.q })),
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
      track('Lead', { value: total })
      const done = { number: res.number, phone: check.value.phone }
      try {
        sessionStorage.setItem(DONE_KEY, JSON.stringify(done))
      } catch {
        /* private mode: the navigation state below is enough */
      }
      cart.clear()
      if (res.track && res.number) {
        // the order's own page, kept on this device for "My orders"
        rememberOrder({ token: res.track, number: res.number, at: new Date().toISOString() })
        navigate(href(lang, `order/${res.track}`), { state: { fresh: true, phone: check.value.phone } })
      } else navigate(href(lang, 'order/done'), { state: done })
    } else if (res.kind === 'fields') setErrors(res.errors)
    else setProblem(t.errors[res.kind])
  }

  if (!lines.length)
    return (
      <div className="container-x flex flex-col items-center pt-20 text-center">
        <Meta title={t.meta.cartTitle} />
        <span className="logo-stage size-24 rounded-[28px]">
          <ShoppingBag className="size-9" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-3xl font-extrabold">{t.cart.empty}</h1>
        <p className="mt-2 max-w-md text-lg text-muted">{t.cart.emptyLead}</p>
        <Link to={href(lang, 'products')} viewTransition className="btn-light mt-8 h-14 px-8">
          {t.cta.browse}
        </Link>
      </div>
    )

  return (
    <form onSubmit={onSubmit} noValidate className="container-x grid items-start gap-10 pt-10 sm:pt-12 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
      <Meta title={t.meta.cartTitle} />
      <Honeypot />
      <div className="flex flex-col gap-14">
        <section>
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-4xl font-extrabold sm:text-5xl">{t.cart.title}</h1>
            <span className="text-muted">{t.cart.count(lines.length)}</span>
          </div>
          <ul className="mt-4">
            {lines.map((l) => (
              <li
                key={l.v}
                className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-4 border-b border-line py-5 sm:grid-cols-[6rem_1fr_auto] sm:gap-6"
                style={{ viewTransitionName: `line-${l.v}` }}
              >
                <span className="logo-stage size-[4.5rem] rounded-[22px] sm:size-24">{l.product && <ProductMark product={l.product} size={40} />}</span>
                <div className="flex min-w-0 flex-col gap-2.5">
                  {l.product && l.variant ? (
                    <span>
                      <b className="latin block text-lg font-semibold sm:text-xl">
                        <Link to={href(lang, `p/${l.product.slug}`)} className="ltr-iso hover:underline">
                          {l.product.name}
                        </Link>
                      </b>
                      <span className="text-muted">{pick(l.variant, 'label', lang)}</span>
                    </span>
                  ) : (
                    <span className="text-danger">{t.cart.unavailable}</span>
                  )}
                  <span className="flex items-center gap-4">
                    {l.product && <Stepper size="sm" value={l.q} onChange={(q) => cart.set(l.v, q)} label={l.product.per_user ? t.product.users : t.product.quantity} />}
                    <button type="button" onClick={() => withViewTransition(() => cart.remove(l.v))} className="text-sm text-muted underline underline-offset-4 hover:text-fg">
                      {t.cart.remove}
                    </button>
                  </span>
                </div>
                {l.variant && (
                  <span key={l.q} className="animate-rise-fast">
                    <Money value={l.variant.price_dzd * l.q} className="text-xl" />
                  </span>
                )}
              </li>
            ))}
          </ul>
          <Link to={href(lang, 'products')} className="mt-5 inline-block text-muted hover:text-fg">
            {t.cart.continue}
          </Link>
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="text-3xl font-extrabold">{t.cart.yourInfo}</h2>
          <Field label={t.cart.name} name="customer_name" autoComplete="name" required error={message('customer_name')} />
          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              label={t.cart.phone}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0661 23 45 67"
              dir="ltr"
              required
              hint={t.cart.phoneHint}
              error={message('phone')}
            />
            <Field label={t.cart.email} name="email" type="email" autoComplete="email" dir="ltr" required hint={t.cart.emailHint} error={message('email')} />
          </div>
          <div>
            <h3 className="field-label">{t.cart.payment}</h3>
            <div className="card flex items-center gap-4 rounded-[20px] p-5">
              <MapPin className="size-6 shrink-0" strokeWidth={1.6} aria-hidden="true" />
              <span className="flex-1">
                <b className="block">{t.cart.paymentTitle}</b>
                <span className="text-sm text-muted">
                  {BUSINESS.address[lang]} · {t.office.hoursValue}. {t.cart.paymentText}
                </span>
              </span>
              <a href={BUSINESS.mapUrl} target="_blank" rel="noopener" className="text-sm underline underline-offset-4">
                {t.cta.map}
              </a>
            </div>
          </div>
          <TextArea label={t.cart.notes} name="notes" maxLength={1000} rows={3} error={message('notes')} />
        </section>
      </div>

      <aside className="glass flex flex-col gap-5 rounded-[32px] p-6 sm:p-8 lg:sticky lg:top-28">
        <h2 className="text-2xl font-extrabold">{t.cart.summary}</h2>
        <ul className="flex flex-col gap-2.5 text-muted">
          {lines.map(
            (l) =>
              l.product &&
              l.variant && (
                <li key={l.v} className="flex justify-between gap-4">
                  <span className="ltr-iso">
                    {l.product.name} × {l.q}
                  </span>
                  <Money value={l.variant.price_dzd * l.q} className="text-base" />
                </li>
              ),
          )}
        </ul>
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-5">
          <b className="text-xl">{t.cart.total}</b>
          <span key={total} className="animate-rise-fast">
            <Money value={total} className="text-4xl" />
          </span>
        </div>
        <span className="-mt-3 text-sm text-faint">{t.price.ttc}</span>
        {problem && (
          <p className="rounded-2xl border border-danger/40 p-4 text-danger" role="alert">
            {problem}
          </p>
        )}
        <button type="submit" className="btn-accent h-15 text-lg" disabled={sending || blocked}>
          {sending ? t.cart.sending : t.cart.submit}
        </button>
        <p className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 text-fg-2">
          <Lock className="mt-1 size-4 shrink-0" aria-hidden="true" />
          {t.cart.reassure}
        </p>
      </aside>
    </form>
  )
}
