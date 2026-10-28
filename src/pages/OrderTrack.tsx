import { Bell, BellOff, Check, CircleCheck, Clock3, MapPin, MessageCircle, Share, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ProductMark } from '@/components/BrandLogo'
import { Meta } from '@/components/Meta'
import { Money } from '@/components/Price'
import { BUSINESS, waLink } from '@/config'
import { fill } from '@/i18n/strings'
import { useCatalog } from '@/lib/catalog'
import { day, prettyPhone } from '@/lib/format'
import { href, useLang, useT } from '@/lib/lang'
import { useTracking, type OrderStatus, type Tracking } from '@/lib/orders'
import { enablePush, pushState, type PushState } from '@/lib/push'

const STEPS: Exclude<OrderStatus, 'cancelled'>[] = ['new', 'confirmed', 'paid', 'activated']

/**
 * The order's own page (/:lang/order/:token/): where it stands, what is in it, and phone notifications.
 * The link is secret; the page shows no name, phone or email. It refreshes itself while open.
 */
export default function OrderTrack() {
  const { token = '' } = useParams()
  const lang = useLang()
  const t = useT()
  const { state } = useLocation() as { state: { fresh?: boolean; phone?: string } | null }
  const tracking = useTracking(token)

  if (tracking === undefined) return <div className="container-x min-h-[60vh] pt-12" aria-busy="true" />
  if (tracking === null || tracking === 'error')
    return (
      <div className="container-x flex max-w-2xl flex-col items-center pt-20 text-center">
        <Meta title={t.track.missing} noindex />
        <h1 className="text-3xl font-extrabold">{tracking === null ? t.track.missing : t.track.error}</h1>
        {tracking === null && <p className="mt-3 text-lg text-muted">{t.track.missingText}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to={href(lang, 'orders')} className="btn-light h-14 px-7">
            {t.track.mine}
          </Link>
          <Link to={href(lang)} className="btn-outline h-14 px-7">
            {t.done.back}
          </Link>
        </div>
      </div>
    )

  const number = `#${tracking.number}`
  return (
    <div className="container-x flex max-w-3xl flex-col gap-8 pt-12 sm:pt-16">
      <Meta title={fill(t.meta.trackTitle, { number: tracking.number })} noindex />

      {state?.fresh && (
        <section className="flex flex-col items-center text-center">
          <CircleCheck className="size-14 animate-pop" strokeWidth={1.4} aria-hidden="true" />
          <h1 className="mt-5 text-4xl font-extrabold text-balance">{t.done.title}</h1>
          <p className="mt-3 max-w-xl text-lg text-fg-2">{fill(t.done.next, { phone: state.phone ? `⁦${prettyPhone(state.phone)}⁩` : '' })}</p>
        </section>
      )}

      <section className="card flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          {state?.fresh ? (
            <h2 className="latin text-2xl font-extrabold">{fill(t.track.order, { number: tracking.number })}</h2>
          ) : (
            <h1 className="latin text-3xl font-extrabold">{fill(t.track.order, { number: tracking.number })}</h1>
          )}
          <span className="text-sm text-muted">{fill(t.track.placed, { date: day(tracking.created_at, lang) })}</span>
        </div>
        {tracking.status === 'cancelled' ? (
          <p className="flex items-start gap-3 rounded-2xl border border-line-strong p-4 text-fg-2">
            <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <span>
              <b className="block text-fg">{t.track.status.cancelled}</b>
              {t.track.cancelled}
            </span>
          </p>
        ) : (
          <Timeline status={tracking.status} />
        )}
        <p className="flex items-center gap-2 text-sm text-faint">
          <span className="relative inline-flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-fg/60" />
            <span className="relative inline-flex size-2 rounded-full bg-fg" />
          </span>
          {t.track.live}
        </p>
      </section>

      <Items tracking={tracking} />

      {tracking.status !== 'cancelled' && <Notifications token={token} />}

      <section className="card flex flex-col gap-4 p-6">
        <b className="text-lg">{t.done.visit}</b>
        <p className="flex gap-3 text-muted">
          <MapPin className="mt-1 size-5 shrink-0 text-fg" aria-hidden="true" />
          {BUSINESS.address[lang]}
        </p>
        <p className="flex gap-3 text-muted">
          <Clock3 className="mt-1 size-5 shrink-0 text-fg" aria-hidden="true" />
          {t.office.hoursValue}
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={BUSINESS.mapUrl} target="_blank" rel="noopener" className="btn-outline">
            {t.cta.map}
          </a>
          <a href={waLink(fill(t.done.waText, { number }))} target="_blank" rel="noopener" className="btn-outline">
            <MessageCircle className="size-5" aria-hidden="true" />
            {t.cta.whatsapp}
          </a>
        </div>
      </section>

      <Link to={href(lang, 'orders')} className="self-center text-muted underline underline-offset-4 hover:text-fg">
        {t.track.mine}
      </Link>
    </div>
  )
}

