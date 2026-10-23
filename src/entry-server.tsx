/**
 * Build-time prerender entry (see scripts/prerender.ts): renders a URL of the store to static HTML.
 * Visitors and search engines get the full page at once; the app loads and takes over.
 */
import { prerender } from 'react-dom/static'
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router-dom'
import { basename, routes } from './App'
import { SNAPSHOT } from './lib/catalog'
import { pages as allPages } from './lib/pages'

export const pages = () => allPages(SNAPSHOT)

export async function render(path: string): Promise<string> {
  const { query, dataRoutes } = createStaticHandler(routes, { basename })
  const url = new URL((basename === '/' ? '' : basename) + path, 'http://localhost')
  const context = await query(new Request(url))
  if (context instanceof Response) throw new Error(`${path} redirects — nothing to prerender`)
  const router = createStaticRouter(dataRoutes, context)
  const { prelude } = await prerender(<StaticRouterProvider router={router} context={context} hydrate={false} />)
  return new Response(prelude).text()
}
