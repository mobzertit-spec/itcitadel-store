import type { Session } from '@supabase/supabase-js'
import { LogOut, MessageSquareQuote, Package, ShoppingBag } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LogoMark } from '@/components/Logo'
import { db } from './db'
import Login from './Login'

export { default as Orders } from './Orders'
export { default as ProductEdit } from './ProductEdit'
export { default as Products } from './Products'
export { default as Reviews } from './Reviews'

/** The owner's dashboard (Arabic). Everything it reads or changes is protected by the database policies, not by this code. */
export default function AdminApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [admin, setAdmin] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    document.documentElement.lang = 'ar'
    document.documentElement.dir = 'rtl'
    document.title = 'ITCITADEL · لوحة التحكم'
    db.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = db.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    db.from('admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setAdmin(!!data))
  }, [session])

  if (session === undefined || (session && admin === undefined)) return <div className="min-h-dvh bg-bg" />
  if (!session) return <Login />
  if (!admin)
    return (
      <Centered>
        <p className="font-semibold">هذا الحساب ({session.user.email}) ليس مديراً للمتجر.</p>
        <button className="btn-outline mt-6" onClick={() => db.auth.signOut()}>
          تسجيل الخروج
        </button>
      </Centered>
    )

  const tab = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? 'bg-fg text-bg' : 'text-fg-2 hover:bg-white/5'}`
  return (
    <div lang="ar" dir="rtl" className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2 font-bold">
            <LogoMark className="size-7" />
            لوحة التحكم
          </div>
          <nav className="flex flex-wrap gap-1">
            <NavLink to="/admin/" end className={tab}>
              <ShoppingBag className="size-4" /> الطلبات
            </NavLink>
            <NavLink to="/admin/products" className={tab}>
              <Package className="size-4" /> المنتجات
            </NavLink>
            <NavLink to="/admin/reviews" className={tab}>
              <MessageSquareQuote className="size-4" /> آراء الزبائن
            </NavLink>
          </nav>
          <button className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg" onClick={() => db.auth.signOut()}>
            <LogOut className="size-4" /> خروج
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

export function Centered({ children }: { children: ReactNode }) {
  return (
    <div lang="ar" dir="rtl" className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="card w-full max-w-sm p-8 text-center">{children}</div>
    </div>
  )
}
