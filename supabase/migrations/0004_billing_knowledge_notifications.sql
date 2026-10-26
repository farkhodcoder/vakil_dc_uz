-- =============================================================================
-- vakil · 0004 — tariflar, to'lovlar, hamkorlar, reklama,
--                bilim bazasi (RAG), AI chat, bildirishnomalar, eslatmalar
-- =============================================================================

-- ─────────────────────────── Tariflar va to'lovlar ───────────────────────────
create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,                   -- "free", "premium"
  name        jsonb not null,
  price_tiyin bigint check (price_tiyin >= 0),        -- null = narx hali belgilanmagan
  period_days int check (period_days > 0),
  limits      jsonb not null default '{}',
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- narxsiz tarif faollashtirilmaydi
  check (not is_active or price_tiyin is not null)
);
create trigger plans_updated_at before update on public.plans
  for each row execute function private.set_updated_at();

create table public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (id) on delete cascade,
  plan_id              uuid not null references public.plans (id),
  status               public.subscription_status not null default 'active',
  current_period_start timestamptz not null,
  current_period_end   timestamptz not null,
  cancel_at_period_end boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (current_period_end > current_period_start)
);
create index subscriptions_user_status_idx on public.subscriptions (user_id, status);
create index subscriptions_plan_idx on public.subscriptions (plan_id);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function private.set_updated_at();

create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete restrict,
  purpose            public.payment_purpose not null,
  order_id           uuid references public.orders (id) on delete set null,
  subscription_id    uuid references public.subscriptions (id) on delete set null,
  offer_id           uuid references public.price_offers (id) on delete set null,
  provider           public.payment_provider not null,
  provider_txn_id    text,
  amount_tiyin       bigint not null check (amount_tiyin > 0),
  currency           text not null default 'UZS',
  status             public.payment_status not null default 'created',
  fiscal_receipt_url text,                            -- fiskal chek
  fiscal_data        jsonb,
  provider_payload   jsonb,                           -- minimal, shaxsiy ma'lumotsiz
  paid_at            timestamptz,
  cancelled_at       timestamptz,
  refunded_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (provider, provider_txn_id),
  check (status <> 'paid' or paid_at is not null)
);
create index payments_user_idx on public.payments (user_id, created_at);
create index payments_order_idx on public.payments (order_id);
create index payments_subscription_idx on public.payments (subscription_id);
create index payments_offer_idx on public.payments (offer_id);
create trigger payments_updated_at before update on public.payments
  for each row execute function private.set_updated_at();

-- Bepul tarif limitlari (kuniga N savol, oyiga 1 hujjat)
create table public.usage_counters (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  metric     text not null,                           -- "chat_question", "simple_doc"
  period_key text not null,                           -- "2026-10-25" yoki "2026-10"
  count      int not null default 0 check (count >= 0),
  unique (user_id, metric, period_key)
);

-- ─────────────────────────── Hamkorlar va reklama ───────────────────────────
create table public.partners (
  id                    uuid primary key default gen_random_uuid(),
  type                  public.partner_type not null,
  name                  text not null,
  user_id               uuid unique references public.profiles (id) on delete set null,
  license_number        text,
  license_verified_at   timestamptz,
  regions               text[] not null default '{}',
  contacts              jsonb not null default '{}',
  commission_pct        numeric(5, 2) check (commission_pct between 0 and 100),
  commission_disclosure jsonb,                        -- mijozga ochiq ko'rsatiladigan matn
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- sudda vakillik faqat litsenziyasi tekshirilgan advokat orqali
  constraint partners_active_lawyer_licensed check (
    type <> 'lawyer' or not is_active or license_verified_at is not null
  )
);
create index partners_type_active_idx on public.partners (type, is_active);
create trigger partners_updated_at before update on public.partners
  for each row execute function private.set_updated_at();

