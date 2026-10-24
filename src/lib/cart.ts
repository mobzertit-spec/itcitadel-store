import { useSyncExternalStore } from 'react'
import { MAX_ITEMS, MAX_QUANTITY } from '@shared/validate'
import type { Catalog, Product, Variant } from './catalog'

/** A cart line: a plan id and how many. Prices are never stored here: they always come from the catalog. */
export type CartLine = { v: string; q: number }

const KEY = 'itc:cart'
const EMPTY: CartLine[] = []
const listeners = new Set<() => void>()

function load(): CartLine[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(raw)) return EMPTY
    return raw
      .filter((l): l is CartLine => typeof l?.v === 'string' && Number.isInteger(l?.q) && l.q > 0)
      .map((l) => ({ v: l.v, q: Math.min(MAX_QUANTITY, l.q) }))
      .slice(0, MAX_ITEMS)
  } catch {
    return EMPTY // no storage (private mode, prerender): an empty cart that still works for this visit
  }
}

let lines: CartLine[] | undefined

function current() {
  return (lines ??= load())
}

function save(next: CartLine[]) {
  lines = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* kept in memory for this visit */
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // another tab changed the cart
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return
    lines = load()
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export const cart = {
  /** Adds a plan (or more of it). False when the cart already holds the maximum number of different plans. */
  add(v: string, q = 1): boolean {
    const now = current()
    const found = now.find((l) => l.v === v)
    if (!found && now.length >= MAX_ITEMS) return false
    save(found ? now.map((l) => (l.v === v ? { v, q: Math.min(MAX_QUANTITY, l.q + q) } : l)) : [...now, { v, q: Math.min(MAX_QUANTITY, q) }])
    return true
  },
  set(v: string, q: number) {
    save(current().map((l) => (l.v === v ? { v, q: Math.min(MAX_QUANTITY, Math.max(1, q)) } : l)))
  },
  remove(v: string) {
    save(current().filter((l) => l.v !== v))
  },
  clear() {
    save([])
  },
}

/** The cart lines; empty while prerendering and before the page has loaded. */
export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, current, () => EMPTY)
}

export type ResolvedLine = CartLine & { product?: Product; variant?: Variant }

/** Each line with its product and plan from the catalog; a missing product means the plan is no longer sold. */
export function resolve(lines: CartLine[], catalog: Catalog): ResolvedLine[] {
  return lines.map((line) => {
    for (const product of catalog.products) {
      const variant = product.product_variants.find((x) => x.id === line.v)
      if (variant) return product.quote_only ? line : { ...line, product, variant }
    }
    return line
  })
}
