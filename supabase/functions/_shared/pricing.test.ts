import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { costInDzd, DEFAULT_RULES, rulePrice, type Currency } from './pricing.ts'

describe('rulePrice', () => {
  // the owner's sheet: purchase price, currency, rounded selling price
  const sheet: [string, number, Currency, number][] = [
    ['Zoom Pro annual', 170, 'USD', 54000],
    ['Zoom Business annual', 220, 'USD', 70000],
    ['Zoom Pro monthly', 17, 'USD', 5500],
    ['Zoom Business monthly', 22, 'USD', 7000],
    ['Magnific Premium annual', 63, 'EUR', 23500],
    ['Magnific Premium+ annual', 306, 'EUR', 113000],
    ['Magnific Pro annual', 774, 'EUR', 287000],
    ['Magnific Premium monthly', 15, 'EUR', 5500],
    ['Magnific Premium+ monthly', 34, 'EUR', 12500],
    ['Magnific Pro monthly', 83, 'EUR', 31000],
  ]
  it('gives the prices of the owner’s sheet (dollar 245, euro 285, margin 30%)', () => {
    for (const [name, amount, currency, price] of sheet) assert.equal(rulePrice(amount, currency, DEFAULT_RULES), price, name)
  })
  it('rounds to 500 DZD below 100 000 and to 1 000 DZD above', () => {
    assert.equal(rulePrice(306, 'EUR', DEFAULT_RULES), 113000, '113 373 → 113 000, not 113 500')
    assert.equal(rulePrice(17, 'USD', DEFAULT_RULES), 5500, '5 414.5 → 5 500, not 5 000')
  })
  it('follows the exchange rates and the margin set in the dashboard', () => {
    assert.equal(costInDzd(20, 'USD', { ...DEFAULT_RULES, usd_rate: 250 }), 5000)
    assert.equal(rulePrice(20, 'USD', { ...DEFAULT_RULES, usd_rate: 250, margin_percent: 20 }), 6000)
    assert.equal(rulePrice(1960, 'DZD', DEFAULT_RULES), 2500, 'a price bought in dinars only gets the margin')
  })
})
