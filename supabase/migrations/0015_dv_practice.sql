-- =============================================================================
-- vakil · 0015 — yo'nalish o'zgardi: faqat DV (Green Card) MASHQ sayti
--
-- Supabase'da endi faqat:
--   • auth.users           — Google orqali kirgan foydalanuvchi (Supabase Auth)
--   • payments             — Click to'lovlari (summa, holat, Click ID'lari)
--   • practice_sessions    — "1 to'lov = 1 mashq" hisobi
--   • payment_events       — Click so'rovlari jurnali (nizolar uchun, shaxsiy ma'lumotsiz)
-- Pasport, foto, anketa ma'lumotlari SERVERGA YUBORILMAYDI — brauzerda qoladi.
--
-- 0001–0014 dagi umumiy platforma obyektlari olib tashlanadi. Tekshirildi:
-- ularning barchasi bo'sh (faqat seed/sinov yozuvlari), foydalanuvchi yo'q.
-- =============================================================================

-- ───────────────────────── 1. Eski obyektlarni olib tashlash ─────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_phone_changed on auth.users;

drop policy if exists vakil_objects_select on storage.objects;
drop policy if exists vakil_objects_insert on storage.objects;
drop policy if exists vakil_objects_update on storage.objects;
drop policy if exists vakil_objects_delete on storage.objects;

do $$
declare
  r record;
begin
  for r in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
  loop
    execute format('drop table if exists public.%I cascade', r.relname);
  end loop;

  for r in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'S'
  loop
    execute format('drop sequence if exists public.%I cascade', r.relname);
  end loop;

  -- Kengaytmalarga tegishli funksiyalar tegilmaydi
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private')
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('drop function if exists %s cascade', r.sig);
  end loop;

  for r in
    select t.typname
      from pg_type t join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public' and t.typtype = 'e'
  loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
end
$$;

-- Bo'sh bucketlar. Storage to'g'ridan-to'g'ri o'chirishni taqiqlasa — qoldiriladi
-- (siyosatsiz private bucketga hech kim kira olmaydi).
do $$
begin
  delete from storage.buckets
   where id in ('documents', 'evidence', 'generated', 'public-assets', 'templates')
     and not exists (select 1 from storage.objects o where o.bucket_id = storage.buckets.id);
exception when others then
  raise notice 'bucketlar qoldirildi: %', sqlerrm;
end
$$;

drop extension if exists vector;

-- ───────────────────────── 2. Yordamchi funksiyalar ─────────────────────────
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function private.try_uuid(p text)
returns uuid
language plpgsql immutable
set search_path = ''
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

create function private.try_bigint(p text)
returns bigint
language plpgsql immutable
set search_path = ''
as $$
begin
  return p::bigint;
exception when others then
  return null;
end;
$$;

-- Bitta mashq narxi: 9 999 so'm (tiyinda). O'zgartirish — yangi migratsiya bilan.
create function private.practice_price_tiyin()
returns bigint
language sql immutable
set search_path = ''
as $$ select 999900::bigint $$;

-- ───────────────────────────── 3. Jadvallar ─────────────────────────────
create type public.payment_status as enum ('created', 'prepared', 'paid', 'cancelled');
create type public.practice_status as enum ('available', 'completed');

create sequence private.click_prepare_seq;
create sequence private.click_confirm_seq;

create table public.payments (
  id              uuid primary key default gen_random_uuid(),     -- = Click merchant_trans_id
  -- Hisob o'chirilsa ham to'lov yozuvi buxgalteriya uchun qoladi (egasiz)
  user_id         uuid references auth.users (id) on delete set null,
  provider        text not null default 'click' check (provider = 'click'),
  amount_tiyin    bigint not null check (amount_tiyin > 0),
  status          public.payment_status not null default 'created',
  click_trans_id  bigint unique,
  click_paydoc_id bigint,
  prepare_id      bigint unique,                                   -- = merchant_prepare_id
  confirm_id      bigint unique,                                   -- = merchant_confirm_id
  click_error     int,                                             -- Click yuborgan manfiy kod
  created_at      timestamptz not null default now(),
  prepared_at     timestamptz,
  paid_at         timestamptz,
  cancelled_at    timestamptz,
  updated_at      timestamptz not null default now(),
  constraint payments_prepared_has_ids
    check (status not in ('prepared', 'paid') or (prepare_id is not null and click_trans_id is not null)),
  constraint payments_paid_has_confirm
    check (status <> 'paid' or (paid_at is not null and confirm_id is not null)),
  constraint payments_cancelled_has_date
    check (status <> 'cancelled' or cancelled_at is not null)
);
create index payments_user_idx on public.payments (user_id, created_at desc);
create trigger payments_updated_at before update on public.payments
  for each row execute function private.set_updated_at();

