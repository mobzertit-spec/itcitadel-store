/**
 * Offers the owner sets on a plan in the dashboard: an offer price and the moment it ends. The database charges
 * the same price (public.create_order); the browser only displays it. No imports: tested with tsx.
 */
export type Priced = { price_dzd: number; promo_price_dzd?: number | null; promo_ends_at?: string | null }

/** Is the plan's offer running at `now`? It stops at its end instant. */
export function onOffer(v: Priced, now = Date.now()): boolean {
  return v.promo_price_dzd != null && !!v.promo_ends_at && Date.parse(v.promo_ends_at) > now
}

/** The price in force: the offer price while it runs, else the normal price. */
export const priceOf = (v: Priced, now = Date.now()) => (onOffer(v, now) ? (v.promo_price_dzd as number) : v.price_dzd)

/** Has any of these plans an offer set? Pages showing them then follow the clock, so an offer ends on screen. */
export const hasOffer = (plans: Priced[]) => plans.some((v) => v.promo_ends_at != null)

/** Time left until `endsAt`, split for a countdown. */
export function timeLeft(endsAt: string, now = Date.now()) {
  const ms = Math.max(0, Date.parse(endsAt) - now)
  const total = Math.floor(ms / 1000)
  return { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60, done: ms === 0 }
}
