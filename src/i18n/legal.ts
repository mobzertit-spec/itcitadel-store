/**
 * Terms of sale and privacy notice. A starting text written for the store's real process (order → phone
 * confirmation → cash payment at the office → activation). Have it checked by your accountant or lawyer.
 */
import type { Lang } from '@shared/validate'

type Section = { title: string; paragraphs: string[] }

export const TERMS: Record<Lang, Section[]> = {
  ar: [
    { title: 'الأسعار', paragraphs: ['الأسعار معروضة بالدينار الجزائري وتشمل جميع الرسوم. السعر المعتمد هو السعر المعروض يوم الطلب، ونؤكده لك بالهاتف قبل أي دفع.'] },
    {
      title: 'الطلب والتأكيد',
      paragraphs: ['يصبح الطلب نهائياً بعد أن نتصل بك ونؤكده معك. يمكنك إلغاء طلبك مجاناً قبل الدفع، بمجرد إخبارنا بالهاتف أو واتساب.'],
    },
    {
      title: 'الدفع',
      paragraphs: ['يتم الدفع نقداً في مكتبنا بأولاد سمار، بعد مكالمة التأكيد، من الأحد إلى الخميس من 8:00 إلى 17:00. لا يتم أي دفع عبر الموقع، ونسلّمك وصلاً بالمبلغ المدفوع.'],
    },
    {
      title: 'التفعيل',
      paragraphs: [
        'نفعّل الاشتراك على الحساب المرتبط بالبريد الذي تعطينا إياه، خلال 24 ساعة بعد الدفع. أنت مسؤول عن صحة البريد والمعلومات التي تقدمها.',
      ],
    },
    {
      title: 'الضمان والاسترجاع',
      paragraphs: [
        'إذا تعذّر علينا تفعيل الاشتراك، نعيد لك المبلغ كاملاً. بعد التفعيل، الخدمة الرقمية مستهلكة ولا يمكن إرجاعها، لكننا نتابع اشتراكك طوال مدته: إذا كان الخلل من جهتنا نصلحه أو نعيد لك الجزء المتبقي.',
      ],
    },
    {
      title: 'العلامات التجارية',
      paragraphs: ['أسماء المنتجات وشعاراتها (ChatGPT وAdobe وFreepik وGoogle Workspace وZoom وKaspersky وغيرها) علامات تجارية لأصحابها. ITCITADEL موزّع مستقل، وتخضع كل خدمة أيضاً لشروط استخدام ناشرها.'],
    },
  ],
  fr: [
    { title: 'Prix', paragraphs: ['Les prix sont affichés en dinars algériens, toutes taxes comprises. Le prix appliqué est celui affiché le jour de la commande ; nous vous le confirmons par téléphone avant tout paiement.'] },
    {
      title: 'Commande et confirmation',
      paragraphs: ['La commande devient définitive après notre appel de confirmation. Vous pouvez l’annuler gratuitement avant le paiement, par simple appel ou message WhatsApp.'],
    },
    {
      title: 'Paiement',
      paragraphs: [
        'Le paiement se fait en espèces à notre bureau d’Oued Smar, après l’appel de confirmation, du dimanche au jeudi de 8 h à 17 h. Aucun paiement n’a lieu sur le site ; nous vous remettons un reçu du montant payé.',
      ],
    },
    {
      title: 'Activation',
      paragraphs: [
        'Nous activons l’abonnement sur le compte lié à l’adresse e-mail que vous nous communiquez, sous 24 heures après le paiement. Vous êtes responsable de l’exactitude des informations fournies.',
      ],
    },
    {
      title: 'Garantie et remboursement',
      paragraphs: [
        'Si nous ne pouvons pas activer l’abonnement, nous vous remboursons intégralement. Une fois activé, le service numérique est consommé et ne peut être retourné ; nous suivons toutefois votre abonnement pendant toute sa durée : si un problème vient de nous, nous le corrigeons ou remboursons la période restante.',
      ],
    },
    {
      title: 'Marques',
      paragraphs: [
        'Les noms et logos des produits (ChatGPT, Adobe, Freepik, Google Workspace, Zoom, Kaspersky et autres) sont des marques de leurs propriétaires respectifs. ITCITADEL est un revendeur indépendant ; chaque service reste soumis aux conditions d’utilisation de son éditeur.',
      ],
    },
  ],
  en: [
    { title: 'Prices', paragraphs: ['Prices are shown in Algerian dinars and include all taxes. The price that applies is the one shown on the day you order; we confirm it by phone before any payment.'] },
    {
      title: 'Ordering and confirmation',
      paragraphs: ['An order becomes final once we have called you and confirmed it together. You can cancel free of charge before paying, with a call or a WhatsApp message.'],
    },
    {
      title: 'Payment',
      paragraphs: [
        'You pay cash at our office in Oued Smar, after the confirmation call, Sunday to Thursday from 8:00 to 17:00. No payment is taken on the website; we give you a receipt for the amount paid.',
      ],
    },
    {
      title: 'Activation',
      paragraphs: [
        'We activate the subscription on the account linked to the email address you give us, within 24 hours of payment. You are responsible for the accuracy of the details you provide.',
      ],
    },
    {
      title: 'Guarantee and refunds',
      paragraphs: [
        'If we cannot activate the subscription, we refund you in full. Once activated, a digital service is consumed and cannot be returned, but we look after your subscription for its whole term: if a problem is on our side, we fix it or refund the remaining period.',
      ],
    },
    {
      title: 'Trademarks',
      paragraphs: [
        'Product names and logos (ChatGPT, Adobe, Freepik, Google Workspace, Zoom, Kaspersky and others) are trademarks of their respective owners. ITCITADEL is an independent reseller, and each service is also governed by its publisher’s terms of use.',
      ],
    },
  ],
}

