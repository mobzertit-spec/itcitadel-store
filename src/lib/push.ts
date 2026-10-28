import { fromB64url } from '@shared/webpush'
import { SUPABASE_KEY, SUPABASE_URL } from '@/config'

/**
 * Phone notifications for an order (Web Push). The service worker (public/sw.js) only shows notifications: it
 * caches nothing, so the store loads exactly as before.
 *   ready: can be turned on · on: already on for this order · denied: blocked in the browser
 *   ios-install: an iPhone that must first add the store to its home screen · unsupported: nothing to offer
 */
export type PushState = 'ready' | 'on' | 'denied' | 'ios-install' | 'unsupported'

const ON = 'itc:push'
const base = import.meta.env.BASE_URL

function ordersOn(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ON) ?? '[]') as string[]
  } catch {
    return []
  }
}

const isIos = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1)
const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export async function pushState(token: string): Promise<PushState> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return isIos() && !standalone() ? 'ios-install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'granted' && ordersOn().includes(token)) {
    const registration = await navigator.serviceWorker.getRegistration(base)
    if (await registration?.pushManager.getSubscription()) return 'on'
  }
  return 'ready'
}

/** Asks the visitor, subscribes this browser and links it to the order. */
export async function enablePush(token: string): Promise<'on' | 'denied' | 'failed'> {
  try {
    await navigator.serviceWorker.register(`${base}sw.js`, { scope: base })
    if ((await Notification.requestPermission()) !== 'granted') return 'denied'
    const { key } = (await (await fetch(`${SUPABASE_URL}/functions/v1/push`)).json()) as { key: string }
    const registration = await navigator.serviceWorker.ready
    const subscription =
      (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64url(key) }))
    const res = await fetch(`${SUPABASE_URL}/functions/v1/push`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, subscription: subscription.toJSON() }),
    })
    if (!res.ok) return 'failed'
    localStorage.setItem(ON, JSON.stringify([...new Set([...ordersOn(), token])].slice(-20)))
    return 'on'
  } catch {
    return 'failed'
  }
}