create table public.referrals (
  id               uuid primary key default gen_random_uuid(),
  partner_id       uuid not null references public.partners (id),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  order_id         uuid references public.orders (id) on delete set null,
  status           public.referral_status not null default 'created',
  commission_tiyin bigint check (commission_tiyin >= 0),
  disclosed_at     timestamptz not null,              -- komissiya mijozga aytilgan payt (majburiy)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index referrals_partner_idx on public.referrals (partner_id);
create index referrals_user_idx on public.referrals (user_id);
create index referrals_order_idx on public.referrals (order_id);
create trigger referrals_updated_at before update on public.referrals
  for each row execute function private.set_updated_at();

-- Reklama faqat ochiq ma'lumot sahifalarida. Ruxsat etilgan joylar ro'yxati
-- shu yerda qat'iy: kabinet / hujjat / to'lov sahifalari ro'yxatda YO'Q.
create table public.ads (
  id              uuid primary key default gen_random_uuid(),
  partner_id      uuid references public.partners (id) on delete set null,
  advertiser_name text not null,
  title           jsonb not null,
  body            jsonb,
  image_path      text,                               -- bucket: public-assets
  target_url      text not null check (target_url ~* '^https://'),
  placements      text[] not null check (
                    cardinality(placements) > 0
                    and placements <@ array['catalog:inline', 'category:inline', 'service:sidebar', 'trend:footer']
                  ),
  service_slugs   text[] not null default '{}',
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index ads_active_period_idx on public.ads (is_active, starts_at, ends_at);
create index ads_partner_idx on public.ads (partner_id);

create table public.ad_stats (
  id          uuid primary key default gen_random_uuid(),
  ad_id       uuid not null references public.ads (id) on delete cascade,
  date        date not null,
  impressions int not null default 0 check (impressions >= 0),
  clicks      int not null default 0 check (clicks >= 0),
  unique (ad_id, date)
);

-- ─────────────────────────── Bilim bazasi (RAG) ───────────────────────────
create table public.knowledge_documents (
  id              uuid primary key default gen_random_uuid(),
  source_type     public.knowledge_source_type not null,
  legal_source_id uuid references public.legal_sources (id) on delete set null,
  service_id      uuid references public.services (id) on delete set null,
  title           text not null,
  url             text not null,
  locale          public.app_locale not null,
  content_hash    text not null,
  status          public.source_status not null default 'needs_review',
  last_checked_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index knowledge_documents_source_idx on public.knowledge_documents (legal_source_id);
create index knowledge_documents_service_idx on public.knowledge_documents (service_id);
create trigger knowledge_documents_updated_at before update on public.knowledge_documents
  for each row execute function private.set_updated_at();

-- Modda darajasidagi bo'lak: embedding (pgvector) + tsv (full-text) → gibrid qidiruv
create table public.knowledge_chunks (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references public.knowledge_documents (id) on delete cascade,
  legal_source_id uuid references public.legal_sources (id) on delete set null, -- iqtibosdagi modda
  ordinal         int not null,
  heading         text,                               -- "N-modda. …"
  content         text not null,                      -- asl matn
  content_norm    text not null,                      -- lotinga normallashtirilgan
  content_hash    text not null,
  token_count     int not null default 0,
  embedding       extensions.vector(1024),            -- BGE-M3 o'lchami
  tsv             tsvector generated always as (
                    to_tsvector('simple'::regconfig, coalesce(heading, '') || ' ' || content_norm)
                  ) stored,
  metadata        jsonb,
  created_at      timestamptz not null default now(),
  unique (document_id, ordinal)
);
create index knowledge_chunks_source_idx on public.knowledge_chunks (legal_source_id);
create index knowledge_chunks_tsv_idx on public.knowledge_chunks using gin (tsv);
create index knowledge_chunks_embedding_idx on public.knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- ─────────────────────────────── AI chat ───────────────────────────────
create table public.chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete cascade, -- mehmonda null
  channel    public.channel not null default 'web',
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chat_sessions_user_idx on public.chat_sessions (user_id, updated_at);
create trigger chat_sessions_updated_at before update on public.chat_sessions
  for each row execute function private.set_updated_at();

create table public.chat_messages (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null references public.chat_sessions (id) on delete cascade,
  role                 public.chat_role not null,
  content_enc          bytea not null,
  citations            jsonb,                         -- [{chunk_id, legal_source_id, cited_text}]
  suggested_service_id uuid references public.services (id) on delete set null,
  escalation           public.escalation_reason,
  ai_model             text,
  input_tokens         int,
  output_tokens        int,
  feedback             smallint check (feedback in (-1, 1)),
  created_at           timestamptz not null default now()
);
create index chat_messages_session_idx on public.chat_messages (session_id, created_at);
create index chat_messages_service_idx on public.chat_messages (suggested_service_id);

-- ─────────────────────────── Bildirishnoma va eslatma ───────────────────────────
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  order_id   uuid references public.orders (id) on delete set null,
  channel    public.channel not null,
  template   text not null,                           -- "order.status_changed", "order.external_ref"
  payload    jsonb not null default '{}',
  status     public.notification_status not null default 'queued',
  error      text,
  sent_at    timestamptz,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_queue_idx on public.notifications (status, created_at);
create index notifications_user_idx on public.notifications (user_id, created_at);
create index notifications_order_idx on public.notifications (order_id);

create table public.reminders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        public.reminder_kind not null,
  document_id uuid references public.documents (id) on delete cascade,
  order_id    uuid references public.orders (id) on delete cascade,
  trend_id    uuid references public.trends (id) on delete cascade,
  remind_at   timestamptz not null,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index reminders_due_idx on public.reminders (remind_at) where sent_at is null;
create index reminders_user_idx on public.reminders (user_id);
create index reminders_document_idx on public.reminders (document_id);
create index reminders_order_idx on public.reminders (order_id);
create index reminders_trend_idx on public.reminders (trend_id);
