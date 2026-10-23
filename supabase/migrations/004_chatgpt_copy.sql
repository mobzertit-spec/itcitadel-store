-- Do not promise how activation works: the owner explains it on the confirmation call.
update public.products set
  description_ar = 'نفعّل اشتراك ChatGPT Plus الرسمي على حسابك الشخصي في OpenAI، وتدفع بالدينار. لا حسابات مشتركة مع أشخاص آخرين: حسابك يبقى ملكك، ومحادثاتك تبقى خاصة بك.',
  description_fr = 'Nous activons l''abonnement officiel ChatGPT Plus sur votre propre compte OpenAI, et vous payez en dinars. Aucun compte partagé avec d''autres personnes : votre compte reste à vous et vos conversations restent privées.',
  description_en = 'We activate the official ChatGPT Plus subscription on your own OpenAI account, and you pay in dinars. No accounts shared with strangers: your account stays yours and your chats stay private.',
  requirements_ar = 'البريد الإلكتروني لحسابك في ChatGPT. نشرح لك طريقة التفعيل عندما نتصل بك.',
  requirements_fr = 'L''adresse e-mail de votre compte ChatGPT. Nous vous expliquons la procédure d''activation lors de notre appel.',
  requirements_en = 'The email address of your ChatGPT account. We explain how activation works when we call you.'
where slug = 'chatgpt-plus';