/** New → confirmed → paid → activated: done steps are white, the current one pulses, the next ones wait. */
function Timeline({ status }: { status: Exclude<OrderStatus, 'cancelled'> }) {
  const t = useT()
  const at = STEPS.indexOf(status)
  return (
    <ol className="flex flex-col">
      {STEPS.map((step, i) => {
        const done = i < at
        const current = i === at
        return (
          <li key={step} aria-current={current ? 'step' : undefined} className="relative flex gap-4 pb-6 last:pb-0">
            {i < STEPS.length - 1 && <span aria-hidden="true" className={`absolute start-[13px] top-8 bottom-0 w-px ${done ? 'bg-fg' : 'bg-line-strong'}`} />}
            <span
              key={current ? `now-${status}` : step}
              aria-hidden="true"
              className={`relative z-[1] inline-flex size-7 shrink-0 items-center justify-center rounded-full border ${
                done ? 'border-fg bg-fg text-bg' : current ? 'animate-pop border-fg bg-bg' : 'border-line-strong bg-bg'
              }`}
            >
              {done ? <Check className="size-4" strokeWidth={3} /> : current && <span className="size-2.5 rounded-full bg-fg" />}
            </span>
            <span className={`flex flex-col pt-0.5 ${i > at ? 'text-faint' : ''}`}>
              <b className={current ? 'text-lg text-fg' : ''}>{t.track.status[step]}</b>
              {current && <span className="text-fg-2">{t.track.steps[step]}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** What was ordered, with each subscription's end date once it is active. */
function Items({ tracking }: { tracking: Tracking }) {
  const lang = useLang()
  const t = useT()
  const { catalog } = useCatalog()
  return (
    <section className="card flex flex-col p-6 sm:p-8">
      <h2 className="text-xl font-bold">{t.track.items}</h2>
      <ul className="mt-2">
        {tracking.lines.map((line, i) => {
          const product = catalog.products.find((p) => p.slug === line.slug)
          return (
            <li key={i} className="flex items-center gap-4 border-b border-line py-4 last:border-0">
              <span className="logo-stage size-14 shrink-0 rounded-2xl">{product && <ProductMark product={product} size={30} />}</span>
              <span className="min-w-0 flex-1">
                <b className="latin block">
                  <span className="ltr-iso">{line.product_name}</span>
                </b>
                <span className="text-sm text-muted">
                  {line.labels[lang]}
                  {line.quantity > 1 && <span className="latin"> × {line.quantity}</span>}
                </span>
                {line.ends_at && (
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-fg-2">
                    {fill(t.track.endsOn, { date: day(line.ends_at, lang) })}
                    {product && (
                      <Link to={href(lang, `p/${product.slug}`)} className="underline underline-offset-4 hover:text-fg">
                        {t.track.renew}
                      </Link>
                    )}
                  </span>
                )}
              </span>
              <Money value={line.line_total} />
            </li>
          )
        })}
      </ul>
      <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-4">
        <b>{t.cart.total}</b>
        <Money value={tracking.total} className="text-2xl" />
      </div>
    </section>
  )
}

/** "Notify me": turns phone notifications on for this order, or says why it cannot. */
function Notifications({ token }: { token: string }) {
  const t = useT()
  const [state, setState] = useState<PushState | 'busy' | 'failed' | null>(null)
  useEffect(() => {
    let alive = true
    void pushState(token).then((s) => alive && setState(s))
    return () => {
      alive = false
    }
  }, [token])
  if (state === null || state === 'unsupported') return null

  const turnOn = async () => {
    setState('busy')
    setState(await enablePush(token))
  }
  return (
    <section className="glass flex flex-col gap-4 rounded-[28px] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8" aria-live="polite">
      <span className="flex items-start gap-4">
        {state === 'denied' ? <BellOff className="mt-1 size-6 shrink-0" aria-hidden="true" /> : <Bell className="mt-1 size-6 shrink-0" aria-hidden="true" />}
        <span>
          <b className="block text-lg">{t.track.notify.title}</b>
          <span className="text-fg-2">
            {state === 'on' ? t.track.notify.on : state === 'denied' ? t.track.notify.denied : state === 'ios-install' ? t.track.notify.ios : t.track.notify.text}
          </span>
          {state === 'failed' && <span className="mt-1 block text-sm text-danger">{t.track.notify.failed}</span>}
        </span>
      </span>
      {(state === 'ready' || state === 'busy' || state === 'failed') && (
        <button type="button" onClick={turnOn} disabled={state === 'busy'} className="btn-light h-13 shrink-0 px-6">
          <Bell className="size-5" aria-hidden="true" />
          {state === 'busy' ? '…' : t.track.notify.button}
        </button>
      )}
      {state === 'ios-install' && <Share className="size-7 shrink-0 self-center text-muted" aria-hidden="true" />}
      {state === 'on' && <Check className="size-7 shrink-0 animate-pop self-center" aria-hidden="true" />}
    </section>
  )
}
