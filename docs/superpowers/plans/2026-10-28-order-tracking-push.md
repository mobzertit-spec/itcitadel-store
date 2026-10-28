# Order Tracking and Phone Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After ordering, customers follow their order on a live page and get Web Push notifications at each status change and 3 days before each subscription ends.

**Architecture:**
- **Tracking:** each order gets a secret `track_token`. A security-definer RPC `order_track(token)` returns the public view of the order (no name, phone or email). A status trigger broadcasts on the Realtime topic `order:<token>`.
- **Notifications:**
  - Status changes and daily renewal checks (pg_cron) write rows to an outbox table, then wake the `notify` Edge Function through pg_net.
  - `notify` claims the rows, encrypts and sends Web Push (RFC 8291 / VAPID RFC 8292, WebCrypto only), and tells the owner on Telegram about renewals.
  - Browsers subscribe through the `push` Edge Function.

**Tech Stack:** Postgres (Supabase: pg_net, pg_cron, realtime.send), Deno Edge Functions, WebCrypto, React 19 + React Router 7, a service worker, Playwright, `node:test` via tsx.

**Spec:** `docs/superpowers/specs/2026-10-28-order-tracking-push-design.md`

## Global Constraints

- **The tracking view never exposes `customer_name`, `phone`, `email`, `notes` or `admin_note`.**
- **`_shared/*.ts` files stay import-free, except `deps.ts`.** They run in the browser, Node and Deno.
- **Every interface string goes in `src/i18n/strings.ts`, in all three languages.** Notification texts live in `_shared/notify.ts`, in all three languages.
- **Notifications go out in the order's `lang`.**
- **Renewal reminders:** sent 3 days before the end date (`activated_at + months`). The check runs daily at 08:00 UTC (09:00 Africa/Algiers).
- **Push endpoints:** only https URLs on known push services are accepted: `fcm.googleapis.com`, `*.push.services.mozilla.com`, `*.push.apple.com`, `*.notify.windows.com`.
- **Look:** black and white, with orange for buying only. Motion follows the existing utilities and stops under reduced motion.
- **Before pushing:** `npx tsc -b && npx oxlint && npm test && npm run build && npx playwright test`.
- **Publishing:** nothing is merged into `main` before the owner approves the preview.

## Review Focus

1. **Unknown or garbage token in the URL:** "order not found" page with a link to "My orders". No crash.
2. **Notification permission denied, or blocked earlier:** a clear message, and the button disappears.
3. **Expired subscription (push service answers 404/410):** the subscription is deleted, the other subscriptions still get the message, and the row is marked sent.
4. **Status toggled back and forth:** each kind of notification goes out at most once per order.
5. **Order with several lines of different lengths:** one renewal reminder per line, each on its own date. Lines with no `months` never remind.

---

### Task 1: Web Push crypto

**Files:**
- Create: `supabase/functions/_shared/webpush.ts`
- Test: `supabase/functions/_shared/webpush.test.ts`

**Interfaces:**
- Produces:
  - `b64url(bytes: Uint8Array): string`
  - `fromB64url(s: string): Uint8Array`
  - `generateVapidKeys(): Promise<{ publicKey: string; privateJwk: JsonWebKey }>`. `publicKey` is the raw 65-byte P-256 point, base64url.
  - `vapidHeader(endpoint: string, keys: { publicKey: string; privateJwk: JsonWebKey }, subject: string, now?: number): Promise<string>`. Returns `vapid t=<jwt>, k=<publicKey>`, with jwt `aud` = endpoint origin, `exp` = now + 12 h, and `sub` = subject.
  - `encrypt(plaintext: Uint8Array, p256dh: string, auth: string, fixed?: { salt: Uint8Array; sender: CryptoKeyPair }): Promise<Uint8Array>`. This is aes128gcm, rs 4096, one record, with padding delimiter 0x02.
  - `sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: unknown, keys, subject: string): Promise<number>`. Returns the HTTP status. Headers: `TTL: 86400`, `Content-Encoding: aes128gcm`, `Urgency: normal`, and `Authorization` from `vapidHeader`.

- [ ] **Step 1: Write the failing tests**
  - `encrypt matches RFC 8291 section 5`: the RFC's receiver keys, auth secret, sender key pair (imported as JWK from the RFC's private and public values) and salt. Expected base64url output: `DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN`. Check this value against the RFC text before relying on it.
  - `encrypt round-trips with a fresh key pair`: decrypt in the test as the user agent would (ECDH, HKDF, AES-GCM), and get the plaintext back.
  - `vapidHeader signs a JWT the public key verifies`: ES256 verify succeeds. Claims: `aud` is `https://fcm.googleapis.com`, `sub` is `mailto:contact@itcitadel.dz`, and `exp - now/1000` is in `(0, 86400]`.
