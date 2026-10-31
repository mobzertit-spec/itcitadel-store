import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { onOffer, priceOf, timeLeft } from './offers.ts'

const NOW = Date.UTC(2026, 9, 31, 12)
const plan = (promo: number | null, ends: string | null) => ({ price_dzd: 6500, promo_price_dzd: promo, promo_ends_at: ends })

describe('offers', () => {
  it('charges the offer price until its end instant, the normal price after', () => {
    const p = plan(5500, '2026-11-02T12:00:00Z')
    assert.equal(onOffer(p, NOW), true)
    assert.equal(priceOf(p, NOW), 5500)
    assert.equal(priceOf(p, Date.parse('2026-11-02T12:00:00Z')), 6500)
    assert.equal(priceOf(p, Date.parse('2026-11-03T00:00:00Z')), 6500)
  })
  it('ignores an offer with no price or no end date', () => {
    assert.equal(priceOf(plan(null, '2026-11-02T12:00:00Z'), NOW), 6500)
    assert.equal(priceOf(plan(5500, null), NOW), 6500)
    assert.equal(priceOf({ price_dzd: 6500 }, NOW), 6500)
  })
  it('splits the time left for a countdown, and stops at zero', () => {
    assert.deepEqual(timeLeft('2026-11-02T15:04:05Z', NOW), { d: 2, h: 3, m: 4, s: 5, done: false })
    assert.deepEqual(timeLeft('2026-10-30T00:00:00Z', NOW), { d: 0, h: 0, m: 0, s: 0, done: true })
  })
})
