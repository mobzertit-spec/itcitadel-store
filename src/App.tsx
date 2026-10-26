import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { LangLayout } from '@/components/Layout'
import CartPage from '@/pages/Cart'
import Catalog from '@/pages/Catalog'
import Home from '@/pages/Home'
import Legal from '@/pages/Legal'
import NotFound from '@/pages/NotFound'
import OrderDone from '@/pages/OrderDone'
import ProductPage from '@/pages/Product'
import RootRedirect from '@/pages/RootRedirect'

// the dashboard is for the owner only: its code (and the Supabase auth library) loads on /admin/ alone
const admin = () => import('@/admin/AdminApp')
const AdminLoading = () => <div className="min-h-dvh bg-bg" />

export const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export const routes: RouteObject[] = [
  { path: '/', element: <RootRedirect /> },
  // explicit child routes: a "/admin/*" splat would rank below "/:lang/products" and lose /admin/products
  {
    path: '/admin',
    lazy: async () => ({ Component: (await admin()).default }),
    HydrateFallback: AdminLoading,
    children: [
      { index: true, lazy: async () => ({ Component: (await admin()).Orders }) },
      { path: 'reviews', lazy: async () => ({ Component: (await admin()).Reviews }) },
      { path: 'pricing', lazy: async () => ({ Component: (await admin()).Pricing }) },
      { path: 'products', lazy: async () => ({ Component: (await admin()).Products }) },
      { path: 'products/:id', lazy: async () => ({ Component: (await admin()).ProductEdit }) },
    ],
  },
  {
    path: '/:lang',
    element: <LangLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'products', element: <Catalog /> },
      { path: 'p/:slug', element: <ProductPage /> },
      { path: 'order/done', element: <OrderDone /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'legal', element: <Legal /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]

let router: ReturnType<typeof createBrowserRouter> | undefined

export default function App() {
  router ??= createBrowserRouter(routes, { basename })
  return <RouterProvider router={router} />
}
