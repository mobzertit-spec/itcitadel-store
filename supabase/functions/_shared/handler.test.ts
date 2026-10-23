import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { handleOrder, handleQuote, orderMessage, type Deps } from './handler.ts'

const VARIANT = '3fd82663-a81f-4c8b-a9eb-4e4b90788237'
const ORIGIN = 'https://mobzertit-spec.github.io'

function deps(over: Partial<Deps> = {}) {
  const calls = { orders: [] as unknown[], quotes: [] as unknown[], notes: [] as string[], keys: [] as string[] }
  const d: Deps = {
    allowedOrigins: [ORIGIN],
    salt: 'test',
    rateHit: async (key) => {
      calls.keys.push(key)
      return true
    },
    createOrder: async (input) => {
      calls.orders.push(input)
      return { number: 1001, product_name: 'ChatGPT Plus', variant_label: '3 أشهر', total: 31800 }
    },
    createQuote: async (input) => {
      calls.quotes.push(input)
      return 501
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
  variant_id: VARIANT,
  quantity: 2,
  customer_name: 'أمين بن علي',
  phone: '+213 661 60 18 38',
  email: 'Amine@Example.dz',
  customer_type: 'person',
  payment_method: 'office_cash',
  notes: '',
}

describe('place-order', () => {
  it('stores a valid order, priced by the database, and notifies the owner', async () => {
    const { d, calls } = deps()
    const res = await handleOrder(order({ ...valid, total_dzd: 1, price_dzd: 1 }), d)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true, number: 1001 })
    const stored = calls.orders[0] as Record<string, unknown>
    assert.equal(stored.phone, '0661601838')
    assert.equal(stored.email, 'amine@example.dz')
    assert.equal('total_dzd' in stored || 'price_dzd' in stored, false, 'client prices never reach the database')
    assert.match(calls.notes[0], /#1001/)
    assert.match(calls.notes[0], /31\s?800/)
    assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN)
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

describe('request-quote', () => {
  it('stores a quote request and notifies the owner', async () => {
    const { d, calls } = deps()
    const req = new Request('https://x/', {
      method: 'POST',
      headers: { origin: ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({ lang: 'fr', company_name: 'SARL Atlas', contact_name: 'Nadia', phone: '0550610084', email: 'n@atlas.dz', message: 'Workspace pour 12 utilisateurs' }),
    })
    const res = await handleQuote(req, d)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true, number: 501 })
    assert.equal(calls.quotes.length, 1)
    assert.match(calls.notes[0], /SARL Atlas/)
  })
})

describe('orderMessage', () => {
  it('escapes customer text for Telegram HTML', () => {
    const text = orderMessage(
      { lang: 'ar', variant_id: VARIANT, quantity: 1, customer_name: '<b>x</b>', phone: '0661601838', email: 'a@b.dz', customer_type: 'company', company_name: 'A & B', nif: '', payment_method: 'bank_transfer', notes: '' },
      { number: 7, product_name: 'Kaspersky', variant_label: 'Plus', total: 6490 },
    )
    assert.match(text, /&lt;b&gt;x&lt;\/b&gt;/)
    assert.match(text, /A &amp; B/)
  })
})
