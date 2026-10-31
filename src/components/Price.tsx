import { amount, currency } from '@/lib/format'
import { lowestPrice, type Product } from '@/lib/catalog'
import { useLang, useT } from '@/lib/lang'

/** A price: the number in Inter, the currency in the page's language. */
export function Money({ value, className = 'text-lg' }: { value: number; className?: string }) {
  const lang = useLang()
  return (
    <span className="whitespace-nowrap">
      <b className={`latin ltr-iso font-bold text-fg ${className}`}>{amount(value)}</b> <span className="text-sm text-muted">{currency(lang)}</span>
    </span>
  )
}

/** "From 5 500 DA / per user" — or "Depends on plan" for products without a public price. */
export function FromPrice({ product, size }: { product: Product; size?: string }) {
  const t = useT()
  if (product.quote_only || !product.product_variants.length) return <span className="text-sm text-muted">{t.price.onRequest}</span>
  return (
    <span className="text-sm text-muted">
      {product.product_variants.length > 1 && `${t.price.from} `}
      <Money value={lowestPrice(product)} className={size} />
      {product.per_user && ` / ${t.price.perUser}`}
    </span>
  )
}
