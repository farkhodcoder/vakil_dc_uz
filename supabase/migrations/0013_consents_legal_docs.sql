-- =============================================================================
-- vakil · 0013 — huquqiy matnlar, rozilik funksiyalari, toifa tavsiflari
-- Rozilik faqat bazadagi matn versiyasiga beriladi; xesh va IP server tomonida yoziladi.
-- =============================================================================

-- ─────────────────────────── Huquqiy matnlar ───────────────────────────
create table public.legal_documents (
  id           uuid primary key default gen_random_uuid(),
  kind         public.consent_type not null,
  version      text not null,
  locale       public.app_locale not null,
  title        text not null,
  body         text not null,
  -- foydalanuvchi ko'rgan matnning xeshi (rozilikka yoziladi)
  content_hash text generated always as (encode(extensions.digest(body, 'sha256'), 'hex')) stored,
  status       text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (kind, version, locale),
  check (status <> 'active' or published_at is not null)
);

alter table public.legal_documents enable row level security;
grant all on public.legal_documents to service_role;
grant select on public.legal_documents to anon, authenticated;
grant insert, update, delete on public.legal_documents to authenticated;

create policy legal_documents_select on public.legal_documents for select to anon, authenticated
  using (status in ('draft', 'active') or (select private.is_admin()));
create policy legal_documents_insert on public.legal_documents for insert to authenticated
  with check ((select private.is_admin()));
create policy legal_documents_update on public.legal_documents for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy legal_documents_delete on public.legal_documents for delete to authenticated
  using ((select private.is_admin()));

create trigger audit_legal_documents after insert or update or delete on public.legal_documents
  for each row execute function private.audit_row_change();

-- LOYIHA matnlar: advokat tayyorlaydi va tasdiqlaydi. Faqat ishlab chiqish uchun.
insert into public.legal_documents (kind, version, locale, title, body) values
  ('offer', 'draft-1', 'uz_latn', 'Ommaviy oferta (loyiha)',
   E'LOYIHA — advokat tomonidan tayyorlanadi va tasdiqlanadi. [TEKSHIRILSIN]\n\nvakil platformasi hujjatlar bo''yicha ma''lumot berishda va hujjat tayyorlashda yordam beradi. Platforma advokat xizmati o''rnini bosmaydi. Pullik xizmatlar narxi buyurtmadan oldin ochiq ko''rsatiladi.'),
  ('offer', 'draft-1', 'uz_cyrl', 'Оммавий оферта (лойиҳа)',
   E'ЛОЙИҲА — адвокат томонидан тайёрланади ва тасдиқланади. [ТЕКШИРИЛСИН]\n\nvakil платформаси ҳужжатлар бўйича маълумот беришда ва ҳужжат тайёрлашда ёрдам беради. Платформа адвокат хизмати ўрнини босмайди. Пуллик хизматлар нархи буюртмадан олдин очиқ кўрсатилади.'),
  ('offer', 'draft-1', 'ru', 'Публичная оферта (проект)',
   E'ПРОЕКТ — готовится и утверждается адвокатом. [ТРЕБУЕТ ПРОВЕРКИ]\n\nПлатформа vakil помогает с информацией по документам и их подготовкой. Платформа не заменяет услуги адвоката. Цены платных услуг открыто показываются до заказа.'),
  ('personal_data', 'draft-1', 'uz_latn', 'Shaxsiy ma''lumotlarni qayta ishlashga rozilik (loyiha)',
   E'LOYIHA — advokat tomonidan tayyorlanadi va tasdiqlanadi. [TEKSHIRILSIN]\n\nMen vakil platformasiga telefon raqamim va o''zim kiritgan ma''lumotlarni xizmat ko''rsatish maqsadida qayta ishlashga rozilik beraman. Rozilikni istalgan vaqtda qaytarib olishim va ma''lumotlarim o''chirilishini so''rashim mumkin.'),
  ('personal_data', 'draft-1', 'uz_cyrl', 'Шахсий маълумотларни қайта ишлашга розилик (лойиҳа)',
   E'ЛОЙИҲА — адвокат томонидан тайёрланади ва тасдиқланади. [ТЕКШИРИЛСИН]\n\nМен vakil платформасига телефон рақамим ва ўзим киритган маълумотларни хизмат кўрсатиш мақсадида қайта ишлашга розилик бераман. Розиликни исталган вақтда қайтариб олишим ва маълумотларим ўчирилишини сўрашим мумкин.'),
  ('personal_data', 'draft-1', 'ru', 'Согласие на обработку персональных данных (проект)',
   E'ПРОЕКТ — готовится и утверждается адвокатом. [ТРЕБУЕТ ПРОВЕРКИ]\n\nЯ даю согласие платформе vakil на обработку моего номера телефона и введённых мной данных для оказания услуг. Я могу в любой момент отозвать согласие и потребовать удаления моих данных.');