- [ ] **Step 2: Run `npx tsx --test supabase/functions/_shared/webpush.test.ts`.** Expected: FAIL (module missing).
- [ ] **Step 3: Implement `webpush.ts`** with WebCrypto only, following RFC 8291 §3–4: `PRK_key`, `key_info` = "WebPush: info\0" + ua_public + as_public, `CEK info`, `NONCE info`. The header is salt(16) ‖ rs(4, big-endian) ‖ idlen(1) ‖ keyid(as_public).
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit** with the message "Add Web Push encryption and VAPID signing (RFC 8291/8292)".

### Task 2: Database: tracking, outbox, renewals (migration 009)

**Files:**
- Create: `supabase/migrations/009_order_tracking.sql`

**Interfaces:**
- **Produces, columns:**
  - `orders.track_token uuid unique not null default gen_random_uuid()`
  - `orders.activated_at timestamptz`
  - `product_variants.months smallint check (months between 1 and 60)`
  - `order_items.months smallint`
- **Produces, data:**
  - Backfill `months` from `label_en` (`(\d+) month` → n, `(\d+) year` → 12n).
  - `order_items.months` copied from their variant.
- **Produces, `create_order(p)`:** same as 007. It also copies `months` into `order_items` and returns `{number, total, lines, track}`.
- **Produces, `public.order_track(p_token uuid) returns jsonb`:**
  - Execute is granted to `anon` and `authenticated`.
  - Returns `null` when the token is not found.
  - Returns `{number, status, lang, created_at, updated_at, activated_at, total, lines: [{product_name, labels: {ar, fr, en}, quantity, line_total, months, ends_at}]}`.
- **Produces, tables:** RLS on, no policies, privileges revoked from `anon` and `authenticated`.
  - `push_subscriptions(id bigint identity pk, order_id uuid → orders on delete cascade, endpoint text, p256dh text, auth text, created_at, unique(order_id, endpoint))`.
  - `push_keys(id boolean pk default true check (id), public_key text, private_jwk jsonb)`.
  - `notifications(id bigint identity pk, order_id uuid → orders cascade, item_id bigint → order_items cascade null, kind text check in (confirmed, paid, activated, cancelled, renewal), created_at, sent_at, unique nulls not distinct (order_id, kind, item_id))`.
- **Produces, triggers on `orders`:**
  - BEFORE UPDATE sets `activated_at = now()` when the status becomes `activated` and `activated_at` is null.
  - AFTER UPDATE OF status, when the status changed:
    - Inserts a notification of kind `new.status`, except for `new`, with `on conflict do nothing`.
    - Calls `realtime.send({status}, 'status', 'order:' || track_token, false)`.
    - Calls `private.kick_notify()`.
- **Produces, functions:**
  - `private.kick_notify()`: `net.http_post` to `https://gkrbvpncamkcuxhvzjax.supabase.co/functions/v1/notify` with body `{}`.
  - `private.queue_renewals()`: inserts `renewal` rows for items of activated orders whose `(activated_at + months)` date in Africa/Algiers is between today and today + 3. If it inserted any, it kicks.
  - `public.claim_notifications() returns jsonb`. Execute for `service_role` only. It locks pending rows (`sent_at is null`, created in the last 7 days, `for update skip locked`), sets `sent_at = now()`, and returns them joined:
    - From the order: `number, lang, track_token, customer_name, phone`.
    - From the item: `product_name, labels, ends_at`.
    - `subscriptions: [{id, endpoint, p256dh, auth}]`.
- **Produces, schedule:** `cron.schedule('itc-renewals', '0 8 * * *', 'select private.queue_renewals()')`.

- [ ] **Step 1: Write the migration.** Re-create `create_order` from 007 with the two additions.
- [ ] **Step 2: Apply it** (`apply_migration`, name `009_order_tracking`).
- [ ] **Step 3: Verify in a transaction that rolls back.** Expected:
  - `create_order` returns a `track` and the lines get `months`.
  - `order_track(track)` has no `phone` key.
  - Updating the status to `confirmed` creates exactly one notification. Updating it to `paid` and back to `confirmed` still leaves one `confirmed` row.
  - `activated` sets `activated_at`.
  - `queue_renewals()` with `activated_at` 27 days ago on an order with a 1-month line and a 12-month line creates exactly one `renewal` row (for the 1-month line); running it twice still leaves one.
- [ ] **Step 4: Check `get_advisors` (security).** Expected: no new findings on the new tables or functions.
- [ ] **Step 5: Commit** with the message "Track orders and queue notifications in the database".

### Task 3: Endpoints: `push`, `notify`, and the tracking link in place-order

**Files:**
- Modify:
  - `supabase/functions/_shared/validate.ts`
  - `supabase/functions/_shared/handler.ts`
  - `supabase/functions/_shared/deps.ts`
