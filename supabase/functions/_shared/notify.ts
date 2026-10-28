/**
 * The notify function: empties the outbox the database fills (status changes, subscriptions about to end), sends
 * each notification to the customer's browsers in the order's language, and tells the owner about renewals.
 * Database, Web Push and Telegram come in through `NotifyDeps` (notify.test.ts).
 */
import type { Lang } from './validate.ts'

export type Kind = 'confirmed' | 'paid' | 'activated' | 'cancelled' | 'renewal'
export type Subscription = { id: number; endpoint: string; p256dh: string; auth: string }
/** One row of public.claim_notifications(); `product_name`, `labels` and `ends_at` are set for renewals (one order line). */
export type Claimed = {
  id: number
  kind: Kind
  number: number
  lang: Lang
  track: string
  customer_name: string
  phone: string
  products: string[] | null
  product_name: string | null
  labels: Record<Lang, string> | null
  ends_at: string | null
  subscriptions: Subscription[]
}
export type Notification = { title: string; body: string; url: string; tag: string }

export type NotifyDeps = {
  /** the storefront's address, ending with "/" */
  siteUrl: string
  /** takes the pending notifications (marking them sent) */
  claim: () => Promise<Claimed[]>
  /** sends one notification to one browser; returns the push service's HTTP status */
  push: (sub: Subscription, payload: Notification) => Promise<number>
  /** forgets a browser the push service no longer knows */
  drop: (subscriptionId: number) => Promise<void>
  /** message to the owner (Telegram) */
  telegram: (html: string) => Promise<void>
}

// the office line, as on the website (src/config.ts)
const PHONE = '0661 60 18 38'
const LOCALE: Record<Lang, string> = { ar: 'ar-DZ', fr: 'fr-DZ', en: 'en-GB' }

const day = (iso: string, lang: Lang) => new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' }).format(new Date(iso))

type Ctx = { n: number; list: string; product: string; date: string }
const TEXTS: Record<Kind, Record<Lang, (c: Ctx) => [string, string]>> = {
  confirmed: {
    ar: (c) => [`أكّدنا طلبك #${c.n}`, 'ننتظرك في مكتبنا بأولاد سمار للدفع، من الأحد إلى الخميس، 8:00 – 17:00.'],
    fr: (c) => [`Commande #${c.n} confirmée`, 'Nous vous attendons à notre bureau d’Oued Smar pour le paiement, du dimanche au jeudi, 8:00 – 17:00.'],
    en: (c) => [`Order #${c.n} confirmed`, 'We look forward to seeing you at our Oued Smar office to pay, Sunday to Thursday, 8:00 – 17:00.'],
  },
  paid: {
    ar: (c) => [`استلمنا الدفع · #${c.n}`, 'شكراً! نفعّل اشتراكك خلال 24 ساعة.'],
    fr: (c) => [`Paiement reçu · #${c.n}`, 'Merci ! Votre abonnement est activé sous 24 heures.'],
    en: (c) => [`Payment received · #${c.n}`, 'Thank you! Your subscription will be active within 24 hours.'],
  },
  activated: {
    ar: (c) => [`اشتراكك مفعّل · #${c.n}`, `فعّلنا ${c.list} على حسابك. استمتع!`],
    fr: (c) => [`Abonnement activé · #${c.n}`, `${c.list} : c’est activé sur votre compte. Bonne utilisation !`],
    en: (c) => [`Subscription active · #${c.n}`, `${c.list} is now active on your account. Enjoy!`],
  },
  cancelled: {
    ar: (c) => [`أُلغي الطلب #${c.n}`, `خطأ أو سؤال؟ اتصل بنا على ${PHONE} أو راسلنا على واتساب.`],
    fr: (c) => [`Commande #${c.n} annulée`, `Une erreur ou une question ? Appelez-nous au ${PHONE} ou écrivez-nous sur WhatsApp.`],
    en: (c) => [`Order #${c.n} cancelled`, `A mistake, or a question? Call us on ${PHONE} or message us on WhatsApp.`],
  },
  renewal: {
    ar: (c) => [`اشتراكك ${c.product} ينتهي قريباً`, `ينتهي في ${c.date}. جدّده الآن ليبقى دون انقطاع.`],
    fr: (c) => [`Votre abonnement ${c.product} se termine bientôt`, `Il se termine le ${c.date}. Renouvelez-le maintenant pour ne pas être coupé.`],
    en: (c) => [`Your ${c.product} subscription ends soon`, `It ends on ${c.date}. Renew now to keep it running.`],
  },
}

/** The notification for one outbox row, in the order's language; a tap opens the order's tracking page. */
export function notificationText(row: Claimed, siteUrl: string): Notification {
  const lang = row.lang
  const ctx: Ctx = {
    n: row.number,
    list: (row.products ?? []).join(lang === 'ar' ? '، ' : ', '),
    product: row.product_name ?? '',
    date: row.ends_at ? day(row.ends_at, lang) : '',
  }
  const [title, body] = TEXTS[row.kind][lang](ctx)
  return { title, body, url: `${siteUrl}${lang}/order/${row.track}/`, tag: row.kind === 'renewal' ? `renewal-${row.number}-${row.id}` : `order-${row.number}` }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** For the owner: a subscription ends within 3 days, here is who to call. */
function renewalMessage(row: Claimed) {
  return [
    `🔔 <b>تجديد قريب · طلب #${row.number}</b>`,
    `• ${esc(row.product_name ?? '')}${row.labels ? ` — ${esc(row.labels.ar)}` : ''}`,
    ...(row.ends_at ? [`⏳ ينتهي في ${day(row.ends_at, 'ar')}`] : []),
    `👤 ${esc(row.customer_name)}`,
    `📞 ${row.phone}`,
  ].join('\n')
}

/** Sends everything waiting in the outbox. One failing browser or message never stops the others. */
export async function runNotify(deps: NotifyDeps): Promise<{ sent: number; dropped: number }> {
  let sent = 0
  let dropped = 0
  for (const row of await deps.claim()) {
    const payload = notificationText(row, deps.siteUrl)
    for (const sub of row.subscriptions) {
      try {
        const status = await deps.push(sub, payload)
        if (status === 404 || status === 410) {
          await deps.drop(sub.id)
          dropped++
        } else if (status >= 200 && status < 300) sent++
        else console.warn(`push service answered ${status} for notification ${row.id}`)
      } catch (err) {
        console.error('push failed', err)
      }
    }
    if (row.kind === 'renewal') {
      try {
        await deps.telegram(renewalMessage(row))
      } catch (err) {
        console.error('telegram failed', err)
      }
    }
  }
  return { sent, dropped }
}
