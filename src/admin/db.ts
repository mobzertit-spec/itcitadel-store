import { createClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from '@/config'
import type { Product, Review, Variant } from '@/lib/catalog'

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
  /** orders taken before the store became individuals-only may carry a company */
  customer_type: 'person' | 'company'
  company_name: string | null
  nif: string | null
  notes: string
  total_dzd: number
  admin_note: string
  /** the secret code of the customer's tracking page */
  track_token: string
  order_items: OrderItem[]
}
export type AdminReview = Review & { published: boolean; sort: number; created_at: string }
export type AdminVariant = Variant & { product_id?: string; active: boolean; /** how long the plan lasts: renewal reminders */ months: number | null }
export type AdminProduct = Omit<Product, 'product_variants'> & { active: boolean; product_variants: AdminVariant[] }

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  new: { label: 'جديد', tone: 'bg-accent/15 text-accent' },
  confirmed: { label: 'مؤكَّد', tone: 'bg-sky-400/15 text-sky-300' },
  paid: { label: 'مدفوع', tone: 'bg-violet-400/15 text-violet-300' },
  activated: { label: 'مفعَّل', tone: 'bg-emerald-400/15 text-emerald-300' },
  cancelled: { label: 'ملغى', tone: 'bg-white/5 text-faint' },
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

/** The customer's tracking page for an order, in the order's language. */
export const trackingUrl = (o: Pick<Order, 'lang' | 'track_token'>) => new URL(`${import.meta.env.BASE_URL}${o.lang}/order/${o.track_token}/`, location.origin).href

/** wa.me link that sends the customer their tracking page. */
export function trackingWhatsApp(o: Pick<Order, 'phone' | 'customer_name' | 'lang' | 'number' | 'track_token'>) {
  const url = trackingUrl(o)
  const text = {
    ar: `مرحباً ${o.customer_name}، تابع طلبك #${o.number} من هنا، وفعّل الإشعارات لتصلك كل خطوة: ${url}`,
    fr: `Bonjour ${o.customer_name}, suivez votre commande #${o.number} ici, et activez les notifications pour chaque étape : ${url}`,
    en: `Hello ${o.customer_name}, follow your order #${o.number} here, and turn on notifications for each step: ${url}`,
  }[o.lang]
  return `https://wa.me/213${o.phone.slice(1)}?text=${encodeURIComponent(text)}`
}