- Create:
  - `supabase/functions/_shared/notify.ts`
  - `supabase/functions/push/index.ts`
  - `supabase/functions/notify/index.ts`
- Test:
  - `_shared/validate.test.ts`
  - `_shared/handler.test.ts`
  - `_shared/notify.test.ts`

**Interfaces:**
- **Consumes:** Task 1 (`sendPush`, `generateVapidKeys`) and Task 2 (`claim_notifications`, `create_order.track`).
- **Produces, `validate.ts`:**
  - `validatePushSubscription(body: unknown): { ok: true; value: { token: string; endpoint: string; p256dh: string; auth: string } } | { ok: false }`.
  - Checks: `token` is a uuid; the endpoint is https and on the allowed hosts; `p256dh` is base64url and decodes to 65 bytes starting with 0x04; `auth` is base64url and decodes to 16 bytes.
- **Produces, `handler.ts`:**
  - `CreatedOrder` gains `track: string`. The place-order reply becomes `{ ok, number, track }`.
  - `orderMessage(o, c, siteUrl)` adds the line `🔗 <siteUrl>ar/order/<track>/`. `Deps` gains `siteUrl: string`.
  - `PushDeps = { allowedOrigins; salt; rateHit; publicKey(): Promise<string>; subscribe(v): Promise<boolean> }`.
  - `handlePush(req, deps: PushDeps)`:
    - GET returns `{ key }`.
    - POST runs intake (CORS, rate limit, honeypot), then validation. It returns 400 `{error:'subscription'}`, 404 `{error:'order'}` when `subscribe` returns false, or 200 `{ok:true}`.
    - CORS allows `GET, POST, OPTIONS`.
- **Produces, `notify.ts`:**
  - Types: `Claimed` (one row of `claim_notifications`) and `NotifyDeps = { claim(): Promise<Claimed[]>; push(sub, payload): Promise<number>; drop(subId: number): Promise<void>; telegram(html: string): Promise<void>; siteUrl: string }`.
  - `notificationText(row: Claimed): { title: string; body: string; url: string; tag: string }`, in `row.lang`:
    - Texts for `confirmed`, `paid`, `activated`, `cancelled` and `renewal`, matching the spec's wording.
    - `url` = `<siteUrl><lang>/order/<track>/`.
    - `tag` = `order-<number>`.
  - `runNotify(deps): Promise<{ sent: number; dropped: number }>`:
    - Sends each row to every subscription.
    - Calls `drop` on 404/410.
    - For `renewal` rows, also sends the owner a Telegram message: number, name, phone, product and end date.
    - One failing push never stops the others.
- **Produces, `deps.ts`:**
  - `pushDeps()`: loads the VAPID keys from `push_keys`. If the table is empty, it generates them and inserts them (`on conflict do nothing`, then re-reads).
  - `notifyDeps()`: subject `mailto:contact@itcitadel.dz`.
  - `SITE_URL` env, default `https://mobzertit-spec.github.io/itcitadel-store/`.

- [ ] **Step 1: Write the failing tests.**
  - **Validate:**
    - A valid FCM subscription passes.
    - These fail: `http://` endpoints, an `evil.example` host, a 64-byte `p256dh`, and a non-uuid token.
  - **Handler:**
    - Place-order returns `track`, and the Telegram text contains `/ar/order/<track>/`.
    - Push GET returns `{key}`.
    - Push POST with a bad body returns 400, an unknown order returns 404, and a valid one returns 200.
  - **Notify:**
    - An Arabic `confirmed` row produces a title containing `#1007` and the office hours.
    - A French `activated` row names the product.
    - A 410 calls `drop` once and still sends to the second subscription.
    - A `renewal` row sends one Telegram message containing the phone.
    - Zero rows → `{sent:0, dropped:0}`.
- [ ] **Step 2: Run `npm test`.** Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the interfaces above. Wiring:
  - `push/index.ts`: `Deno.serve((req) => handlePush(req, pushDeps(...)))`, with limits 30 per visitor and 2000 per day.
  - `notify/index.ts`: answers POST by running `runNotify(notifyDeps())` and returning the counts.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Deploy** `place-order`, `push` and `notify`, all with `verify_jwt: false`, like place-order. Then, with pg_net, call:
  - `notify` → expected `{"sent":0,"dropped":0}`.
  - `push` with GET → expected a 65-byte key.
- [ ] **Step 6: Commit** with the message "Add the push and notify functions; place-order returns the tracking link".

### Task 4: Storefront: tracking page, My orders, notifications

**Files:**
- Create:
  - `src/lib/orders.ts`
  - `src/lib/push.ts`
  - `src/pages/OrderTrack.tsx`
  - `src/pages/MyOrders.tsx`
  - `public/sw.js`
  - `public/manifest.webmanifest`
  - `public/icon-192.png`, `public/icon-512.png`, `public/badge-96.png` (rendered from `LogoMark` with Playwright)
