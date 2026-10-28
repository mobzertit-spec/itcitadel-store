import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Lang } from '@shared/validate'
import { SUPABASE_KEY, SUPABASE_URL } from '@/config'

export type OrderStatus = 'new' | 'confirmed' | 'paid' | 'activated' | 'cancelled'
export type TrackingLine = {
  product_name: string
  slug: string | null
  labels: Record<Lang, string>
  quantity: number
  line_total: number
  months: number | null
  /** set once the order is activated, for plans with a length */
  ends_at: string | null
}
/** What the tracking page may show of an order (public.order_track): never the customer's name, phone or email. */
export type Tracking = {
  number: number
  status: OrderStatus
  lang: Lang
  created_at: string
  updated_at: string
  activated_at: string | null
  total: number
  lines: TrackingLine[]
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The order with this tracking code; null if there is none, 'error' if the store could not be reached. */
export async function fetchTracking(token: string): Promise<Tracking | null | 'error'> {
  if (!UUID.test(token)) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/order_track`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: token }),
    })
    if (!res.ok) return 'error'
    return ((await res.json()) as Tracking | null) ?? null
  } catch {
    return 'error'
  }
}

/** How often an open tracking page asks again (the owner changes the status from the dashboard). */
const EVERY = 10_000

/** The order, kept fresh while the page is on screen: every 10 s, and at once when the visitor comes back to it. */
export function useTracking(token: string) {
  const [tracking, setTracking] = useState<Tracking | null | 'error' | undefined>(undefined)
  useEffect(() => {
    let alive = true
    const load = async () => {
      if (document.visibilityState !== 'visible') return
      const got = await fetchTracking(token)
      // a passing network error never hides an order already shown
      if (alive) setTracking((was) => (got === 'error' && was && was !== 'error' ? was : got))
    }
    void load()
    const timer = setInterval(load, EVERY)
    document.addEventListener('visibilitychange', load)
    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', load)
    }
  }, [token])
  return tracking
}

// ── The orders sent from this device (localStorage), for "My orders" ────────
export type Remembered = { token: string; number: number; at: string }

const KEY = 'itc:orders'
const EMPTY: Remembered[] = []
const listeners = new Set<() => void>()
let cache: { raw: string | null; list: Remembered[] } = { raw: null, list: EMPTY }

function read(): Remembered[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    /* no storage: nothing remembered */
  }
  if (raw === cache.raw) return cache.list
  let list: Remembered[] = EMPTY
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]')
    if (Array.isArray(parsed)) list = parsed.filter((o): o is Remembered => UUID.test(o?.token) && Number.isInteger(o?.number))
  } catch {
    /* unreadable: start again */
  }
  cache = { raw, list }
  return list
}

/** Keeps an order on this device (newest first, at most 20). */
export function rememberOrder(order: Remembered) {
  const list = [order, ...read().filter((o) => o.token !== order.token)].slice(0, 20)
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* private mode: the tracking link still works */
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

/** The orders sent from this device; empty while prerendering. */
export function useRememberedOrders(): Remembered[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}
