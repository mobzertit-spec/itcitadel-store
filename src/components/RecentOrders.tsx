import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { Lang } from '@shared/validate'
import { SUPABASE_KEY, SUPABASE_URL } from '@/config'
import { fill } from '@/i18n/strings'
import { ADDED_EVENT } from '@/lib/cart'
import { useCatalog } from '@/lib/catalog'
import { href, useLang, useT } from '@/lib/lang'
import { ProductMark } from './BrandLogo'

/** A real order of the last 72 hours (public.recent_orders): the product and when, nothing about the customer. */
type Recent = { slug: string; name: string; at: string }

const FIRST = 12_000
const SHOWN = 6_000
const EVERY = 30_000
const PER_VISIT = 3
const SEEN = 'itc:recent-seen'

// pages where a notice would be in the way: the cart and the order pages
const quietPage = (path: string) => /\/(cart|orders?)(\/|$)/.test(path)

function seen(): number {
  try {
    return Number(sessionStorage.getItem(SEEN)) || 0
  } catch {
    return PER_VISIT // no storage: no notices rather than the same ones on every page
  }
}
function setSeen(n: number) {
  try {
    sessionStorage.setItem(SEEN, String(n))
  } catch {
    /* nothing to remember */
  }
}

let lastAdd = 0
if (typeof window !== 'undefined') window.addEventListener(ADDED_EVENT, () => (lastAdd = Date.now()))

/** Something else has the visitor's attention: a sheet is open, the tab is hidden, they just added to the cart. */
const busy = () => document.hidden || !!document.querySelector('dialog[open]') || quietPage(location.pathname) || Date.now() - lastAdd < 8000

/** "Claude Pro ordered · 3 hours ago": a few notices per visit, from real orders, if the owner leaves them on. */
export function RecentOrders() {
  const lang = useLang()
  const t = useT()
  const { pathname } = useLocation()
  const { catalog } = useCatalog()
  const [list, setList] = useState<Recent[]>([])
  const [shown, setShown] = useState<Recent | null>(null)

  useEffect(() => {
    if (seen() >= PER_VISIT || !SUPABASE_URL) return
    let alive = true
    fetch(`${SUPABASE_URL}/rest/v1/rpc/recent_orders`, { method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, body: '{}' })
      .then((res) => (res.ok ? (res.json() as Promise<unknown>) : []))
      .then((rows) => alive && Array.isArray(rows) && setList(rows.filter((r): r is Recent => typeof r?.slug === 'string' && typeof r?.at === 'string')))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!list.length) return
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const n = seen()
      if (n >= PER_VISIT) return // done for this visit: no timer left
      if (busy()) {
        timer = setTimeout(tick, EVERY)
        return
      }
      setSeen(n + 1)
      setShown(list[n % list.length])
      timer = setTimeout(() => {
        setShown(null)
        timer = setTimeout(tick, EVERY)
      }, SHOWN)
    }
    timer = setTimeout(tick, FIRST)
    // an add to the cart brings its own notice: this one makes way
    const makeWay = () => setShown(null)
    window.addEventListener(ADDED_EVENT, makeWay)
    return () => {
      clearTimeout(timer)
      window.removeEventListener(ADDED_EVENT, makeWay)
    }
  }, [list])

  if (!shown || quietPage(pathname)) return null
  const product = catalog.products.find((p) => p.slug === shown.slug)
  const dismiss = () => {
    setSeen(PER_VISIT) // closed by the visitor: no more this visit
    setShown(null)
  }
  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-50 flex justify-center lg:inset-x-auto lg:start-6 lg:top-auto lg:bottom-6 lg:max-w-xs">
      <div className="glass pointer-events-auto flex w-full max-w-sm animate-rise items-center gap-3 rounded-[22px] p-2 pe-2.5">
        <span className="logo-stage size-12 shrink-0 rounded-2xl">{product && <ProductMark product={product} size={26} />}</span>
        <Link to={href(lang, `p/${shown.slug}`)} viewTransition onClick={() => setShown(null)} className="min-w-0 flex-1 text-sm">
          <b className="block truncate">{fill(t.recent.ordered, { name: shown.name })}</b>
          <span className="block text-muted">{ago(shown.at, lang)}</span>
        </Link>
        <button type="button" onClick={dismiss} aria-label={t.recent.close} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-white/10 hover:text-fg">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

/** "5 minutes ago", "3 hours ago", "yesterday", in the page's language (Latin digits in Arabic, as everywhere). */
function ago(at: string, lang: Lang) {
  const minutes = Math.max(1, Math.round((Date.now() - Date.parse(at)) / 60_000))
  const format = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar-DZ' : lang, { numeric: 'auto' })
  if (minutes < 60) return format.format(-minutes, 'minute')
  if (minutes < 60 * 24) return format.format(-Math.round(minutes / 60), 'hour')
  return format.format(-Math.round(minutes / (60 * 24)), 'day')
}
