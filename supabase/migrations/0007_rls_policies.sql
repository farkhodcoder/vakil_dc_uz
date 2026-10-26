-- =============================================================================
-- vakil · 0007 — Row Level Security va ruxsatlar
-- Tamoyil: hammasi yopiq → kerakli ruxsat aniq beriladi.
--   anon          — faqat ochiq katalog
--   authenticated — o'z ma'lumotlari; xodimlar (aal2) — vazifasiga ko'ra
--   service_role  — Edge Functions (RLS'ni chetlab o'tadi, lekin holat mashinasi
--                   va audit trigger'lari unga ham amal qiladi)
-- =============================================================================

-- Mijoz tomonidan yaratiladigan qatorlarda egasi avtomatik — joriy foydalanuvchi
alter table public.orders              alter column user_id   set default auth.uid();
alter table public.documents           alter column user_id   set default auth.uid();
alter table public.order_messages      alter column sender_id set default auth.uid();
alter table public.trend_subscriptions alter column user_id   set default auth.uid();
alter table public.chat_sessions       alter column user_id   set default auth.uid();

-- ─────────────────────────────── Ruxsatlar ───────────────────────────────
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- O'qish: RLS qatorlarni cheklaydi
grant select on all tables in schema public to authenticated;
grant select on
  public.categories, public.legal_sources, public.ref_values, public.services,
  public.service_versions, public.service_version_sources, public.service_requirements,
  public.price_offers, public.trends, public.plans, public.partners, public.ads
to anon;

-- Admin boshqaradigan katalog (RLS: faqat admin + 2FA)
grant insert, update, delete on
  public.categories, public.legal_sources, public.ref_values, public.services,
  public.service_versions, public.service_version_sources, public.service_requirements,
  public.doc_templates, public.price_offers, public.trends, public.plans,
  public.partners, public.ads, public.knowledge_documents, public.knowledge_chunks
to authenticated;

-- Foydalanuvchi o'zgartira oladigan ustunlar (rol, telefon, shifrlangan maydonlar — YO'Q)
grant update (full_name, locale) on public.profiles to authenticated;
grant insert (user_id, service_version_id, fulfillment_mode) on public.orders to authenticated;
grant update (assigned_operator_id, assigned_lawyer_id, retention_until) on public.orders to authenticated;
grant usage on sequence public.order_public_seq to authenticated;
grant insert (order_id, sender_id, sender_type, body, attachment_document_id) on public.order_messages to authenticated;
grant insert (user_id, order_id, requirement_id, kind, doc_type, bucket, storage_path,
              mime_type, size_bytes, sha256, valid_until)
  on public.documents to authenticated;
grant insert (trend_id, user_id, channel) on public.trend_subscriptions to authenticated;
grant delete on public.trend_subscriptions to authenticated;
grant insert (user_id, channel, title) on public.chat_sessions to authenticated;
grant update (title) on public.chat_sessions to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ───────────────────────── RLS'ni hamma jadvalda yoqish ─────────────────────────
alter table public.profiles                enable row level security;
alter table public.legal_sources           enable row level security;
alter table public.ref_values              enable row level security;
alter table public.categories              enable row level security;
alter table public.services                enable row level security;
alter table public.service_versions        enable row level security;
alter table public.service_version_sources enable row level security;
alter table public.service_requirements    enable row level security;
alter table public.doc_templates           enable row level security;
alter table public.price_offers            enable row level security;
alter table public.trends                  enable row level security;
alter table public.trend_subscriptions     enable row level security;
alter table public.orders                  enable row level security;
alter table public.documents               enable row level security;
alter table public.order_steps             enable row level security;
alter table public.order_messages          enable row level security;
alter table public.checks                  enable row level security;
alter table public.generated_docs          enable row level security;
alter table public.consents                enable row level security;
alter table public.agent_actions           enable row level security;
alter table public.plans                   enable row level security;
alter table public.subscriptions           enable row level security;
alter table public.payments                enable row level security;
alter table public.usage_counters          enable row level security;
alter table public.partners                enable row level security;
alter table public.referrals               enable row level security;
alter table public.ads                     enable row level security;
alter table public.ad_stats                enable row level security;
alter table public.knowledge_documents     enable row level security;
alter table public.knowledge_chunks        enable row level security;
alter table public.chat_sessions           enable row level security;
alter table public.chat_messages           enable row level security;
alter table public.notifications           enable row level security;
alter table public.reminders               enable row level security;
alter table public.audit_logs              enable row level security;
alter table public.order_transitions       enable row level security;

-- ───────────────────────────────── Profillar ─────────────────────────────────
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ───────────── Ochiq katalog: o'qish hammaga, yozish faqat admin (2FA) ─────────────
-- categories
create policy categories_select on public.categories for select to anon, authenticated
  using (is_active or (select private.is_staff()));
create policy categories_insert on public.categories for insert to authenticated
  with check ((select private.is_admin()));
create policy categories_update on public.categories for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy categories_delete on public.categories for delete to authenticated
  using ((select private.is_admin()));

