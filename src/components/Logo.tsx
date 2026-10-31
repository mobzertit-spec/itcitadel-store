import { MARK } from './logo-mark'

/**
 * The ITCITADEL mark (drawing in logo-mark.ts). The arch takes the text colour; with `animated`, the orange light
 * rises in the doorway when the page opens and glows under the mouse (index.css: .logo-light).
 */
export function LogoMark({ className = 'size-9', animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox={MARK.viewBox} className={className} aria-hidden="true">
      <path fill="currentColor" d={MARK.arch} />
      <rect {...MARK.light} fill={MARK.orange} className={animated ? 'logo-light' : undefined} />
    </svg>
  )
}

export function Logo({ className = '', animated = false }: { className?: string; animated?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-fg ${className}`} dir="ltr">
      <LogoMark className="h-[30px] w-[29px]" animated={animated} />
      <span className="latin text-[1.05rem] font-light tracking-[0.18em]">
        IT<span className="font-bold">CITADEL</span>
      </span>
    </span>
  )
}
