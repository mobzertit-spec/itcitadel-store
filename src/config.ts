/** Business details shown across the site. Change them here; nothing else needs editing. */
export const BUSINESS = {
  name: 'ITCITADEL',
  phones: ['0661 60 18 38', '0550 61 00 84'],
  /** the number that answers WhatsApp, international format without "+" */
  whatsapp: '213661601838',
  email: 'contact@itcitadel.dz',
  address: {
    ar: 'حي علي خوجة، القطعة 46، أولاد سمار، الجزائر العاصمة',
    fr: 'Cité Ali Khodja, Lot 46, Oued Smar, Alger',
    en: 'Cité Ali Khodja, Lot 46, Oued Smar, Algiers',
  },
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=Cit%C3%A9%20Ali%20Khodja%20Oued%20Smar%20Alger',
  /** opening hours, for structured data (the words are in strings.ts: office.hoursValue) */
  openingHours: 'Su-Th 08:00-17:00',
  /** legal identifiers for the legal page and invoices — shown only once filled in */
  legal: { rc: '', nif: '', nis: '', ai: '' },
  social: { facebook: '', instagram: '', linkedin: '', tiktok: '' },
}

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const telLink = (phone: string) => `tel:+213${phone.replace(/\s/g, '').slice(1)}`
export const waLink = (text = '', number = BUSINESS.whatsapp) => `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`
