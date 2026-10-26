-- =============================================================================
-- vakil · 0012 — DV-2027 landing mazmuni (qadamlar, savol-javob)
-- Hammasi status = needs_review: rasmiy DV-2027 yo'riqnomasi chiqqach tekshiriladi.
-- =============================================================================

update public.trends
   set landing = $json$
{
  "status": "needs_review",
  "steps": [
    {
      "title": {"uz_latn": "Fotoni tekshiring", "uz_cyrl": "Фотони текширинг", "ru": "Проверьте фото"},
      "body": {
        "uz_latn": "Quyidagi bepul tekshiruv fotoingizni DV talablariga solishtiradi. Rasm qurilmangizdan chiqmaydi.",
        "uz_cyrl": "Қуйидаги бепул текширув фотоингизни DV талабларига солиштиради. Расм қурилмангиздан чиқмайди.",
        "ru": "Бесплатная проверка ниже сравнит ваше фото с требованиями DV. Фото не покидает ваше устройство."
      }
    },
    {
      "title": {"uz_latn": "Rasmiy saytga kiring", "uz_cyrl": "Расмий сайтга киринг", "ru": "Откройте официальный сайт"},
      "body": {
        "uz_latn": "Ariza faqat dvprogram.state.gov saytida, ro'yxat ochiq bo'lgan muddatda topshiriladi.",
        "uz_cyrl": "Ариза фақат dvprogram.state.gov сайтида, рўйхат очиқ бўлган муддатда топширилади.",
        "ru": "Заявка подаётся только на сайте dvprogram.state.gov в период открытой регистрации."
      }
    },
    {
      "title": {"uz_latn": "Anketani to'ldiring", "uz_cyrl": "Анкетани тўлдиринг", "ru": "Заполните анкету"},
      "body": {
        "uz_latn": "Barcha oila a'zolaringizni ko'rsating. Bir kishi faqat bitta ariza topshiradi.",
        "uz_cyrl": "Барча оила аъзоларингизни кўрсатинг. Бир киши фақат битта ариза топширади.",
        "ru": "Укажите всех членов семьи. Один человек подаёт только одну заявку."
      }
    },
    {
      "title": {"uz_latn": "Tasdiqlash raqamini saqlang", "uz_cyrl": "Тасдиқлаш рақамини сақланг", "ru": "Сохраните номер подтверждения"},
      "body": {
        "uz_latn": "Topshirgandan keyin berilgan Confirmation Number'ni saqlab qo'ying — natijani tekshirish uchun kerak bo'ladi.",
        "uz_cyrl": "Топширгандан кейин берилган Confirmation Number'ни сақлаб қўйинг — натижани текшириш учун керак бўлади.",
        "ru": "Сохраните номер подтверждения (Confirmation Number), выданный после подачи — он нужен для проверки результата."
      }
    },
    {
      "title": {"uz_latn": "Natijani o'zingiz tekshiring", "uz_cyrl": "Натижани ўзингиз текширинг", "ru": "Проверьте результат сами"},
      "body": {
        "uz_latn": "Natija sanasida Entrant Status Check'da o'zingiz tekshiring.",
        "uz_cyrl": "Натижа санасида Entrant Status Check'да ўзингиз текширинг.",
        "ru": "В дату объявления результатов проверьте их сами в Entrant Status Check."
      }
    }
  ],
  "faq": [
    {
      "q": {"uz_latn": "G'oliblikni kafolatlaysizmi?", "uz_cyrl": "Ғолибликни кафолатлайсизми?", "ru": "Вы гарантируете выигрыш?"},
      "a": {
        "uz_latn": "Yo'q. G'oliblar tasodifiy tanlanadi — hech kim g'alabani kafolatlay olmaydi.",
        "uz_cyrl": "Йўқ. Ғолиблар тасодифий танланади — ҳеч ким ғалабани кафолатлай олмайди.",
        "ru": "Нет. Победители выбираются случайно — выигрыш не может гарантировать никто."
      }
    },
    {
      "q": {"uz_latn": "Arizani o'zim topshira olamanmi?", "uz_cyrl": "Аризани ўзим топшира оламанми?", "ru": "Могу ли я подать заявку сам?"},
      "a": {
        "uz_latn": "Ha. Rasmiy ariza faqat dvprogram.state.gov saytida topshiriladi.",
        "uz_cyrl": "Ҳа. Расмий ариза фақат dvprogram.state.gov сайтида топширилади.",
        "ru": "Да. Официальная заявка подаётся только на сайте dvprogram.state.gov."
      }
    },
    {
      "q": {"uz_latn": "Fotoim serverga yuboriladimi?", "uz_cyrl": "Фотоим серверга юбориладими?", "ru": "Отправляется ли моё фото на сервер?"},
      "a": {
        "uz_latn": "Yo'q. Tekshiruv brauzeringizning o'zida bajariladi — rasm hech qayerga yuborilmaydi va saqlanmaydi.",
        "uz_cyrl": "Йўқ. Текширув браузерингизнинг ўзида бажарилади — расм ҳеч қаерга юборилмайди ва сақланмайди.",
        "ru": "Нет. Проверка выполняется прямо в вашем браузере — фото никуда не отправляется и не сохраняется."
      }
    }
  ]
}
$json$::jsonb
 where slug = 'dv-2027';
