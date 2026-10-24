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
  const A = '3fd82663-a81f-4c8b-a9eb-4e4b90788237'
  const B = '8a1c0e52-6b7d-4f3e-9c21-5d4b3a2f1e0d'
  const base = { items: [{ variant_id: A, quantity: 1 }], customer_name: 'Sami', phone: '0661601838', email: 's@x.dz' }

  it('merges two lines of the same plan into one', () => {
    const r = validateOrder({ ...base, items: [{ variant_id: A, quantity: 1 }, { variant_id: B, quantity: 2 }, { variant_id: A.toUpperCase(), quantity: 3 }] })
    assert.ok(r.ok)
    if (r.ok) assert.deepEqual(r.value.items, [{ variant_id: A, quantity: 4 }, { variant_id: B, quantity: 2 }])
  })
  it('needs at least one line, and refuses malformed or oversized carts', () => {
    assert.deepEqual(validateOrder({ ...base, items: [] }), { ok: false, errors: { items: 'required' } })
    for (const quantity of [0, 501, 1.5, 'x']) assert.equal(validateOrder({ ...base, items: [{ variant_id: A, quantity }] }).ok, false, String(quantity))
    assert.equal(validateOrder({ ...base, items: [{ variant_id: "1' or 1=1", quantity: 1 }] }).ok, false)
    const eleven = Array.from({ length: 11 }, (_, i) => ({ variant_id: A.slice(0, -2) + String(i).padStart(2, '0'), quantity: 1 }))
    assert.equal(validateOrder({ ...base, items: eleven }).ok, false)
  })
  it('keeps no company or payment fields: individuals pay cash at the office', () => {
    const r = validateOrder({ ...base, customer_type: 'company', company_name: 'SARL', nif: '123', payment_method: 'bank_transfer' })
    assert.ok(r.ok)
    if (r.ok) assert.deepEqual(Object.keys(r.value).sort(), ['customer_name', 'email', 'items', 'lang', 'notes', 'phone'])
  })
  it('falls back to Arabic for an unknown language', () => {
    const r = validateOrder({ ...base, lang: 'de' })
    assert.ok(r.ok)
    if (r.ok) assert.equal(r.value.lang, 'ar')
  })
})
