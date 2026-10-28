import { Clock3, Pause, Play, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { fill } from '@/i18n/strings'
import { lowestPrice, type Catalog, type Product } from '@/lib/catalog'
import { href, pick, useLang, useT } from '@/lib/lang'
import { morphFrom, reducedMotion, useReducedMotion, useTilt } from '@/lib/motion'
import { addToCart } from './AddedToast'
import { ProductMark } from './BrandLogo'
import { Money } from './Price'

/** Seconds each product stays in front when the hero turns by itself. */
const TURN = 7

/**
 * The top of the home page: the product the owner picked, then the next two, one at a time. They turn by
 * themselves (the progress line under each name is the clock), stop under the mouse or the keyboard, and stop
 * for good once the visitor swipes, picks one or presses pause. Phones swipe; prerendered pages show the first.
 */
export function HeroCarousel({ products, catalog }: { products: Product[]; catalog: Catalog }) {
  const t = useT()
  const track = useRef<HTMLDivElement>(null)
  // a slide the hero is scrolling to: the slides passed on the way do not count as "shown"
  const heading = useRef<number | null>(null)
  const [index, setIndex] = useState(0)
  const [moved, setMoved] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [hover, setHover] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(false)
  const still = useReducedMotion()
  const total = products.length
  const turning = total > 1 && !still && playing
  const running = turning && !hover && !focused && !hidden

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // the slide in view is the one shown, whether it got there by a swipe or by go()
  useEffect(() => {
    const el = track.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const i = Number((entry.target as HTMLElement).dataset.slide)
          if (heading.current !== null && heading.current !== i) continue
          heading.current = null
          setIndex(i)
          // the first slide is in view on arrival: only a later change animates
          if (i !== 0) setMoved(true)
        }
      },
      { root: el, threshold: 0.6 },
    )
    for (const slide of el.children) io.observe(slide)
    return () => io.disconnect()
  }, [total])

  function go(i: number) {
    const el = track.current
    const slide = el?.children[i]
    if (!el || !slide) return
    heading.current = i
    setMoved(true)
    setIndex(i)
    el.scrollBy({ left: slide.getBoundingClientRect().left - el.getBoundingClientRect().left, behavior: reducedMotion() ? 'instant' : 'smooth' })
  }
  const choose = (i: number) => {
    setPlaying(false)
    go(i)
  }
  // tabs: arrows move along the reading direction, Home/End jump to the ends
  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key]
    const next = step ? (index + step + total) % total : e.key === 'Home' ? 0 : e.key === 'End' ? total - 1 : null
    if (next === null) return
    e.preventDefault()
    choose(next)
    e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus()
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t.home.carousel}
      className="flex flex-col gap-3"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
    >
      <div className="spotlight relative overflow-hidden rounded-[36px] border border-line bg-surface">
        <div
          ref={track}
          aria-live={running ? 'off' : 'polite'}
          onPointerDown={(e) => e.pointerType !== 'mouse' && setPlaying(false)}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((p, i) => (
            <Slide key={p.id} product={p} catalog={catalog} i={i} total={total} active={i === index} enter={moved && i === index} />
          ))}
        </div>
      </div>

      {total > 1 && (
        <div className="flex gap-2 sm:gap-3">
          {/* first, as the carousel pattern asks, and away from the WhatsApp button in the corner */}
          {!still && (
            <button
              type="button"
              onClick={() => setPlaying(!playing)}
              aria-label={playing ? t.home.pause : t.home.play}
              className="inline-flex w-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface text-muted transition hover:border-line-strong hover:text-fg active:scale-95"
            >
              {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            </button>
          )}
          <div role="tablist" aria-label={t.home.pick} onKeyDown={onTabKey} className="grid flex-1 gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
            {products.map((p, i) => {
              const on = i === index
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls={`hero-slide-${i}`}
                  aria-label={p.name}
                  tabIndex={on ? 0 : -1}
                  onClick={() => choose(i)}
                  className={`relative flex items-center justify-center gap-3 overflow-hidden rounded-2xl border bg-surface px-3 py-2.5 transition sm:justify-start sm:px-4 ${on ? 'border-line-strong' : 'border-line opacity-60 hover:opacity-100'}`}
                >
                  <span className="logo-stage size-10 shrink-0 rounded-xl">
                    <ProductMark product={p} size={22} />
                  </span>
                  <b className="latin ltr-iso hidden truncate text-start font-semibold sm:block">{p.name}</b>
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-line">
                    {on && (
                      <span
                        key={`${index}-${turning}`}
                        className="block h-full bg-fg ltr:origin-left rtl:origin-right"
                        style={turning ? { animation: `progress ${TURN}s linear both`, animationPlayState: running ? 'running' : 'paused' } : undefined}
                        onAnimationEnd={() => go((index + 1) % total)}
                      />
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

/** One product in front: huge name, price, buttons, and its logo on a lit glass tile that floats and leans to the mouse. */
function Slide({ product, catalog, i, total, active, enter }: { product: Product; catalog: Catalog; i: number; total: number; active: boolean; enter: boolean }) {
  const lang = useLang()
  const t = useT()
  const tilt = useTilt<HTMLDivElement>(10)
  const tile = useRef<HTMLDivElement>(null)
  const category = catalog.categories.find((c) => c.id === product.category_id)
  const plan = product.product_variants[0]
  const buyable = !product.quote_only && plan
  const to = href(lang, `p/${product.slug}`)
  // the words come in one after the other when this slide arrives
  const step = (n: number) => (enter ? { className: 'animate-rise', style: { animationDelay: `${n * 80}ms` } } : {})

  return (
    <div
      id={`hero-slide-${i}`}
      data-slide={i}
      data-fly-scope
      role="tabpanel"
      aria-roledescription="slide"
      aria-label={fill(t.home.slide, { n: i + 1, total })}
      aria-hidden={!active}
      inert={!active}
      className="grid w-full shrink-0 snap-center snap-always items-center gap-6 px-6 pt-8 pb-9 sm:px-12 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-[72px] lg:py-16"
    >
      <div className="relative flex h-56 items-center justify-center sm:h-80 lg:order-2 lg:h-[440px]">
        <div className="animate-float">
          <div ref={tilt}>
            <div ref={tile} data-fly className="glass flex size-40 items-center justify-center rounded-[44px] sm:size-64 sm:rounded-[66px] lg:size-[300px] lg:rounded-[78px]">
              <span className="scale-[0.55] sm:scale-[0.85] lg:scale-100">
                <ProductMark product={product} size={150} />
              </span>
            </div>
          </div>
        </div>
        <span className="glass absolute start-0 top-10 hidden animate-float items-center gap-2 rounded-full px-4 py-2 text-sm [animation-delay:-2s] sm:inline-flex lg:start-2">
          <ShieldCheck className="size-4" aria-hidden="true" />
          {t.home.onYourAccount}
        </span>
        <span className="glass absolute end-0 bottom-14 hidden animate-float items-center gap-2 rounded-full px-4 py-2 text-sm [animation-delay:-4s] sm:inline-flex">
          <Clock3 className="size-4" aria-hidden="true" />
          {t.home.activation}
        </span>
      </div>
      <div className="flex flex-col gap-5 lg:order-1">
        {category && (
          <span {...step(0)}>
            <span className="eyebrow">{pick(category, 'name', lang)}</span>
          </span>
        )}
        <h2 {...step(1)}>
          <span className="latin ltr-iso block text-[3.4rem] leading-[0.98] font-extrabold tracking-[-0.035em] text-balance sm:text-7xl lg:text-[5.75rem]">{product.name}</span>
        </h2>
        <p {...step(2)}>
          <span className="block max-w-md text-xl text-fg-2 sm:text-2xl">{pick(product, 'tagline', lang)}</span>
        </p>
        {buyable && (
          <p {...step(3)}>
            <span className="flex flex-wrap items-baseline gap-x-3 text-muted">
              <Money value={lowestPrice(product)} className="text-4xl" />
              <span>{product.product_variants.length > 1 ? `· ${pick(plan, 'label', lang)}` : ''}</span>
            </span>
          </p>
        )}
        <div {...step(4)}>
          <div className="mt-1 flex flex-wrap gap-3">
            {buyable && (
              <button type="button" className="btn-accent h-14 px-8" onClick={(e) => addToCart(product, plan, 1, lang, e.currentTarget)}>
                {t.cta.addToCart}
              </button>
            )}
            <Link to={to} viewTransition onClick={() => morphFrom(tile.current, product.slug)} className="btn-outline h-14 px-7">
              {t.cta.details}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
