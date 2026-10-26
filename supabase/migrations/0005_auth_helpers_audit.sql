-- =============================================================================
-- vakil · 0005 — rol yordamchilari, yangi foydalanuvchi trigger'i, audit jurnali
-- =============================================================================

-- ─────────────────────────── Rol yordamchilari ───────────────────────────
-- Xodim huquqlari faqat 2FA (aal2) bilan ishlaydi.

create function private.current_app_role()
returns public.app_role
language sql stable security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid()) and p.deleted_at is null
$$;

create function private.has_aal2()
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
$$;

create function private.is_staff()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.has_aal2()
     and coalesce(private.current_app_role() in ('operator', 'lawyer', 'admin'), false)
$$;

create function private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.has_aal2() and coalesce(private.current_app_role() = 'admin', false)
$$;

create function private.has_staff_role(p_role public.app_role)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.has_aal2() and coalesce(private.current_app_role() = p_role, false)
$$;

grant execute on function
  private.current_app_role(), private.has_aal2(), private.is_staff(),
  private.is_admin(), private.has_staff_role(public.app_role)
  to anon, authenticated, service_role;

-- ─────────────────── Yangi foydalanuvchi → profil ───────────────────
-- Supabase Auth telefonni "+"siz saqlaydi: 998901234567 → +998901234567
create function private.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, nullif('+' || ltrim(coalesce(new.phone, ''), '+'), '+'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.sync_user_phone()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.profiles
     set phone = nullif('+' || ltrim(coalesce(new.phone, ''), '+'), '+')
   where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_phone_changed
  after update of phone on auth.users
  for each row when (old.phone is distinct from new.phone)
  execute function private.sync_user_phone();

-- ─────────────────────────────── Audit jurnali ───────────────────────────────
-- Faqat qo'shiladi. hash = sha256(prev_hash + yozuv). Zanjir `seq` bo'yicha.
-- Ataylab FK yo'q: yozuvlar o'chirilgan obyektlardan keyin ham qoladi.
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  seq         bigint not null unique,                 -- trigger beradi (qulf ostida)
  actor_type  public.actor_type not null,
  actor_id    uuid,
  action      text not null,                          -- "orders.update", "document.view" ...
  entity_type text not null,
  entity_id   text,
  order_id    uuid,
  ip          inet,
  user_agent  text,
  data        jsonb,                                  -- o'zgarish (shaxsiy ma'lumotsiz)
  prev_hash   text,
  hash        text not null,
  created_at  timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_order_idx on public.audit_logs (order_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at);

-- Xesh uchun kanonik ko'rinish (jsonb kalitlarni tartiblaydi)
create function private.audit_payload(r public.audit_logs)
returns text
language sql stable
set search_path = ''
as $$
  select jsonb_build_object(
    'seq', r.seq,
    'actor_type', r.actor_type,
    'actor_id', r.actor_id,
    'action', r.action,
    'entity_type', r.entity_type,
    'entity_id', r.entity_id,
    'order_id', r.order_id,
    'ip', r.ip,
    'user_agent', r.user_agent,
    'data', r.data,
    'created_at', to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  )::text
$$;

create function private.audit_logs_chain()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_seq  bigint;
  v_hash text;
begin
  -- parallel yozuvlar zanjirni buzmasligi uchun tranzaksiya qulfi
  perform pg_advisory_xact_lock(hashtext('public.audit_logs'));
  select a.seq, a.hash into v_seq, v_hash
    from public.audit_logs a
   order by a.seq desc
   limit 1;

  new.seq        := coalesce(v_seq, 0) + 1;
  new.prev_hash  := v_hash;
  new.created_at := now();
  new.hash       := encode(
    extensions.digest(coalesce(v_hash, '') || private.audit_payload(new), 'sha256'),
    'hex'
  );
  return new;
end;
$$;

create trigger audit_logs_chain
  before insert on public.audit_logs
  for each row execute function private.audit_logs_chain();

create function private.audit_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs faqat qo''shiladi: % taqiqlangan', tg_op using errcode = '42501';
end;
$$;

create trigger audit_logs_no_update_delete
  before update or delete on public.audit_logs
  for each row execute function private.audit_logs_immutable();
create trigger audit_logs_no_truncate
  before truncate on public.audit_logs
  for each statement execute function private.audit_logs_immutable();

