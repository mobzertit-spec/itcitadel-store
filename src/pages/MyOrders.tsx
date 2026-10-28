import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Meta } from '@/components/Meta'
import { day } from '@/lib/format'
import { href, useLang, useT } from '@/lib/lang'
import { fetchTracking, useRememberedOrders, type OrderStatus } from '@/lib/orders'

/** The orders sent from this device, newest first, each with where it stands now. */
export default function MyOrders() {
  const lang = useLang()
  const t = useT()
  const orders = useRememberedOrders()
  const [statuses, setStatuses] = useState<Record<string, OrderStatus>>({})
  const Arrow = t.dir === 'rtl' ? ChevronLeft : ChevronRight

  useEffect(() => {
    let alive = true
    for (const o of orders)
      void fetchTracking(o.token).then((got) => {
        if (alive && got && got !== 'error') setStatuses((s) => ({ ...s, [o.token]: got.status }))
      })
    return () => {
      alive = false
    }
  }, [orders])

  return (
    <div className="container-x max-w-3xl pt-12 sm:pt-16">
      <Meta title={t.meta.ordersTitle} noindex />
      <h1 className="h-section">{t.track.mine}</h1>
      <p className="mt-3 text-lg text-muted">{orders.length ? t.track.mineLead : t.track.mineEmpty}</p>
      {orders.length > 0 ? (
        <ul className="mt-8 flex flex-col gap-3">
          {orders.map((o) => {
            const status = statuses[o.token]
            return (
              <li key={o.token}>
                <Link to={href(lang, `order/${o.token}`)} viewTransition className="glow lift card relative flex items-center gap-4 p-5 sm:p-6">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <b className="latin text-xl">#{o.number}</b>
                    <span className="text-sm text-muted">{day(o.at, lang)}</span>
                  </span>
                  {status && (
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${status === 'activated' ? 'bg-fg text-bg' : 'border border-line-strong text-fg-2'}`}>
                      {t.track.status[status]}
                    </span>
                  )}
                  <Arrow className="size-5 shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <Link to={href(lang, 'products')} viewTransition className="btn-light mt-8 h-14 px-8">
          {t.cta.browse}
        </Link>
      )}
    </div>
  )
}