- Modify:
  - `src/lib/api.ts`: the submit result adds `track: string | null`.
  - `src/pages/Cart.tsx`: navigates to `order/<track>/` with state `{ fresh: true, phone }`, or falls back to `order/done`; calls `rememberOrder`.
  - `src/App.tsx`: routes `order/:token` and `orders`.
  - `src/components/Footer.tsx`: a "My orders" link.
  - `src/i18n/strings.ts`: a `track` section.
  - `index.html`: manifest and apple-touch-icon links.
- Test: `e2e/store.spec.ts`, `e2e/supabase.ts`

**Interfaces:**
- **Consumes:** `order_track` (Task 2) and the `push` function (Task 3).
- **Produces, `orders.ts`:**
  - `type Tracking`: the shape returned by `order_track`.
  - `fetchTracking(token): Promise<Tracking | null | 'error'>`, through `POST /rest/v1/rpc/order_track`.
  - `watchOrder(token, onChange: () => void): () => void`. It lazy-imports `@supabase/supabase-js` and joins channel `order:<token>` for the `status` broadcast. It also re-fetches on window focus and every 60 s while the page is visible.
  - `rememberOrder({ token, number, at })` and `useRememberedOrders()`: localStorage key `itc:orders`, newest first, at most 20.
- **Produces, `push.ts`:**
  - `pushState(): 'ready' | 'on' | 'denied' | 'ios-install' | 'unsupported'`.
  - `enablePush(token): Promise<'on' | 'denied' | 'failed'>`. It registers `${BASE_URL}sw.js`, GETs the key, subscribes with `userVisibleOnly`, and POSTs the subscription to `push`.
- **Produces, the tracking page:**
  - Content:
    - The thanks block when `state.fresh`.
    - A four-step timeline with the current step highlighted (`animate-pop` on change), or a cancelled state.
    - The lines with their end dates once activated.
    - The total.
    - The notification button, the iPhone guide, the denied message, or "notifications on".
    - The office card and WhatsApp.
  - Its `<Meta>` carries noindex.
- **Produces, `sw.js`:**
  - `push` → `showNotification(title, { body, icon: 'icon-192.png', badge: 'badge-96.png', tag, data: { url } })`.
  - `notificationclick` → focuses an open tab on the url, else `clients.openWindow(url)`.

- [ ] **Step 1: Write the failing e2e tests.**
  - **Order → tracking:** the order redirects to `/ar/order/<track>/`. The timeline marks «جديد» as current, and the thanks heading is shown.
  - **Status from the RPC:** a fake RPC returning `confirmed` shows «مؤكَّد» as current.
  - **Unknown token:** the not-found text is shown, with a link to «طلباتي».
  - **My orders:** after ordering, «طلباتي» lists `#1007`.
  - **iPhone:** with the iPhone user agent and `PushManager` removed (an init script), the add-to-home-screen guide is shown instead of the button.
  - **Notifications refused:** with `Notification.permission` forced to `denied` (an init script), the refused message shows and there is no button.
- [ ] **Step 2: Run `npx playwright test`.** Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the files above. The fake Supabase answers `rpc/order_track` from `opts.tracking`, and place-order returns `track`.
- [ ] **Step 4: Run** `npx tsc -b && npx oxlint && npm run build && npx playwright test`. Expected: all pass.
- [ ] **Step 5: Commit** with the message "Add the live order page, My orders and phone notifications".

### Task 5: Dashboard: tracking link and plan length

**Files:**
- Modify:
  - `src/admin/Orders.tsx`: the order detail shows the tracking link, a copy button, and "Send to the customer on WhatsApp" (wa.me to the customer's phone in international format, in the order's language). The select adds `track_token`.
  - `src/admin/ProductEdit.tsx`: a "Months" number field per plan, saved with the plan.
- Test: `e2e/store.spec.ts`. The owner test checks that the order detail shows a link containing `/order/`.

- [ ] **Step 1: Extend the owner e2e test.** Expected: FAIL.
- [ ] **Step 2: Implement.** Expected: PASS.
- [ ] **Step 3: Commit** with the message "Dashboard: tracking link for each order, plan length in months".

### Task 6: End-to-end check and preview

- [ ] **Step 1: Run the full checks.** Expected: green.
- [ ] **Step 2: Live check:**
  1. Create an order through `place-order`, with pg_net from the database.
  2. Read `order_track`.
  3. Update the status to `confirmed`.
  4. Confirm that the `notifications` row has `sent_at` set and that the `notify` response shows `{"sent":0,...}` (no subscriptions).
  5. Delete the order.
- [ ] **Step 3: Record** a short phone video of order → tracking page → status changing live, using a fake realtime refetch in the recording.
- [ ] **Step 4: Push the branch `interactive-design`** (not `main`) and send the video to the owner for approval.
