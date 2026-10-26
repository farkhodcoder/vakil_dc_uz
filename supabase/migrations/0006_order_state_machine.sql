-- =============================================================================
-- vakil · 0006 — buyurtma holat mashinasi (kuzatish vaqt chizig'i)
-- Holat FAQAT public.transition_order() orqali o'zgaradi (service_role ham).
-- =============================================================================

-- Ruxsat etilgan o'tishlar va ularni bajara oladigan rollar
create table public.order_transitions (
  from_status   public.order_status not null,
  to_status     public.order_status not null,
  allowed_roles public.actor_type[] not null,
  primary key (from_status, to_status)
);

insert into public.order_transitions (from_status, to_status, allowed_roles) values
  ('draft',             'collected',         '{client,system}'),
  ('draft',             'cancelled',         '{client,admin,system}'),
  ('collected',         'ai_checked',        '{system,ai}'),
  ('collected',         'needs_fix',         '{system,ai,operator,admin}'),
  ('collected',         'cancelled',         '{client,admin}'),
  ('ai_checked',        'needs_fix',         '{system,ai,operator,admin}'),
  ('ai_checked',        'client_approved',   '{client}'),
  ('ai_checked',        'cancelled',         '{client,admin}'),
  ('needs_fix',         'collected',         '{client,system}'),
  ('needs_fix',         'cancelled',         '{client,admin}'),
  ('client_approved',   'package_ready',     '{system}'),            -- self
  ('client_approved',   'operator_reviewed', '{operator,admin}'),    -- assisted
  ('client_approved',   'needs_fix',         '{operator,admin}'),
  ('client_approved',   'cancelled',         '{client,admin}'),
  ('package_ready',     'submitted',         '{client,system}'),     -- mijoz o'zi topshirdi
  ('package_ready',     'cancelled',         '{client,admin}'),
  ('operator_reviewed', 'submitted',         '{operator,admin}'),    -- raqam + dalil majburiy
  ('operator_reviewed', 'needs_fix',         '{operator,admin}'),
  ('operator_reviewed', 'cancelled',         '{admin}'),
  ('submitted',         'awaiting_response', '{client,operator,admin,system}'),
  ('submitted',         'completed',         '{client,operator,admin}'),
  ('submitted',         'rejected',          '{client,operator,admin}'),
  ('awaiting_response', 'completed',         '{client,operator,admin,system}'),
  ('awaiting_response', 'rejected',          '{client,operator,admin,system}');

-- ───────────────────────── Yordamchilar ─────────────────────────
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

-- Buyurtmaga kirish huquqi: egasi, admin, operator (assisted yoki biriktirilgan),
-- advokat (biriktirilgan). Xodimlar uchun 2FA majburiy.
create function private.can_access_order(p_order_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.orders o
     where o.id = p_order_id
       and (
         o.user_id = (select auth.uid())
         or private.is_admin()
         or (private.has_staff_role('operator')
             and (o.fulfillment_mode = 'assisted' or o.assigned_operator_id = (select auth.uid())))
         or (private.has_staff_role('lawyer') and o.assigned_lawyer_id = (select auth.uid()))
       )
  )
$$;

grant execute on function private.try_uuid(text), private.can_access_order(uuid)
  to anon, authenticated, service_role;

-- ───────────── Holatni to'g'ridan-to'g'ri o'zgartirishni taqiqlash ─────────────
create function private.orders_guard_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('vakil.order_transition', true), '') <> 'on' then
    raise exception 'Buyurtma holati faqat transition_order() orqali o''zgaradi'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger orders_guard_status
  before update of status on public.orders
  for each row execute function private.orders_guard_status();

-- Yangi buyurtma → vaqt chizig'idagi birinchi qadam
create function private.order_initial_step()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.order_steps (order_id, from_status, to_status, actor_type, actor_id)
  values (
    new.id, null, new.status,
    case when (select auth.uid()) is null then 'system' else 'client' end,
    (select auth.uid())
  );
  return new;
end;
$$;

create trigger orders_initial_step
  after insert on public.orders
  for each row execute function private.order_initial_step();

-- ───────────────────────── Asosiy funksiya ─────────────────────────
create function public.transition_order(
  p_order_id             uuid,
  p_to                   public.order_status,
  p_comment              text default null,
  p_external_ref         text default null,
  p_evidence_document_id uuid default null,
  p_visible_to_client    boolean default true,
  p_as                   public.actor_type default null  -- faqat server: 'system' | 'ai'
)
returns public.orders
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_is_server boolean;
  v_order     public.orders;
  v_from      public.order_status;
  v_role      public.app_role;
  v_actor     public.actor_type;
  v_allowed   public.actor_type[];
  v_ref       text := nullif(btrim(p_external_ref), '');
  v_has_tg    boolean;
