-- =============================================================================
-- vakil · 0016 — click_handle: OUT parametr "payment_id" jadval ustuni bilan to'qnashardi
-- ("on conflict (payment_id)" → 42702 ambiguous). Smoke test topdi. Konflikt nishoni
-- endi constraint nomi bilan beriladi.
-- =============================================================================

create or replace function private.click_handle(
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
    on conflict on constraint practice_sessions_payment_id_key do nothing;
  end if;

  resp := jsonb_build_object(
    'click_trans_id', v_trans,
    'merchant_trans_id', f_mtrans,
    'merchant_confirm_id', v_pay.confirm_id,
    'error', 0,
    'error_note', 'Success');
end;
$$;
