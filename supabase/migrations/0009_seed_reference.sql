-- =============================================================================
-- vakil · 0009 — boshlang'ich ma'lumotlar
-- QOIDA: hech bir qonun, narx, muddat o'ylab topilmaydi. Tasdiqlanmagan har bir
-- qiymat status = 'needs_review' yoki note'da [TEKSHIRILSIN] bilan turadi.
-- DV xizmati QORALAMA (draft), trend NOFAOL — rasmiy e'londan keyin yoqiladi.
-- =============================================================================

-- ─────────────────────────────── Toifalar ───────────────────────────────
insert into public.categories (slug, name, sort_order) values
  ('sud-va-huquq',
   '{"uz_latn": "Sud va huquq", "uz_cyrl": "Суд ва ҳуқуқ", "ru": "Суд и право"}', 10),
  ('transport',
   '{"uz_latn": "Transport", "uz_cyrl": "Транспорт", "ru": "Транспорт"}', 20),
  ('shaxsiy-hujjatlar',
   '{"uz_latn": "Shaxsiy hujjatlar", "uz_cyrl": "Шахсий ҳужжатлар", "ru": "Личные документы"}', 30),
  ('murojaatlar',
   '{"uz_latn": "Murojaatlar", "uz_cyrl": "Мурожаатлар", "ru": "Обращения"}', 40),
  ('shartnomalar',
   '{"uz_latn": "Shartnomalar", "uz_cyrl": "Шартномалар", "ru": "Договоры"}', 50),
  ('xorij-va-migratsiya',
   '{"uz_latn": "Xorij va migratsiya", "uz_cyrl": "Хориж ва миграция", "ru": "Зарубежье и миграция"}', 60);

-- ─────────────────────────────── Tariflar ───────────────────────────────
-- Narxlar va kunlik limit — siz belgilaysiz. Premium narxsiz turgani uchun nofaol.
insert into public.plans (code, name, price_tiyin, period_days, limits, is_active) values
  ('free',
   '{"uz_latn": "Bepul", "uz_cyrl": "Бепул", "ru": "Бесплатный"}',
   0, null,
   '{"chat_per_day": null, "simple_docs_per_month": 1, "note": "chat_per_day — [siz belgilaysiz]"}',
   true),
  ('premium',
   '{"uz_latn": "Premium", "uz_cyrl": "Премиум", "ru": "Премиум"}',
   null, 30,
   '{"chat_unlimited": true, "all_templates": true, "ai_checks": true, "deadline_reminders": true, "documents_archive": true, "priority_support": true}',
   false);

-- ─────────────────────────── DV manbalari ───────────────────────────
-- travel.state.gov avtomatik tekshiruvga 403 qaytaradi — chuqur havolalar qo'lda tekshirilsin.
insert into public.legal_sources (title, url, publisher, status, note) values
  ('{"uz_latn": "AQSh Davlat departamenti — DV dasturining rasmiy ariza sayti",
     "uz_cyrl": "АҚШ Давлат департаменти — DV дастурининг расмий ариза сайти",
     "ru": "Государственный департамент США — официальный сайт подачи заявок DV"}',
   'https://dvprogram.state.gov', 'dvprogram.state.gov', 'needs_review',
   'DV-2027 yo''riqnomasi e''lon qilingach tekshirilsin [TEKSHIRILSIN]'),
  ('{"uz_latn": "AQSh Davlat departamenti — DV dasturi va foto talablari (travel.state.gov)",
     "uz_cyrl": "АҚШ Давлат департаменти — DV дастури ва фото талаблари (travel.state.gov)",
     "ru": "Государственный департамент США — программа DV и требования к фото (travel.state.gov)"}',
   'https://travel.state.gov', 'travel.state.gov', 'needs_review',
   'Aniq sahifa havolalari (DV-2027 yo''riqnomasi, foto talablari) qo''lda qo''yilsin [TEKSHIRILSIN]'),
  ('{"uz_latn": "AQSh elchixonasi, Toshkent",
     "uz_cyrl": "АҚШ элчихонаси, Тошкент",
     "ru": "Посольство США в Ташкенте"}',
   'https://uz.usembassy.gov', 'uz.usembassy.gov', 'needs_review', null),
  ('{"uz_latn": "Fragomen: sud DV-2027 ro''yxatini ochishni buyurdi (Red Eagle Law v. Rubio)",
     "uz_cyrl": "Fragomen: суд DV-2027 рўйхатини очишни буюрди (Red Eagle Law v. Rubio)",
     "ru": "Fragomen: суд обязал открыть регистрацию DV-2027 (Red Eagle Law v. Rubio)"}',
   'https://www.fragomen.com/insights/united-states-court-orders-state-department-to-open-fy-2027-diversity-visa-lottery-registration.html',
   'fragomen.com', 'needs_review',
   'Rasmiy manba EMAS. Sud qarori: e''lon 2026-10-29 gacha, ro''yxat 2026-11-01 gacha 30 kunga, g''oliblar 2026-12-03 gacha. Apellyatsiya mumkin [TEKSHIRILSIN]');

