/**
 * Order and quote validation, shared by the storefront (instant feedback) and the Edge Functions (the real check).
 * Plain TypeScript with no imports, so it runs in the browser, in Node (tests) and in Deno.
 */

export const LANGS = ['ar', 'fr', 'en'] as const
export type Lang = (typeof LANGS)[number]

export type OrderInput = {
  lang: Lang
  variant_id: string
  quantity: number
  customer_name: string
  phone: string
  email: string
  customer_type: 'person' | 'company'
  company_name: string
  nif: string
  payment_method: 'office_cash' | 'bank_transfer'
  notes: string
}

export type QuoteInput = {
  lang: Lang
  company_name: string
  contact_name: string
  phone: string
  email: string
  message: string
}

/** Field name → error code; the storefront turns codes into words in the visitor's language. */
export type FieldErrors = Partial<Record<string, 'required' | 'invalid' | 'too_long'>>

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

function text(errors: FieldErrors, field: string, value: string, max: number, min = 1) {
  if (value.length < min) errors[field] = 'required'
  else if (value.length > max) errors[field] = 'too_long'
}

function contact(errors: FieldErrors, body: Record<string, unknown>) {
  const phone = normalizePhone(str(body.phone))
  if (!str(body.phone)) errors.phone = 'required'
  else if (!phone) errors.phone = 'invalid'
  const email = str(body.email).toLowerCase()
  if (!email) errors.email = 'required'
  else if (email.length > 200) errors.email = 'too_long'
  else if (!EMAIL.test(email)) errors.email = 'invalid'
  return { phone: phone ?? '', email }
}

const langOf = (v: unknown): Lang => (LANGS.includes(v as Lang) ? (v as Lang) : 'ar')

export function validateOrder(body: Record<string, unknown>): { ok: true; value: OrderInput } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {}
  const variant_id = str(body.variant_id)
  if (!UUID.test(variant_id)) errors.variant_id = 'invalid'
  const quantity = Number(body.quantity)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) errors.quantity = 'invalid'

  const customer_name = str(body.customer_name)
  text(errors, 'customer_name', customer_name, 120, 2)
  const { phone, email } = contact(errors, body)

  const customer_type = body.customer_type === 'company' ? 'company' : 'person'
  const company_name = customer_type === 'company' ? str(body.company_name) : ''
  const nif = customer_type === 'company' ? str(body.nif) : ''
  if (customer_type === 'company') text(errors, 'company_name', company_name, 160, 2)
  if (nif.length > 40) errors.nif = 'too_long'

  const payment_method = body.payment_method === 'bank_transfer' ? 'bank_transfer' : 'office_cash'
  const notes = str(body.notes)
  if (notes.length > 1000) errors.notes = 'too_long'

  if (Object.keys(errors).length) return { ok: false, errors }
  return {
    ok: true,
    value: { lang: langOf(body.lang), variant_id, quantity, customer_name, phone, email, customer_type, company_name, nif, payment_method, notes },
  }
}

export function validateQuote(body: Record<string, unknown>): { ok: true; value: QuoteInput } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {}
  const company_name = str(body.company_name)
  text(errors, 'company_name', company_name, 160, 2)
  const contact_name = str(body.contact_name)
  text(errors, 'contact_name', contact_name, 120, 2)
  const { phone, email } = contact(errors, body)
  const message = str(body.message)
  text(errors, 'message', message, 3000, 5)
  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, value: { lang: langOf(body.lang), company_name, contact_name, phone, email, message } }
}

/** A filled-in hidden "website" field means a bot filled the form. */
export const isBot = (body: Record<string, unknown>) => str(body.website).length > 0