begin
  -- JWT'siz to'g'ridan-to'g'ri ulanish yoki service_role kaliti = server
  v_is_server := v_uid is null
             and coalesce((select auth.role()), 'postgres') in ('service_role', 'postgres');

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Buyurtma topilmadi' using errcode = 'P0002';
  end if;
  v_from := v_order.status;

  -- Kim bajaryapti?
  if v_is_server then
    v_actor := coalesce(p_as, 'system');
    if v_actor not in ('system', 'ai') then
      raise exception 'Server faqat system yoki ai nomidan ishlaydi' using errcode = '22023';
    end if;
  elsif v_uid is null then
    raise exception 'Kirish talab qilinadi' using errcode = '42501';
  else
    if p_as is not null then
      raise exception 'p_as faqat server uchun' using errcode = '42501';
    end if;
    v_role := private.current_app_role();
    if v_order.user_id = v_uid then
      v_actor := 'client';
    elsif private.has_aal2() and v_role = 'admin' then
      v_actor := 'admin';
    elsif private.has_aal2() and v_role = 'operator'
          and (v_order.fulfillment_mode = 'assisted' or v_order.assigned_operator_id = v_uid) then
      v_actor := 'operator';
    elsif private.has_aal2() and v_role = 'lawyer' and v_order.assigned_lawyer_id = v_uid then
      v_actor := 'lawyer';
    else
      raise exception 'Bu buyurtmaga ruxsat yo''q' using errcode = '42501';
    end if;
  end if;

  -- O'tish ruxsat etilganmi?
  select t.allowed_roles into v_allowed
    from public.order_transitions t
   where t.from_status = v_from and t.to_status = p_to;
  if v_allowed is null then
    raise exception 'Bunday o''tish mumkin emas: % → %', v_from, p_to using errcode = '22023';
  end if;
  if not (v_actor = any (v_allowed)) then
    raise exception '% bu o''tishni bajara olmaydi: % → %', v_actor, v_from, p_to using errcode = '42501';
  end if;

  -- Rejimga bog'liq qoidalar
  if p_to = 'package_ready' and v_order.fulfillment_mode <> 'self' then
    raise exception 'package_ready faqat "O''zim topshiraman" rejimida' using errcode = '22023';
  end if;
  if p_to = 'operator_reviewed' and v_order.fulfillment_mode <> 'assisted' then
    raise exception 'operator_reviewed faqat "Siz topshiring" rejimida' using errcode = '22023';
  end if;
  if v_actor = 'client' and v_order.fulfillment_mode = 'assisted'
     and p_to in ('submitted', 'awaiting_response', 'completed', 'rejected') then
    raise exception '"Siz topshiring" rejimida bu holatni operator belgilaydi' using errcode = '42501';
  end if;
  if p_to = 'submitted' and v_order.fulfillment_mode = 'assisted' then
    if v_ref is null then
      raise exception 'Ariza raqami majburiy' using errcode = '23514';
    end if;
    if p_evidence_document_id is null then
      raise exception 'Dalil (kvitansiya yoki skrinshot) majburiy' using errcode = '23514';
    end if;
  end if;
  if p_evidence_document_id is not null and not exists (
       select 1 from public.documents d
        where d.id = p_evidence_document_id and d.order_id = p_order_id
     ) then
    raise exception 'Dalil hujjati shu buyurtmaga tegishli emas' using errcode = '23514';
  end if;

  -- Yangilash (guard trigger uchun tranzaksiya bayrog'i)
  perform set_config('vakil.order_transition', 'on', true);
  update public.orders
     set status               = p_to,
         external_ref         = coalesce(v_ref, external_ref),
         external_ref_at      = case when v_ref is not null then now() else external_ref_at end,
         submitted_at         = case when p_to = 'submitted' then now() else submitted_at end,
         completed_at         = case when p_to in ('completed', 'rejected') then now() else completed_at end,
         cancelled_at         = case when p_to = 'cancelled' then now() else cancelled_at end,
         assigned_operator_id = case when v_actor = 'operator' and assigned_operator_id is null
                                     then v_uid else assigned_operator_id end
   where id = p_order_id
  returning * into v_order;
  perform set_config('vakil.order_transition', 'off', true);

  insert into public.order_steps
    (order_id, from_status, to_status, actor_type, actor_id, comment, evidence_document_id, is_visible_to_client)
  values
    (p_order_id, v_from, p_to, v_actor, v_uid, p_comment, p_evidence_document_id, p_visible_to_client);

  -- Bildirishnomalar navbati: har bir ko'rinadigan o'zgarishda web + SMS (+ Telegram ulangan bo'lsa).
  -- Ariza raqami alohida shablon bilan DARHOL yuboriladi.
  if p_visible_to_client then
    select p.telegram_id is not null into v_has_tg from public.profiles p where p.id = v_order.user_id;

    insert into public.notifications (user_id, order_id, channel, template, payload)
    select v_order.user_id, v_order.id, ch,
           case when v_ref is not null then 'order.external_ref' else 'order.status_changed' end,
           jsonb_build_object(
             'public_code', v_order.public_code,
             'status', p_to,
             'external_ref', v_order.external_ref
           )
      from unnest(
             case when coalesce(v_has_tg, false)
                  then array['web', 'sms', 'telegram']::public.channel[]
                  else array['web', 'sms']::public.channel[] end
           ) as ch;
  end if;

  return v_order;
end;
$$;

revoke execute on function public.transition_order(uuid, public.order_status, text, text, uuid, boolean, public.actor_type)
  from public, anon;
grant execute on function public.transition_order(uuid, public.order_status, text, text, uuid, boolean, public.actor_type)
  to authenticated, service_role;
