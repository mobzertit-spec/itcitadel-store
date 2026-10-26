import type { Product } from '@/lib/catalog'
import { LOGOS, logoFor, type LogoKey } from './brand-logos'
import { CategoryIcon } from './CategoryIcon'

/** Every product logo once, as <symbol>s; rendered by the page shell. Not display:none, so logo gradients still paint. */
export function LogoSprite() {
  const symbols = Object.entries(LOGOS)
    .map(([key, l]) => `<symbol id="lg-${key}" viewBox="${l.viewBox}">${l.svg}</symbol>`)
    .join('')
  return <svg width="0" height="0" className="absolute" aria-hidden="true" dangerouslySetInnerHTML={{ __html: `<defs>${symbols}</defs>` }} />
}

/** An official logo, `size` pixels tall; wide wordmarks get a wider, shorter box so they read at the same weight. */
export function BrandLogo({ logo, size, label = false }: { logo: LogoKey; size: number; label?: boolean }) {
  const [, , w, h] = LOGOS[logo].viewBox.split(' ').map(Number)
  const ratio = w / h
  const width = ratio > 1.6 ? size * 2.4 : size * Math.min(ratio, 1.2)
  return (
    <svg width={width} height={width / ratio} style={{ maxWidth: '80%' }} {...(label ? { role: 'img', 'aria-label': LOGOS[logo].name } : { 'aria-hidden': true })}>
      <use href={`#lg-${logo}`} />
    </svg>
  )
}

/** What stands for a product: the image uploaded in the dashboard (it can replace any logo), else its official logo, else its category icon. */
export function ProductMark({ product, size }: { product: Product; size: number }) {
  if (product.image_url) return <img src={product.image_url} alt="" width={size} height={size} className="rounded-xl object-contain" loading="lazy" />
  const logo = logoFor(product.slug)
  if (logo) return <BrandLogo logo={logo} size={size} />
  return <CategoryIcon id={product.category_id} style={{ width: size, height: size }} />
}
