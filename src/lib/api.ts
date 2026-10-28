import type { FieldErrors } from '@shared/validate'
import { SUPABASE_KEY, SUPABASE_URL } from '@/config'

export type SubmitResult =
  | { ok: true; number: number | null; track: string | null }
  | { ok: false; kind: 'fields'; errors: FieldErrors }
  | { ok: false; kind: 'rate' | 'unavailable' | 'network' }

/** Sends a form to the store's Edge Function (place-order). */
export async function submit(fn: 'place-order', body: Record<string, unknown>): Promise<SubmitResult> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => ({}))) as { number?: number; track?: string; errors?: FieldErrors; error?: string }
    if (res.ok) return { ok: true, number: data.number ?? null, track: data.track ?? null }
    if (res.status === 400 && data.errors) return { ok: false, kind: 'fields', errors: data.errors }
    if (res.status === 429) return { ok: false, kind: 'rate' }
    if (res.status === 409) return { ok: false, kind: 'unavailable' }
    return { ok: false, kind: 'network' }
  } catch {
    return { ok: false, kind: 'network' }
  }
}
