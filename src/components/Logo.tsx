import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react'
import { ADDED_EVENT } from '@/lib/cart'
import { reducedMotion } from '@/lib/motion'
import { MARK } from './logo-mark'

/** The ITCITADEL mark (drawing in logo-mark.ts): the gate takes the text colour, its light is orange. */
export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox={MARK.viewBox} className={className} aria-hidden="true">
      <path fill="currentColor" d={MARK.arch} />
      <rect {...MARK.light} fill={MARK.orange} />
    </svg>
  )
}

/** The mark beside the name (footer, dashboard). */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-fg ${className}`} dir="ltr">
      <LogoMark className="h-[30px] w-[29px]" />
      <span className="wordmark text-[1.15rem] font-medium">
        IT<span className="font-extrabold">CITADEL</span>
      </span>
    </span>
  )
}

// A prerendered page shows the logo looping before the app runs. When the app takes the page over, its logo picks
// up at the same moment of the loop instead of starting again (read here, before the page is replaced).
const pageStart = typeof document === 'undefined' ? null : (document.querySelector('[data-logo-loop] .lg-c svg')?.getAnimations()[0]?.startTime ?? null)

const CITADEL_REST = ['I', 'T', 'A', 'D', 'E', 'L']
const nth = (n: number) => ({ '--n': n }) as CSSProperties

/**
 * The header's logo, a loop of 10 seconds (index.css: .lg): the gate with its light; the light steps out to become
 * the I, the gate turns into the C, and the other letters appear: ITCITADEL. Then it folds back into the gate. Pure
 * CSS, so it runs on the prerendered page too; with less motion it is the word, still. Adding to the cart makes the
 * light flash.
 */
export function LogoLoop() {
  const root = useRef<HTMLSpanElement>(null)
  const light = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    if (pageStart == null || !root.current) return
    for (const animation of root.current.getAnimations({ subtree: true })) animation.startTime = pageStart
  }, [])

  useEffect(() => {
    const flash = (e: Event) => {
      if (!(e as CustomEvent<{ ok?: boolean }>).detail?.ok || reducedMotion() || typeof Element.prototype.animate !== 'function') return
      light.current?.animate([{ offset: 0.3, boxShadow: '0 0 0.7em 0.12em rgb(255 106 0 / 0.95)' }], { duration: 800, easing: 'ease-out' })
    }
    window.addEventListener(ADDED_EVENT, flash)
    return () => window.removeEventListener(ADDED_EVENT, flash)
  }, [])

  return (
    <span ref={root} data-logo-loop className="lg" dir="ltr" aria-hidden="true">
      <span ref={light} className="lg-i" />
      <span className="lg-l lg-t" style={nth(0)}>
        T
      </span>
      <span className="lg-c">
        <svg viewBox={MARK.viewBox}>
          <path fill="currentColor" d={MARK.arch} />
        </svg>
      </span>
      {CITADEL_REST.map((letter, i) => (
        <span key={i} className="lg-l" style={nth(i + 1)}>
          {letter}
        </span>
      ))}
    </span>
  )
}
