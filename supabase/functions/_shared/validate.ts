/**
 * Order validation, shared by the storefront (instant feedback) and the Edge Function (the real check).
 * Plain TypeScript with no imports, so it runs in the browser, in Node (tests) and in Deno.
 */

export const LANGS = ['ar', 'fr', 'en'] as const
export type Lang = (typeof LANGS)[number]

/** One cart line: a plan and how many (subscriptions, or users for per-user products). */
export type OrderItem = { variant_id: string; quantity: number }

export type OrderInput = {
  lang: Lang
  items: OrderItem[]
  customer_name: string
  phone: string
  email: string
  notes: string
}

/** Field name → error code; the storefront turns codes into words in the visitor's language. */
export type FieldErrors = Partial<Record<string, 'required' | 'invalid' | 'too_long'>>

export const MAX_ITEMS = 10
export const MAX_QUANTITY = 500

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Algerian mobile numbers: "0661 60 18 38", "+213 661601838", "00213-661-60-18-38" → "0661601838". Null if not a mobile. */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[\s().-]/g, '')
  if (d.startsWith('+213')) d = '0' + d.slice(4)
  else if (d.startsWith('00213')) d = '0' + d.slice(5)
  else if (d.startsWith('213') && d.length === 12) d = '0' + d.slice(3)
  return /^0[567]\d{8}$/.test(d) ? d : null
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

const langOf = (v: unknown): Lang => (LANGS.includes(v as Lang) ? (v as Lang) : 'ar')

/** The cart lines, merged by plan; null if the list is malformed. Pages built before the cart send one plan. */
function cartItems(body: Record<string, unknown>): OrderItem[] | null {
  const raw = Array.isArray(body.items) ? body.items : body.variant_id ? [{ variant_id: body.variant_id, quantity: body.quantity }] : []
  const merged = new Map<string, number>()
  for (const line of raw as Record<string, unknown>[]) {
    const id = str(line?.variant_id).toLowerCase()
    const quantity = Number(line?.quantity)
    if (!UUID.test(id) || !Number.isInteger(quantity) || quantity < 1) return null
    merged.set(id, (merged.get(id) ?? 0) + quantity)
  }
  const items = [...merged].map(([variant_id, quantity]) => ({ variant_id, quantity }))
  return items.some((i) => i.quantity > MAX_QUANTITY) || items.length > MAX_ITEMS ? null : items
}

export function validateOrder(body: Record<string, unknown>): { ok: true; value: OrderInput } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {}
  const items = cartItems(body)
  if (!items) errors.items = 'invalid'
  else if (!items.length) errors.items = 'required'

  const customer_name = str(body.customer_name)
  if (customer_name.length < 2) errors.customer_name = 'required'
  else if (customer_name.length > 120) errors.customer_name = 'too_long'

  const phone = normalizePhone(str(body.phone))
  if (!str(body.phone)) errors.phone = 'required'
  else if (!phone) errors.phone = 'invalid'

  const email = str(body.email).toLowerCase()
  if (!email) errors.email = 'required'
  else if (email.length > 200) errors.email = 'too_long'
  else if (!EMAIL.test(email)) errors.email = 'invalid'

  const notes = str(body.notes)
  if (notes.length > 1000) errors.notes = 'too_long'

  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, value: { lang: langOf(body.lang), items: items!, customer_name, phone: phone!, email, notes } }
}

/** A filled-in hidden "website" field means a bot filled the form. */
export const isBot = (body: Record<string, unknown>) => str(body.website).length > 0

export type PushSubscriptionInput = { token: string; endpoint: string; p256dh: string; auth: string }

// the push services of Chrome/Android/Edge-on-Android, Firefox, Safari and Windows: the only addresses the notify
// function will ever post to
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /\.push\.apple\.com$/, /\.notify\.windows\.com$/]
// base64url: a P-256 public key (65 bytes, starting 0x04) and a 16-byte secret
const P256DH = /^B[A-Za-z0-9_-]{86}$/
const AUTH = /^[A-Za-z0-9_-]{22}$/

/** A browser's push subscription for the order with this tracking code (body: {token, subscription}). */
export function validatePushSubscription(body: unknown): { ok: true; value: PushSubscriptionInput } | { ok: false } {
  const b = (body ?? {}) as { token?: unknown; subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } }
  const token = str(b.token).toLowerCase()
  const endpoint = str(b.subscription?.endpoint)
  const p256dh = str(b.subscription?.keys?.p256dh).replace(/=+$/, '')
  const auth = str(b.subscription?.keys?.auth).replace(/=+$/, '')
  let host = ''
  try {
    const url = new URL(endpoint)
    if (url.protocol === 'https:') host = url.hostname
  } catch {
    /* not a URL */
  }
  if (!UUID.test(token) || !PUSH_HOSTS.some((h) => h.test(host)) || endpoint.length > 1000 || !P256DH.test(p256dh) || !AUTH.test(auth)) return { ok: false }
  return { ok: true, value: { token, endpoint, p256dh, auth } }
}