-- 1 muvaffaqiyatli to'lov = 1 mashq. "available" → mashq "Successful" bo'lganda "completed".
-- Vaqt bilan tugamaydi.
create table public.practice_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  payment_id   uuid not null unique references public.payments (id) on delete restrict,
  status       public.practice_status not null default 'available',
  created_at   timestamptz not null default now(),
  completed_at timestamptz,
  constraint practice_completed_has_date check (status <> 'completed' or completed_at is not null)
);
create index practice_sessions_user_idx on public.practice_sessions (user_id, status, created_at);

-- Click so'rovlari jurnali: faqat imzosi to'g'ri so'rovlar. Shaxsiy ma'lumot yo'q.
create table public.payment_events (
  id             bigint generated always as identity primary key,
  payment_id     uuid references public.payments (id) on delete set null,
  action         smallint not null check (action in (0, 1)),       -- 0 Prepare, 1 Complete
  click_trans_id bigint,
  click_error    bigint,
  response_error int not null,
  created_at     timestamptz not null default now()
);
create index payment_events_payment_idx on public.payment_events (payment_id);

create function private.payment_events_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'payment_events faqat qo''shiladi' using errcode = '42501';
end;
$$;
create trigger payment_events_no_update before update or delete on public.payment_events
  for each row execute function private.payment_events_immutable();
create trigger payment_events_no_truncate before truncate on public.payment_events
  for each statement execute function private.payment_events_immutable();

-- ─────────────────────────────── 4. RLS ───────────────────────────────
alter table public.payments enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.payment_events enable row level security;

create policy payments_select_own on public.payments
  for select to authenticated using (user_id = (select auth.uid()));
create policy practice_sessions_select_own on public.practice_sessions
  for select to authenticated using (user_id = (select auth.uid()));
-- payment_events: siyosat yo'q → faqat service_role / postgres

revoke all on public.payments, public.practice_sessions, public.payment_events from anon, authenticated;
grant select on public.payments, public.practice_sessions to authenticated;
grant all on public.payments, public.practice_sessions, public.payment_events to service_role;

-- ───────────────────────── 5. Foydalanuvchi funksiyalari ─────────────────────────
-- To'lov yaratish. Oxirgi 1 soatdagi ishlatilmagan ("created") to'lov qayta beriladi —
-- ikki marta bosish yoki sahifani yangilash ortiqcha yozuv yaratmaydi.
create function public.create_practice_payment()
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select p.id into v_id
    from public.payments p
   where p.user_id = v_uid
     and p.status = 'created'
     and p.created_at > now() - interval '1 hour'
   order by p.created_at desc
   limit 1;

  if v_id is null then
    insert into public.payments (user_id, amount_tiyin)
    values (v_uid, private.practice_price_tiyin())
    returning id into v_id;
  end if;

  return jsonb_build_object('id', v_id, 'amount_tiyin', private.practice_price_tiyin());
end;
$$;

-- Joriy holat: ochiq mashq (eng eskisi), nechta ochiq, nechta tugagan
create function public.my_practice()
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'session_id', (select s.id from public.practice_sessions s
                    where s.user_id = (select auth.uid()) and s.status = 'available'
                    order by s.created_at limit 1),
    'available',  (select count(*) from public.practice_sessions s
                    where s.user_id = (select auth.uid()) and s.status = 'available'),
    'completed',  (select count(*) from public.practice_sessions s
                    where s.user_id = (select auth.uid()) and s.status = 'completed'),
    'price_tiyin', private.practice_price_tiyin()
  )
$$;

