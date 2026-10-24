import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { db, type AdminProduct, type AdminReview } from './db'

/** Real customer reviews: typed in with the customer's consent, shown on the home page only once published. */
export default function Reviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [products, setProducts] = useState<Pick<AdminProduct, 'id' | 'name'>[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    db.from('reviews')
      .select('*')
      .order('sort')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => (error ? setError(error.message) : setReviews(data as AdminReview[])))
    db.from('products')
      .select('id,name')
      .order('sort')
      .then(({ data }) => setProducts((data ?? []) as Pick<AdminProduct, 'id' | 'name'>[]))
  }, [])

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    const row = {
      author: String(f.get('author')).trim(),
      detail: String(f.get('detail')).trim(),
      body: String(f.get('body')).trim(),
      product_id: String(f.get('product_id')) || null,
      published: f.get('published') === 'on',
    }
    if (row.author.length < 2 || row.body.length < 5) return setError('اكتب اسم الزبون ونص رأيه.')
    setBusy(true)
    setError('')
    const { data, error } = await db.from('reviews').insert(row).select('*').single()
    setBusy(false)
    if (error) return setError(error.message)
    setReviews((list) => [data as AdminReview, ...list])
    form.reset()
  }

  async function togglePublished(r: AdminReview) {
    const { error } = await db.from('reviews').update({ published: !r.published }).eq('id', r.id)
    if (error) return setError(error.message)
    setReviews((list) => list.map((x) => (x.id === r.id ? { ...x, published: !r.published } : x)))
  }

  async function remove(r: AdminReview) {
    if (!confirm(`حذف رأي ${r.author} نهائياً؟`)) return
    const { error } = await db.from('reviews').delete().eq('id', r.id)
    if (error) return setError(error.message)
    setReviews((list) => list.filter((x) => x.id !== r.id))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">آراء الزبائن</h1>
        <p className="mt-2 text-sm text-muted">أضف فقط آراء حقيقية وبموافقة أصحابها. القسم يظهر في الصفحة الرئيسية عندما يُنشر رأي واحد على الأقل.</p>
      </div>

      <form onSubmit={add} className="card grid gap-5 p-6 sm:grid-cols-2">
        <label>
          <span className="field-label">اسم الزبون</span>
          <input name="author" className="field-input" maxLength={80} required />
        </label>
        <label>
          <span className="field-label">المهنة · الولاية (اختياري)</span>
          <input name="detail" className="field-input" maxLength={120} placeholder="مصمم · وهران" />
        </label>
        <label className="sm:col-span-2">
          <span className="field-label">نص الرأي كما كتبه</span>
          <textarea name="body" rows={3} className="field-input h-auto! py-3" maxLength={600} required />
        </label>
        <label>
          <span className="field-label">المنتج (اختياري)</span>
          <select name="product_id" className="field-input" defaultValue="">
            <option value="">—</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 self-end pb-3 text-sm font-medium">
          <input type="checkbox" name="published" className="size-4 accent-fg" /> نشره الآن
        </label>
        <button className="btn-light sm:col-span-2" disabled={busy}>
          <Plus className="size-4" /> إضافة الرأي
        </button>
      </form>

      {error && <p className="rounded-xl border border-danger/40 p-3 text-sm text-danger">{error}</p>}

      <ul className="card divide-y divide-line">
        {reviews.length === 0 && <li className="p-6 text-muted">لا توجد آراء بعد.</li>}
        {reviews.map((r) => (
          <li key={r.id} className={`flex flex-wrap items-start gap-4 p-5 ${r.published ? '' : 'opacity-60'}`}>
            <div className="min-w-0 flex-1">
              <p className="text-fg-2">«{r.body}»</p>
              <p className="mt-2 text-sm">
                <b>{r.author}</b>
                {r.detail && <span className="text-muted"> · {r.detail}</span>}
                {r.product_id && <span className="ltr-iso text-muted"> · {products.find((p) => p.id === r.product_id)?.name}</span>}
              </p>
            </div>
            <button className="btn-outline !px-3 h-9! text-sm" onClick={() => togglePublished(r)}>
              {r.published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              {r.published ? 'منشور' : 'غير منشور'}
            </button>
            <button className="text-muted hover:text-danger" aria-label="حذف" onClick={() => remove(r)}>
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