-- ─────────────────────────── Rozilik funksiyalari ───────────────────────────

/** Majburiy roziliklar (oferta, shaxsiy ma'lumot) va joriy foydalanuvchi ularni berganmi */
create function public.consent_requirements(p_locale public.app_locale default 'uz_latn')
returns table (type public.consent_type, version text, title text, status text, granted boolean)
language sql stable security invoker
set search_path = ''
as $$
  with latest as (
    select distinct on (d.kind) d.kind, d.version, d.title, d.status
      from public.legal_documents d
     where d.kind in ('offer', 'personal_data')
       and d.locale = p_locale
       and d.status in ('draft', 'active')
     order by d.kind, (d.status = 'active') desc, d.published_at desc nulls last, d.created_at desc
  )
  select l.kind, l.version, l.title, l.status,
         exists (
           select 1 from public.consents c
            where c.user_id = (select auth.uid())
              and c.type = l.kind
              and c.text_version = l.version
              and c.revoked_at is null
         )
    from latest l
   order by l.kind
$$;

/**
 * Rozilik berish. Matn versiyasi bazada bo'lishi shart; xesh bazadan olinadi,
 * IP va qurilma — so'rov sarlavhalaridan (mijoz soxtalashtira olmaydi). Takroriy chaqiruv — idempotent.
 */
create function public.grant_consent(
  p_type     public.consent_type,
  p_version  text,
  p_locale   public.app_locale default 'uz_latn',
  p_order_id uuid default null
)
returns public.consents
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_hash    text;
  v_headers json;
  v_ip      inet;
  v_row     public.consents;
begin
  if v_uid is null then
    raise exception 'Kirish talab qilinadi' using errcode = '42501';
  end if;

  select d.content_hash into v_hash
    from public.legal_documents d
   where d.kind = p_type and d.version = p_version and d.locale = p_locale
     and d.status in ('draft', 'active');
  if v_hash is null then
    raise exception 'Rozilik matni topilmadi yoki eskirgan' using errcode = '22023';
  end if;

  if p_order_id is not null and not exists (
       select 1 from public.orders o where o.id = p_order_id and o.user_id = v_uid
     ) then
    raise exception 'Buyurtma topilmadi' using errcode = '42501';
  end if;

  select * into v_row
    from public.consents c
   where c.user_id = v_uid and c.type = p_type and c.text_version = p_version
     and c.revoked_at is null and c.order_id is not distinct from p_order_id
   limit 1;
  if found then
    return v_row;
  end if;

  v_headers := nullif(current_setting('request.headers', true), '')::json;
  begin
    v_ip := nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), '')::inet;
  exception when others then
    v_ip := null;
  end;

  insert into public.consents
    (user_id, order_id, type, text_version, text_hash, method, signature_data, ip, user_agent)
  values (
    v_uid, p_order_id, p_type, p_version, v_hash, 'checkbox',
    jsonb_build_object('locale', p_locale, 'aal', (select auth.jwt() ->> 'aal')),
    v_ip,
    left(v_headers ->> 'user-agent', 500)
  )
  returning * into v_row;
  return v_row;
end;
$$;

