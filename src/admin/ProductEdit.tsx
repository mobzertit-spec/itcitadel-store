import { ArrowRight, ImageUp, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Lang } from '@shared/validate'
import type { Category } from '@/lib/catalog'
import { db, type AdminProduct, type AdminVariant } from './db'

const LANGS: { id: Lang; label: string; dir: 'rtl' | 'ltr' }[] = [
  { id: 'ar', label: 'العربية', dir: 'rtl' },
  { id: 'fr', label: 'Français', dir: 'ltr' },
  { id: 'en', label: 'English', dir: 'ltr' },
]

type Draft = Omit<AdminProduct, 'id' | 'product_variants'> & { id?: string }
type VariantDraft = Omit<AdminVariant, 'id'> & { id?: string; key: string }

const EMPTY: Draft = {
  slug: '',
  category_id: 'ai',
  name: '',
  tagline_ar: '',
  tagline_fr: '',
  tagline_en: '',
  description_ar: '',
  description_fr: '',
  description_en: '',
  features_ar: [],
  features_fr: [],
  features_en: [],
  requirements_ar: '',
  requirements_fr: '',
  requirements_en: '',
  image_url: null,
  per_user: false,
  quote_only: false,
  featured: false,
  active: true,
  sort: 100,
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
const newVariant = (sort: number): VariantDraft => ({ key: crypto.randomUUID(), label_ar: '', label_fr: '', label_en: '', price_dzd: 0, active: true, sort })

export default function ProductEdit() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Draft | null>(isNew ? EMPTY : null)
  const [variants, setVariants] = useState<VariantDraft[]>(isNew ? [newVariant(1)] : [])
  const [removed, setRemoved] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [lang, setLang] = useState<Lang>('ar')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    db.from('categories')
      .select('*')
      .order('sort')
      .then(({ data }) => setCategories((data ?? []) as Category[]))
    if (isNew) return
    db.from('products')
      .select('*, product_variants(*)')
      .eq('id', id!)
      .single()
      .then(({ data, error }) => {
        if (error) return setError(error.message)
        const { product_variants, ...product } = data as AdminProduct
        setDraft(product)
        setVariants(product_variants.sort((a, b) => a.sort - b.sort).map((v) => ({ ...v, key: v.id })))
      })
  }, [id, isNew])

  if (!draft) return <p className="text-muted">{error || '…'}</p>
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch })
  const field = (name: string, l: Lang) => (draft as Record<string, unknown>)[`${name}_${l}`] as string
  const setVariant = (key: string, patch: Partial<VariantDraft>) => setVariants((vs) => vs.map((v) => (v.key === key ? { ...v, ...patch } : v)))

  async function upload(file: File) {
    setBusy(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `${draft!.slug || 'product'}-${Date.now()}.${ext}`
    const { error } = await db.storage.from('product-images').upload(path, file, { contentType: file.type })
    setBusy(false)
    if (error) return setError(`تعذّر رفع الصورة: ${error.message}`)
    set({ image_url: db.storage.from('product-images').getPublicUrl(path).data.publicUrl })
  }

  async function save() {
    const d = draft!
    if (!d.name.trim() || !d.slug.trim()) return setError('الاسم والرابط مطلوبان.')
    if (!/^[a-z0-9-]+$/.test(d.slug)) return setError('الرابط: حروف إنجليزية صغيرة وأرقام وشرطات فقط.')
    if (!variants.length) return setError('أضف خطة واحدة على الأقل.')
    if (variants.some((v) => !v.label_ar.trim() || !v.label_fr.trim() || !v.label_en.trim())) return setError('اكتب اسم كل خطة باللغات الثلاث.')
    setBusy(true)
    setError('')
    const { id: productId, ...fields } = d
    const saved = productId
      ? await db.from('products').update(fields).eq('id', productId).select('id').single()
      : await db.from('products').insert(fields).select('id').single()
    if (saved.error) {
      setBusy(false)
      return setError(saved.error.code === '23505' ? 'هذا الرابط مستعمل لمنتج آخر.' : saved.error.message)
    }
    const pid = saved.data.id as string
    const rows = variants.map((v, i) => ({ label_ar: v.label_ar, label_fr: v.label_fr, label_en: v.label_en, price_dzd: v.price_dzd, active: v.active, sort: i + 1, product_id: pid }))
    const existing = variants.flatMap((v, i) => (v.id ? [{ ...rows[i], id: v.id }] : []))
    const added = variants.flatMap((v, i) => (v.id ? [] : [rows[i]]))
    const results = await Promise.all([
      existing.length ? db.from('product_variants').upsert(existing) : null,
      added.length ? db.from('product_variants').insert(added) : null,
      removed.length ? db.from('product_variants').delete().in('id', removed) : null,
    ])
    setBusy(false)
    const failed = results.find((r) => r?.error)
    if (failed?.error) return setError(failed.error.message)
    navigate('/admin/products')
  }

  async function removeProduct() {
    if (!draft?.id || !confirm(`حذف ${draft.name} نهائياً؟ (لإخفائه فقط استعمل زر "مخفي")`)) return
    const { error } = await db.from('products').delete().eq('id', draft.id)
    if (error) return setError(error.message)
    navigate('/admin/products')
  }

  const current = LANGS.find((l) => l.id === lang)!
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/admin/products" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-brand">
        <ArrowRight className="size-4" /> المنتجات
      </Link>
      <h1 className="text-2xl font-extrabold">{isNew ? 'منتج جديد' : draft.name}</h1>

      <section className="card grid gap-5 p-6 sm:grid-cols-2">
        <label>
          <span className="field-label">الاسم (كما يكتبه الناشر)</span>
          <input
            className="field-input"
            dir="ltr"
            value={draft.name}
            onChange={(e) => set({ name: e.target.value, ...(isNew ? { slug: slugify(e.target.value) } : {}) })}
          />
        </label>
        <label>
          <span className="field-label">الرابط</span>
          <input className="field-input" dir="ltr" value={draft.slug} onChange={(e) => set({ slug: e.target.value })} />
        </label>
        <label>
          <span className="field-label">المجال</span>
          <select className="field-input" value={draft.category_id} onChange={(e) => set({ category_id: e.target.value })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_ar}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">الترتيب (الأصغر يظهر أولاً)</span>
          <input type="number" className="field-input" dir="ltr" value={draft.sort} onChange={(e) => set({ sort: Number(e.target.value) || 0 })} />
        </label>
        <div className="flex flex-wrap gap-x-6 gap-y-3 sm:col-span-2">
          <Check label="ظاهر في المتجر" checked={draft.active} onChange={(active) => set({ active })} />
          <Check label="مميز في الرئيسية" checked={draft.featured} onChange={(featured) => set({ featured })} />
          <Check label="السعر للمستخدم الواحد" checked={draft.per_user} onChange={(per_user) => set({ per_user })} />
          <Check label="بدون سعر معلن (اطلب السعر)" checked={draft.quote_only} onChange={(quote_only) => set({ quote_only })} />
        </div>
        <div className="flex items-center gap-4 sm:col-span-2">
          {draft.image_url ? (
            <img src={draft.image_url} alt="" className="size-16 rounded-2xl border border-line bg-white object-contain p-1" />
          ) : (
            <span className="inline-flex size-16 items-center justify-center rounded-2xl border border-dashed border-line text-muted">
              <ImageUp className="size-6" />
            </span>
          )}
          <label className="btn-ghost cursor-pointer !py-2 text-sm">
            رفع صورة (PNG/JPG/WebP، أقل من 2 ميغا)
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          {draft.image_url && (
            <button className="inline-flex items-center gap-1 text-sm text-muted hover:text-danger" onClick={() => set({ image_url: null })}>
              <X className="size-4" /> إزالة
            </button>
          )}
        </div>
      </section>

      <section className="card p-6">
        <div className="flex gap-1 rounded-full border border-line bg-paper p-1" role="tablist">
          {LANGS.map((l) => (
            <button key={l.id} role="tab" aria-selected={lang === l.id} onClick={() => setLang(l.id)} className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold ${lang === l.id ? 'bg-ink text-white' : ''}`}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="mt-5 space-y-5" dir={current.dir} lang={lang}>
          <label className="block">
            <span className="field-label">جملة قصيرة تحت الاسم</span>
            <input className="field-input" value={field('tagline', lang)} onChange={(e) => set({ [`tagline_${lang}`]: e.target.value } as Partial<Draft>)} />
          </label>
          <label className="block">
            <span className="field-label">الوصف</span>
            <textarea rows={4} className="field-input" value={field('description', lang)} onChange={(e) => set({ [`description_${lang}`]: e.target.value } as Partial<Draft>)} />
          </label>
          <label className="block">
            <span className="field-label">ما يحصل عليه الزبون (سطر لكل ميزة)</span>
            <textarea
              rows={4}
              className="field-input"
              value={((draft as Record<string, unknown>)[`features_${lang}`] as string[]).join('\n')}
              onChange={(e) => set({ [`features_${lang}`]: e.target.value.split('\n') } as Partial<Draft>)}
              onBlur={(e) => set({ [`features_${lang}`]: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) } as Partial<Draft>)}
            />
          </label>
          <label className="block">
            <span className="field-label">ما نحتاجه من الزبون</span>
            <input className="field-input" value={field('requirements', lang)} onChange={(e) => set({ [`requirements_${lang}`]: e.target.value } as Partial<Draft>)} />
          </label>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-bold">الخطط والأسعار</h2>
        <p className="mt-1 text-sm text-muted">السعر بالدينار ويشمل الرسوم. الخطة المخفية لا تظهر ولا يمكن طلبها.</p>
        <div className="mt-4 space-y-3">
          {variants.map((v) => (
            <div key={v.key} className={`grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1fr_1fr_8rem_auto] sm:items-end ${v.active ? '' : 'opacity-60'}`}>
              <input className="field-input !py-2" placeholder="الاسم بالعربية" value={v.label_ar} onChange={(e) => setVariant(v.key, { label_ar: e.target.value })} />
              <input className="field-input !py-2" dir="ltr" placeholder="Nom en français" value={v.label_fr} onChange={(e) => setVariant(v.key, { label_fr: e.target.value })} />
              <input className="field-input !py-2" dir="ltr" placeholder="Name in English" value={v.label_en} onChange={(e) => setVariant(v.key, { label_en: e.target.value })} />
              <input
                type="number"
                min={0}
                step={100}
                className="field-input !py-2"
                dir="ltr"
                aria-label="السعر"
                value={v.price_dzd}
                onChange={(e) => setVariant(v.key, { price_dzd: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
              />
              <div className="flex items-center gap-3">
                <Check label="ظاهرة" checked={v.active} onChange={(active) => setVariant(v.key, { active })} />
                <button
                  className="text-muted hover:text-danger"
                  aria-label="حذف الخطة"
                  onClick={() => {
                    if (v.id) setRemoved((r) => [...r, v.id!])
                    setVariants((vs) => vs.filter((x) => x.key !== v.key))
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button className="btn-ghost mt-3 !py-2 text-sm" onClick={() => setVariants((vs) => [...vs, newVariant(vs.length + 1)])}>
          <Plus className="size-4" /> إضافة خطة
        </button>
      </section>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-danger">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button className="btn-primary" disabled={busy} onClick={save}>
          {busy ? '…' : 'حفظ'}
        </button>
        {!isNew && (
          <button className="inline-flex items-center gap-1.5 text-sm text-danger hover:underline" onClick={removeProduct}>
            <Trash2 className="size-4" /> حذف المنتج
          </button>
        )}
      </div>
    </div>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
      <input type="checkbox" className="size-4 accent-brand" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}
