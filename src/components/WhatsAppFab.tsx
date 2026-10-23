import { MessageCircle } from 'lucide-react'
import { waLink } from '@/config'
import { useT } from '@/lib/lang'
import { track } from '@/lib/track'

/** Always-visible WhatsApp button — the channel most Algerian buyers use first. */
export function WhatsAppFab() {
  const t = useT()
  return (
    <a
      href={waLink()}
      target="_blank"
      rel="noopener"
      onClick={() => track('Contact')}
      className="fixed end-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#1f9e5a] px-4 py-3 font-semibold text-white shadow-[var(--shadow-lift)] transition hover:bg-[#188a4d] sm:end-6 sm:bottom-6"
    >
      <MessageCircle className="size-5" aria-hidden="true" />
      <span className="hidden sm:inline">{t.cta.whatsapp}</span>
      <span className="sr-only sm:hidden">{t.cta.whatsapp}</span>
    </a>
  )
}
