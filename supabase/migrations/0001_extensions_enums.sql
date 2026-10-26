-- =============================================================================
-- vakil · 0001 — kengaytmalar, xizmat sxemasi, enumlar, umumiy funksiyalar
-- =============================================================================

create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- RLS yordamchi funksiyalari uchun API'ga OCHIQ BO'LMAGAN sxema.
-- (Supabase tavsiyasi: security definer funksiyalar exposed sxemada turmasin.)
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- Yangi jadval va funksiyalar standart holatda YOPIQ: har bir ruxsat aniq beriladi.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private
  revoke execute on functions from public;

-- ───────────────────────────── Enumlar ─────────────────────────────
create type public.app_role as enum ('client', 'operator', 'lawyer', 'admin');
create type public.app_locale as enum ('uz_latn', 'uz_cyrl', 'ru');
create type public.channel as enum ('web', 'telegram', 'sms', 'email');
create type public.publish_status as enum ('draft', 'published', 'archived');
create type public.service_badge as enum ('trend', 'new', 'deadline_soon');
create type public.submission_method as enum ('api', 'operator', 'self');
-- self = "O'zim topshiraman", assisted = "Siz topshiring"
create type public.fulfillment_mode as enum ('self', 'assisted');
create type public.order_status as enum (
  'draft',              -- ma'lumot to'planmoqda
  'collected',          -- Ma'lumot to'plandi
  'ai_checked',         -- AI tekshirdi
  'needs_fix',          -- tuzatish kerak
  'client_approved',    -- Mijoz tasdiqladi
  'package_ready',      -- Paket tayyor (self)
  'operator_reviewed',  -- Operator tekshirdi (assisted)
  'submitted',          -- Topshirildi (raqam bilan)
  'awaiting_response',  -- Javob kutilmoqda
  'completed',          -- Yakunlandi
  'rejected',           -- organ rad etdi
  'cancelled'
);
create type public.actor_type as enum ('client', 'operator', 'lawyer', 'admin', 'system', 'ai');
create type public.check_engine as enum ('rule', 'ai', 'human');
create type public.check_result as enum ('pending', 'pass', 'fail', 'warn', 'error');
create type public.document_kind as enum ('upload', 'evidence', 'power_of_attorney', 'receipt', 'other');
create type public.document_type as enum (
  'passport', 'id_card', 'driver_license', 'birth_certificate', 'marriage_certificate',
  'photo', 'vehicle_registration', 'contract', 'court_decision', 'other'
);
create type public.scan_status as enum ('pending', 'clean', 'infected');
create type public.generated_kind as enum ('document', 'package', 'instructions');
create type public.file_format as enum ('docx', 'pdf', 'zip');
create type public.generated_status as enum ('draft', 'client_approved', 'final', 'superseded');
create type public.consent_type as enum (
  'offer', 'personal_data', 'ai_processing', 'assisted_submission', 'power_of_attorney', 'marketing'
);
create type public.signature_method as enum ('checkbox', 'sms_otp', 'e_imzo');
create type public.payment_provider as enum ('click', 'payme', 'uzum');
create type public.payment_status as enum ('created', 'pending', 'paid', 'cancelled', 'refunded', 'failed');
create type public.payment_purpose as enum ('subscription', 'one_time');
-- package = "Paket tayyorlash", assisted_submission = "Biz topshiramiz"
create type public.offer_kind as enum ('package', 'assisted_submission', 'lawyer_review');
create type public.subscription_status as enum ('active', 'past_due', 'cancelled', 'expired');
create type public.partner_type as enum ('lawyer', 'notary', 'translator', 'photo_studio', 'driving_school', 'other');
create type public.referral_status as enum ('created', 'accepted', 'completed', 'cancelled');
create type public.notification_status as enum ('queued', 'sent', 'failed');
create type public.reminder_kind as enum ('doc_expiry', 'deadline', 'trend_open', 'trend_result', 'order_action');
create type public.source_status as enum ('verified', 'needs_review', 'outdated');
create type public.knowledge_source_type as enum ('law', 'service_config', 'portal_guide', 'faq');
create type public.chat_role as enum ('user', 'assistant');
create type public.escalation_reason as enum ('criminal', 'large_amount', 'deadline_missed', 'other');
create type public.agent_action_status as enum ('proposed', 'approved', 'rejected', 'executed', 'failed');

-- ───────────────────────── Umumiy trigger ─────────────────────────
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
