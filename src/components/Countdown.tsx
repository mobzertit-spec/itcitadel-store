import type { Product } from '@/lib/catalog'
import { useT } from '@/lib/lang'
import { useNow } from '@/lib/now'
import { hasOffer, onOffer, timeLeft } from '@/lib/offers'

const two = (n: number) => String(n).padStart(2, '0')

/**
 * Time left in an offer. `compact` for a tile's badge ("2d 05h", then "05:12:33" on the last day); otherwise
 * boxes of days, hours, minutes and seconds. Nothing once it is over.
 */
export function Countdown({ endsAt, compact = false }: { endsAt: string; compact?: boolean }) {
  const t = useT()
  const left = timeLeft(endsAt, useNow())
  if (left.done) return null
  // in the page's direction ("2ي 05س" reads from the right in Arabic); the last day's clock always left to right
  if (compact)
    return left.d > 0 ? (
      <span className="tabular-nums">{`${left.d}${t.offer.short.d} ${two(left.h)}${t.offer.short.h}`}</span>
    ) : (
      <span className="tabular-nums" dir="ltr">{`${two(left.h)}:${two(left.m)}:${two(left.s)}`}</span>
    )
  const boxes = [
    [left.d, t.offer.units.d],
    [left.h, t.offer.units.h],
    [left.m, t.offer.units.m],
    [left.s, t.offer.units.s],
  ] as const
  return (
    <div className="flex flex-wrap items-center gap-3" role="timer" aria-live="off">
      <span className="text-sm text-fg-2">{t.offer.ends}</span>
      {/* days first, in the reading direction */}
      <span className="flex gap-1.5">
        {boxes.map(([n, unit]) => (
          <span key={unit} className="flex min-w-12 flex-col items-center rounded-xl border border-line bg-raised px-2 py-1">
            <b className="latin text-lg leading-tight tabular-nums">{two(n)}</b>
            <span className="text-[0.7rem] text-muted">{unit}</span>
          </span>
        ))}
      </span>
    </div>
  )
}

/** A tile's "Offer · 2d 05h" while one of the product's plans is on offer (the soonest to end); nothing otherwise. */
export function OfferBadge({ product, className = '' }: { product: Product; className?: string }) {
  const t = useT()
  const now = useNow(hasOffer(product.product_variants))
  if (product.quote_only) return null
  const ends = product.product_variants
    .filter((v) => onOffer(v, now))
    .map((v) => v.promo_ends_at as string)
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0]
  if (!ends) return null
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-fg px-2.5 py-1 text-xs font-bold text-bg ${className}`}>
      {t.offer.badge}
      <span aria-hidden="true">·</span>
      <Countdown endsAt={ends} compact />
    </span>
  )
}
