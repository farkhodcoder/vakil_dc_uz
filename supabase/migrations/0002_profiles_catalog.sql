-- =============================================================================
-- vakil · 0002 — profillar, manbalar, katalog, xizmat konfiguratsiyasi, trendlar
-- Foydalanuvchilar: auth.users (Supabase Auth) + public.profiles (rol, til, ...)
-- =============================================================================

-- ─────────────────────────────── Profillar ───────────────────────────────
create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  role                  public.app_role   not null default 'client',
  phone                 text unique,                 -- +998XXXXXXXXX (auth.users'dan trigger bilan)
  full_name             text,
  locale                public.app_locale not null default 'uz_latn',
  telegram_id           bigint unique,
  pinfl_enc             bytea,                       -- JShShIR (ilova darajasida shifrlangan)
  pinfl_hash            text unique,                 -- blind index
  deletion_requested_at timestamptz,
  deleted_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- ─────────────────────────────── Manbalar ───────────────────────────────
-- Har bir huquqiy qoida shu jadvalga bog'lanadi: havola + "oxirgi tekshirilgan sana".
create table public.legal_sources (
  id              uuid primary key default gen_random_uuid(),
  title           jsonb not null,                    -- {"uz_latn": "...", "uz_cyrl": "...", "ru": "..."}
  article         text,                              -- "N-modda", "M-band"
  url             text not null check (url ~* '^https://'),
  publisher       text,                              -- "lex.uz", "dvprogram.state.gov", ...
  excerpt         text,
  status          public.source_status not null default 'needs_review',
  last_checked_at timestamptz,
  checked_by      uuid references public.profiles (id) on delete set null,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- "tasdiqlangan" manba tekshirilgan sanasiz bo'lishi mumkin emas
  constraint legal_sources_verified_has_date check (status <> 'verified' or last_checked_at is not null)
);
create index legal_sources_status_checked_idx on public.legal_sources (status, last_checked_at);
create trigger legal_sources_updated_at before update on public.legal_sources
  for each row execute function private.set_updated_at();

-- O'zgaruvchan raqamli qiymatlar (BHM, boj stavkalari...) — amal qilish sanasi va manba bilan.
create table public.ref_values (
  id             uuid primary key default gen_random_uuid(),
  key            text not null,                      -- "BHM", "court_duty.<turi>.rate"
  value          numeric(18, 4) not null,
  unit           text not null,                      -- "UZS", "percent", "BHM"
  effective_from date not null,
  effective_to   date,
  source_id      uuid not null references public.legal_sources (id),
  created_at     timestamptz not null default now(),
  unique (key, effective_from),
  check (effective_to is null or effective_to > effective_from)
);
create index ref_values_source_idx on public.ref_values (source_id);

-- ─────────────────────────────── Katalog ───────────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        jsonb not null,
  description jsonb,
  icon        text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger categories_updated_at before update on public.categories
  for each row execute function private.set_updated_at();

create table public.services (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  category_id        uuid not null references public.categories (id),
  status             public.publish_status not null default 'draft',
  badges             public.service_badge[] not null default '{}',
  sort_order         int not null default 0,
  current_version_id uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index services_category_status_idx on public.services (category_id, status);
create trigger services_updated_at before update on public.services
  for each row execute function private.set_updated_at();

-- Xizmat konfiguratsiyasining o'zgarmas versiyasi. Buyurtma shu versiyaga qotiriladi.
create table public.service_versions (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid not null references public.services (id) on delete cascade,
  version      int not null check (version > 0),
  config       jsonb not null,                       -- savollar, boj, muddat, bosqichlar, topshirish
  config_hash  text not null,
  change_note  text,
  published_at timestamptz,
  published_by uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (service_id, version),
  unique (id, service_id)
);

-- Joriy versiya aynan shu xizmatga tegishli bo'lishi shart (kompozit FK)
alter table public.services
  add constraint services_current_version_fk
  foreign key (current_version_id, id) references public.service_versions (id, service_id);
create index services_current_version_idx on public.services (current_version_id);

-- Huquqiy asos (versiya ↔ manba)
create table public.service_version_sources (
  service_version_id uuid not null references public.service_versions (id) on delete cascade,
  legal_source_id    uuid not null references public.legal_sources (id),
  role               text not null default 'asosiy', -- "asosiy", "boj", "muddat", ...
  primary key (service_version_id, legal_source_id)
);
create index service_version_sources_source_idx on public.service_version_sources (legal_source_id);

-- Kerakli hujjat va uning tekshirish qoidalari
create table public.service_requirements (
  id                 uuid primary key default gen_random_uuid(),
  service_version_id uuid not null references public.service_versions (id) on delete cascade,
  code               text not null,                  -- "birth_certificate", "dv_photo"
  title              jsonb not null,
  description        jsonb,
  document_type      public.document_type,
  is_required        boolean not null default true,
  accepted_mime      text[] not null default '{}',
  max_size_bytes     int check (max_size_bytes > 0),
  rules              jsonb not null default '[]',    -- [{engine, code, params, source_id}]
  source_id          uuid references public.legal_sources (id),
  sort_order         int not null default 0,
  unique (service_version_id, code)
);
create index service_requirements_source_idx on public.service_requirements (source_id);

create table public.doc_templates (
  id                 uuid primary key default gen_random_uuid(),
  service_version_id uuid not null references public.service_versions (id) on delete cascade,
  code               text not null,                  -- "aliment_davo_v1"
  title              jsonb not null,
  locale             public.app_locale not null,
  storage_path       text not null,                  -- bucket: templates
  file_hash          text not null,
  variables          jsonb not null default '{}',
  reviewed_by        uuid references public.profiles (id) on delete set null, -- advokat
  reviewed_at        timestamptz,
  created_at         timestamptz not null default now(),
  unique (service_version_id, code, locale)
);
create index doc_templates_reviewed_by_idx on public.doc_templates (reviewed_by);

-- Bir martalik xizmat narxlari — mijozga oldindan ochiq ko'rsatiladi
create table public.price_offers (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.services (id) on delete cascade,
  kind        public.offer_kind not null,
  price_tiyin bigint not null check (price_tiyin >= 0),
  currency    text not null default 'UZS',
  description jsonb,
  is_active   boolean not null default true,
  valid_from  timestamptz not null default now(),
  valid_to    timestamptz,
  check (valid_to is null or valid_to > valid_from)
);
create index price_offers_service_idx on public.price_offers (service_id, kind, is_active);

-- ─────────────────────────────── Trendlar ───────────────────────────────
create table public.trends (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.services (id) on delete cascade,
  slug        text not null unique,                  -- landing: /dolzarb/[slug]
  title       jsonb not null,
  summary     jsonb,
  opens_at    timestamptz,                           -- ro'yxat ochilishi
  deadline_at timestamptz,                           -- teskari sanoq
  results_at  timestamptz,                           -- natija sanasi (eslatma)
  landing     jsonb not null default '{}',
  seo         jsonb,
  disclaimer  jsonb,                                 -- doimiy ogohlantirish (DV)
  priority    int not null default 0,
  is_active   boolean not null default false,
  source_id   uuid references public.legal_sources (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (deadline_at is null or opens_at is null or deadline_at > opens_at)
);
create index trends_active_deadline_idx on public.trends (is_active, deadline_at);
create index trends_service_idx on public.trends (service_id);
create index trends_source_idx on public.trends (source_id);
create trigger trends_updated_at before update on public.trends
  for each row execute function private.set_updated_at();

-- "Muddat ochilganda xabar bering" obunasi (consent_id FK 0003 da qo'shiladi)
create table public.trend_subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  trend_id           uuid not null references public.trends (id) on delete cascade,
  user_id            uuid references public.profiles (id) on delete cascade,
  channel            public.channel not null,
  telegram_chat_id   bigint,
  phone              text,
  consent_id         uuid,
  notified_open_at   timestamptz,
  notified_result_at timestamptz,
  unsubscribed_at    timestamptz,
  created_at         timestamptz not null default now(),
  check (user_id is not null or telegram_chat_id is not null or phone is not null)
);
create unique index trend_subscriptions_tg_uniq
  on public.trend_subscriptions (trend_id, channel, telegram_chat_id) where telegram_chat_id is not null;
create unique index trend_subscriptions_phone_uniq
  on public.trend_subscriptions (trend_id, channel, phone) where phone is not null;
create index trend_subscriptions_user_idx on public.trend_subscriptions (user_id);
