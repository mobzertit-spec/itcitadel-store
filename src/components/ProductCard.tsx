import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Product } from '@/lib/catalog'
import { href, pick, useLang, useT } from '@/lib/lang'
import { FromPrice } from './Price'
import { ProductVisual } from './ProductVisual'

export function ProductCard({ product }: { product: Product }) {
  const lang = useLang()
  const t = useT()
  const Arrow = t.dir === 'rtl' ? ArrowLeft : ArrowRight
  return (
    <Link
      to={href(lang, `p/${product.slug}`)}
      className="card group flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="flex items-start gap-4">
        <ProductVisual product={product} />
        <div className="min-w-0">
          <h3 className="text-lg leading-snug font-bold">
<span className="ltr-iso">{product.name}</span>
</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{pick(product, 'tagline', lang)}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
        <FromPrice product={product} />
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
          {product.quote_only ? t.cta.askPrice : t.cta.details}
          <Arrow className="size-4 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}
