import { useEffect } from 'react'

/**
 * Keeps the tab title and description right while the visitor navigates.
 * The first HTML already has them: scripts/prerender.ts writes the same values from src/lib/pages.ts.
 */
export function Meta({ title, description, noindex = false }: { title: string; description?: string; noindex?: boolean }) {
  useEffect(() => {
    document.title = title
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [title, description])
  // private pages (an order's tracking link): kept out of search engines
  useEffect(() => {
    if (!noindex) return
    const robots = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex' })
    document.head.append(robots)
    return () => robots.remove()
  }, [noindex])
  return null
}
