import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { billing, savings, tierOf } from './billing.ts'

const v = (id: string, label_en: string, months: number | null, price_dzd: number) => ({ id, label_en, months, price_dzd })

describe('billing', () => {
  it('names a tier without its length', () => {
    assert.equal(tierOf('Premium · 1 year'), 'premium')
    assert.equal(tierOf('Premium+ · 1 month'), 'premium+')
    assert.equal(tierOf('12 months'), '')
    assert.equal(tierOf('Standard · 1 device · 1 year'), 'standard · 1 device')
  })
  it('pairs each yearly plan with the monthly plan of the same tier', () => {
    const plans = [v('pm', 'Premium · 1 month', 1, 5500), v('py', 'Premium · 1 year', 12, 23500), v('xm', 'Pro · 1 month', 1, 31000), v('xy', 'Pro · 1 year', 12, 287000)]
    const b = billing(plans)!
    assert.deepEqual(b.monthly.map((x) => x.id), ['pm', 'xm'])
    assert.equal(b.other.get('py')?.id, 'pm')
    assert.equal(b.other.get('xm')?.id, 'xy')
  })
  it('offers no switch without a monthly and a yearly plan of the same tier', () => {
    assert.equal(billing([v('a', '1 month', 1, 6500), v('b', '3 months', 3, 19000)]), null)
    assert.equal(billing([v('a', 'Starter · 1 month', 1, 2500), v('b', 'Plus · 1 year', 12, 90000)]), null)
    assert.equal(billing([v('a', 'Standard · 1 device · 1 year', 12, 1990)]), null)
  })
  it('counts what a year saves on twelve months, offers included', () => {
    const month = { price_dzd: 6500 }
    assert.equal(savings({ price_dzd: 63500 }, month), 14500)
    assert.equal(savings({ price_dzd: 90000 }, month), 0)
    const now = Date.UTC(2026, 9, 31)
    assert.equal(savings({ price_dzd: 63500, promo_price_dzd: 60000, promo_ends_at: '2026-11-30T00:00:00Z' }, month, now), 18000)
  })
})
