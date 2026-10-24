import { Check, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Lang } from '@shared/validate'
import { cart } from '@/lib/cart'
import type { Product, Variant } from '@/lib/catalog'
import { href, pick, useLang, useT } from '@/lib/lang'
import { track } from '@/lib/track'

type Added = { ok: boolean; name: string; plan: string; key: number }
const EVENT = 'itc:added'

/** Puts a plan in the cart and tells the page (the notice below shows it). False when the cart is full. */
export function addToCart(product: Product, variant: Variant, qty: number, lang: Lang): boolean {
  const ok = cart.add(variant.id, qty)
  if (ok) track('AddToCart', { content_name: product.name, value: variant.price_dzd * qty })
  const detail: Added = { ok, name: product.name, plan: pick(variant, 'label', lang), key: Date.now() }
  window.dispatchEvent(new CustomEvent(EVENT, { detail }))
  return ok
}

/** "Added to cart · ChatGPT Plus — 1 month · View cart", for a few seconds after each add. */
export function AddedToast() {
  const lang = useLang()
  const t = useT()
  const [added, setAdded] = useState<Added | null>(null)

  useEffect(() => {
    const show = (e: Event) => setAdded((e as CustomEvent<Added>).detail)
    window.addEventListener(EVENT, show)
    return () => window.removeEventListener(EVENT, show)
  }, [])
  useEffect(() => {
    if (!added) return
    const timer = setTimeout(() => setAdded(null), 4000)
    return () => clearTimeout(timer)
  }, [added])

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-28 z-50 flex justify-center lg:bottom-8">
      {added && (
        <div key={added.key} className="glass pointer-events-auto flex max-w-lg items-center gap-4 rounded-full py-2.5 ps-5 pe-2.5">
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
          <Link to={href(lang, 'cart')} className="btn-light h-10! shrink-0 px-4! text-sm!">
            {t.cta.viewCart}
          </Link>
        </div>
      )}
    </div>
  )
}
