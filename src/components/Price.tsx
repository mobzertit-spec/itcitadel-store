import { amount, currency } from '@/lib/format'
import { lowestPrice, type Product, type Variant } from '@/lib/catalog'
import { useLang, useT } from '@/lib/lang'
import { useNow } from '@/lib/now'
import { hasOffer, onOffer, priceOf } from '@/lib/offers'

/** A price: the number in Inter, the currency in the page's language. */
export function Money({ value, className = 'text-lg' }: { value: number; className?: string }) {
  const lang = useLang()
  return (
    <span className="whitespace-nowrap">
      <b className={`latin ltr-iso font-bold text-fg ${className}`}>{amount(value)}</b> <span className="text-sm text-muted">{currency(lang)}</span>
    </span>
  )
}

/** The struck-through normal price shown beside an offer price. */
const Was = ({ value }: { value: number }) => <s className="latin ltr-iso text-sm text-faint decoration-1">{amount(value)}</s>

/** A plan's price in force; during an offer, the normal price struck through beside it. */
export function PlanPrice({ variant, className = 'text-xl' }: { variant: Variant; className?: string }) {
  const now = useNow(variant.promo_ends_at != null)
  return (
    <span className="inline-flex flex-wrap items-baseline justify-end gap-x-2">
      {onOffer(variant, now) && <Was value={variant.price_dzd} />}
      <Money value={priceOf(variant, now)} className={className} />
    </span>
  )
}

/** "From 5 500 DA / per user" — or "Depends on plan" for products without a public price. Offers included. */
export function FromPrice({ product, size }: { product: Product; size?: string }) {
  const t = useT()
  const now = useNow(hasOffer(product.product_variants))
  if (product.quote_only || !product.product_variants.length) return <span className="text-sm text-muted">{t.price.onRequest}</span>
  const price = lowestPrice(product, now)
  const normal = Math.min(...product.product_variants.map((v) => v.price_dzd))
  return (
    <span className="text-sm text-muted">
      {product.product_variants.length > 1 && `${t.price.from} `}
      {price < normal && (
        <>
          <Was value={normal} />{' '}
        </>
      )}
      <Money value={price} className={size} />
      {product.per_user && ` / ${t.price.perUser}`}
    </span>
  )
}
