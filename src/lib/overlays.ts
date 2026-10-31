import { useSyncExternalStore } from 'react'

/** The two overlays every page shares: a product's quick view and the cart drawer. Anything can open them. */
function store<T>(initial: T) {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next: T) {
      value = next
      listeners.forEach((l) => l())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

const shown = store<string | null>(null)
const drawer = store(false)

export const quickView = { open: (slug: string) => shown.set(slug), close: () => shown.set(null) }
/** The slug of the product in the quick view, or null. */
export const useQuickView = () => useSyncExternalStore(shown.subscribe, shown.get, () => null)

export const cartDrawer = { open: () => drawer.set(true), close: () => drawer.set(false) }
export const useCartDrawer = () => useSyncExternalStore(drawer.subscribe, drawer.get, () => false)

/**
 * For a link to the cart page: open the drawer instead, unless the visitor asked for a new tab or window, or is on
 * the cart page already.
 */
export function openDrawerInstead(e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; preventDefault: () => void }) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  if (/\/cart\/?$/.test(location.pathname)) return
  e.preventDefault()
  cartDrawer.open()
}
