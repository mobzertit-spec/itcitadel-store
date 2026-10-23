import { startTransition, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './index.css'
import App from './App'
import { initTracking, track } from './lib/track'

// Pages are prerendered at build time (scripts/prerender.ts); the app then replaces that HTML with identical content.
const rootEl = document.getElementById('root')!
const prerendered = rootEl.hasChildNodes()
const root = createRoot(rootEl)
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)
if (prerendered) startTransition(() => root.render(app))
else root.render(app)

initTracking()
track('PageView')
