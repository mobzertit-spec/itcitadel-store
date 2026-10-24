/**
 * Optional marketing tags: Meta Pixel (Facebook / Instagram ads) and Google Analytics 4.
 * Nothing loads unless VITE_META_PIXEL_ID / VITE_GA_ID are set.
 */
type Fn = (...args: unknown[]) => void
type TagWindow = Window & { fbq?: Fn & { queue?: unknown[]; loaded?: boolean; version?: string; push?: Fn }; dataLayer?: unknown[]; gtag?: Fn }

const PIXEL = import.meta.env.VITE_META_PIXEL_ID as string | undefined
const GA = import.meta.env.VITE_GA_ID as string | undefined

function script(src: string) {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  document.head.append(s)
}

export function initTracking() {
  const w = window as TagWindow
  if (PIXEL && !w.fbq) {
    // the official loader snippet: calls queue until fbevents.js arrives and installs callMethod
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args)
      else fbq.queue.push(args)
    } as Fn & { queue: unknown[]; loaded: boolean; version: string; push: Fn; callMethod?: Fn }
    fbq.queue = []
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.push = fbq
    w.fbq = fbq
    script('https://connect.facebook.net/en_US/fbevents.js')
    w.fbq('init', PIXEL)
  }
  if (GA && !w.gtag) {
    w.dataLayer = w.dataLayer ?? []
    w.gtag = function () {
      // gtag expects the arguments object itself
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments)
    }
    w.gtag('js', new Date())
    w.gtag('config', GA, { send_page_view: false })
    script(`https://www.googletagmanager.com/gtag/js?id=${GA}`)
  }
}

type Event = 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Lead' | 'Contact'
const GA_NAMES: Record<Event, string> = {
  PageView: 'page_view',
  ViewContent: 'view_item',
  AddToCart: 'add_to_cart',
  InitiateCheckout: 'begin_checkout',
  Lead: 'generate_lead',
  Contact: 'contact',
}

export function track(event: Event, params: { value?: number; content_name?: string } = {}) {
  if (typeof window === 'undefined') return
  const w = window as TagWindow
  const money = params.value !== undefined ? { value: params.value, currency: 'DZD' } : {}
  w.fbq?.('track', event, { ...params, ...money })
  w.gtag?.('event', GA_NAMES[event], { ...money, item_name: params.content_name })
}
