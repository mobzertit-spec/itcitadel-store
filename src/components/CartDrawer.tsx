import { ShoppingBag, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cart, resolve, useCart } from '@/lib/cart'
import { useCatalog } from '@/lib/catalog'
import { href, pick, useLang, useT } from '@/lib/lang'
import { withViewTransition } from '@/lib/motion'
import { useNow } from '@/lib/now'
import { hasOffer, priceOf } from '@/lib/offers'
import { cartDrawer, useCartDrawer } from '@/lib/overlays'
import { ProductMark } from './BrandLogo'
import { Money } from './Price'
import { Sheet } from './Sheet'
import { Stepper } from './Stepper'

/**
 * The cart, sliding in from the side (from the cart icons and the "added" notice): lines, quantities, the total
 * at today's prices, and the way to the order form on the cart page. Without JavaScript the icons lead there.
 */
export function CartDrawer() {
  const open = useCartDrawer()
  const lang = useLang()
  const t = useT()
  const { catalog } = useCatalog()
  const lines = resolve(useCart(), catalog)
  const now = useNow(open && hasOffer(lines.flatMap((l) => (l.variant ? [l.variant] : []))))
  const total = lines.reduce((sum, l) => sum + (l.variant ? priceOf(l.variant, now) * l.q : 0), 0)

  return (
    <Sheet open={open} onClose={cartDrawer.close} labelledBy="drawer-title" className="drawer">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <h2 id="drawer-title" className="text-2xl font-extrabold">
            {t.drawer.title}
            {lines.length > 0 && <span className="ms-3 text-base font-normal text-muted">{t.cart.count(lines.length)}</span>}
          </h2>
          <button
            type="button"
            onClick={cartDrawer.close}
            aria-label={t.quick.close}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-raised transition hover:bg-white/10 active:scale-95"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {lines.length ? (
          <>
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6">
              {lines.map((l) => (
                <li key={l.v} className="grid grid-cols-[4rem_1fr_auto] items-center gap-4 border-b border-line py-4 last:border-0" style={{ viewTransitionName: `drawer-${l.v}` }}>
                  <span className="logo-stage size-16 rounded-[18px]">{l.product && <ProductMark product={l.product} size={32} />}</span>
                  <div className="flex min-w-0 flex-col gap-2">
                    {l.product && l.variant ? (
                      <span className="min-w-0">
                        <Link to={href(lang, `p/${l.product.slug}`)} viewTransition className="latin block truncate font-semibold hover:underline">
                          <span className="ltr-iso">{l.product.name}</span>
                        </Link>
                        <span className="block truncate text-sm text-muted">{pick(l.variant, 'label', lang)}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-danger">{t.cart.unavailable}</span>
                    )}
                    <span className="flex items-center gap-3">
                      {l.product && <Stepper size="sm" value={l.q} onChange={(q) => cart.set(l.v, q)} label={l.product.per_user ? t.product.users : t.product.quantity} />}
                      <button type="button" onClick={() => withViewTransition(() => cart.remove(l.v))} className="text-sm text-muted underline underline-offset-4 hover:text-fg">
                        {t.cart.remove}
                      </button>
                    </span>
                  </div>
                  {l.variant && (
                    <span key={l.q} className="animate-rise-fast self-start pt-1">
                      <Money value={priceOf(l.variant, now) * l.q} className="text-base" />
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 border-t border-line p-5 sm:p-6">
              <div className="flex items-baseline justify-between gap-4">
                <b className="text-lg">{t.cart.total}</b>
                <span key={total} className="animate-rise-fast">
                  <Money value={total} className="text-3xl" />
                </span>
              </div>
              <span className="-mt-2 text-sm text-faint">{t.price.ttc}</span>
              <Link to={href(lang, 'cart')} viewTransition className="btn-accent h-14 text-lg">
                {t.drawer.checkout}
              </Link>
              <button type="button" onClick={cartDrawer.close} className="btn-outline h-12">
                {t.drawer.keep}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="logo-stage size-20 rounded-[24px]">
              <ShoppingBag className="size-8" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <b className="mt-3 text-2xl">{t.cart.empty}</b>
            <p className="max-w-xs text-muted">{t.cart.emptyLead}</p>
            <Link to={href(lang, 'products')} viewTransition className="btn-light mt-4 h-12 px-7">
              {t.cta.browse}
            </Link>
          </div>
        )}
      </div>
    </Sheet>
  )
}