export const PRIVACY: Record<Lang, string[]> = {
  ar: [
    'نجمع فقط ما نحتاجه لمعالجة طلبك: الاسم، والهاتف، والبريد الإلكتروني.',
    'نستعمل هذه المعطيات لتأكيد طلبك وتفعيل اشتراكك وتذكيرك بموعد تجديده، ولا نبيعها ولا نشاركها مع أي جهة أخرى، إلا ما يلزم لتفعيل الخدمة لدى ناشرها.',
    'سلة المشتريات تُحفظ في متصفحك فقط، إلى أن ترسل طلبك.',
    'وفقاً للقانون 18-07 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة المعطيات ذات الطابع الشخصي، يمكنك طلب الاطلاع على معطياتك أو تصحيحها أو حذفها في أي وقت عبر البريد أو الهاتف.',
  ],
  fr: [
    'Nous collectons uniquement ce qui est nécessaire au traitement de votre commande : nom, téléphone et adresse e-mail.',
    'Ces données servent à confirmer votre commande, activer votre abonnement et vous rappeler son renouvellement. Elles ne sont ni vendues ni partagées, sauf ce qui est nécessaire à l’activation du service chez son éditeur.',
    'Le panier est enregistré uniquement dans votre navigateur, jusqu’à l’envoi de votre commande.',
    'Conformément à la loi 18-07 relative à la protection des personnes physiques dans le traitement des données à caractère personnel, vous pouvez demander à tout moment l’accès, la rectification ou la suppression de vos données, par e-mail ou par téléphone.',
  ],
  en: [
    'We collect only what we need to process your order: your name, phone number and email address.',
    'We use this data to confirm your order, activate your subscription and remind you when it is due for renewal. We never sell or share it, except where needed to activate the service with its publisher.',
    'Your cart is stored in your browser only, until you send your order.',
    'Under Algerian law 18-07 on the protection of personal data, you can ask at any time to see, correct or delete your data, by email or by phone.',
  ],
}
