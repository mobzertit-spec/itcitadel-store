import { useEffect, useId, useRef } from 'react'
import { ADDED_EVENT } from '@/lib/cart'
import { reducedMotion } from '@/lib/motion'
import { MARK } from './logo-mark'

/**
 * The ITCITADEL mark (drawing in logo-mark.ts). The arch takes the text colour. With `animated` (the header), the
 * orange light rises in the doorway when the page opens, the doorway breathes a soft glow, the light reaches the top
 * of the door under the mouse or the keyboard, as if it opened (index.css: .logo-light, .logo-glow), and it flashes
 * when something is added to the cart.
 */
export function LogoMark({ className = 'size-9', animated = false }: { className?: string; animated?: boolean }) {
  const glowId = `logo-glow${useId().replace(/[^\w-]/g, '')}`
  const light = useRef<SVGRectElement>(null)
  const glow = useRef<SVGRectElement>(null)

  useEffect(() => {
    if (!animated) return
    const flash = (e: Event) => {
      if (!(e as CustomEvent<{ ok?: boolean }>).detail?.ok || reducedMotion() || typeof Element.prototype.animate !== 'function') return
      light.current?.animate([{ offset: 0.3, transform: 'scaleY(1.24)' }], { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
      glow.current?.animate([{ offset: 0.25, opacity: 1 }], { duration: 900, easing: 'ease-out' })
    }
    window.addEventListener(ADDED_EVENT, flash)
    return () => window.removeEventListener(ADDED_EVENT, flash)
  }, [animated])

  return (
    <svg viewBox={MARK.viewBox} className={`logo-mark ${className}`} aria-hidden="true">
      {animated && (
        <>
          <defs>
            <filter id={glowId} x="-150%" y="-50%" width="400%" height="200%">
              <feGaussianBlur stdDeviation="2.6" />
            </filter>
          </defs>
          {/* behind the arch: only the doorway shows it */}
          <rect ref={glow} {...MARK.light} fill={MARK.orange} filter={`url(#${glowId})`} className="logo-glow" />
        </>
      )}
      <path fill="currentColor" d={MARK.arch} />
      <rect ref={light} {...MARK.light} fill={MARK.orange} className={animated ? 'logo-light' : undefined} />
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
