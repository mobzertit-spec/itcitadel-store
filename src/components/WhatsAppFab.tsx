import { MessageCircle } from 'lucide-react'
import { waLink } from '@/config'
import { useT } from '@/lib/lang'
import { track } from '@/lib/track'

/** WhatsApp, the channel most Algerian buyers use first. Desktop only: phones have it in the bottom bar. */
export function WhatsAppFab() {
  const t = useT()
  return (
    <a
      href={waLink()}
      target="_blank"
      rel="noopener"
      onClick={() => track('Contact')}
      className="glass fixed end-6 bottom-6 z-40 hidden h-12 items-center gap-2 rounded-full px-5 font-bold text-fg transition hover:brightness-125 lg:inline-flex"
    >
      <MessageCircle className="size-5" aria-hidden="true" />
      {t.cta.whatsapp}
    </a>
  )
}