-- legal_sources (qonun havolalari — ochiq)
create policy legal_sources_select on public.legal_sources for select to anon, authenticated
  using (true);
create policy legal_sources_insert on public.legal_sources for insert to authenticated
  with check ((select private.is_admin()));
create policy legal_sources_update on public.legal_sources for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy legal_sources_delete on public.legal_sources for delete to authenticated
  using ((select private.is_admin()));

-- ref_values
create policy ref_values_select on public.ref_values for select to anon, authenticated
  using (true);
create policy ref_values_insert on public.ref_values for insert to authenticated
  with check ((select private.is_admin()));
create policy ref_values_update on public.ref_values for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy ref_values_delete on public.ref_values for delete to authenticated
  using ((select private.is_admin()));

-- services
create policy services_select on public.services for select to anon, authenticated
  using (status = 'published' or (select private.is_staff()));
create policy services_insert on public.services for insert to authenticated
  with check ((select private.is_admin()));
create policy services_update on public.services for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy services_delete on public.services for delete to authenticated
  using ((select private.is_admin()));

-- service_versions
create policy service_versions_select on public.service_versions for select to anon, authenticated
  using (published_at is not null or (select private.is_staff()));
create policy service_versions_insert on public.service_versions for insert to authenticated
  with check ((select private.is_admin()));
create policy service_versions_update on public.service_versions for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy service_versions_delete on public.service_versions for delete to authenticated
  using ((select private.is_admin()));

-- service_version_sources
create policy service_version_sources_select on public.service_version_sources for select to anon, authenticated
  using (
    service_version_id in (select v.id from public.service_versions v where v.published_at is not null)
    or (select private.is_staff())
  );
create policy service_version_sources_insert on public.service_version_sources for insert to authenticated
  with check ((select private.is_admin()));
create policy service_version_sources_update on public.service_version_sources for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy service_version_sources_delete on public.service_version_sources for delete to authenticated
  using ((select private.is_admin()));

-- service_requirements
create policy service_requirements_select on public.service_requirements for select to anon, authenticated
  using (
    service_version_id in (select v.id from public.service_versions v where v.published_at is not null)
    or (select private.is_staff())
  );
create policy service_requirements_insert on public.service_requirements for insert to authenticated
  with check ((select private.is_admin()));
create policy service_requirements_update on public.service_requirements for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy service_requirements_delete on public.service_requirements for delete to authenticated
  using ((select private.is_admin()));

-- doc_templates (faqat xodimlar)
create policy doc_templates_select on public.doc_templates for select to authenticated
  using ((select private.is_staff()));
create policy doc_templates_insert on public.doc_templates for insert to authenticated
  with check ((select private.is_admin()));
create policy doc_templates_update on public.doc_templates for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy doc_templates_delete on public.doc_templates for delete to authenticated
  using ((select private.is_admin()));

-- price_offers
create policy price_offers_select on public.price_offers for select to anon, authenticated
  using (is_active or (select private.is_staff()));
create policy price_offers_insert on public.price_offers for insert to authenticated
  with check ((select private.is_admin()));
create policy price_offers_update on public.price_offers for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy price_offers_delete on public.price_offers for delete to authenticated
  using ((select private.is_admin()));

-- trends
create policy trends_select on public.trends for select to anon, authenticated
  using (is_active or (select private.is_staff()));
create policy trends_insert on public.trends for insert to authenticated
  with check ((select private.is_admin()));
create policy trends_update on public.trends for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy trends_delete on public.trends for delete to authenticated
  using ((select private.is_admin()));

-- plans
create policy plans_select on public.plans for select to anon, authenticated
  using (is_active or (select private.is_staff()));
create policy plans_insert on public.plans for insert to authenticated
  with check ((select private.is_admin()));
create policy plans_update on public.plans for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy plans_delete on public.plans for delete to authenticated
  using ((select private.is_admin()));

-- partners
create policy partners_select on public.partners for select to anon, authenticated
  using (is_active or (select private.is_staff()));
create policy partners_insert on public.partners for insert to authenticated
  with check ((select private.is_admin()));
create policy partners_update on public.partners for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy partners_delete on public.partners for delete to authenticated
  using ((select private.is_admin()));

-- ads (faqat faol va muddati ichidagi reklama ko'rinadi)
create policy ads_select on public.ads for select to anon, authenticated
  using ((is_active and starts_at <= now() and ends_at > now()) or (select private.is_staff()));
create policy ads_insert on public.ads for insert to authenticated
  with check ((select private.is_admin()));
create policy ads_update on public.ads for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy ads_delete on public.ads for delete to authenticated
  using ((select private.is_admin()));

create policy ad_stats_select on public.ad_stats for select to authenticated
  using ((select private.is_admin()));

-- Bilim bazasi (RAG serverda service_role orqali; ko'rish — xodimlar)
create policy knowledge_documents_select on public.knowledge_documents for select to authenticated
  using ((select private.is_staff()));
create policy knowledge_documents_insert on public.knowledge_documents for insert to authenticated
  with check ((select private.is_admin()));
create policy knowledge_documents_update on public.knowledge_documents for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy knowledge_documents_delete on public.knowledge_documents for delete to authenticated
  using ((select private.is_admin()));

create policy knowledge_chunks_select on public.knowledge_chunks for select to authenticated
  using ((select private.is_staff()));
create policy knowledge_chunks_insert on public.knowledge_chunks for insert to authenticated
  with check ((select private.is_admin()));
create policy knowledge_chunks_update on public.knowledge_chunks for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy knowledge_chunks_delete on public.knowledge_chunks for delete to authenticated
  using ((select private.is_admin()));

create policy order_transitions_select on public.order_transitions for select to authenticated
  using (true);

-- ─────────────────────────────── Buyurtmalar ───────────────────────────────
create policy orders_select on public.orders
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin())
    or ((select private.has_staff_role('operator'))
        and (fulfillment_mode = 'assisted' or assigned_operator_id = (select auth.uid())))
    or ((select private.has_staff_role('lawyer')) and assigned_lawyer_id = (select auth.uid()))
  );

