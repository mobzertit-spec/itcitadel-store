import { dzd } from '@/lib/format'
import { lowestPrice, type Product } from '@/lib/catalog'
import { useLang, useT } from '@/lib/lang'

/** "From 5 500 DA / per user" — or "On request" for quote-only products. */
export function FromPrice({ product, className = '' }: { product: Product; className?: string }) {
  const lang = useLang()
  const t = useT()
  if (product.quote_only || !product.product_variants.length) return <span className={`font-semibold text-ink ${className}`}>{t.price.onRequest}</span>
  const multi = product.product_variants.length > 1
  return (
    <span className={className}>
      {multi && <span className="text-sm text-muted">{t.price.from} </span>}
      <span className="font-bold whitespace-nowrap text-ink">{dzd(lowestPrice(product), lang)}</span>
      {product.per_user && <span className="text-sm text-muted"> / {t.price.perUser}</span>}
    </span>
  )
}
