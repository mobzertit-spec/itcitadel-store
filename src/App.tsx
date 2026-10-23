import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { LangLayout } from '@/components/Layout'
import Business from '@/pages/Business'
import Catalog from '@/pages/Catalog'
import Home from '@/pages/Home'
import Legal from '@/pages/Legal'
import NotFound from '@/pages/NotFound'
import OrderPage from '@/pages/Order'
import OrderDone from '@/pages/OrderDone'
import ProductPage from '@/pages/Product'
import RootRedirect from '@/pages/RootRedirect'

// the dashboard is for the owner only: its code (and the Supabase auth library) loads on /admin/ alone
const Admin = lazy(() => import('@/admin/AdminApp'))

export const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export const routes: RouteObject[] = [
  { path: '/', element: <RootRedirect /> },
  {
    path: '/admin/*',
    element: (
      <Suspense fallback={<div className="min-h-dvh bg-paper" />}>
        <Admin />
      </Suspense>
    ),
  },
  {
    path: '/:lang',
    element: <LangLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'products', element: <Catalog /> },
      { path: 'p/:slug', element: <ProductPage /> },
      { path: 'order/done', element: <OrderDone /> },
      { path: 'order/:slug', element: <OrderPage /> },
      { path: 'business', element: <Business /> },
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
