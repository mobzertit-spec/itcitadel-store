import type { Page, Route } from '@playwright/test'
import catalog from '../src/data/catalog.json' with { type: 'json' }

/** Answers every Supabase request the page makes, and records what was sent. */
export const TRACK = '6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b'

export async function fakeSupabase(page: Page, opts: { orders?: unknown[]; admin?: boolean; costs?: unknown[]; tracking?: unknown } = {}) {
  const sent: { url: string; method: string; body: unknown }[] = []
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  await page.route(/supabase\.co\//, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const body = req.postData() ? JSON.parse(req.postData()!) : null
    sent.push({ url: url.pathname + url.search, method: req.method(), body })
    const p = url.pathname
    // .single() asks PostgREST for one object
    const one = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object')
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } })
    if (p.endsWith('/rest/v1/categories')) return json(route, catalog.categories)
    if (p.endsWith('/rest/v1/products') && req.method() === 'GET') {
      const products = catalog.products.map((x) => ({ ...x, active: true, product_variants: x.product_variants.map((v) => ({ ...v, active: true })) }))
      if (one) return json(route, products.find((x) => `eq.${x.id}` === url.searchParams.get('id')))
      return json(route, products)
    }
    if (/\/rest\/v1\/(products|product_variants)$/.test(p)) return json(route, req.method() === 'PATCH' ? { id: url.searchParams.get('id')?.slice(3) } : [])
    if (p.endsWith('/rest/v1/pricing_rules')) return req.method() === 'GET' ? json(route, { usd_rate: 245, eur_rate: 285, margin_percent: 30 }) : route.fulfill({ status: 204 })
    if (p.endsWith('/rest/v1/variant_costs') && req.method() === 'GET') return json(route, opts.costs ?? [])
    if (p.endsWith('/rest/v1/reviews') && req.method() === 'POST') return json(route, { id: 'r1', created_at: '2026-10-24T09:00:00Z', sort: 0, ...body })
    if (p.endsWith('/functions/v1/place-order')) return json(route, { ok: true, number: 1007, track: TRACK })
    // an order's tracking page: the order given by the test, for its own code only
    if (p.endsWith('/rest/v1/rpc/order_track')) return json(route, (body as { p_token?: string })?.p_token === TRACK ? (opts.tracking ?? null) : null)
    if (p.endsWith('/functions/v1/push')) return json(route, req.method() === 'GET' ? { key: 'BGwgweIbrGq_CTQ_8rd_r2kp91axylwg0X5nVyyZgUn9qXBAz6ju2vl3fPZ2_eT7g81KR2_t0mIMi1QKN_a0bRc' } : { ok: true })
    if (p.endsWith('/auth/v1/token'))
      return json(route, {
        access_token: 'fake.jwt.token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'r',
        user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'owner@itcitadel.dz', app_metadata: {}, user_metadata: {}, created_at: '2026-10-23T00:00:00Z' },
      })
    if (p.endsWith('/rest/v1/admins')) return json(route, opts.admin === false ? null : { user_id: 'u1' })
    if (p.endsWith('/rest/v1/orders') && req.method() === 'GET') return json(route, opts.orders ?? [])
    if (p.endsWith('/rest/v1/orders') && req.method() === 'PATCH') return route.fulfill({ status: 204 })
    return json(route, [])
  })
  return sent
}
