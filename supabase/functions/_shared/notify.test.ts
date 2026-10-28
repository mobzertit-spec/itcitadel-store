import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { notificationText, runNotify, type Claimed, type NotifyDeps } from './notify.ts'

const SITE = 'https://mobzertit-spec.github.io/itcitadel-store/'
const TRACK = '6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b'
const sub = (id: number) => ({ id, endpoint: `https://fcm.googleapis.com/fcm/send/${id}`, p256dh: 'B'.repeat(87), auth: 'A'.repeat(22) })

function row(over: Partial<Claimed> = {}): Claimed {
  return {
    id: 1,
    kind: 'confirmed',
    number: 1007,
    lang: 'ar',
    track: TRACK,
    customer_name: 'أمين بن علي',
    phone: '0661601838',
    products: ['ChatGPT Plus'],
    product_name: null,
    labels: null,
    ends_at: null,
    subscriptions: [sub(1)],
    ...over,
  }
}

function deps(rows: Claimed[], statuses: Record<number, number | Error> = {}) {
  const calls = { pushed: [] as { sub: number; title: string }[], dropped: [] as number[], telegram: [] as string[] }
  const d: NotifyDeps = {
    siteUrl: SITE,
    claim: async () => rows,
    push: async (s, payload) => {
      const status = statuses[s.id] ?? 201
      if (status instanceof Error) throw status
      calls.pushed.push({ sub: s.id, title: payload.title })
      return status
    },
    drop: async (id) => {
      calls.dropped.push(id)
    },
    telegram: async (html) => {
      calls.telegram.push(html)
    },
  }
  return { d, calls }
}

describe('notificationText', () => {
  it('confirms in Arabic with the order number, the office hours and the tracking page', () => {
    const n = notificationText(row(), SITE)
    assert.match(n.title, /#1007/)
    assert.match(n.body, /8:00/)
    assert.equal(n.url, `${SITE}ar/order/${TRACK}/`)
    assert.equal(n.tag, 'order-1007')
  })
  it('speaks the order’s language and names what was activated', () => {
    const n = notificationText(row({ kind: 'activated', lang: 'fr', products: ['ChatGPT Plus', 'Canva Pro'] }), SITE)
    assert.match(n.title, /activé/i)
    assert.match(n.body, /ChatGPT Plus, Canva Pro/)
    assert.equal(n.url, `${SITE}fr/order/${TRACK}/`)
  })
  it('reminds the renewal with the product and the end date', () => {
    const n = notificationText(row({ kind: 'renewal', lang: 'en', product_name: 'Claude Pro', ends_at: '2026-11-01T09:00:00+00:00' }), SITE)
    assert.match(n.title, /Claude Pro/)
    assert.match(n.body, /1 November 2026/)
  })
  it('has a text for every status in every language', () => {
    for (const kind of ['confirmed', 'paid', 'activated', 'cancelled', 'renewal'] as const)
      for (const lang of ['ar', 'fr', 'en'] as const) {
        const n = notificationText(row({ kind, lang, product_name: 'Claude Pro', ends_at: '2026-11-01T09:00:00Z' }), SITE)
        assert.ok(n.title && n.body, `${kind} ${lang}`)
      }
  })
})

describe('runNotify', () => {
  it('sends each notification to every browser of the order', async () => {
    const { d, calls } = deps([row({ subscriptions: [sub(1), sub(2)] }), row({ id: 2, kind: 'paid', subscriptions: [] })])
    assert.deepEqual(await runNotify(d), { sent: 2, dropped: 0 })
    assert.deepEqual(
      calls.pushed.map((p) => p.sub),
      [1, 2],
    )
    assert.equal(calls.telegram.length, 0)
  })
  it('forgets a browser the push service no longer knows, and still reaches the others', async () => {
    const { d, calls } = deps([row({ subscriptions: [sub(1), sub(2), sub(3)] })], { 1: 410, 2: new Error('timeout') })
    assert.deepEqual(await runNotify(d), { sent: 1, dropped: 1 })
    assert.deepEqual(calls.dropped, [1])
    assert.deepEqual(
      calls.pushed.map((p) => p.sub),
      [1, 3],
    )
  })
  it('tells the owner on Telegram about each subscription about to end, with the customer’s phone', async () => {
    const renewal = row({ kind: 'renewal', product_name: 'Claude Pro', labels: { ar: 'شهر واحد', fr: '1 mois', en: '1 month' }, ends_at: '2026-11-01T09:00:00Z', subscriptions: [] })
    const { d, calls } = deps([renewal])
    await runNotify(d)
    assert.equal(calls.telegram.length, 1)
    assert.match(calls.telegram[0], /#1007/)
    assert.match(calls.telegram[0], /0661601838/)
    assert.match(calls.telegram[0], /Claude Pro/)
  })
  it('does nothing when nothing is waiting', async () => {
    const { d, calls } = deps([])
    assert.deepEqual(await runNotify(d), { sent: 0, dropped: 0 })
    assert.equal(calls.telegram.length, 0)
  })
})
