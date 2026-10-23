# ITCITADEL store — notes for Claude

- Storefront: React 19 + Vite + Tailwind v4, Arabic (RTL, default) / French / English. Every interface string lives in
  `src/i18n/strings.ts` (the `Dict` type forces all three languages); product texts are database columns `*_ar/_fr/_en`.
- Validation shared by the browser and the Edge Functions: `supabase/functions/_shared/validate.ts` (no imports — runs in
  browser, Node and Deno). Endpoint logic: `_shared/handler.ts`, tested in `_shared/*.test.ts` (`npm test`).
- Prices are always taken from the database (`public.create_order`), never from the request.
- Supabase project: `gkrbvpncamkcuxhvzjax`. Schema changes go in a new numbered file in `supabase/migrations/`.
- Before pushing: `npx tsc -b && npx oxlint && npm test && npm run build && npx playwright test`.
- Design skills from the program repo are in `.claude/skills/` (brand, design, ui-ux-pro-max, …).
