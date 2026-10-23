import { Package, PenTool, ShieldCheck, Sparkles, Users, type LucideIcon } from 'lucide-react'

/** Each category has an icon and a tint; product cards use them instead of brand logos (trademarks stay with their owners). */
const STYLES: Record<string, { icon: LucideIcon; tile: string }> = {
  ai: { icon: Sparkles, tile: 'bg-violet-100 text-violet-700' },
  design: { icon: PenTool, tile: 'bg-rose-100 text-rose-700' },
  collab: { icon: Users, tile: 'bg-sky-100 text-sky-700' },
  security: { icon: ShieldCheck, tile: 'bg-emerald-100 text-emerald-700' },
}
const FALLBACK = { icon: Package, tile: 'bg-stone text-ink-2' }

export function CategoryIcon({ id, className = 'size-12', iconClass = 'size-6' }: { id: string; className?: string; iconClass?: string }) {
  const { icon: Icon, tile } = STYLES[id] ?? FALLBACK
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-2xl ${tile} ${className}`}>
      <Icon className={iconClass} strokeWidth={1.8} aria-hidden="true" />
    </span>
  )
}
