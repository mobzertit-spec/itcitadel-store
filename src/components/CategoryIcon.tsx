import type { CSSProperties } from 'react'
import { Package, PenTool, ShieldCheck, Sparkles, Users, type LucideIcon } from 'lucide-react'

/** A neutral icon per category, for products that have no logo yet. */
const ICONS: Record<string, LucideIcon> = { ai: Sparkles, design: PenTool, collab: Users, security: ShieldCheck }

export function CategoryIcon({ id, className = 'size-12', style }: { id: string; className?: string; style?: CSSProperties }) {
  const Icon = ICONS[id] ?? Package
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-raised text-fg ${className}`} style={style}>
      <Icon className="size-1/2" strokeWidth={1.6} aria-hidden="true" />
    </span>
  )
}