-- Mijoz faqat o'zi uchun, faqat nashr qilingan xizmatning JORIY versiyasiga qoralama ochadi
create policy orders_insert_own on public.orders
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'draft'
    and service_version_id in (
      select s.current_version_id
        from public.services s
       where s.status = 'published' and s.current_version_id is not null
    )
  );

-- Biriktirish va saqlash muddati — faqat admin (holat esa transition_order() orqali)
create policy orders_update_admin on public.orders
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy order_steps_select on public.order_steps
  for select to authenticated
  using (
    order_id in (select o.id from public.orders o)
    and (is_visible_to_client or (select private.is_staff()))
  );

create policy order_messages_select on public.order_messages
  for select to authenticated
  using (order_id in (select o.id from public.orders o));

create policy order_messages_insert on public.order_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and order_id in (select o.id from public.orders o)
    and sender_type = (
      case when (select private.is_staff()) then (select private.current_app_role())::text
           else 'client' end
    )::public.actor_type
    and (
      attachment_document_id is null
      or attachment_document_id in (
        select d.id from public.documents d where d.order_id = order_messages.order_id
      )
    )
  );

-- ─────────────────────── Hujjatlar va tekshiruvlar ───────────────────────
create policy documents_select on public.documents
  for select to authenticated
  using (
    (user_id = (select auth.uid()) and deleted_at is null)
    or ((select private.is_staff()) and order_id in (select o.id from public.orders o))
  );

-- Mijoz: o'z papkasiga yuklagan fayl. Xodim: buyurtmaga dalil/kvitansiya.
create policy documents_insert on public.documents
  for insert to authenticated
  with check (
    (
      user_id = (select auth.uid())
      and kind = 'upload'
      and bucket = 'documents'
      and storage_path like ((select auth.uid())::text || '/%')
      and (order_id is null
           or order_id in (select o.id from public.orders o where o.user_id = (select auth.uid())))
    )
    or (
      (select private.is_staff())
      and kind in ('evidence', 'receipt')
      and bucket = 'evidence'
      and order_id in (select o.id from public.orders o)
      and user_id = (select o.user_id from public.orders o where o.id = documents.order_id)
    )
  );

create policy checks_select on public.checks
  for select to authenticated
  using (order_id in (select o.id from public.orders o));

create policy generated_docs_select on public.generated_docs
  for select to authenticated
  using (order_id in (select o.id from public.orders o));

create policy agent_actions_select on public.agent_actions
  for select to authenticated
  using ((select private.is_staff()) and order_id in (select o.id from public.orders o));

-- ─────────────────────────────── Roziliklar ───────────────────────────────
-- Yozish faqat server orqali (IP va qurilma server tomonida olinadi)
create policy consents_select on public.consents
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin())
    or ((select private.is_staff()) and order_id in (select o.id from public.orders o))
  );

-- ─────────────────────────── To'lovlar va obunalar ───────────────────────────
create policy payments_select on public.payments
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy usage_counters_select on public.usage_counters
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy referrals_select on public.referrals
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- ─────────────────────────── Trend obunalari ───────────────────────────
-- Kirgan foydalanuvchi faqat o'zi uchun obuna bo'ladi (telefon/telegram profildan olinadi).
-- Mehmon obunasi (Telegram bot, SMS) — server orqali.
create policy trend_subscriptions_select on public.trend_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy trend_subscriptions_insert_own on public.trend_subscriptions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and phone is null
    and telegram_chat_id is null
    and trend_id in (select t.id from public.trends t where t.is_active)
  );

create policy trend_subscriptions_delete_own on public.trend_subscriptions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─────────────────────────────── AI chat ───────────────────────────────
create policy chat_sessions_select on public.chat_sessions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy chat_sessions_insert_own on public.chat_sessions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy chat_sessions_update_own on public.chat_sessions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Xabarlarni AI server (service_role) yozadi
create policy chat_messages_select on public.chat_messages
  for select to authenticated
  using (session_id in (select s.id from public.chat_sessions s));

-- ─────────────────────── Bildirishnoma, eslatma, audit ───────────────────────
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy reminders_select on public.reminders
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using ((select private.is_admin()));
