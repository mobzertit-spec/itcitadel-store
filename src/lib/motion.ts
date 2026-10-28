import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type CSSProperties, type RefObject } from 'react'
import { flushSync } from 'react-dom'

/**
 * The store's few moving parts that CSS cannot do alone (the rest lives in index.css: reveal, glow, lift…).
 * Everything here stands still for visitors who ask their device for less motion, and on touch screens
 * where it would need a mouse.
 */

const REDUCE = '(prefers-reduced-motion: reduce)'
/** Has the visitor asked their device for less motion? */
export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia(REDUCE).matches

/** The same, as React state that follows the device setting. Prerendered pages count as still: nothing moves before the page runs. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = matchMedia(REDUCE)
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    reducedMotion,
    () => true,
  )
}

const finePointer = () => typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches

/** For `reveal`: the place of an element among its neighbours, so they appear one after the other. */
export const stagger = (i: number) => ({ '--i': i }) as CSSProperties

/** Runs a page update as a view transition (elements with a view-transition-name glide to their new place). */
export function withViewTransition(update: () => void) {
  if (typeof document.startViewTransition !== 'function' || reducedMotion()) return update()
  document.startViewTransition(() => flushSync(update))
}

/** Once per page: the light of every `.glow` card follows the mouse (--mx, --my, in pixels from its corner). */
export function useSpotlight() {
  useEffect(() => {
    if (!finePointer()) return
    let frame = 0
    let last: PointerEvent | undefined
    const paint = () => {
      frame = 0
      const card = last?.target instanceof Element ? last.target.closest<HTMLElement>('.glow') : null
      if (!card || !last) return
      const box = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${last.clientX - box.left}px`)
      card.style.setProperty('--my', `${last.clientY - box.top}px`)
    }
    const move = (e: PointerEvent) => {
      last = e
      frame ||= requestAnimationFrame(paint)
    }
    document.addEventListener('pointermove', move, { passive: true })
    return () => {
      document.removeEventListener('pointermove', move)
      cancelAnimationFrame(frame)
    }
  }, [])
}

/** Tilts an element towards the mouse while it moves over the element's parent, up to `max` degrees. */
export function useTilt<T extends HTMLElement>(max = 8): RefObject<T | null> {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    const area = el?.parentElement
    if (!el || !area || reducedMotion() || !finePointer()) return
    let frame = 0
    const move = (e: PointerEvent) => {
      const box = area.getBoundingClientRect()
      const x = (e.clientX - box.left) / box.width - 0.5
      const y = (e.clientY - box.top) / box.height - 0.5
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        el.style.transform = `perspective(900px) rotateX(${(-y * 2 * max).toFixed(2)}deg) rotateY(${(x * 2 * max).toFixed(2)}deg)`
      })
    }
    const leave = () => {
      cancelAnimationFrame(frame)
      el.style.transform = ''
    }
    el.style.transition = 'transform 500ms var(--ease-smooth)'
    area.addEventListener('pointermove', move)
    area.addEventListener('pointerleave', leave)
    return () => {
      leave()
      area.removeEventListener('pointermove', move)
      area.removeEventListener('pointerleave', leave)
    }
  }, [max])
  return ref
}

/**
 * The product's logo flies from where the visitor tapped into the cart icon on screen (the tab bar on phones,
 * the header otherwise), then the icon gives a little jump. `origin` is the button that was pressed: the logo
 * is the `[data-fly]` element of its `[data-fly-scope]`.
 */
export function flyToCart(origin: Element) {
  const targets = [...document.querySelectorAll<HTMLElement>('[data-cart-target]')].filter((el) => {
    const box = el.getBoundingClientRect()
    return box.width > 0 && box.bottom > 0 && box.top < innerHeight
  })
  const target = targets.at(-1)
  if (!target || reducedMotion() || typeof Element.prototype.animate !== 'function') return
  const source = origin.closest('[data-fly-scope]')?.querySelector<HTMLElement>('[data-fly]') ?? (origin as HTMLElement)
  const from = source.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  const ghost = source.cloneNode(true) as HTMLElement
  ghost.removeAttribute('data-fly')
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    zIndex: '60',
    pointerEvents: 'none',
    viewTransitionName: 'none',
    transform: 'none',
    translate: 'none',
  })
  ghost.setAttribute('aria-hidden', 'true')
  ghost.dataset.flying = ''
  document.body.append(ghost)

  // along an arc: up first, then into the icon, shrinking to its size
  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)
  const end = Math.max(0.06, (to.width * 1.1) / Math.max(from.width, from.height))
  const steps = 10
  const frames: Keyframe[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
    const lift = 4 * e * (1 - e) * 90
    frames.push({ transform: `translate(${dx * e}px, ${dy * e - lift}px) scale(${1 + (end - 1) * e})`, opacity: i === steps ? 0.4 : 1, offset: t })
  }
  ghost.animate(frames, { duration: 700, easing: 'linear' }).finished.then(
    () => {
      ghost.remove()
      target.animate([{ scale: 1 }, { scale: 1.22 }, { scale: 1 }], { duration: 420, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' })
    },
    () => ghost.remove(),
  )
}

/*
 * A product's logo grows from the tile that was tapped into the big logo of its page. The shared name is given
 * to the tapped tile only (a product can be on screen twice: in the hero and in the grid), and taken back soon after.
 */
let morphing: string | null = null
const MORPH = 'product-logo'

export function morphFrom(el: HTMLElement | null | undefined, slug: string) {
  if (!el || typeof document.startViewTransition !== 'function') return
  morphing = slug
  el.style.viewTransitionName = MORPH
  setTimeout(() => {
    el.style.viewTransitionName = ''
  }, 1000)
}

/** The big logo of a product page: takes the shared name when the page was opened from a tile of this product. */
export function useMorphTarget(ref: RefObject<HTMLElement | null>, slug: string) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || morphing !== slug) return
    morphing = null
    el.style.viewTransitionName = MORPH
    const timer = setTimeout(() => {
      el.style.viewTransitionName = ''
    }, 1000)
    return () => clearTimeout(timer)
  }, [ref, slug])
}
