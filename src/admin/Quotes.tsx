import { MessageCircle, Phone, RefreshCw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { prettyPhone } from '@/lib/format'
import { customerWhatsApp, db, QUOTE_STATUS, when, type Quote, type QuoteStatus } from './db'
import { NoteBox } from './Orders'

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await db.from('quote_requests').select('*').order('created_at', { ascending: false }).limit(300)
    if (error) setError(error.message)
    else setQuotes(data as Quote[])
  }, [])
  useEffect(() => {
    load()
  }, [load])

  async function update(id: string, patch: Partial<Quote>) {
    const { error } = await db.from('quote_requests').update(patch).eq('id', id)
    if (error) return setError(error.message)
    setQuotes((list) => list.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }
  async function remove(q: Quote) {
    if (!confirm(`حذف طلب عرض السعر #${q.number} نهائياً؟`)) return
    const { error } = await db.from('quote_requests').delete().eq('id', q.id)
    if (error) return setError(error.message)
    setQuotes((list) => list.filter((x) => x.id !== q.id))
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">طلبات عروض الأسعار</h1>
        <button className="btn-ghost !py-2" onClick={load}>
          <RefreshCw className="size-4" /> تحديث
        </button>
      </div>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-danger">{error}</p>}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {quotes.length === 0 && <p className="text-muted">لا توجد طلبات عروض أسعار.</p>}
        {quotes.map((q) => (
          <article key={q.id} className="card space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-extrabold">
                #{q.number} · {q.company_name}
              </h2>
              <span className="text-xs text-muted ltr-iso">{when(q.created_at)}</span>
            </div>
            <p className="text-sm">
              {q.contact_name} · <span className="ltr-iso">{prettyPhone(q.phone)}</span> · <span className="break-all">{q.email}</span>
            </p>
            <p className="rounded-xl bg-stone/60 p-3 whitespace-pre-wrap">{q.message}</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(QUOTE_STATUS) as QuoteStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => update(q.id, { status: s })}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-line ${q.status === s ? QUOTE_STATUS[s].tone + ' ring-transparent' : 'bg-card'}`}
                >
                  {QUOTE_STATUS[s].label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <a className="btn-dark flex-1 !py-2" href={`tel:+213${q.phone.slice(1)}`}>
                <Phone className="size-4" /> اتصال
              </a>
              <a className="btn-primary flex-1 !py-2" href={customerWhatsApp(q.phone, q.contact_name, q.lang, `#${q.number}`)} target="_blank" rel="noopener">
                <MessageCircle className="size-4" /> واتساب
              </a>
            </div>
            <NoteBox initial={q.admin_note} onSave={(admin_note) => update(q.id, { admin_note })} />
            <button className="inline-flex items-center gap-1.5 text-sm text-danger hover:underline" onClick={() => remove(q)}>
              <Trash2 className="size-4" /> حذف
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
