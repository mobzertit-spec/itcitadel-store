import { Check, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Lang } from '@shared/validate'
import { ADDED_EVENT, cart } from '@/lib/cart'
import type { Product, Variant } from '@/lib/catalog'
import { href, pick, useLang, useT } from '@/lib/lang'
import { flyToCart } from '@/lib/motion'
import { priceOf } from '@/lib/offers'
import { openDrawerInstead, useCartDrawer } from '@/lib/overlays'
import { track } from '@/lib/track'

type Added = { ok: boolean; name: string; plan: string; key: number }

/**
 * Puts a plan in the cart and tells the page (the notice below shows it). False when the cart is full.
 * `from`, the button pressed, sends the product's logo flying into the cart icon.
 */
export function addToCart(product: Product, variant: Variant, qty: number, lang: Lang, from?: Element): boolean {
  const ok = cart.add(variant.id, qty)
  if (ok) {
    track('AddToCart', { content_name: product.name, value: priceOf(variant) * qty })
    if (from) flyToCart(from)
  }
  const detail: Added = { ok, name: product.name, plan: pick(variant, 'label', lang), key: Date.now() }
  window.dispatchEvent(new CustomEvent(ADDED_EVENT, { detail }))
  return ok
}

/** "Added to cart · ChatGPT Plus — 1 month · View cart", for a few seconds after each add (not over the open cart). */
export function AddedToast() {
  const lang = useLang()
  const t = useT()
  const drawerOpen = useCartDrawer()
  const [added, setAdded] = useState<Added | null>(null)
  // the cart drawer shows what was added: no notice over it, nor after it closes
  if (drawerOpen && added) setAdded(null)

  useEffect(() => {
    const show = (e: Event) => setAdded((e as CustomEvent<Added>).detail)
    window.addEventListener(ADDED_EVENT, show)
    return () => window.removeEventListener(ADDED_EVENT, show)
  }, [])
  useEffect(() => {
    if (!added) return
    const timer = setTimeout(() => setAdded(null), 4000)
    return () => clearTimeout(timer)
  }, [added])

  return (
    <div aria-live="polite" className="added-toast pointer-events-none fixed inset-x-4 bottom-28 z-50 flex justify-center lg:bottom-8">
      {added && !drawerOpen && (
        <div key={added.key} className="glass pointer-events-auto flex max-w-lg animate-rise items-center gap-4 rounded-full py-2.5 ps-5 pe-2.5">
          {added.ok ? <Check className="size-5 shrink-0" aria-hidden="true" /> : <TriangleAlert className="size-5 shrink-0 text-accent" aria-hidden="true" />}
          <span className="min-w-0 text-sm">
            {added.ok ? (
              <>
                <b className="block">{t.cta.added}</b>
                <span className="block truncate text-muted">
                  <span className="ltr-iso">{added.name}</span> — {added.plan}
                </span>
              </>
            ) : (
              t.cart.full
            )}
          </span>
          <Link to={href(lang, 'cart')} onClick={openDrawerInstead} aria-haspopup="dialog" className="btn-light h-10! shrink-0 px-4! text-sm!">
            {t.cta.viewCart}
          </Link>
        </div>
      )}
    </div>
  )
}
