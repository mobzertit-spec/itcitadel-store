# Shopping Interactions Implementation Plan

> **Changed after the preview (2026-10-31):**
> - **Offers and countdowns removed:** the store sells at fixed prices (migration 011 drops the columns).
> - **Product cards:** they float gently.
> - **Logo:** it loops every 10 s. The gate opens, the light becomes the I, the gate turns into the C, and ITCITADEL forms.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eight storefront interactions plus an interactive logo, without new libraries.

The eight interactions:
- quick view
- cart drawer
- mobile sticky buy bar
- live search
- logo marquee
- countdown offers
- monthly/yearly switch
- recent-order toasts

**Architecture:**
- **Pure logic, unit-tested:** offer pricing, billing pairs and search ranking live in import-free `src/lib/*.ts` files, tested with tsx (`npm test`).
- **Overlays:** quick view and the cart drawer are native `<dialog>` elements rendered once in the shell, opened through tiny stores (`useSyncExternalStore`).
- **Server:** offers and recent orders come from migration 010; `create_order` charges the offer price while it runs.

**Tech Stack:** React 19, React Router 7, Tailwind v4, Supabase (Postgres RPC), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-31-shopping-interactions-design.md`

## Global Constraints
- Black and white; orange (`btn-accent`, `#ff6a00`) for buying and the logo's light only.
- Every string in `src/i18n/strings.ts` in ar/fr/en; RTL-correct (logical properties).
- Prices never come from the browser: the browser only displays `priceOf(variant)`; the server recomputes it.
- Every animation stops under `prefers-reduced-motion`; overlays are keyboard-usable (Esc, focus).
- Before pushing: `npx tsc -b && npx oxlint && npm test && npm run build && npx playwright test`.
- Nothing merges into `main` before the owner approves the preview.

## Review Focus
1. **An offer ends while the page is open:** prices return to normal without a reload, and the order is charged the normal price.
2. **The drawer is opened from the tab bar on a phone, or with JavaScript off:** the link still leads to the cart page.
3. **A search finds nothing, or only French or Arabic text matches:** the list shows the "no results" line, and Enter still goes to the store search.
4. **No recent orders, or the owner switched them off:** nothing appears and no timers keep running.
5. **A product has a yearly plan without a monthly counterpart:** no switch and no savings line.

---

### Task 1: Offers, billing and search logic (pure, tested)
- **Create:**
  - `src/lib/offers.ts`: `priceOf(v, now?)`, `onOffer(v, now?)`, `timeLeft(endsAt, now)` returning `{ d, h, m, s, done }`.
  - `src/lib/billing.ts`: `tierOf(label_en)`, `billing(variants)` returning `{ monthly, yearly, pairs: Map<yearlyId, monthlyVariant> } | null`, `savings(yearly, monthly, now?)`.
  - `src/lib/search.ts`: `rankProducts(products, categories, q)`. Order: names that start with the query, then names that contain it, then any other text.
- **Tests:** `src/lib/*.test.ts`; `npm test` runs them too.
- **Modify:** `lowestPrice` uses `priceOf`; so do the cart totals, the Product page and the JSON-LD (`priceValidUntil` while an offer runs).

### Task 2: Migration 010 and the dashboard
- **Migration 010:**
  - `promo_price_dzd`, `promo_ends_at` (check: both or neither).
  - `create_order` uses the price in force.
  - `store_settings(recent_orders)` with admin policies.
  - `recent_orders()`: security definer, granted to anon.
- **Catalog columns:** `scripts/snapshot.ts` and `src/lib/catalog.ts` select `months`, `promo_price_dzd`, `promo_ends_at`.
- **`src/admin/ProductEdit.tsx`:** offer price and end date per plan, validated (below the price, in the future).
- **`src/admin/Products.tsx`:** the recent-orders switch.

### Task 3: Storefront components
- **Logic:**
  - `src/lib/overlays.ts`: `quickView.open(slug)` / `cartDrawer.open()`, plus hooks.
  - `src/lib/now.ts`: a shared one-second clock, `useNow()`.
- **New components:**
  - `src/components/PlanPicker.tsx`: the switch, plans, offer prices and countdown. Used by the Product page and quick view.
  - `QuickView.tsx` and `CartDrawer.tsx`.
  - `Marquee.tsx`: under the hero.
  - `RecentOrders.tsx`: in the shell.
  - `Countdown.tsx`.
- **Wiring:**
  - **Header:** live search as a combobox; the cart button opens the drawer, and the tab bar's cart does the same.
  - **Product page:** sticky bar.
  - **`ProductTile`:** quick-view button; offer badge.
- **Logo (`Logo.tsx` + `index.css`):** door-opening hover, breathing glow, flash on `itc:added` and on press.

### Task 4: Tests, checks, preview
- **New e2e tests:** one per interaction (Review Focus included). Recent-order toasts use `page.clock`.
- **Full checks.**
- **Video recordings:** phone and desktop.
- **Push:** the `logo` branch only, then the owner's approval.
