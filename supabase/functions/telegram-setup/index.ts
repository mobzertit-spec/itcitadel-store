/**
 * One-time Telegram link: after the owner saves TELEGRAM_BOT_TOKEN and presses Start in their bot, this finds their
 * chat, stores its id in public.settings and sends a confirmation there. Once linked it refuses to run again, so a
 * stranger who messages the bot later cannot take over the order alerts.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const env = (k: string) => Deno.env.get(k) ?? ''
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async () => {
  const token = env('TELEGRAM_BOT_TOKEN')
  if (!token) return json(412, { error: 'TELEGRAM_BOT_TOKEN is not set' })
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
  const { data: linked } = await db.from('settings').select('value').eq('key', 'telegram_chat_id').maybeSingle()
  if (linked) return json(409, { error: 'already linked' })

  const tg = (method: string, body?: unknown) =>
    fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }).then((r) => r.json())

  const me = await tg('getMe')
  if (!me.ok) return json(400, { error: 'Telegram refused the token' })
  const updates = await tg('getUpdates')
  const chats = ((updates.result ?? []) as { message?: { chat?: { id: number; type: string; first_name?: string } } }[])
    .map((u) => u.message?.chat)
    .filter((c) => c?.type === 'private')
  const chat = chats.at(-1)
  if (!chat) return json(404, { bot: me.result.username, error: 'nobody pressed Start in the bot yet' })

  const saved = await db.from('settings').upsert({ key: 'telegram_chat_id', value: String(chat.id) })
  if (saved.error) return json(500, { error: saved.error.message })
  await tg('sendMessage', { chat_id: chat.id, text: '✅ تم ربط متجر ITCITADEL بهذا البوت.\nستصلك هنا كل الطلبات وطلبات عروض الأسعار الجديدة.' })
  return json(200, { bot: me.result.username, name: chat.first_name ?? '' })
})
