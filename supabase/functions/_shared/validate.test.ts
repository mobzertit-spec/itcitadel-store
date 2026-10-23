import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizePhone, validateOrder } from './validate.ts'

describe('normalizePhone', () => {
  it('accepts the ways Algerians write a mobile number', () => {
    for (const raw of ['0661 60 18 38', '0661-60-18-38', '+213 661 60 18 38', '00213661601838', '213661601838', '(0661) 601838'])
      assert.equal(normalizePhone(raw), '0661601838', raw)
    assert.equal(normalizePhone('0550610084'), '0550610084')
    assert.equal(normalizePhone('0770123456'), '0770123456')
  })
  it('rejects landlines, short numbers and other countries', () => {
    for (const raw of ['021 23 45 67', '0661', '+33 6 12 34 56 78', 'abc', '']) assert.equal(normalizePhone(raw), null, raw)
  })
})

describe('validateOrder', () => {
  const base = { variant_id: '3fd82663-a81f-4c8b-a9eb-4e4b90788237', quantity: 1, customer_name: 'Sami', phone: '0661601838', email: 's@x.dz' }
  it('requires a company name only from companies, and drops it for individuals', () => {
    const company = validateOrder({ ...base, customer_type: 'company', company_name: '' })
    assert.equal(company.ok, false)
    const person = validateOrder({ ...base, customer_type: 'person', company_name: 'ignored', nif: '123' })
    assert.ok(person.ok)
    if (person.ok) assert.deepEqual([person.value.company_name, person.value.nif], ['', ''])
  })
  it('rejects quantities outside 1–500 and malformed plan ids', () => {
    for (const quantity of [0, 501, 1.5, 'x']) assert.equal(validateOrder({ ...base, quantity }).ok, false, String(quantity))
    assert.equal(validateOrder({ ...base, variant_id: "1' or 1=1" }).ok, false)
  })
  it('falls back to Arabic and cash for unknown language or payment values', () => {
    const r = validateOrder({ ...base, lang: 'de', payment_method: 'crypto' })
    assert.ok(r.ok)
    if (r.ok) assert.deepEqual([r.value.lang, r.value.payment_method], ['ar', 'office_cash'])
  })
})