-- ─────────────────────────── DV xizmati (qoralama) ───────────────────────────
do $$
declare
  v_category uuid;
  v_service  uuid;
  v_version  uuid;
  v_src_dv   uuid;
  v_src_tsg  uuid;
  v_src_news uuid;
  v_config   jsonb;
begin
  select id into v_category from public.categories where slug = 'xorij-va-migratsiya';
  select id into v_src_dv   from public.legal_sources where url = 'https://dvprogram.state.gov';
  select id into v_src_tsg  from public.legal_sources where url = 'https://travel.state.gov';
  select id into v_src_news from public.legal_sources where publisher = 'fragomen.com';

  v_config := '{
    "title": {
      "uz_latn": "AQSh DV lotereyasi (Green Card)",
      "uz_cyrl": "АҚШ DV лотереяси (Green Card)",
      "ru": "Лотерея DV (Green Card) США"
    },
    "description": {
      "uz_latn": "Foto va pasportni talablarga solishtiramiz, anketa uchun ma''lumotni tayyorlaymiz va natija sanasini eslatamiz. Arizani o''zingiz rasmiy saytda topshirasiz.",
      "uz_cyrl": "Фото ва паспортни талабларга солиштирамиз, анкета учун маълумотни тайёрлаймиз ва натижа санасини эслатамиз. Аризани ўзингиз расмий сайтда топширасиз.",
      "ru": "Проверим фото и паспорт на соответствие требованиям, подготовим данные для анкеты и напомним о дате результатов. Заявку вы подаёте сами на официальном сайте."
    },
    "disclaimer": {
      "uz_latn": "Biz AQSh hukumati bilan bog''liq emasmiz. Rasmiy ariza faqat dvprogram.state.gov saytida, davlat to''lovi $1. O''zingiz bepul topshirishingiz mumkin.",
      "uz_cyrl": "Биз АҚШ ҳукумати билан боғлиқ эмасмиз. Расмий ариза фақат dvprogram.state.gov сайтида, давлат тўлови $1. Ўзингиз бепул топширишингиз мумкин.",
      "ru": "Мы не связаны с правительством США. Официальная заявка подаётся только на сайте dvprogram.state.gov, государственный сбор — $1. Вы можете подать заявку самостоятельно и бесплатно.",
      "note": "$1 to''lov rasmiy DV-2027 yo''riqnomasida tasdiqlanishi kerak [TEKSHIRILSIN]"
    },
    "program": {
      "code": "DV-2027",
      "registration_opens_at": null,
      "registration_closes_at": null,
      "results_at": null,
      "status": "needs_review",
      "note": "Sanalar rasmiy e''londan keyin kiritiladi [TEKSHIRILSIN]"
    },
    "eligibility": {
      "one_entry_per_person": true,
      "list_all_family_members": true,
      "education_or_work_experience_required": true,
      "valid_passport_required": true,
      "status": "needs_review"
    },
    "fees": {
      "official_fee_usd": null,
      "note": "Rasmiy to''lov miqdori yo''riqnomadan olinadi [TEKSHIRILSIN]"
    },
    "submission": {
      "methods": ["self"],
      "portal_url": "https://dvprogram.state.gov",
      "note": "A varianti: pullik \"biz topshiramiz\" xizmati yo''q"
    },
    "result_reminder": {
      "text": {
        "uz_latn": "Entrant Status Check''da o''zingiz tekshiring",
        "uz_cyrl": "Entrant Status Check''да ўзингиз текширинг",
        "ru": "Проверьте результат самостоятельно в Entrant Status Check"
      }
    },
    "prohibited": ["guarantee_of_winning", "us_flag_or_seal", "photo_content_editing"],
    "pipeline": ["collected", "ai_checked", "client_approved", "package_ready", "submitted", "awaiting_response", "completed"]
  }'::jsonb;

  insert into public.services (slug, category_id, status, badges, sort_order)
  values ('dv-lotereya', v_category, 'draft', '{trend}', 10)
  returning id into v_service;

  insert into public.service_versions (service_id, version, config, config_hash, change_note)
  values (v_service, 1, v_config,
          encode(extensions.digest(v_config::text, 'sha256'), 'hex'),
          'Boshlang''ich qoralama — barcha qoidalar tekshirilishi kerak')
  returning id into v_version;

  update public.services set current_version_id = v_version where id = v_service;

  insert into public.service_version_sources (service_version_id, legal_source_id, role) values
    (v_version, v_src_dv, 'asosiy'),
    (v_version, v_src_tsg, 'talablar'),
    (v_version, v_src_news, 'muddat');

  insert into public.service_requirements
    (service_version_id, code, title, description, document_type, is_required,
     accepted_mime, max_size_bytes, rules, source_id, sort_order)
  values
    (v_version, 'dv_photo',
     '{"uz_latn": "Foto (DV talablari)", "uz_cyrl": "Фото (DV талаблари)", "ru": "Фото (требования DV)"}',
     '{"uz_latn": "Oq fon, ko''zoynaksiz, oxirgi 6 oyda olingan rangli foto.",
       "uz_cyrl": "Оқ фон, кўзойнаксиз, охирги 6 ойда олинган рангли фото.",
       "ru": "Цветное фото на белом фоне, без очков, сделанное за последние 6 месяцев."}',
     'photo', true,
     '{image/jpeg}', 240000,
     '[
       {"engine": "rule",  "code": "photo.format_jpeg"},
       {"engine": "rule",  "code": "photo.dimensions", "params": {"width": 600, "height": 600}},
       {"engine": "rule",  "code": "photo.max_size", "params": {"max_bytes": 240000, "note": "240 kB talqini (1000 yoki 1024) [TEKSHIRILSIN]; qat''iyroq qiymat olindi"}},
       {"engine": "rule",  "code": "photo.head_height_pct", "params": {"min": 50, "max": 69}},
       {"engine": "rule",  "code": "photo.eye_line_pct_from_bottom", "params": {"min": 56, "max": 69}},
       {"engine": "rule",  "code": "photo.background_white"},
       {"engine": "ai",    "code": "photo.no_glasses"},
       {"engine": "ai",    "code": "photo.quality"},
       {"engine": "human", "code": "photo.taken_within_6_months", "params": {"self_attest": true}}
     ]',
     v_src_tsg, 10),
    (v_version, 'passport_scan',
     '{"uz_latn": "Pasport skani (ma''lumot va imzo sahifalari)", "uz_cyrl": "Паспорт скани (маълумот ва имзо саҳифалари)", "ru": "Скан паспорта (страницы с данными и подписью)"}',
     null,
     'passport', true,
     '{image/jpeg,image/png,application/pdf}', 10485760,
     '[
       {"engine": "rule", "code": "mrz.checksum"},
       {"engine": "rule", "code": "passport.not_expired"},
       {"engine": "ai",   "code": "passport.pages_present", "params": {"pages": ["data", "signature"]}}
     ]',
     v_src_dv, 20);

  insert into public.trends
    (service_id, slug, title, summary, disclaimer, priority, is_active, source_id, landing, seo)
  values (
    v_service, 'dv-2027',
    '{"uz_latn": "DV-2027: Green Card lotereyasi", "uz_cyrl": "DV-2027: Green Card лотереяси", "ru": "DV-2027: лотерея Green Card"}',
    '{"uz_latn": "Fotoingizni bepul tekshiring va arizani o''zingiz to''g''ri topshiring.",
      "uz_cyrl": "Фотоингизни бепул текширинг ва аризани ўзингиз тўғри топширинг.",
      "ru": "Бесплатно проверьте фото и правильно подайте заявку самостоятельно."}',
    v_config -> 'disclaimer',
    100, false, v_src_news,
    '{}',
    '{"title": {"uz_latn": "DV-2027 Green Card — foto tekshiruvi va yo''riqnoma | vakil"}}'
  );
end;
$$;
