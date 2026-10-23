import { CircleCheck, MessageCircle } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Meta } from '@/components/Meta'
import { waLink } from '@/config'
import { fill } from '@/i18n/strings'
import { prettyPhone } from '@/lib/format'
import { href, useLang, useT } from '@/lib/lang'
import { DONE_KEY } from './Order'

type Done = { kind: 'order' | 'quote'; number: number | null; phone: string }

function lastDone(state: unknown): Done | null {
  if (state && typeof state === 'object' && 'kind' in state) return state as Done
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
  const quote = done?.kind === 'quote'
  const number = done?.number ? `#${done.number}` : ''

  return (
    <div className="container-x max-w-2xl pt-16 text-center">
      <Meta title={`${quote ? t.done.quoteTitle : t.done.title} | ITCITADEL`} />
      <CircleCheck className="mx-auto size-16 text-brand" strokeWidth={1.6} aria-hidden="true" />
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-balance">{quote ? t.done.quoteTitle : t.done.title}</h1>
      {number && (
        <p className="mt-4 text-lg">
          {t.done.number}: <strong className="ltr-iso">{number}</strong>
        </p>
      )}
      <p className="mt-3 text-lg text-ink-2">
        {quote ? t.done.quoteNext : fill(t.done.next, { phone: done?.phone ? `⁦${prettyPhone(done.phone)}⁩` : '' })}
      </p>
      <div className="mt-10 flex flex-col items-center gap-3">
        {number && (
          <a href={waLink(fill(t.done.waText, { number }))} target="_blank" rel="noopener" className="btn-primary">
            <MessageCircle className="size-5" aria-hidden="true" />
            {t.done.whatsapp}
          </a>
        )}
        <Link to={href(lang)} className="btn-ghost">
          {t.done.back}
        </Link>
      </div>
    </div>
  )
}
