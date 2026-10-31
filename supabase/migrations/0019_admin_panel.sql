-- =============================================================================
-- vakil · 0019 — admin panel: arizalarni ko'rish va holatini o'zgartirish.
-- Admin = private.admins ro'yxatida + 2FA (aal2). Ro'yxatga faqat SQL orqali qo'shiladi:
--   select private.grant_admin('email@gmail.com');
-- Admin ma'lumotlarni faqat security definer funksiyalar orqali oladi (jadvalga to'g'ridan-to'g'ri ruxsat yo'q).
-- =============================================================================

create table private.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on private.admins from public, anon, authenticated;

-- Ichki izoh: faqat admin ko'radi — foydalanuvchiga ustun darajasida select berilmaydi
alter table public.scopus_requests
  add column admin_note text check (admin_note is null or char_length(admin_note) <= 2000);
revoke select on public.scopus_requests from authenticated;
grant select (id, user_id, package, field, title, stage, target, language, deadline, contact, message, status, created_at, updated_at)
  on public.scopus_requests to authenticated;

create function private.is_panel_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
     and exists (select 1 from private.admins a where a.user_id = (select auth.uid()))
$$;
revoke all on function private.is_panel_admin() from public, anon;
grant execute on function private.is_panel_admin() to authenticated;

-- UI uchun: chaqiruvchi ro'yxatdami va 2FA bilan kirganmi (faqat o'zi haqida)
create function public.admin_status()
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'listed', exists (select 1 from private.admins a where a.user_id = (select auth.uid())),
    'aal2', coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
  )
$$;

create function public.admin_list_requests(p_status public.request_status default null)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.is_panel_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc)
    from (
      select r.id, r.package, r.field, r.title, r.stage, r.target, r.language, r.deadline,
             r.contact, r.message, r.status, r.admin_note, r.created_at, r.updated_at,
             u.email
      from public.scopus_requests r
      left join auth.users u on u.id = r.user_id
      where p_status is null or r.status = p_status
      order by r.created_at desc
      limit 500
    ) x
  ), '[]'::jsonb);
end;
$$;

create function public.admin_update_request(p_id uuid, p_status public.request_status, p_note text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_panel_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.scopus_requests
     set status = p_status,
         admin_note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;

create function public.admin_stats()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.is_panel_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from auth.users),
    'requests', coalesce((select jsonb_object_agg(status, n)
                          from (select status, count(*) n from public.scopus_requests group by status) s), '{}'::jsonb),
    'paid_count', (select count(*) from public.payments where status = 'paid'),
    'paid_tiyin', (select coalesce(sum(amount_tiyin), 0) from public.payments where status = 'paid'),
    'practices', (select count(*) from public.practice_sessions),
    'practices_completed', (select count(*) from public.practice_sessions where status = 'completed')
  );
end;
$$;

revoke all on function public.admin_status() from public, anon;
revoke all on function public.admin_list_requests(public.request_status) from public, anon;
revoke all on function public.admin_update_request(uuid, public.request_status, text) from public, anon;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_status() to authenticated;
grant execute on function public.admin_list_requests(public.request_status) to authenticated;
grant execute on function public.admin_update_request(uuid, public.request_status, text) to authenticated;
grant execute on function public.admin_stats() to authenticated;

create function private.grant_admin(p_email text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  if v_uid is null then
    raise exception 'foydalanuvchi topilmadi: % (avval saytga Google bilan kirsin)', p_email;
  end if;
  insert into private.admins (user_id) values (v_uid) on conflict do nothing;
  return v_uid;
end;
$$;
revoke all on function private.grant_admin(text) from public, anon, authenticated;
