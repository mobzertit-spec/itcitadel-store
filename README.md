# ITCITADEL — متجر الاشتراكات الرقمية

متجر إلكتروني بثلاث لغات (العربية، الفرنسية، الإنجليزية) لاشتراكات ChatGPT وFreepik وAdobe وGoogle Workspace وZoom وKaspersky، بالدينار الجزائري.
الزبون يطلب ← نتصل به للتأكيد ← يدفع نقداً في المكتب أو بتحويل بنكي مع فاتورة ← نفعّل اشتراكه خلال 24 ساعة.

- **المتجر:** `https://mobzertit-spec.github.io/itcitadel-store/`
- **لوحة التحكم:** `…/admin/`، للطلبات وعروض الأسعار والمنتجات والأسعار.
- **خطة التسويق:** [`docs/marketing.md`](docs/marketing.md).
- **التصميم المعتمد:** [`docs/superpowers/specs/`](docs/superpowers/specs/).

## كيف يعمل

| الجزء | التقنية | أين |
|---|---|---|
| الواجهة | React 19، Vite، Tailwind v4، React Router، وكل صفحة تتحول إلى HTML جاهز بكل لغة | `src/`، `scripts/prerender.ts` |
| الكتالوج | Supabase (`products` و`product_variants` و`categories`)، مع نسخة وقت البناء في `src/data/catalog.json` | `scripts/snapshot.ts` |
| الطلبات | دالتا Supabase Edge: `place-order` و`request-quote`. السعر يُحسب دائماً من قاعدة البيانات، مع حد للطلبات وحقل مخفي ضد الرسائل الآلية وإشعار تيليغرام | `supabase/functions/` |
| الحماية | قواعد RLS: الزائر يقرأ المنتجات الظاهرة فقط، والطلبات للمدير وحده | `supabase/migrations/` |
| لوحة التحكم | `/admin/`، تُحمَّل وحدها | `src/admin/` |
| النشر | GitHub Pages عند كل دفع، وكل ليلة لتحديث الأسعار في صفحات Google | `.github/workflows/deploy.yml` |

## تشغيل محلي

```bash
npm install
npm run dev          # http://localhost:5173/ar/
npm test             # اختبارات منطق الطلب والتحقق
npm run build        # dist/ — كل الصفحات بكل اللغات
npx playwright test  # اختبارات المتصفح (بعد build)
```

## إعداد لمرة واحدة

1. **حساب المدير:**
   - Supabase ← Authentication ← Users ← Add user. أدخل بريدك وكلمة مرور، وفعّل Auto Confirm.
   - ثم أضف الحساب إلى جدول المدراء في SQL Editor:
     `insert into public.admins (user_id) select id from auth.users where email = 'بريدك';`
   - وأخيراً أوقف التسجيل العام: Authentication ← Sign In / Providers ← Allow new users to sign up ← Off.
2. **تيليغرام:** أنشئ بوتاً عبر @BotFather واضغط Start فيه، ثم ضع في Supabase ← Edge Functions ← Secrets قيمة `TELEGRAM_BOT_TOKEN` فقط، ثم شغّل الدالة `telegram-setup` مرة واحدة: تجد محادثتك وتربطها وترسل لك رسالة تأكيد.
3. **أسرار أخرى:**
   - `ALLOWED_ORIGINS=https://mobzertit-spec.github.io`، وأضف نطاقك لاحقاً مفصولاً بفاصلة.
   - `RATE_SALT`: أي نص عشوائي طويل.
4. **GitHub Pages:** Settings ← Pages ← Source: GitHub Actions.
5. **التتبع (اختياري):** `VITE_META_PIXEL_ID` و`VITE_GA_ID` كمتغيرات في Settings ← Secrets and variables ← Actions ← Variables.

## تعديل المعلومات

- **الأسعار والمنتجات:** من لوحة التحكم. تظهر في المتجر فوراً، وفي صفحات Google بعد البناء الليلي.
- **الهاتف وواتساب والعنوان وأرقام RC وNIF:** `src/config.ts`.
- **نصوص الواجهة:** `src/i18n/strings.ts`. الشروط والخصوصية في `src/i18n/legal.ts`.
