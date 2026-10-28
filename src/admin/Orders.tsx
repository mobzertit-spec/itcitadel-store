import { Copy, MessageCircle, Phone, RefreshCw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { dzd, prettyPhone } from '@/lib/format'
import { customerWhatsApp, db, ORDER_STATUS, trackingUrl, trackingWhatsApp, when, type Order, type OrderStatus } from './db'

const FLOW: OrderStatus[] = ['new', 'confirmed', 'paid', 'activated']

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await db.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(300)
    if (error) setError(error.message)
    else setOrders(data as Order[])
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 60_000) // new orders show up without reloading the page
    return () => clearInterval(timer)
  }, [load])

  const shown = filter === 'all' ? orders : orders.filter((o) => o.status === filter)
  const open = orders.find((o) => o.id === openId)
  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length

  async function update(id: string, patch: Partial<Order>) {
    const { error } = await db.from('orders').update(patch).eq('id', id)
    if (error) return setError(error.message)
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }
  async function remove(o: Order) {
    if (!confirm(`حذف الطلب #${o.number} نهائياً؟`)) return
    const { error } = await db.from('orders').delete().eq('id', o.id)
    if (error) return setError(error.message)
    setOrders((list) => list.filter((x) => x.id !== o.id))
    setOpenId(null)
  }

  const chip = (on: boolean) => `rounded-full border px-3.5 py-1.5 text-sm font-semibold ${on ? 'border-fg bg-fg text-bg' : 'border-line-strong/60 hover:border-fg/50'}`
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">الطلبات</h1>
        <button className="btn-outline h-10!" onClick={load}>
          <RefreshCw className="size-4" /> تحديث
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={chip(filter === 'all')} onClick={() => setFilter('all')}>
          الكل ({orders.length})
        </button>
        {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => (
          <button key={s} className={chip(filter === s)} onClick={() => setFilter(s)}>
            {ORDER_STATUS[s].label} ({count(s)})
          </button>
        ))}
      </div>
      {error && <p className="mt-4 rounded-xl border border-danger/40 p-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_26rem] lg:items-start">
        <ul className={`card divide-y divide-line ${open ? 'hidden lg:block' : ''}`}>
          {shown.length === 0 && <li className="p-6 text-muted">لا توجد طلبات.</li>}
          {shown.map((o) => (
            <li key={o.id}>
              <button
                onClick={() => setOpenId(o.id)}
                className={`flex w-full items-center justify-between gap-4 p-4 text-start transition hover:bg-white/5 ${o.id === openId ? 'bg-white/5' : ''}`}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-bold">#{o.number}</span>
                    <Badge status={o.status} />
                    <span className="text-xs text-muted ltr-iso">{when(o.created_at)}</span>
                  </span>
                  <span className="mt-1 block truncate text-sm">
                    {o.customer_name} · <span className="ltr-iso">{o.order_items.map((i) => `${i.product_name} ×${i.quantity}`).join('، ')}</span>
                  </span>
                </span>
                <span className="font-bold whitespace-nowrap">{dzd(o.total_dzd, 'ar')}</span>
              </button>
            </li>
          ))}
        </ul>

        {open && (
          <section className="card min-w-0 space-y-5 p-6 lg:sticky lg:top-20">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">طلب #{open.number}</h2>
              <button className="text-sm text-muted hover:text-fg lg:hidden" onClick={() => setOpenId(null)}>
                رجوع
              </button>
            </div>
            <div className="space-y-1">
              {open.order_items.map((i) => (
                <p key={i.id}>
                  <span className="ltr-iso font-semibold">{i.product_name}</span> — {i.variant_label} × {i.quantity}
                  <span className="text-muted"> ({dzd(i.unit_price_dzd, 'ar')})</span>
                </p>
              ))}
              <p className="text-lg font-extrabold">{dzd(open.total_dzd, 'ar')}</p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted">الزبون</dt>
              <dd className="font-semibold">{open.customer_name}</dd>
              {open.customer_type === 'company' && (
                <>
                  <dt className="text-muted">الشركة</dt>
                  <dd>
                    {open.company_name}
                    {open.nif ? ` · NIF ${open.nif}` : ''}
                  </dd>
                </>
              )}
              <dt className="text-muted">الهاتف</dt>
              <dd className="ltr-iso">{prettyPhone(open.phone)}</dd>
              <dt className="text-muted">البريد</dt>
              <dd className="break-all">{open.email}</dd>
              <dt className="text-muted">لغة الزبون</dt>
              <dd>{{ ar: 'العربية', fr: 'الفرنسية', en: 'الإنجليزية' }[open.lang]}</dd>
              {open.notes && (
                <>
                  <dt className="text-muted">ملاحظاته</dt>
                  <dd className="whitespace-pre-wrap">{open.notes}</dd>
                </>
              )}
            </dl>
            <div className="flex gap-2">
              <a className="btn-outline flex-1 h-11!" href={`tel:+213${open.phone.slice(1)}`}>
                <Phone className="size-4" /> اتصال
              </a>
              <a
                className="btn-light flex-1 h-11!"
                href={customerWhatsApp(open.phone, open.customer_name, open.lang, `#${open.number}`)}
                target="_blank"
                rel="noopener"
              >
                <MessageCircle className="size-4" /> واتساب
              </a>
            </div>

            {open.track_token && <TrackingLink order={open} />}

            <div>
              <p className="field-label">الحالة</p>
              <div className="flex flex-wrap gap-2">
                {[...FLOW, 'cancelled' as const].map((s) => (
                  <button
                    key={s}
                    onClick={() => update(open.id, { status: s })}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-line ${open.status === s ? ORDER_STATUS[s].tone + ' ring-transparent' : 'bg-surface'}`}
                  >
                    {ORDER_STATUS[s].label}
                  </button>
                ))}
              </div>
            </div>

            <NoteBox key={open.id} initial={open.admin_note} onSave={(admin_note) => update(open.id, { admin_note })} />

            <button className="inline-flex items-center gap-1.5 text-sm text-danger hover:underline" onClick={() => remove(open)}>
              <Trash2 className="size-4" /> حذف الطلب
            </button>
          </section>
        )}
      </div>
    </div>
  )
}

export function Badge({ status }: { status: OrderStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS[status].tone}`}>{ORDER_STATUS[status].label}</span>
}

export function NoteBox({ initial, onSave }: { initial: string; onSave: (v: string) => Promise<void> }) {
  const [value, setValue] = useState(initial)
  const [saved, setSaved] = useState(true)
  return (
    <div>
      <label className="field-label" htmlFor="admin-note">
        ملاحظة داخلية (لا يراها الزبون)
      </label>
      <textarea
        id="admin-note"
        rows={3}
        className="field-input h-auto py-3"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setSaved(false)
        }}
      />
      <button className="btn-outline mt-2 h-10! text-sm" disabled={saved} onClick={() => onSave(value).then(() => setSaved(true))}>
        {saved ? 'محفوظة' : 'حفظ الملاحظة'}
      </button>
    </div>
  )
}

/** The customer's tracking page: copy it, or send it on WhatsApp in their language. */
function TrackingLink({ order }: { order: Order }) {
  const [copied, setCopied] = useState(false)
  const url = trackingUrl(order)
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="field-label">صفحة تتبع الطلب</p>
      <p className="mt-1 text-xs text-muted">يتابع منها الزبون حالة طلبه ويفعّل الإشعارات. كل تغيير في الحالة يصله فوراً.</p>
      <div className="mt-2 flex items-center gap-2">
        <a href={url} target="_blank" rel="noopener" dir="ltr" className="min-w-0 flex-1 truncate text-sm underline underline-offset-4">
          {url}
        </a>
        <button
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
          onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))}
        >
          <Copy className="size-4" /> {copied ? 'نُسخ' : 'نسخ'}
        </button>
      </div>
      <a className="btn-outline mt-3 h-10! w-full text-sm" href={trackingWhatsApp(order)} target="_blank" rel="noopener">
        <MessageCircle className="size-4" /> أرسل رابط التتبع على واتساب
      </a>
    </div>
  )
}