-- Muhim jadvallardagi har bir o'zgarishni avtomatik yozish.
-- Shifrlangan, xesh va shaxsiy maydonlar jurnalga TUSHMAYDI.
create function private.audit_row_change()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_actor public.actor_type;
  v_new   jsonb;
  v_old   jsonb;
  v_row   jsonb;
  v_data  jsonb;
  v_skip  text[] := array['updated_at', 'phone', 'full_name', 'ip', 'user_agent',
                          'signature_data', 'provider_payload', 'fiscal_data', 'contacts'];
begin
  v_actor := case
    when v_uid is null then 'system'
    else coalesce(private.current_app_role()::text, 'client')::public.actor_type
  end;

  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new); end if;
  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old); end if;
  v_row := coalesce(v_new, v_old);

  if tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, n.value) into v_data
      from jsonb_each(v_new) n
     where n.value is distinct from v_old -> n.key
       and n.key !~ '(_enc|_hash)$'
       and n.key <> all (v_skip);
    if v_data is null then
      return new;                                   -- mazmunli o'zgarish yo'q
    end if;
  elsif tg_op = 'INSERT' then
    select jsonb_object_agg(n.key, n.value) into v_data
      from jsonb_each(v_new) n
     where n.key !~ '(_enc|_hash)$'
       and n.key <> all (v_skip);
  end if;

  insert into public.audit_logs (actor_type, actor_id, action, entity_type, entity_id, order_id, data)
  values (
    v_actor,
    v_uid,
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    v_row ->> 'id',
    case when tg_table_name = 'orders' then (v_row ->> 'id')::uuid
         else (v_row ->> 'order_id')::uuid end,
    v_data
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_profiles after update on public.profiles
  for each row execute function private.audit_row_change();
create trigger audit_orders after insert or update or delete on public.orders
  for each row execute function private.audit_row_change();
create trigger audit_documents after insert or update or delete on public.documents
  for each row execute function private.audit_row_change();
create trigger audit_generated_docs after insert or update on public.generated_docs
  for each row execute function private.audit_row_change();
create trigger audit_consents after insert or update on public.consents
  for each row execute function private.audit_row_change();
create trigger audit_payments after insert or update on public.payments
  for each row execute function private.audit_row_change();
create trigger audit_agent_actions after insert or update on public.agent_actions
  for each row execute function private.audit_row_change();
create trigger audit_services after insert or update or delete on public.services
  for each row execute function private.audit_row_change();
create trigger audit_service_versions after insert or update or delete on public.service_versions
  for each row execute function private.audit_row_change();
create trigger audit_legal_sources after insert or update or delete on public.legal_sources
  for each row execute function private.audit_row_change();
create trigger audit_ref_values after insert or update or delete on public.ref_values
  for each row execute function private.audit_row_change();
create trigger audit_price_offers after insert or update or delete on public.price_offers
  for each row execute function private.audit_row_change();
create trigger audit_plans after insert or update or delete on public.plans
  for each row execute function private.audit_row_change();
create trigger audit_partners after insert or update or delete on public.partners
  for each row execute function private.audit_row_change();

-- Zanjir yaxlitligini tekshirish (admin 2FA bilan yoki server)
create function public.verify_audit_chain()
returns table (ok boolean, checked bigint, broken_at_seq bigint)
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  r      public.audit_logs;
  v_prev text := null;
  n      bigint := 0;
begin
  if not (private.is_admin() or current_user in ('service_role', 'postgres')) then
    raise exception 'Faqat admin (2FA bilan)' using errcode = '42501';
  end if;

  for r in select * from public.audit_logs order by seq loop
    n := n + 1;
    if r.prev_hash is distinct from v_prev
       or r.hash <> encode(extensions.digest(coalesce(v_prev, '') || private.audit_payload(r), 'sha256'), 'hex')
    then
      ok := false; checked := n; broken_at_seq := r.seq;
      return next;
      return;
    end if;
    v_prev := r.hash;
  end loop;

  ok := true; checked := n; broken_at_seq := null;
  return next;
end;
$$;

grant execute on function private.audit_payload(public.audit_logs) to authenticated, service_role;
grant execute on function public.verify_audit_chain() to authenticated, service_role;
