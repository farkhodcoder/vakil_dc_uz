-- =============================================================================
-- vakil · 0017 — bepul (sovg'a/sinov) mashq: to'lovsiz berilgan mashq.
-- Faqat administrator SQL orqali beradi (private sxema — API'dan chaqirib bo'lmaydi):
--   select private.grant_practice('email@gmail.com', 'egasi sinovi', 3);
-- To'lov jadvaliga soxta yozuv qo'shilmaydi: mashq to'lovsiz, sababi grant_note'da.
-- =============================================================================

alter table public.practice_sessions alter column payment_id drop not null;
alter table public.practice_sessions add column grant_note text;
alter table public.practice_sessions
  add constraint practice_sessions_source check (payment_id is not null or nullif(trim(grant_note), '') is not null);

create function private.grant_practice(p_email text, p_note text, p_count int default 1)
returns int
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  if p_count < 1 or p_count > 20 then
    raise exception 'p_count 1..20 bo''lishi kerak';
  end if;
  if nullif(trim(p_note), '') is null then
    raise exception 'sabab (p_note) majburiy';
  end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  if v_uid is null then
    raise exception 'foydalanuvchi topilmadi: % (avval saytga Google bilan kirsin)', p_email;
  end if;
  insert into public.practice_sessions (user_id, grant_note)
  select v_uid, trim(p_note) from generate_series(1, p_count);
  return p_count;
end;
$$;

revoke all on function private.grant_practice(text, text, int) from public, anon, authenticated;
