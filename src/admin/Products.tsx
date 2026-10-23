import { Eye, EyeOff, Plus, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductVisual } from '@/components/ProductVisual'
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

  async function toggle(p: AdminProduct, field: 'active' | 'featured') {
    const { error } = await db.from('products').update({ [field]: !p[field] }).eq('id', p.id)
    if (error) return setError(error.message)
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, [field]: !p[field] } : x)))
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">المنتجات والأسعار</h1>
        <Link to="/admin/products/new" className="btn-primary !py-2">
          <Plus className="size-4" /> منتج جديد
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted">التغييرات تظهر في المتجر فوراً. الأسعار بالدينار وتشمل الرسوم.</p>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-danger">{error}</p>}
      <ul className="card mt-6 divide-y divide-line">
        {products.map((p) => (
          <li key={p.id} className={`flex flex-wrap items-center gap-4 p-4 ${p.active ? '' : 'opacity-55'}`}>
            <ProductVisual product={{ ...p, product_variants: p.product_variants }} />
            <Link to={`/admin/products/${p.id}`} className="min-w-0 flex-1 hover:text-brand">
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
            <button className="btn-ghost !px-3 !py-1.5 text-sm" onClick={() => toggle(p, 'featured')} title="يظهر في الصفحة الرئيسية">
              <Star className={`size-4 ${p.featured ? 'fill-gold text-gold' : ''}`} /> مميز
            </button>
            <button className="btn-ghost !px-3 !py-1.5 text-sm" onClick={() => toggle(p, 'active')}>
              {p.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              {p.active ? 'ظاهر' : 'مخفي'}
            </button>
            <Link to={`/admin/products/${p.id}`} className="btn-dark !px-4 !py-1.5 text-sm">
              تعديل
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
