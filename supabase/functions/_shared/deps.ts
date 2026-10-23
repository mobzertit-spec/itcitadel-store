/**
 * Production wiring for the handlers: Supabase (service role) and Telegram.
 * Secrets (Edge Function settings): TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (one id, or several separated by commas),
 * ALLOWED_ORIGINS (e.g. https://mobzertit-spec.github.io,https://itcitadel.dz), RATE_SALT.
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import type { CreatedOrder, Deps } from './handler.ts'

const env = (k: string) => Deno.env.get(k) ?? ''

export function productionDeps(limits: { perVisitor: number; perDay: number }): Deps {
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
  const token = env('TELEGRAM_BOT_TOKEN')
  const chats = env('TELEGRAM_CHAT_ID').split(',').map((s) => s.trim()).filter(Boolean)

  return {
    allowedOrigins: env('ALLOWED_ORIGINS').split(',').map((s) => s.trim()).filter(Boolean),
    salt: env('RATE_SALT') || 'itcitadel-store',
    rateHit: async (key) => {
      const { data, error } = await db.rpc('rate_hit', { p_key: key, p_per_key: limits.perVisitor, p_global: limits.perDay })
      if (error) throw error
      return data === true
    },
    createOrder: async (input) => {
      const { data, error } = await db.rpc('create_order', { p: input })
      if (error) throw error
      return (data as { error?: string }).error ? 'unavailable' : (data as CreatedOrder)
    },
    createQuote: async (input) => {
      const { data, error } = await db.from('quote_requests').insert(input).select('number').single()
      if (error) throw error
      return data.number as number
    },
    notify: async (html) => {
      if (!token || !chats.length) return console.warn('Telegram is not configured: set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID')
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
    },
  }
}
