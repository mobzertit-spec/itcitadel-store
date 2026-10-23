import { useEffect } from 'react'

/**
 * Keeps the tab title and description right while the visitor navigates.
 * The first HTML already has them: scripts/prerender.ts writes the same values from src/lib/pages.ts.
 */
export function Meta({ title, description }: { title: string; description?: string }) {
  useEffect(() => {
    document.title = title
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [title, description])
  return null
}
