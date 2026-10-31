import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '@/lib/catalog'
import { href, useLang, useT } from '@/lib/lang'
import { ProductMark } from './BrandLogo'

/**
 * Every product's logo gliding past under the hero (index.css: .marquee). It stops under the mouse or the keyboard,
 * and each logo opens its product. With less motion it is a row to swipe through, the copy hidden.
 */
export function Marquee({ products }: { products: Product[] }) {
  const lang = useLang()
  const t = useT()
  if (products.length < 3) return null
  // two identical sets side by side: the track moves by one set, then starts again where it was
  const set = (copy: boolean) => (
    <ul className="flex shrink-0 gap-3 pe-3" aria-hidden={copy || undefined}>
      {products.map((p) => (
        <li key={p.id}>
          <Link
            to={href(lang, `p/${p.slug}`)}
            viewTransition
            tabIndex={copy ? -1 : undefined}
            className="flex h-16 items-center gap-3 rounded-full border border-line bg-surface ps-2 pe-6 transition hover:border-line-strong hover:bg-raised"
          >
            <span className="logo-stage size-12 rounded-full">
              <ProductMark product={p} size={24} />
            </span>
            <span className="latin ltr-iso font-semibold whitespace-nowrap">{p.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
  return (
    <section aria-label={t.home.marquee} className="marquee -mx-4 sm:-mx-8" style={{ '--marquee-time': `${products.length * 3.5}s` } as CSSProperties}>
      <div className="marquee-track flex w-max py-1">
        {set(false)}
        {set(true)}
      </div>
    </section>
  )
}
