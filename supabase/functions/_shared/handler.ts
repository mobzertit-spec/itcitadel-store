/**
 * The store's public endpoints (place-order, push) as plain functions of a Request.
 * Database and Telegram access come in through `Deps`, so the rules are tested without either (handler.test.ts).
 */
import { isBot, validateOrder, validatePushSubscription, type OrderInput, type PushSubscriptionInput } from './validate.ts'

export type OrderLine = { product_name: string; variant_label: string; quantity: number; line_total: number }
/** `track`: the secret code of the order's tracking page */
export type CreatedOrder = { number: number; total: number; lines: OrderLine[]; track: string }

export type Deps = {
  /** browser origins allowed to call (the storefront); empty = any */
  allowedOrigins: string[]
  /** secret mixed into the visitor hash, so stored keys cannot be turned back into IP addresses */
  salt: string
  /** the storefront's address, ending with "/" (tracking links in the owner's messages) */
  siteUrl: string
  /** counts one request for the key; false = over today's limit */
  rateHit: (key: string) => Promise<boolean>
  /** prices the order from the database and stores it; 'unavailable' if the plan cannot be ordered */
  createOrder: (input: OrderInput) => Promise<CreatedOrder | 'unavailable'>
  /** message to the owner (Telegram); failures never fail the request */
  notify: (html: string) => Promise<void>
}

/** What every public endpoint needs: who may call, and the rate limit. */
type Gate = Pick<Deps, 'allowedOrigins' | 'salt' | 'rateHit'>

function corsHeaders(req: Request, deps: Gate, methods = 'POST, OPTIONS'): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allowed = !deps.allowedOrigins.length || deps.allowedOrigins.includes(origin)
  return {
    'Access-Control-Allow-Origin': allowed && origin ? origin : deps.allowedOrigins[0] ?? '*',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  }
}

const reply = (status: number, body: unknown, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })

async function visitorKey(req: Request, kind: string, salt: string) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'unknown'
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`))
  return `${kind}:${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')}`
}

/** Shared steps: CORS, method, origin, JSON body, honeypot, rate limit. Returns the body, or the response to send. */
async function intake(req: Request, deps: Gate, kind: string, methods?: string): Promise<{ body: Record<string, unknown>; cors: Record<string, string> } | Response> {
  const cors = corsHeaders(req, deps, methods)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'method' }, cors)
  const origin = req.headers.get('origin')
  if (deps.allowedOrigins.length && origin && !deps.allowedOrigins.includes(origin)) return reply(403, { error: 'origin' }, cors)

  let body: Record<string, unknown>
  try {
    const parsed = await req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
    body = parsed as Record<string, unknown>
  } catch {
    return reply(400, { error: 'json' }, cors)
  }
  // a bot filled the hidden field: look successful, store nothing
  if (isBot(body)) return reply(200, { ok: true, number: null }, cors)
  if (!(await deps.rateHit(await visitorKey(req, kind, deps.salt)))) return reply(429, { error: 'rate' }, cors)
  return { body, cors }
}

async function safeNotify(deps: Deps, html: string) {
  try {
    await deps.notify(html)
  } catch (err) {
    console.error('notify failed', err)
  }
}

export async function handleOrder(req: Request, deps: Deps): Promise<Response> {
  const got = await intake(req, deps, 'order')
  if (got instanceof Response) return got
  const { body, cors } = got
  const check = validateOrder(body)
  if (!check.ok) return reply(400, { errors: check.errors }, cors)
  try {
    const created = await deps.createOrder(check.value)
    if (created === 'unavailable') return reply(409, { error: 'unavailable' }, cors)
    await safeNotify(deps, orderMessage(check.value, created, deps.siteUrl))
    return reply(200, { ok: true, number: created.number, track: created.track }, cors)
  } catch (err) {
    console.error('order failed', err)
    return reply(500, { error: 'server' }, cors)
  }
}

// ── Telegram messages (in Arabic, for the owner) ─────────────────────────────
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const money = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, ' ')} دج`
const LANG = { ar: 'العربية', fr: 'الفرنسية', en: 'الإنجليزية' }

export function orderMessage(o: OrderInput, c: CreatedOrder, siteUrl: string) {
  return [
    `🛒 <b>طلب جديد #${c.number}</b>`,
    ...c.lines.map((l) => `• ${esc(l.product_name)} — ${esc(l.variant_label)} × ${l.quantity}: ${money(l.line_total)}`),
    `💰 <b>${money(c.total)}</b> · نقداً في المكتب`,
    '',
    `👤 ${esc(o.customer_name)}`,
    `📞 ${o.phone}`,
    `✉️ ${esc(o.email)}`,
    ...(o.notes ? [`📝 ${esc(o.notes)}`] : []),
    `🌐 ${LANG[o.lang]}`,
    `🔗 ${siteUrl}${o.lang}/order/${c.track}/`,
  ].join('\n')
}

// ── push: browsers that want news of an order ────────────────────────────────
export type PushDeps = Gate & {
  /** the store's VAPID public key (base64url), which browsers subscribe with */
  publicKey: () => Promise<string>
  /** saves the browser for the order with this tracking code; false if there is no such order */
  subscribe: (s: PushSubscriptionInput) => Promise<boolean>
}

/** GET: the public key. POST {token, subscription}: notify this browser about that order. */
export async function handlePush(req: Request, deps: PushDeps): Promise<Response> {
  const methods = 'GET, POST, OPTIONS'
  if (req.method === 'GET') return reply(200, { key: await deps.publicKey() }, corsHeaders(req, deps, methods))
  const got = await intake(req, deps, 'push', methods)
  if (got instanceof Response) return got
  const { body, cors } = got
  const check = validatePushSubscription(body)
  if (!check.ok) return reply(400, { error: 'subscription' }, cors)
  try {
    if (!(await deps.subscribe(check.value))) return reply(404, { error: 'order' }, cors)
    return reply(200, { ok: true }, cors)
  } catch (err) {
    console.error('push subscribe failed', err)
    return reply(500, { error: 'server' }, cors)
  }
}