/** Rozilikni qaytarib olish (faqat o'ziniki) */
create function public.revoke_consent(p_consent_id uuid)
returns public.consents
language plpgsql security definer
set search_path = ''
as $$
declare
  v_row public.consents;
begin
  update public.consents
     set revoked_at = now()
   where id = p_consent_id
     and user_id = (select auth.uid())
     and revoked_at is null
  returning * into v_row;
  if not found then
    raise exception 'Rozilik topilmadi' using errcode = 'P0002';
  end if;
  return v_row;
end;
$$;

revoke execute on function public.consent_requirements(public.app_locale) from public;
revoke execute on function public.grant_consent(public.consent_type, text, public.app_locale, uuid) from public, anon;
revoke execute on function public.revoke_consent(uuid) from public, anon;
grant execute on function public.consent_requirements(public.app_locale) to anon, authenticated, service_role;
grant execute on function public.grant_consent(public.consent_type, text, public.app_locale, uuid) to authenticated, service_role;
grant execute on function public.revoke_consent(uuid) to authenticated, service_role;

-- ─────────────────────────── Toifa tavsiflari ───────────────────────────
-- Brifdagi MVP xizmatlar ro'yxati — bosh sahifada platformaning to'liq ko'lamini ko'rsatish uchun
update public.categories set icon = 'scale', description =
  '{"uz_latn": "Aliment, nikohni bekor qilish, qarzni undirish va mehnat nizolari bo''yicha da''vo arizalari; davlat boji hisoblagichi.",
    "uz_cyrl": "Алимент, никоҳни бекор қилиш, қарзни ундириш ва меҳнат низолари бўйича даъво аризалари; давлат божи ҳисоблагичи.",
    "ru": "Иски об алиментах, расторжении брака, взыскании долга и трудовых спорах; калькулятор госпошлины."}'
 where slug = 'sud-va-huquq';
update public.categories set icon = 'car', description =
  '{"uz_latn": "Haydovchilik guvohnomasini olish, almashtirish va tiklash; avtomobilni ro''yxatdan o''tkazish.",
    "uz_cyrl": "Ҳайдовчилик гувоҳномасини олиш, алмаштириш ва тиклаш; автомобилни рўйхатдан ўтказиш.",
    "ru": "Получение, замена и восстановление водительского удостоверения; регистрация автомобиля."}'
 where slug = 'transport';
update public.categories set icon = 'id-card', description =
  '{"uz_latn": "Pasport, ID-karta, propiska, tug''ilganlik va nikoh guvohnomalari.",
    "uz_cyrl": "Паспорт, ID-карта, прописка, туғилганлик ва никоҳ гувоҳномалари.",
    "ru": "Паспорт, ID-карта, прописка, свидетельства о рождении и браке."}'
 where slug = 'shaxsiy-hujjatlar';
update public.categories set icon = 'megaphone', description =
  '{"uz_latn": "Davlat organlariga ariza va shikoyatlar.",
    "uz_cyrl": "Давлат органларига ариза ва шикоятлар.",
    "ru": "Заявления и жалобы в государственные органы."}'
 where slug = 'murojaatlar';
update public.categories set icon = 'contract', description =
  '{"uz_latn": "Ijara, oldi-sotdi, qarz tilxati va ishonchnoma loyihalari.",
    "uz_cyrl": "Ижара, олди-сотди, қарз тилхати ва ишончнома лойиҳалари.",
    "ru": "Проекты договоров аренды, купли-продажи, долговых расписок и доверенностей."}'
 where slug = 'shartnomalar';
update public.categories set icon = 'globe', description =
  '{"uz_latn": "Xorijiy vizalar (Koreya, Yevropa va boshqalar), tarjima va apostil yo''riqnomasi, Green Card (DV).",
    "uz_cyrl": "Хорижий визалар (Корея, Европа ва бошқалар), таржима ва апостиль йўриқномаси, Green Card (DV).",
    "ru": "Зарубежные визы (Корея, Европа и др.), перевод и апостиль, Green Card (DV)."}'
 where slug = 'xorij-va-migratsiya';
