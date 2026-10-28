// Woken by the database (pg_net) after a status change and by the morning renewal check: sends what the outbox holds.
// Anyone may call it; it only ever sends notifications the database has queued.
import { notifyDeps } from '../_shared/deps.ts'
import { runNotify } from '../_shared/notify.ts'

const deps = notifyDeps()
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 })
  try {
    return Response.json(await runNotify(deps))
  } catch (err) {
    console.error('notify failed', err)
    return Response.json({ error: 'server' }, { status: 500 })
  }
})
