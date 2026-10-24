import { Crown, Eye, EyeOff, Plus, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductMark } from '@/components/BrandLogo'
import { dzd } from '@/lib/format'
import { db, type AdminProduct } from './db'

export default function Products() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    db.from('products')
      .select('*, product_variants(*)')
      .order('sort')
      .then(({ data, error }) => (error ? setError(error.message) : setProducts(data as AdminProduct[])))
  }, [])

  /** The home page shows one product on top: the database allows only one, so clear the old one first. */
  async function makeHero(p: AdminProduct) {
    const cleared = await db.from('products').update({ hero: false }).eq('hero', true)
    const { error } = cleared.error ? cleared : await db.from('products').update({ hero: true }).eq('id', p.id)
    if (error) return setError(error.message)
    setProducts((list) => list.map((x) => ({ ...x, hero: x.id === p.id })))
  }

  async function toggle(p: AdminProduct, field: 'active' | 'featured') {
    const { error } = await db.from('products').update({ [field]: !p[field] }).eq('id', p.id)
    if (error) return setError(error.message)
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, [field]: !p[field] } : x)))
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">المنتجات والأسعار</h1>
        <Link to="/admin/products/new" className="btn-light h-10!">
          <Plus className="size-4" /> منتج جديد
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted">التغييرات تظهر في المتجر فوراً. الأسعار بالدينار وتشمل الرسوم.</p>
      {error && <p className="mt-4 rounded-xl border border-danger/40 p-3 text-sm text-danger">{error}</p>}
      <ul className="card mt-6 divide-y divide-line">
        {products.map((p) => (
          <li key={p.id} className={`flex flex-wrap items-center gap-4 p-4 ${p.active ? '' : 'opacity-55'}`}>
            <span className="logo-stage size-12 shrink-0 rounded-2xl">
              <ProductMark product={{ ...p, product_variants: p.product_variants }} size={26} />
            </span>
            <Link to={`/admin/products/${p.id}`} className="min-w-0 flex-1 hover:text-fg">
              <span className="ltr-iso block font-bold">{p.name}</span>
              <span className="text-sm text-muted">
                {p.quote_only
                  ? 'حسب الطلب'
                  : p.product_variants
                      .filter((v) => v.active)
                      .sort((a, b) => a.sort - b.sort)
                      .map((v) => `${v.label_ar}: ${dzd(v.price_dzd, 'ar')}`)
                      .join(' · ')}
              </span>
            </Link>
            <button
              className={`btn-outline !px-3 h-9! text-sm ${p.hero ? 'border-fg' : ''}`}
              onClick={() => makeHero(p)}
              disabled={p.hero}
              title="المنتج الكبير أعلى الصفحة الرئيسية (منتج واحد فقط)"
            >
              <Crown className={`size-4 ${p.hero ? 'fill-accent text-accent' : ''}`} /> {p.hero ? 'أعلى الرئيسية' : 'ضعه أعلى الرئيسية'}
            </button>
            <button className="btn-outline !px-3 h-9! text-sm" onClick={() => toggle(p, 'featured')} title="يظهر بجانب المنتج الأول في الصفحة الرئيسية">
              <Star className={`size-4 ${p.featured ? 'fill-accent text-accent' : ''}`} /> مميز
            </button>
            <button className="btn-outline !px-3 h-9! text-sm" onClick={() => toggle(p, 'active')}>
              {p.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              {p.active ? 'ظاهر' : 'مخفي'}
            </button>
            <Link to={`/admin/products/${p.id}`} className="btn-outline !px-4 h-9! text-sm">
              تعديل
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
