import { CircleCheck, Clock3, MapPin, MessageCircle } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Meta } from '@/components/Meta'
import { BUSINESS, waLink } from '@/config'
import { fill } from '@/i18n/strings'
import { prettyPhone } from '@/lib/format'
import { href, useLang, useT } from '@/lib/lang'
import { DONE_KEY } from './Cart'

type Done = { number: number | null; phone: string }

function lastDone(state: unknown): Done | null {
  if (state && typeof state === 'object' && 'phone' in state) return state as Done
  try {
    return JSON.parse(sessionStorage.getItem(DONE_KEY) ?? 'null') as Done | null
  } catch {
    return null
  }
}

export default function OrderDone() {
  const lang = useLang()
  const t = useT()
  const { state } = useLocation()
  const done = typeof window === 'undefined' ? null : lastDone(state)
  const number = done?.number ? `#${done.number}` : ''

  return (
    <div className="container-x flex max-w-2xl flex-col items-center pt-16 text-center">
      <Meta title={t.meta.doneTitle} />
      <CircleCheck className="size-16" strokeWidth={1.4} aria-hidden="true" />
      <h1 className="mt-6 text-4xl font-extrabold text-balance">{t.done.title}</h1>
      {number && (
        <p className="mt-4 text-lg text-muted">
          {t.done.number}: <strong className="latin ltr-iso text-2xl text-fg">{number}</strong>
        </p>
      )}
      <p className="mt-3 text-lg text-fg-2">{fill(t.done.next, { phone: done?.phone ? `⁦${prettyPhone(done.phone)}⁩` : '' })}</p>

      <div className="card mt-10 flex w-full flex-col gap-4 p-6 text-start">
        <b className="text-lg">{t.done.visit}</b>
        <p className="flex gap-3 text-muted">
          <MapPin className="mt-1 size-5 shrink-0 text-fg" aria-hidden="true" />
          {BUSINESS.address[lang]}
        </p>
        <p className="flex gap-3 text-muted">
          <Clock3 className="mt-1 size-5 shrink-0 text-fg" aria-hidden="true" />
          {t.office.hoursValue}
        </p>
        <a href={BUSINESS.mapUrl} target="_blank" rel="noopener" className="btn-outline self-start">
          {t.cta.map}
        </a>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        {number && (
          <a href={waLink(fill(t.done.waText, { number }))} target="_blank" rel="noopener" className="btn-light h-14 px-7">
            <MessageCircle className="size-5" aria-hidden="true" />
            {t.done.whatsapp}
          </a>
        )}
        <Link to={href(lang)} className="text-muted underline underline-offset-4 hover:text-fg">
          {t.done.back}
        </Link>
      </div>
    </div>
  )
}
