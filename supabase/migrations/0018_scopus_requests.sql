-- =============================================================================
-- vakil · 0018 — ikkinchi xizmat: Scopus jurnalida nashr qilishga hamrohlik (ariza).
-- 1-bosqich: foydalanuvchi ariza qoldiradi → jamoa bog'lanadi. Fayllar va to'lov — keyingi bosqich.
-- Saqlanadigan ma'lumot: mavzu, soha, holat va aloqa uchun kontakt (foydalanuvchi o'zi kiritadi).
-- =============================================================================

create type public.scopus_stage as enum ('idea', 'draft', 'ready', 'revision');
create type public.scopus_target as enum ('any', 'q1q2', 'q3q4');
create type public.scopus_package as enum ('select', 'edit', 'full');
create type public.request_status as enum ('new', 'in_review', 'in_progress', 'done', 'cancelled');

create table public.scopus_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  package    public.scopus_package not null,
  field      text not null check (char_length(field) between 2 and 120),
  title      text not null check (char_length(title) between 3 and 300),
  stage      public.scopus_stage not null,
  target     public.scopus_target not null default 'any',
  language   text not null check (char_length(language) between 2 and 40),
  deadline   date,
  contact    text not null check (char_length(contact) between 3 and 120),
  message    text check (message is null or char_length(message) <= 2000),
  status     public.request_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index scopus_requests_user_idx on public.scopus_requests (user_id, created_at desc);
create trigger scopus_requests_updated_at before update on public.scopus_requests
  for each row execute function private.set_updated_at();

alter table public.scopus_requests enable row level security;
create policy scopus_requests_select_own on public.scopus_requests
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.scopus_requests from anon, authenticated;
grant select on public.scopus_requests to authenticated;
grant all on public.scopus_requests to service_role;

-- Ariza yaratish: kirgan foydalanuvchi uchun; spamga qarshi — sutkasiga 5 tagacha
create function public.create_scopus_request(p jsonb)
returns uuid
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
  if (select count(*) from public.scopus_requests
       where user_id = v_uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'too_many_requests' using errcode = 'P0001';
  end if;
  insert into public.scopus_requests (user_id, package, field, title, stage, target, language, deadline, contact, message)
  values (
    v_uid,
    (p ->> 'package')::public.scopus_package,
    trim(p ->> 'field'),
    trim(p ->> 'title'),
    (p ->> 'stage')::public.scopus_stage,
    coalesce(nullif(p ->> 'target', ''), 'any')::public.scopus_target,
    trim(p ->> 'language'),
    nullif(p ->> 'deadline', '')::date,
    trim(p ->> 'contact'),
    nullif(trim(coalesce(p ->> 'message', '')), '')
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.create_scopus_request(jsonb) from public, anon;
grant execute on function public.create_scopus_request(jsonb) to authenticated;
