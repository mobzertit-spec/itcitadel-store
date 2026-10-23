import type { Product } from '@/lib/catalog'
import { CategoryIcon } from './CategoryIcon'

/** The product's uploaded image, or its category tile. */
export function ProductVisual({ product, size = 'md' }: { product: Product; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'size-20' : 'size-12'
  if (product.image_url)
    return <img src={product.image_url} alt="" className={`${box} shrink-0 rounded-2xl border border-line bg-white object-contain p-1.5`} loading="lazy" />
  return <CategoryIcon id={product.category_id} className={box} iconClass={size === 'lg' ? 'size-9' : 'size-6'} />
}