-- Mashq "Successful" bo'ldi → kredit sarflanadi. Takroriy chaqiruv xavfsiz.
create function public.complete_practice(p_session_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  update public.practice_sessions
     set status = 'completed', completed_at = now()
   where id = p_session_id and user_id = v_uid and status = 'available'
  returning id into v_id;

  if v_id is not null then
    return jsonb_build_object('ok', true, 'already', false);
  end if;
  if exists (select 1 from public.practice_sessions
              where id = p_session_id and user_id = v_uid and status = 'completed') then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  raise exception 'session_not_available' using errcode = 'P0002';
end;
$$;

-- ───────────────────────── 6. Click SHOP API ─────────────────────────
-- Manba: https://docs.click.uz/shop-api/requests va /shop-api/errors (2026-10-26 o'qildi).
-- Kalitlar Supabase Vault'da (kodda emas):
--   select vault.create_secret('<SECRET_KEY>', 'click_secret_key');
--   select vault.create_secret('<SERVICE_ID>', 'click_service_id');
create function private.click_config(out secret text, out service_id text)
language sql stable security definer
set search_path = ''
as $$
  select (select decrypted_secret from vault.decrypted_secrets where name = 'click_secret_key'),
         (select decrypted_secret from vault.decrypted_secrets where name = 'click_service_id')
$$;

create function private.click_resp(p_error int, p_note text)
returns jsonb
language sql immutable
set search_path = ''
as $$ select jsonb_build_object('error', p_error, 'error_note', p_note) $$;

-- p_action: 0 = Prepare, 1 = Complete. Barcha qiymatlar Click yuborgan matn ko'rinishida:
-- imzo aynan shu satrlardan hisoblanadi (masalan amount "9999.00").
create function private.click_handle(
  p_form jsonb,
  p_action int,
  out resp jsonb,
  out payment_id uuid,
  out sign_ok boolean
)
language plpgsql security definer
set search_path = ''
as $$
declare
  c_secret   text;
  c_service  text;
  f_trans    text := p_form ->> 'click_trans_id';
  f_service  text := p_form ->> 'service_id';
  f_paydoc   text := p_form ->> 'click_paydoc_id';
  f_mtrans   text := p_form ->> 'merchant_trans_id';
  f_mprep    text := p_form ->> 'merchant_prepare_id';
  f_amount   text := p_form ->> 'amount';
  f_action   text := p_form ->> 'action';
  f_error    text := p_form ->> 'error';
  f_time     text := p_form ->> 'sign_time';
  f_sign     text := p_form ->> 'sign_string';
  v_trans    bigint;
  v_paydoc   bigint;
  v_mprep    bigint;
  v_amount   numeric;
  v_click_err int;
  v_pay      public.payments;
begin
  sign_ok := false;

  select c.secret, c.service_id into c_secret, c_service from private.click_config() c;
  if coalesce(c_secret, '') = '' then
    resp := private.click_resp(-8, 'Error in request from click');  -- kalit hali kiritilmagan
    return;
  end if;

  if f_trans is null or f_service is null or f_mtrans is null or f_amount is null
     or f_action is null or f_time is null or f_sign is null
     or (p_action = 1 and f_mprep is null) then
    resp := private.click_resp(-8, 'Error in request from click');
    return;
  end if;

  -- Prepare:  md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)
  -- Complete: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
  if lower(f_sign) <> md5(
       f_trans || f_service || c_secret || f_mtrans
       || case when p_action = 1 then f_mprep else '' end
       || f_amount || f_action || f_time) then
    resp := private.click_resp(-1, 'SIGN CHECK FAILED!');
    return;
  end if;
  sign_ok := true;

  if f_action <> p_action::text then
    resp := private.click_resp(-3, 'Action not found');
    return;
  end if;
  if coalesce(c_service, '') <> '' and f_service <> c_service then
    resp := private.click_resp(-8, 'Error in request from click');
    return;
  end if;

  begin
    v_trans     := f_trans::bigint;
    v_paydoc    := nullif(f_paydoc, '')::bigint;
    v_amount    := f_amount::numeric;
    v_click_err := coalesce(nullif(f_error, '')::int, 0);
    if p_action = 1 then
      v_mprep := f_mprep::bigint;
    end if;
  exception when others then
    resp := private.click_resp(-8, 'Error in request from click');
    return;
  end;

  select * into v_pay
    from public.payments p
   where p.id = private.try_uuid(f_mtrans)
   for update;
  if not found then
    resp := private.click_resp(-5, 'User does not exist');
    return;
  end if;
  payment_id := v_pay.id;

  if p_action = 0 then
    -- ───── Prepare ─────
    if v_pay.status = 'paid' then
      resp := private.click_resp(-4, 'Already paid');
      return;
    end if;
    if v_pay.status = 'cancelled' then
      resp := private.click_resp(-9, 'Transaction cancelled');
      return;
    end if;
    if v_amount * 100 <> v_pay.amount_tiyin then
      resp := private.click_resp(-2, 'Incorrect parameter amount');
      return;
    end if;
    -- Boshqa Click tranzaksiyasi allaqachon tayyorlangan: ikkinchisini rad etamiz
    -- (birinchisining Complete'i muvaffaqiyatli kelishi mumkin — uni buzmaslik kerak).
    if v_pay.status = 'prepared' and v_pay.click_trans_id <> v_trans then
      resp := private.click_resp(-8, 'Error in request from click');
      return;
    end if;

    if v_pay.status = 'created' then
      begin
        update public.payments
           set status = 'prepared',
               click_trans_id = v_trans,
               click_paydoc_id = v_paydoc,
               prepare_id = nextval('private.click_prepare_seq'),
               prepared_at = now()
         where id = v_pay.id
        returning * into v_pay;
      exception when unique_violation then
        -- shu click_trans_id boshqa to'lovga bog'langan
        resp := private.click_resp(-8, 'Error in request from click');
        return;
      end;
    end if;
    -- status = 'prepared' va o'sha tranzaksiya → takroriy Prepare, o'sha javob

    resp := jsonb_build_object(
      'click_trans_id', v_trans,
      'merchant_trans_id', f_mtrans,
      'merchant_prepare_id', v_pay.prepare_id,
      'error', 0,
      'error_note', 'Success');
    return;
  end if;

  -- ───── Complete ─────
  if v_pay.status = 'paid' then
    resp := private.click_resp(-4, 'Already paid');
    return;
  end if;
  if v_pay.status = 'cancelled' then
    resp := private.click_resp(-9, 'Transaction cancelled');
    return;
  end if;
  if v_pay.status <> 'prepared' or v_pay.prepare_id <> v_mprep or v_pay.click_trans_id <> v_trans then
    resp := private.click_resp(-6, 'Transaction does not exist');
    return;
  end if;
  if v_amount * 100 <> v_pay.amount_tiyin then
    resp := private.click_resp(-2, 'Incorrect parameter amount');
    return;
  end if;

  -- Click manfiy kod yuborsa: to'lovni bekor qilib, -9 qaytarish kerak (hujjat talabi)
  if v_click_err < 0 then
    update public.payments
       set status = 'cancelled', cancelled_at = now(), click_error = v_click_err
     where id = v_pay.id;
    resp := private.click_resp(-9, 'Transaction cancelled');
    return;
  end if;

  update public.payments
     set status = 'paid', paid_at = now(), confirm_id = nextval('private.click_confirm_seq')
   where id = v_pay.id
  returning * into v_pay;

  if v_pay.user_id is not null then
    insert into public.practice_sessions (user_id, payment_id)
    values (v_pay.user_id, v_pay.id)
    on conflict (payment_id) do nothing;
  end if;

  resp := jsonb_build_object(
    'click_trans_id', v_trans,
    'merchant_trans_id', f_mtrans,
    'merchant_confirm_id', v_pay.confirm_id,
    'error', 0,
    'error_note', 'Success');
end;
$$;

create function private.click_dispatch(p_form jsonb, p_action int)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  r record;
begin
  select * into r from private.click_handle(p_form, p_action);
  if r.sign_ok then
    insert into public.payment_events (payment_id, action, click_trans_id, click_error, response_error)
    values (r.payment_id, p_action::smallint,
            private.try_bigint(p_form ->> 'click_trans_id'),
            private.try_bigint(nullif(p_form ->> 'error', '')),
            (r.resp ->> 'error')::int);
  end if;
  return r.resp;
end;
$$;

-- Veb-ilovadagi /api/click/{prepare,complete} shularni chaqiradi (publishable kalit bilan).
-- Himoya — imzo: SECRET_KEY'siz to'g'ri sign_string yasab bo'lmaydi.
create function public.click_prepare(p_form jsonb)
returns jsonb
language sql security definer
set search_path = ''
as $$ select private.click_dispatch(p_form, 0) $$;

create function public.click_complete(p_form jsonb)
returns jsonb
language sql security definer
set search_path = ''
as $$ select private.click_dispatch(p_form, 1) $$;

-- ───────────────────────────── 7. Ruxsatlar ─────────────────────────────
revoke all on function public.create_practice_payment() from public, anon;
revoke all on function public.my_practice() from public, anon;
revoke all on function public.complete_practice(uuid) from public, anon;
revoke all on function public.click_prepare(jsonb) from public;
revoke all on function public.click_complete(jsonb) from public;

grant execute on function public.create_practice_payment() to authenticated;
grant execute on function public.my_practice() to authenticated;
grant execute on function public.complete_practice(uuid) to authenticated;
grant execute on function public.click_prepare(jsonb) to anon, authenticated;
grant execute on function public.click_complete(jsonb) to anon, authenticated;

-- my_practice (invoker) narx funksiyasini chaqiradi
grant execute on function private.practice_price_tiyin() to authenticated;
