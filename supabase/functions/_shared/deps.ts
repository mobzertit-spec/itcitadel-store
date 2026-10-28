/**
 * Production wiring for the handlers: Supabase (service role), Telegram and Web Push.
 * Secrets (Edge Function settings): TELEGRAM_BOT_TOKEN, optionally TELEGRAM_CHAT_ID (ids separated by commas; else the
 * chat linked by telegram-setup is used),
 * ALLOWED_ORIGINS (e.g. https://mobzertit-spec.github.io,https://itcitadel.dz), RATE_SALT, optionally SITE_URL.
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase. The VAPID keys are made on first use and kept
 * in public.push_keys (server only).
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { CreatedOrder, Deps, PushDeps } from './handler.ts'
import type { Claimed, NotifyDeps } from './notify.ts'
import { generateVapidKeys, sendPush, type VapidKeys } from './webpush.ts'

const env = (k: string) => Deno.env.get(k) ?? ''
const SUBJECT = 'mailto:contact@itcitadel.dz'

const database = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
const siteUrl = () => (env('SITE_URL') || 'https://mobzertit-spec.github.io/itcitadel-store/').replace(/\/?$/, '/')

function gate(db: SupabaseClient, limits: { perVisitor: number; perDay: number }) {
  return {
    allowedOrigins: env('ALLOWED_ORIGINS').split(',').map((s) => s.trim()).filter(Boolean),
    salt: env('RATE_SALT') || 'itcitadel-store',
    rateHit: async (key: string) => {
      const { data, error } = await db.rpc('rate_hit', { p_key: key, p_per_key: limits.perVisitor, p_global: limits.perDay })
      if (error) throw error
      return data === true
    },
  }
}

/** Sends an HTML message to the owner's Telegram chat(s). */
async function telegram(db: SupabaseClient, html: string) {
  const token = env('TELEGRAM_BOT_TOKEN') // read per message: a secret saved later applies without a redeploy
  // the owner's chat: TELEGRAM_CHAT_ID if set, else the one linked by the telegram-setup function
  let chats = env('TELEGRAM_CHAT_ID').split(',').map((s) => s.trim()).filter(Boolean)
  if (token && !chats.length) {
    const { data } = await db.from('settings').select('value').eq('key', 'telegram_chat_id').maybeSingle()
    chats = data ? [data.value as string] : []
  }
  if (!token || !chats.length) return console.warn('Telegram is not linked: set TELEGRAM_BOT_TOKEN, then run telegram-setup')
  await Promise.all(
    chats.map(async (chat_id) => {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, text: html, parse_mode: 'HTML', disable_web_page_preview: true }),
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) throw new Error(`telegram ${res.status}: ${await res.text()}`)
    }),
  )
}

/** The store's VAPID keys: made the first time any function needs them, then always the same. */
let vapid: Promise<VapidKeys> | undefined
function vapidKeys(db: SupabaseClient): Promise<VapidKeys> {
  const read = async () => {
    const { data, error } = await db.from('push_keys').select('public_key, private_jwk').maybeSingle()
    if (error) throw error
    return data ? { publicKey: data.public_key as string, privateJwk: data.private_jwk as JsonWebKey } : null
  }
  vapid ??= (async () => {
    const found = await read()
    if (found) return found
    const made = await generateVapidKeys()
    // two first calls at once: the second insert is ignored and both read the same row
    await db.from('push_keys').upsert({ id: true, public_key: made.publicKey, private_jwk: made.privateJwk }, { onConflict: 'id', ignoreDuplicates: true })
    const saved = await read()
    if (!saved) throw new Error('VAPID keys not saved')
    return saved
  })().catch((err) => {
    vapid = undefined
    throw err
  })
  return vapid
}

export function productionDeps(limits: { perVisitor: number; perDay: number }): Deps {
  const db = database()
  return {
    ...gate(db, limits),
    siteUrl: siteUrl(),
    createOrder: async (input) => {
      const { data, error } = await db.rpc('create_order', { p: input })
      if (error) throw error
      return (data as { error?: string }).error ? 'unavailable' : (data as CreatedOrder)
    },
    notify: (html) => telegram(db, html),
  }
}

export function pushDeps(limits: { perVisitor: number; perDay: number }): PushDeps {
  const db = database()
  return {
    ...gate(db, limits),
    publicKey: async () => (await vapidKeys(db)).publicKey,
    subscribe: async (s) => {
      const { data, error } = await db.rpc('save_push_subscription', { p_token: s.token, p_endpoint: s.endpoint, p_p256dh: s.p256dh, p_auth: s.auth })
      if (error) throw error
      return data === true
    },
  }
}

export function notifyDeps(): NotifyDeps {
  const db = database()
  return {
    siteUrl: siteUrl(),
    claim: async () => {
      const { data, error } = await db.rpc('claim_notifications')
      if (error) throw error
      return (data ?? []) as Claimed[]
    },
    push: async (sub, payload) => sendPush(sub, payload, await vapidKeys(db), SUBJECT),
    drop: async (id) => {
      const { error } = await db.from('push_subscriptions').delete().eq('id', id)
      if (error) throw error
    },
    telegram: (html) => telegram(db, html),
  }
}
