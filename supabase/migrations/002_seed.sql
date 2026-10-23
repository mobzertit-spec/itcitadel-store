-- ITCITADEL store — launch catalog. Prices are the proposed launch prices (DZD, all taxes included);
-- the owner adjusts them from the admin dashboard.

insert into public.categories (id, name_ar, name_fr, name_en, sort) values
  ('ai', 'الذكاء الاصطناعي', 'Intelligence artificielle', 'AI', 1),
  ('design', 'التصميم والإبداع', 'Design et création', 'Design', 2),
  ('collab', 'العمل الجماعي', 'Travail collaboratif', 'Collaboration', 3),
  ('security', 'الحماية', 'Sécurité', 'Security', 4);

with p as (
  insert into public.products (
    slug, category_id, name, featured, per_user, quote_only, sort,
    tagline_ar, tagline_fr, tagline_en,
    description_ar, description_fr, description_en,
    features_ar, features_fr, features_en,
    requirements_ar, requirements_fr, requirements_en
  ) values
  (
    'chatgpt-plus', 'ai', 'ChatGPT Plus', true, false, false, 1,
    'المساعد الذكي الأشهر للعمل والدراسة، مفعّل على حسابك أنت.',
    'L''assistant IA le plus utilisé au travail et dans les études, activé sur votre propre compte.',
    'The most popular AI assistant for work and study, activated on your own account.',
    'نفعّل اشتراك ChatGPT Plus الرسمي على حسابك الشخصي في OpenAI، وتدفع بالدينار. لا حسابات مشتركة ولا كلمات مرور مشتركة: حسابك يبقى ملكك، ومحادثاتك تبقى خاصة بك.',
    'Nous activons l''abonnement officiel ChatGPT Plus sur votre propre compte OpenAI, et vous payez en dinars. Aucun compte partagé, aucun mot de passe partagé : votre compte reste à vous et vos conversations restent privées.',
    'We activate the official ChatGPT Plus subscription on your own OpenAI account, and you pay in dinars. No shared accounts and no shared passwords: your account stays yours and your chats stay private.',
    array['أحدث نماذج OpenAI', 'حدود استخدام أعلى بكثير من النسخة المجانية', 'إنشاء الصور وتحليل الملفات', 'تفعيل خلال 24 ساعة بعد الدفع'],
    array['Les derniers modèles d''OpenAI', 'Des limites d''utilisation bien plus élevées que la version gratuite', 'Création d''images et analyse de fichiers', 'Activation sous 24 h après paiement'],
    array['The latest OpenAI models', 'Much higher usage limits than the free plan', 'Image generation and file analysis', 'Activated within 24 hours of payment'],
    'البريد الإلكتروني لحسابك في ChatGPT. لا نطلب كلمة المرور أبداً.',
    'L''adresse e-mail de votre compte ChatGPT. Nous ne demandons jamais votre mot de passe.',
    'The email address of your ChatGPT account. We never ask for your password.'
  ),
  (
    'freepik-premium', 'design', 'Freepik Premium', true, false, false, 2,
    'ملايين الصور والفيكتور والقوالب لمشاريعك، برخصة استعمال تجاري.',
    'Des millions de photos, vecteurs et modèles pour vos projets, avec licence commerciale.',
    'Millions of photos, vectors and templates for your projects, with a commercial licence.',
    'اشتراك Freepik Premium رسمي على حسابك أنت، وليس حساباً مشتركاً بين عشرات الأشخاص. تحمّل المحتوى المميز بدون ذكر المصدر، وتستعمل أدوات Freepik للذكاء الاصطناعي حسب ما تتيحه الخطة.',
    'Un abonnement Freepik Premium officiel sur votre propre compte, pas un compte partagé entre des dizaines de personnes. Téléchargez le contenu premium sans attribution et utilisez les outils IA de Freepik selon votre formule.',
    'An official Freepik Premium subscription on your own account, not an account shared by dozens of people. Download premium content without attribution and use the Freepik AI tools your plan includes.',
    array['المحتوى المميز بدون ذكر المصدر', 'رخصة استعمال تجاري لأعمال زبائنك', 'أدوات الذكاء الاصطناعي من Freepik', 'تفعيل خلال 24 ساعة بعد الدفع'],
    array['Contenu premium sans attribution', 'Licence commerciale pour les projets de vos clients', 'Outils IA de Freepik', 'Activation sous 24 h après paiement'],
    array['Premium content without attribution', 'Commercial licence for client work', 'Freepik AI tools', 'Activated within 24 hours of payment'],
    'البريد الإلكتروني لحسابك في Freepik، أو ننشئ لك حساباً جديداً باسمك.',
    'L''adresse e-mail de votre compte Freepik, ou nous créons un compte à votre nom.',
    'The email address of your Freepik account, or we create a new account in your name.'
  ),
  (
    'adobe-creative-cloud', 'design', 'Adobe Creative Cloud', true, false, true, 3,
    'Photoshop وIllustrator وPremiere Pro وباقي تطبيقات Adobe، بفاتورة جزائرية.',
    'Photoshop, Illustrator, Premiere Pro et toutes les applications Adobe, avec facture algérienne.',
    'Photoshop, Illustrator, Premiere Pro and the rest of Adobe''s apps, with an Algerian invoice.',
    'نوفّر اشتراكات Adobe Creative Cloud للأفراد والشركات، مفعّلة على حسابك. تتغير الأسعار حسب الخطة وعدد المستخدمين، لذلك نرسل لك عرض سعر دقيقاً خلال يوم عمل.',
    'Nous fournissons les abonnements Adobe Creative Cloud aux particuliers et aux entreprises, activés sur votre compte. Le prix dépend de la formule et du nombre d''utilisateurs : nous vous envoyons un devis précis sous un jour ouvré.',
    'We provide Adobe Creative Cloud subscriptions for individuals and companies, activated on your account. Prices depend on the plan and the number of users, so we send you an exact quote within one business day.',
    array['كل تطبيقات Adobe أو تطبيق واحد حسب حاجتك', 'مساحة تخزين سحابية', 'فاتورة للشركات', 'مساعدة في التثبيت'],
    array['Toutes les applications Adobe ou une seule, selon votre besoin', 'Stockage cloud', 'Facture pour les entreprises', 'Aide à l''installation'],
    array['Every Adobe app, or just the one you need', 'Cloud storage', 'Invoice for companies', 'Help with installation'],
    'البريد الإلكتروني لحسابك في Adobe، والتطبيقات التي تحتاجها.',
    'L''adresse e-mail de votre compte Adobe et les applications dont vous avez besoin.',
    'The email address of your Adobe account and the apps you need.'
  ),
  (
    'google-workspace', 'collab', 'Google Workspace', true, true, false, 4,
    'بريد مهني باسم شركتك، مع Drive وMeet ومستندات Google.',
    'Une messagerie professionnelle à votre nom de domaine, avec Drive, Meet et Google Docs.',
    'Professional email on your company''s domain, with Drive, Meet and Google Docs.',
    'نجهّز لشركتك Google Workspace كاملاً: ربط النطاق، وإنشاء حسابات الموظفين، ونقل البريد القديم إن وُجد. الإعداد مجاني مع كل اشتراك. السعر للمستخدم الواحد في الشهر.',
    'Nous installons Google Workspace pour votre entreprise : configuration du domaine, création des comptes de vos employés et migration de l''ancienne messagerie si besoin. La mise en place est offerte avec chaque abonnement. Prix par utilisateur et par mois.',
    'We set up Google Workspace for your company: domain configuration, accounts for your staff, and migration of your old mailbox if you have one. Setup is free with every subscription. Prices are per user per month.',
    array['بريد مهني @شركتك.dz', 'إعداد مجاني للنطاق والحسابات', 'Gmail وDrive وMeet وDocs', 'فاتورة للشركات'],
    array['E-mail professionnel @votreentreprise.dz', 'Configuration du domaine et des comptes offerte', 'Gmail, Drive, Meet et Docs', 'Facture pour les entreprises'],
    array['Professional email @yourcompany.dz', 'Free domain and account setup', 'Gmail, Drive, Meet and Docs', 'Invoice for companies'],
    'اسم نطاق شركتك (أو نساعدك في حجزه)، وعدد المستخدمين.',
    'Le nom de domaine de votre entreprise (ou nous vous aidons à le réserver) et le nombre d''utilisateurs.',
    'Your company''s domain name (or we help you register one) and the number of users.'
  ),
  (
    'zoom-workplace-pro', 'collab', 'Zoom Workplace Pro', false, true, false, 5,
    'اجتماعات طويلة بدون انقطاع الأربعين دقيقة، مع تسجيل سحابي.',
    'Des réunions sans la coupure des 40 minutes, avec enregistrement dans le cloud.',
    'Meetings without the 40-minute cut-off, with cloud recording.',
    'اشتراك Zoom Workplace Pro رسمي على حسابك، مثالي للدروس عن بعد والاجتماعات مع الزبائن. السعر للمستخدم الواحد.',
    'Un abonnement Zoom Workplace Pro officiel sur votre compte, idéal pour les cours en ligne et les réunions avec vos clients. Prix par utilisateur.',
    'An official Zoom Workplace Pro subscription on your account, ideal for online classes and client meetings. Prices are per user.',
    array['اجتماعات تصل إلى 30 ساعة', 'حتى 100 مشارك', 'تسجيل سحابي', 'تفعيل خلال 24 ساعة بعد الدفع'],
    array['Réunions jusqu''à 30 heures', 'Jusqu''à 100 participants', 'Enregistrement dans le cloud', 'Activation sous 24 h après paiement'],
    array['Meetings up to 30 hours', 'Up to 100 participants', 'Cloud recording', 'Activated within 24 hours of payment'],
    'البريد الإلكتروني لحسابك في Zoom.',
    'L''adresse e-mail de votre compte Zoom.',
    'The email address of your Zoom account.'
  ),
  (
    'kaspersky', 'security', 'Kaspersky', true, false, false, 6,
    'حماية أصلية لحواسيبك وهواتفك من الفيروسات وبرامج الفدية.',
    'Une protection officielle de vos PC et smartphones contre les virus et les rançongiciels.',
    'Genuine protection for your computers and phones against viruses and ransomware.',
    'رخص Kaspersky أصلية لمدة سنة. نرسل لك مفتاح التفعيل ونساعدك في التثبيت على أجهزتك.',
    'Des licences Kaspersky officielles valables un an. Nous vous envoyons la clé d''activation et vous aidons à l''installer sur vos appareils.',
    'Genuine one-year Kaspersky licences. We send you the activation key and help you install it on your devices.',
    array['رخصة أصلية لمدة سنة', 'Windows وmacOS وAndroid وiOS', 'مساعدة في التثبيت', 'فاتورة للشركات'],
    array['Licence officielle d''un an', 'Windows, macOS, Android et iOS', 'Aide à l''installation', 'Facture pour les entreprises'],
    array['Genuine one-year licence', 'Windows, macOS, Android and iOS', 'Help with installation', 'Invoice for companies'],
    'عدد الأجهزة التي تريد حمايتها.',
    'Le nombre d''appareils à protéger.',
    'How many devices you want to protect.'
  )
  returning id, slug
)
insert into public.product_variants (product_id, label_ar, label_fr, label_en, price_dzd, sort)
select p.id, v.label_ar, v.label_fr, v.label_en, v.price_dzd, v.sort
from p
join (values
  ('chatgpt-plus', 'شهر واحد', '1 mois', '1 month', 5500, 1),
  ('chatgpt-plus', '3 أشهر', '3 mois', '3 months', 15900, 2),
  ('freepik-premium', 'شهر واحد', '1 mois', '1 month', 5500, 1),
  ('freepik-premium', '12 شهراً', '12 mois', '12 months', 49000, 2),
  ('adobe-creative-cloud', 'كل التطبيقات · 12 شهراً', 'Toutes les applications · 12 mois', 'All apps · 12 months', 0, 1),
  ('adobe-creative-cloud', 'Photoshop · 12 شهراً', 'Photoshop · 12 mois', 'Photoshop · 12 months', 0, 2),
  ('adobe-creative-cloud', 'Illustrator · 12 شهراً', 'Illustrator · 12 mois', 'Illustrator · 12 months', 0, 3),
  ('google-workspace', 'Business Starter · شهر', 'Business Starter · 1 mois', 'Business Starter · 1 month', 1700, 1),
  ('google-workspace', 'Business Standard · شهر', 'Business Standard · 1 mois', 'Business Standard · 1 month', 3100, 2),
  ('google-workspace', 'Business Plus · شهر', 'Business Plus · 1 mois', 'Business Plus · 1 month', 4700, 3),
  ('zoom-workplace-pro', 'شهر واحد', '1 mois', '1 month', 4500, 1),
  ('zoom-workplace-pro', '12 شهراً', '12 mois', '12 months', 44900, 2),
  ('kaspersky', 'Standard · جهاز واحد · سنة', 'Standard · 1 appareil · 1 an', 'Standard · 1 device · 1 year', 1990, 1),
  ('kaspersky', 'Plus · 5 أجهزة · سنة', 'Plus · 5 appareils · 1 an', 'Plus · 5 devices · 1 year', 6490, 2),
  ('kaspersky', 'Premium · 5 أجهزة · سنة', 'Premium · 5 appareils · 1 an', 'Premium · 5 devices · 1 year', 6990, 3)
) as v (slug, label_ar, label_fr, label_en, price_dzd, sort) on v.slug = p.slug;
