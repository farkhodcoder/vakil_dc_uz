-- =============================================================================
-- vakil · DB smoke test: Click SHOP API (Prepare/Complete) va "1 to'lov = 1 mashq".
-- Bitta tranzaksiya; oxirida exception → ROLLBACK (vault siri ham, yozuvlar ham qolmaydi).
-- Natija xato xabarida: "PASS ..."/"FAIL ..." qatorlari.
-- Diqqat: vault'da click_secret_key allaqachon bo'lsa — test o'tkazilmaydi.
-- =============================================================================
do $$
declare
  rep      text := '';
  nl       text := chr(10);
  fails    int := 0;
  total    int := 0;
  secret   text := 'smoke-' || md5(random()::text);
  svc      text := '777';
  v_user   uuid := gen_random_uuid();
  v_other  uuid := gen_random_uuid();
  v_pay    uuid;
  v_pay2   uuid;
  v_pay3   uuid;
  v_sess   uuid;
  r        jsonb;
  v_prep   bigint;
  n        int;
  v_status text;

  -- Click so'rovini imzolab yasaydi
  form jsonb;
begin
  if exists (select 1 from vault.secrets where name in ('click_secret_key', 'click_service_id')) then
    raise exception 'SKIP: vault''da Click kaliti bor — smoke test faqat bo''sh muhitda';
  end if;

  insert into auth.users (id, email, aud, role) values
    (v_user,  'smoke-user@vakil.test',  'authenticated', 'authenticated'),
    (v_other, 'smoke-other@vakil.test', 'authenticated', 'authenticated');

  -- ───── P. To'lov yaratish va RLS ─────
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  total := total + 1;
  begin
    perform public.create_practice_payment();
    fails := fails + 1; rep := rep || nl || 'FAIL P1 mehmon to''lov yaratdi';
  exception when insufficient_privilege then
    rep := rep || nl || 'PASS P1 mehmon to''lov yarata olmaydi';
  end;
  reset role;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.create_practice_payment();
  v_pay := (r ->> 'id')::uuid;
  total := total + 1;
  if (r ->> 'amount_tiyin')::bigint = 999900 and public.create_practice_payment() ->> 'id' = v_pay::text then
    rep := rep || nl || 'PASS P2 9 999 so''m; takroriy bosish o''sha to''lovni qaytaradi';
  else fails := fails + 1; rep := rep || nl || 'FAIL P2 ' || r::text; end if;

  total := total + 1;
  begin
    update public.payments set status = 'paid' where id = v_pay;
    fails := fails + 1; rep := rep || nl || 'FAIL P3 mijoz to''lovni o''zi "paid" qildi';
  exception when insufficient_privilege then
    rep := rep || nl || 'PASS P3 mijoz to''lov holatini o''zgartira olmaydi';
  end;
  reset role;

  -- boshqa foydalanuvchining to'lovi
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_other, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_pay2 := (public.create_practice_payment() ->> 'id')::uuid;
  select count(*) into n from public.payments where id = v_pay;
  total := total + 1;
  if n = 0 then rep := rep || nl || 'PASS P4 begona to''lov ko''rinmaydi (RLS)';
  else fails := fails + 1; rep := rep || nl || 'FAIL P4 begona to''lov ko''rindi'; end if;
  reset role;

  -- ───── K. Click Prepare / Complete (anon — Click serveri) ─────
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  form := jsonb_build_object('click_trans_id', '1001', 'service_id', svc, 'click_paydoc_id', '5001',
    'merchant_trans_id', v_pay::text, 'amount', '9999.00', 'action', '0', 'error', '0',
    'error_note', 'Success', 'sign_time', '2026-10-26 12:00:00', 'sign_string', 'x');
  r := public.click_prepare(form);
  total := total + 1;
  if (r ->> 'error')::int = -8 then rep := rep || nl || 'PASS K1 kalit kiritilmagan → -8';
  else fails := fails + 1; rep := rep || nl || 'FAIL K1 ' || r::text; end if;
  reset role;

  perform vault.create_secret(secret, 'click_secret_key');

  set local role anon;
  r := public.click_prepare(form);
  total := total + 1;
  if (r ->> 'error')::int = -1 then rep := rep || nl || 'PASS K2 noto''g''ri imzo → -1';
  else fails := fails + 1; rep := rep || nl || 'FAIL K2 ' || r::text; end if;

  form := form || jsonb_build_object('sign_string',
    md5('1001' || svc || secret || v_pay::text || '9999.00' || '0' || '2026-10-26 12:00:00'));
  r := public.click_prepare(form);
  v_prep := (r ->> 'merchant_prepare_id')::bigint;
  total := total + 1;
  if (r ->> 'error')::int = 0 and v_prep is not null and (r ->> 'click_trans_id')::bigint = 1001
     and r ->> 'merchant_trans_id' = v_pay::text then
    rep := rep || nl || 'PASS K3 Prepare muvaffaqiyatli (prepare_id=' || v_prep || ')';
  else fails := fails + 1; rep := rep || nl || 'FAIL K3 ' || r::text; end if;

  r := public.click_prepare(form);
  total := total + 1;
  if (r ->> 'error')::int = 0 and (r ->> 'merchant_prepare_id')::bigint = v_prep then
    rep := rep || nl || 'PASS K4 takroriy Prepare → o''sha prepare_id';
  else fails := fails + 1; rep := rep || nl || 'FAIL K4 ' || r::text; end if;

  r := public.click_prepare(form || jsonb_build_object('click_trans_id', '1002', 'sign_string',
    md5('1002' || svc || secret || v_pay::text || '9999.00' || '0' || '2026-10-26 12:00:00')));
  total := total + 1;
  if (r ->> 'error')::int = -8 then rep := rep || nl || 'PASS K5 tayyorlangan to''lovga boshqa tranzaksiya → -8';
  else fails := fails + 1; rep := rep || nl || 'FAIL K5 ' || r::text; end if;

  r := public.click_prepare(form || jsonb_build_object('merchant_trans_id', v_pay2::text,
    'amount', '100.00', 'click_trans_id', '1003', 'sign_string',
    md5('1003' || svc || secret || v_pay2::text || '100.00' || '0' || '2026-10-26 12:00:00')));
  total := total + 1;
  if (r ->> 'error')::int = -2 then rep := rep || nl || 'PASS K6 noto''g''ri summa → -2';
  else fails := fails + 1; rep := rep || nl || 'FAIL K6 ' || r::text; end if;

  r := public.click_prepare(form || jsonb_build_object('merchant_trans_id', 'abc', 'sign_string',
    md5('1001' || svc || secret || 'abc' || '9999.00' || '0' || '2026-10-26 12:00:00')));
  total := total + 1;
  if (r ->> 'error')::int = -5 then rep := rep || nl || 'PASS K7 noma''lum buyurtma → -5';
  else fails := fails + 1; rep := rep || nl || 'FAIL K7 ' || r::text; end if;

  r := public.click_prepare(form || jsonb_build_object('action', '1', 'sign_string',
    md5('1001' || svc || secret || v_pay::text || '9999.00' || '1' || '2026-10-26 12:00:00')));
  total := total + 1;
  if (r ->> 'error')::int = -3 then rep := rep || nl || 'PASS K8 Prepare manziliga action=1 → -3';
  else fails := fails + 1; rep := rep || nl || 'FAIL K8 ' || r::text; end if;

  -- Complete: noto'g'ri prepare_id
  form := jsonb_build_object('click_trans_id', '1001', 'service_id', svc, 'click_paydoc_id', '5001',
    'merchant_trans_id', v_pay::text, 'merchant_prepare_id', (v_prep + 1000)::text,
    'amount', '9999.00', 'action', '1', 'error', '0', 'error_note', 'Success',
    'sign_time', '2026-10-26 12:00:05');
  r := public.click_complete(form || jsonb_build_object('sign_string',
    md5('1001' || svc || secret || v_pay::text || (v_prep + 1000)::text || '9999.00' || '1' || '2026-10-26 12:00:05')));
  total := total + 1;
  if (r ->> 'error')::int = -6 then rep := rep || nl || 'PASS K9 noto''g''ri merchant_prepare_id → -6';
  else fails := fails + 1; rep := rep || nl || 'FAIL K9 ' || r::text; end if;

  -- Complete: muvaffaqiyatli
  form := form || jsonb_build_object('merchant_prepare_id', v_prep::text, 'sign_string',
    md5('1001' || svc || secret || v_pay::text || v_prep::text || '9999.00' || '1' || '2026-10-26 12:00:05'));
  r := public.click_complete(form);
  total := total + 1;
  if (r ->> 'error')::int = 0 and (r ->> 'merchant_confirm_id') is not null then
    rep := rep || nl || 'PASS K10 Complete muvaffaqiyatli';
  else fails := fails + 1; rep := rep || nl || 'FAIL K10 ' || r::text; end if;

  r := public.click_complete(form);
  total := total + 1;
  if (r ->> 'error')::int = -4 then rep := rep || nl || 'PASS K11 takroriy Complete → -4 (Already paid)';
  else fails := fails + 1; rep := rep || nl || 'FAIL K11 ' || r::text; end if;

  r := public.click_prepare(jsonb_build_object('click_trans_id', '1001', 'service_id', svc,
    'click_paydoc_id', '5001', 'merchant_trans_id', v_pay::text, 'amount', '9999.00', 'action', '0',
    'error', '0', 'sign_time', '2026-10-26 12:00:00', 'sign_string',
    md5('1001' || svc || secret || v_pay::text || '9999.00' || '0' || '2026-10-26 12:00:00')));
  total := total + 1;
  if (r ->> 'error')::int = -4 then rep := rep || nl || 'PASS K12 to''langan buyurtmaga Prepare → -4';
  else fails := fails + 1; rep := rep || nl || 'FAIL K12 ' || r::text; end if;
  reset role;

  -- Bekor qilish: v_pay3 (birinchi foydalanuvchi, yangi to'lov)
  insert into public.payments (user_id, amount_tiyin) values (v_user, 999900) returning id into v_pay3;
  set local role anon;
  r := public.click_prepare(jsonb_build_object('click_trans_id', '2001', 'service_id', svc,
    'click_paydoc_id', '6001', 'merchant_trans_id', v_pay3::text, 'amount', '9999', 'action', '0',
    'error', '0', 'sign_time', '2026-10-26 13:00:00', 'sign_string',
    md5('2001' || svc || secret || v_pay3::text || '9999' || '0' || '2026-10-26 13:00:00')));
  total := total + 1;
  if (r ->> 'error')::int = 0 then rep := rep || nl || 'PASS K13 summa "9999" (kasrsiz) ham qabul qilinadi';
  else fails := fails + 1; rep := rep || nl || 'FAIL K13 ' || r::text; end if;
  v_prep := (r ->> 'merchant_prepare_id')::bigint;

  r := public.click_complete(jsonb_build_object('click_trans_id', '2001', 'service_id', svc,
    'click_paydoc_id', '6001', 'merchant_trans_id', v_pay3::text, 'merchant_prepare_id', v_prep::text,
    'amount', '9999', 'action', '1', 'error', '-5017', 'error_note', 'Insufficient funds',
    'sign_time', '2026-10-26 13:00:05', 'sign_string',
    md5('2001' || svc || secret || v_pay3::text || v_prep::text || '9999' || '1' || '2026-10-26 13:00:05')));
  total := total + 1;
  if (r ->> 'error')::int = -9 then rep := rep || nl || 'PASS K14 Click xatosi (-5017) → bekor, -9';
  else fails := fails + 1; rep := rep || nl || 'FAIL K14 ' || r::text; end if;
  reset role;

  select status::text into v_status from public.payments where id = v_pay3;
  select count(*) into n from public.practice_sessions where payment_id = v_pay3;
  total := total + 1;
  if v_status = 'cancelled' and n = 0 then rep := rep || nl || 'PASS K15 bekor to''lov mashq bermaydi';
  else fails := fails + 1; rep := rep || nl || 'FAIL K15 ' || v_status || ' / ' || n; end if;

  -- service_id tekshiruvi (sozlangan bo'lsa)
  perform vault.create_secret(svc, 'click_service_id');
  set local role anon;
  r := public.click_prepare(jsonb_build_object('click_trans_id', '3001', 'service_id', '999',
    'click_paydoc_id', '7001', 'merchant_trans_id', v_pay2::text, 'amount', '9999.00', 'action', '0',
    'error', '0', 'sign_time', '2026-10-26 14:00:00', 'sign_string',
    md5('3001' || '999' || secret || v_pay2::text || '9999.00' || '0' || '2026-10-26 14:00:00')));
  total := total + 1;
  if (r ->> 'error')::int = -8 then rep := rep || nl || 'PASS K16 begona service_id → -8';
  else fails := fails + 1; rep := rep || nl || 'FAIL K16 ' || r::text; end if;
  reset role;

  -- ───── E. Jurnal ─────
  select count(*) into n from public.payment_events;
  total := total + 1;
  -- K3,K4,K5,K6,K7,K8,K9,K10,K11,K12,K13,K14,K16 → imzosi to'g'ri 13 so'rov (K1,K2 yozilmaydi)
  if n = 13 then rep := rep || nl || 'PASS E1 jurnalda faqat imzosi to''g''ri so''rovlar (13)';
  else fails := fails + 1; rep := rep || nl || 'FAIL E1 jurnal: ' || n; end if;

  total := total + 1;
  begin
    delete from public.payment_events;
    fails := fails + 1; rep := rep || nl || 'FAIL E2 jurnal o''chirildi';
  exception when insufficient_privilege then
    rep := rep || nl || 'PASS E2 jurnalni o''chirib bo''lmaydi';
  end;

  -- ───── U. Mashq hisobi ─────
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.my_practice();
  v_sess := (r ->> 'session_id')::uuid;
  total := total + 1;
  if (r ->> 'available')::int = 1 and v_sess is not null and (r ->> 'completed')::int = 0 then
    rep := rep || nl || 'PASS U1 to''lovdan keyin 1 ta mashq ochiq';
  else fails := fails + 1; rep := rep || nl || 'FAIL U1 ' || r::text; end if;

  total := total + 1;
  begin
    update public.practice_sessions set status = 'available' where id = v_sess;
    fails := fails + 1; rep := rep || nl || 'FAIL U2 mijoz mashq holatini o''zgartirdi';
  exception when insufficient_privilege then
    rep := rep || nl || 'PASS U2 mijoz mashq holatini to''g''ridan-to''g''ri o''zgartira olmaydi';
  end;
  reset role;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_other, 'role', 'authenticated')::text, true);
  set local role authenticated;
  total := total + 1;
  begin
    perform public.complete_practice(v_sess);
    fails := fails + 1; rep := rep || nl || 'FAIL U3 begona mashqni yakunladi';
  exception when no_data_found then
    rep := rep || nl || 'PASS U3 begona mashqni yakunlab bo''lmaydi';
  end;
  reset role;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.complete_practice(v_sess);
  total := total + 1;
  if (r ->> 'ok')::boolean and not (r ->> 'already')::boolean
     and (public.complete_practice(v_sess) ->> 'already')::boolean then
    rep := rep || nl || 'PASS U4 Successful → mashq yopildi; takroriy chaqiruv xavfsiz';
  else fails := fails + 1; rep := rep || nl || 'FAIL U4 ' || r::text; end if;

  r := public.my_practice();
  total := total + 1;
  if (r ->> 'available')::int = 0 and (r ->> 'session_id') is null and (r ->> 'completed')::int = 1 then
    rep := rep || nl || 'PASS U5 keyingi mashq uchun yangi to''lov kerak';
  else fails := fails + 1; rep := rep || nl || 'FAIL U5 ' || r::text; end if;
  reset role;

  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  total := total + 1;
  begin
    select count(*) into n from public.payment_events;
    fails := fails + 1; rep := rep || nl || 'FAIL U6 mehmon jurnalni o''qidi';
  exception when insufficient_privilege then
    rep := rep || nl || 'PASS U6 mehmon jurnal va to''lovlarni o''qiy olmaydi';
  end;
  reset role;

  raise exception '%', 'NATIJA: ' || (total - fails) || '/' || total || ' PASS' || rep;
end
$$;
