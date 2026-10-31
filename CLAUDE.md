# ITCITADEL store — notes for Claude

- Storefront: React 19 + Vite + Tailwind v4, Arabic (RTL, default) / French / English. Every interface string lives in
  `src/i18n/strings.ts` (the `Dict` type forces all three languages); product texts are database columns `*_ar/_fr/_en`.
- Validation shared by the browser and the Edge Functions: `supabase/functions/_shared/validate.ts` (no imports — runs in
  browser, Node and Deno). Endpoint logic: `_shared/handler.ts`, tested in `_shared/*.test.ts` (`npm test`).
- Prices are always taken from the database (`public.create_order`), never from the request.
- The store sells to individuals only, who pay cash at the office (no companies, invoices, bank transfer or quotes). Orders come
  from a cart kept in the browser (`src/lib/cart.ts`); `create_order` takes `items: [{variant_id, quantity}]`.
- Logo: the C of the initials as an arched gate, the I an orange light in its doorway. One drawing in
  `src/components/logo-mark.ts` (Logo.tsx); `npm run brand` regenerates the favicon, app icons, og.png and docs/brand/.
- Look: black and white, Zain (Arabic) + Inter (Latin), orange only for buying. Official product logos live in
  `src/components/brand-logos.ts` (picked by slug). Never invent reviews or "best seller" claims.
- Motion (no library): CSS utilities in `index.css` (`reveal` is scroll-driven, `glow`, `lift`, view transitions) and
  `src/lib/motion.ts`. Calm, white light only; never hide content until a script runs; everything stops under
  prefers-reduced-motion. Browser tests run with reduced motion; `test.describe('with motion')` switches it on.
- Pricing rule (`_shared/pricing.ts`, tested): purchase price × rate (USD/EUR, set in the dashboard) × (1 + margin), nearest
  500 DZD (1 000 from 100 000). Costs live in `variant_costs` (admins only); the owner may override a final price.
- Supabase project: `gkrbvpncamkcuxhvzjax`. Schema changes go in a new numbered file in `supabase/migrations/`.
- Before pushing: `npx tsc -b && npx oxlint && npm test && npm run build && npx playwright test`.
- Design skills from the program repo are in `.claude/skills/` (brand, design, ui-ux-pro-max, …).
