import { createClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from '@/config'
import type { Product, Variant } from '@/lib/catalog'

/** The owner's session lives in this browser only (separate storage key from anything else on the site). */
export const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, storageKey: 'itc-admin' } })

export type OrderStatus = 'new' | 'confirmed' | 'paid' | 'activated' | 'cancelled'
export type OrderItem = { id: number; product_name: string; variant_label: string; unit_price_dzd: number; quantity: number }
export type Order = {
  id: string
  number: number
  created_at: string
  status: OrderStatus
  lang: 'ar' | 'fr' | 'en'
  customer_name: string
  phone: string
  email: string
  customer_type: 'person' | 'company'
  company_name: string | null
  nif: string | null
  payment_method: 'office_cash' | 'bank_transfer'
  notes: string
  total_dzd: number
  admin_note: string
  order_items: OrderItem[]
}
export type QuoteStatus = 'new' | 'contacted' | 'won' | 'lost'
export type Quote = {
  id: string
  number: number
  created_at: string
  status: QuoteStatus
  lang: 'ar' | 'fr' | 'en'
  company_name: string
  contact_name: string
  phone: string
  email: string
  message: string
  admin_note: string
}
export type AdminVariant = Variant & { product_id?: string; active: boolean }
export type AdminProduct = Omit<Product, 'product_variants'> & { active: boolean; product_variants: AdminVariant[] }

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  new: { label: 'جديد', tone: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'مؤكَّد', tone: 'bg-sky-100 text-sky-800' },
  paid: { label: 'مدفوع', tone: 'bg-violet-100 text-violet-800' },
  activated: { label: 'مفعَّل', tone: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'ملغى', tone: 'bg-stone text-muted' },
}
export const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: string }> = {
  new: { label: 'جديد', tone: 'bg-amber-100 text-amber-800' },
  contacted: { label: 'تم التواصل', tone: 'bg-sky-100 text-sky-800' },
  won: { label: 'مقبول', tone: 'bg-emerald-100 text-emerald-800' },
  lost: { label: 'مرفوض', tone: 'bg-stone text-muted' },
}

export const when = (iso: string) =>
  new Intl.DateTimeFormat('fr-DZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Algiers' }).format(new Date(iso))

/** wa.me link to the customer, with a greeting in their language. */
export function customerWhatsApp(phone: string, name: string, lang: 'ar' | 'fr' | 'en', ref: string) {
  const text = {
    ar: `مرحباً ${name}، معك ITCITADEL بخصوص ${ref}.`,
    fr: `Bonjour ${name}, ici ITCITADEL au sujet de ${ref}.`,
    en: `Hello ${name}, this is ITCITADEL about ${ref}.`,
  }[lang]
  return `https://wa.me/213${phone.slice(1)}?text=${encodeURIComponent(text)}`
}
