import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { handleOrder, orderMessage, type Deps } from './handler.ts'

const VARIANT = '3fd82663-a81f-4c8b-a9eb-4e4b90788237'
const VARIANT_2 = '8a1c0e52-6b7d-4f3e-9c21-5d4b3a2f1e0d'
const ORIGIN = 'https://mobzertit-spec.github.io'

function deps(over: Partial<Deps> = {}) {
  const calls = { orders: [] as unknown[], notes: [] as string[], keys: [] as string[] }
  const d: Deps = {
    allowedOrigins: [ORIGIN],
    salt: 'test',
    rateHit: async (key) => {
      calls.keys.push(key)
      return true
    },
    createOrder: async (input) => {
      calls.orders.push(input)
      return {
        number: 1001,
        total: 38290,
        lines: [
          { product_name: 'ChatGPT Plus', variant_label: '3 أشهر', quantity: 2, line_total: 31800 },
          { product_name: 'Kaspersky', variant_label: 'Plus · 5 أجهزة · سنة', quantity: 1, line_total: 6490 },
        ],
      }
    },
    notify: async (text) => {
      calls.notes.push(text)
    },
    ...over,
  }
  return { d, calls }
}

const order = (body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  new Request('https://x.supabase.co/functions/v1/place-order', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-forwarded-for': '41.200.1.2, 10.0.0.1', ...headers },
    body: JSON.stringify(body),
  })

const valid = {
  lang: 'ar',
  items: [
    { variant_id: VARIANT, quantity: 2 },
    { variant_id: VARIANT_2, quantity: 1 },
  ],
  customer_name: 'أمين بن علي',
  phone: '+213 661 60 18 38',
  email: 'Amine@Example.dz',
  notes: '',
}

describe('place-order', () => {
  it('stores a cart of several plans, priced by the database, and notifies the owner', async () => {
    const { d, calls } = deps()
    const res = await handleOrder(order({ ...valid, total_dzd: 1, items: valid.items.map((i) => ({ ...i, price_dzd: 1 })) }), d)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true, number: 1001 })
    const stored = calls.orders[0] as Record<string, unknown>
    assert.equal(stored.phone, '0661601838')
    assert.equal(stored.email, 'amine@example.dz')
    assert.deepEqual(stored.items, valid.items, 'only plan ids and quantities reach the database')
    assert.equal('total_dzd' in stored, false, 'client prices never reach the database')
    assert.match(calls.notes[0], /#1001/)
    assert.match(calls.notes[0], /ChatGPT Plus[^\n]*× 2/)
    assert.match(calls.notes[0], /Kaspersky/)
    assert.match(calls.notes[0], /38\s?290/)
    assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN)
  })

  it('still accepts the single-plan body of pages built before the cart', async () => {
    const { d, calls } = deps()
    const { items: _items, ...rest } = valid
    const res = await handleOrder(order({ ...rest, variant_id: VARIANT, quantity: 3, customer_type: 'company', payment_method: 'bank_transfer' }), d)
    assert.equal(res.status, 200)
    assert.deepEqual((calls.orders[0] as { items: unknown }).items, [{ variant_id: VARIANT, quantity: 3 }])
  })

  it('rejects invalid fields with per-field codes and stores nothing', async () => {
    const { d, calls } = deps()
    const res = await handleOrder(order({ ...valid, phone: '0123', email: 'nope' }), d)
    assert.equal(res.status, 400)
    const body = (await res.json()) as { errors: Record<string, string> }
    assert.equal(body.errors.phone, 'invalid')
    assert.equal(body.errors.email, 'invalid')
    assert.equal(calls.orders.length, 0)
  })

  it('answers bots that fill the hidden field as if all went well, without storing', async () => {
    const { d, calls } = deps()
    const res = await handleOrder(order({ ...valid, website: 'http://spam.example' }), d)
    assert.equal(res.status, 200)
    assert.equal(calls.orders.length, 0)
    assert.equal(calls.notes.length, 0)
  })

  it('limits requests per visitor, keyed by a hash rather than the IP address', async () => {
    const { d, calls } = deps({ rateHit: async () => false })
    const res = await handleOrder(order(valid), d)
    assert.equal(res.status, 429)
    assert.equal(calls.orders.length, 0)
    const { d: d2, calls: c2 } = deps()
    await handleOrder(order(valid), d2)
    assert.equal(c2.keys[0].includes('41.200.1.2'), false)
    assert.match(c2.keys[0], /^order:[0-9a-f]{64}$/)
  })

  it('reports a plan that is hidden, removed or quote-only as unavailable', async () => {
    const { d } = deps({ createOrder: async () => 'unavailable' })
    const res = await handleOrder(order(valid), d)
    assert.equal(res.status, 409)
  })

  it('refuses other websites but answers the store’s preflight', async () => {
    const { d } = deps()
    assert.equal((await handleOrder(order(valid, { origin: 'https://evil.example' }), d)).status, 403)
    const pre = await handleOrder(new Request('https://x/', { method: 'OPTIONS', headers: { origin: ORIGIN } }), d)
    assert.equal(pre.status, 204)
    assert.match(pre.headers.get('access-control-allow-headers') ?? '', /apikey/)
  })

  it('keeps the order when the Telegram alert fails', async () => {
    const { d } = deps({
      notify: async () => {
        throw new Error('telegram down')
      },
    })
    const res = await handleOrder(order(valid), d)
    assert.equal(res.status, 200)
  })
})

describe('orderMessage', () => {
  it('escapes customer text for Telegram HTML', () => {
    const text = orderMessage(
      { lang: 'ar', items: [{ variant_id: VARIANT, quantity: 1 }], customer_name: '<b>x</b>', phone: '0661601838', email: 'a@b.dz', notes: 'A & B' },
      { number: 7, total: 6490, lines: [{ product_name: 'Kaspersky', variant_label: 'Plus', quantity: 1, line_total: 6490 }] },
    )
    assert.match(text, /&lt;b&gt;x&lt;\/b&gt;/)
    assert.match(text, /A &amp; B/)
    assert.match(text, /نقداً في المكتب/)
  })
})
