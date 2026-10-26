-- =============================================================================
-- vakil · 0003 — buyurtmalar, vaqt chizig'i, hujjatlar, tekshiruvlar,
--                yaratilgan hujjatlar, roziliklar, AI harakatlari
-- =============================================================================

create sequence public.order_public_seq;

create table public.orders (
  id                   uuid primary key default gen_random_uuid(),
  -- mijozga ko'rinadigan raqam: VK-2026-000123
  public_code          text not null unique
                       default ('VK-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_public_seq')::text, 6, '0')),
  user_id              uuid not null references public.profiles (id) on delete restrict,
  service_version_id   uuid not null references public.service_versions (id) on delete restrict,
  status               public.order_status not null default 'draft',
  fulfillment_mode     public.fulfillment_mode not null default 'self',
  submission_method    public.submission_method,
  answers_enc          bytea,                         -- savol-javoblar (shifrlangan JSON)
  progress             smallint not null default 0 check (progress between 0 and 100),
  assigned_operator_id uuid references public.profiles (id) on delete set null,
  assigned_lawyer_id   uuid references public.profiles (id) on delete set null,
  external_ref         text,                          -- ariza / tasdiqlash raqami
  external_ref_at      timestamptz,
  submitted_at         timestamptz,
  completed_at         timestamptz,
  cancelled_at         timestamptz,
  retention_until      timestamptz,                   -- avtomatik o'chirish sanasi
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- "Siz topshiring": topshirilgan buyurtmada ariza raqami bo'lishi SHART
  constraint orders_assisted_submitted_has_ref check (
    fulfillment_mode = 'self'
    or status not in ('submitted', 'awaiting_response', 'completed')
    or external_ref is not null
  )
);
create index orders_user_status_idx on public.orders (user_id, status);
create index orders_status_operator_idx on public.orders (status, assigned_operator_id);
create index orders_lawyer_idx on public.orders (assigned_lawyer_id);
create index orders_service_version_idx on public.orders (service_version_id);
create trigger orders_updated_at before update on public.orders
  for each row execute function private.set_updated_at();

-- Yuklangan fayllar va "Hujjatlarim" arxivi
create table public.documents (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete restrict,
  order_id          uuid references public.orders (id) on delete set null,
  requirement_id    uuid references public.service_requirements (id) on delete set null,
  kind              public.document_kind not null default 'upload',
  doc_type          public.document_type,
  bucket            text not null default 'documents',
  storage_path      text not null,                    -- {user_id}/{order_id|archive}/{uuid}.{ext}
  mime_type         text not null,
  size_bytes        bigint not null check (size_bytes > 0),
  sha256            text,
  scan_status       public.scan_status not null default 'pending',
  original_name_enc bytea,
  extracted_enc     bytea,                            -- OCR / MRZ natijalari (shifrlangan)
  doc_number_hash   text,                             -- hujjat raqami blind index
  valid_until       date,                             -- amal qilish muddati → eslatma
  created_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  unique (bucket, storage_path)
);
create index documents_user_valid_idx on public.documents (user_id, valid_until);
create index documents_order_idx on public.documents (order_id);
create index documents_requirement_idx on public.documents (requirement_id);

-- Vaqt chizig'idagi har bir qadam: sana, bajaruvchi, izoh, dalil
create table public.order_steps (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.orders (id) on delete cascade,
  from_status          public.order_status,
  to_status            public.order_status not null,
  actor_type           public.actor_type not null,
  actor_id             uuid references public.profiles (id) on delete set null,
  comment              text,
  evidence_document_id uuid references public.documents (id) on delete set null,
  is_visible_to_client boolean not null default true,
  created_at           timestamptz not null default now()
);
create index order_steps_order_idx on public.order_steps (order_id, created_at);
create index order_steps_actor_idx on public.order_steps (actor_id);
create index order_steps_evidence_idx on public.order_steps (evidence_document_id);

-- Buyurtma ichidagi operator bilan chat
create table public.order_messages (
  id                     uuid primary key default gen_random_uuid(),
  order_id               uuid not null references public.orders (id) on delete cascade,
  sender_id              uuid not null references public.profiles (id) on delete restrict,
  sender_type            public.actor_type not null,
  body                   text not null check (char_length(body) between 1 and 4000),
  attachment_document_id uuid references public.documents (id) on delete set null,
  read_at                timestamptz,
  created_at             timestamptz not null default now()
);
create index order_messages_order_idx on public.order_messages (order_id, created_at);
create index order_messages_sender_idx on public.order_messages (sender_id);
create index order_messages_attachment_idx on public.order_messages (attachment_document_id);

-- Har bir mezon bo'yicha ✅ / ❌ natija
create table public.checks (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  document_id    uuid references public.documents (id) on delete set null,
  requirement_id uuid references public.service_requirements (id) on delete set null,
  rule_code      text not null,                       -- "photo.size", "mrz.checksum" ...
  engine         public.check_engine not null,
  result         public.check_result not null default 'pending',
  message        jsonb,                               -- oddiy tilda tushuntirish (i18n)
  fix_hint       jsonb,                               -- qanday tuzatish (i18n)
  measured       jsonb,                               -- {"head_pct": 61.2}
  source_id      uuid references public.legal_sources (id),
  ai_model       text,
  prompt_version text,
  created_at     timestamptz not null default now()
);
create index checks_order_result_idx on public.checks (order_id, result);
create index checks_document_idx on public.checks (document_id);
create index checks_requirement_idx on public.checks (requirement_id);
create index checks_source_idx on public.checks (source_id);

-- Platforma yaratgan hujjatlar va paketlar
create table public.generated_docs (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  template_id  uuid references public.doc_templates (id) on delete set null,
  kind         public.generated_kind not null,
  format       public.file_format not null,
  version      int not null default 1 check (version > 0),
  storage_path text not null,                         -- bucket: generated
  sha256       text not null,
  status       public.generated_status not null default 'draft',
  citations    jsonb,                                 -- ishlatilgan bo'lak / manba ID'lari
  ai_model     text,
  approved_at  timestamptz,
  approved_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  check (status not in ('client_approved', 'final') or approved_at is not null)
);
create index generated_docs_order_idx on public.generated_docs (order_id, kind);
create index generated_docs_template_idx on public.generated_docs (template_id);
create index generated_docs_approved_by_idx on public.generated_docs (approved_by);

-- Alohida, versiyali roziliklar
create table public.consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete restrict,
  order_id       uuid references public.orders (id) on delete set null,
  type           public.consent_type not null,
  text_version   text not null,                       -- "oferta-v1.0"
  text_hash      text not null,                       -- ko'rsatilgan matn sha256
  method         public.signature_method not null,
  signature_data jsonb,                               -- OTP tasdiq ID / E-IMZO imzo
  ip             inet,
  user_agent     text,
  granted_at     timestamptz not null default now(),
  revoked_at     timestamptz,
  check (revoked_at is null or revoked_at >= granted_at)
);
create index consents_user_type_idx on public.consents (user_id, type);
create index consents_order_idx on public.consents (order_id);

alter table public.trend_subscriptions
  add constraint trend_subscriptions_consent_fk
  foreign key (consent_id) references public.consents (id) on delete set null;
create index trend_subscriptions_consent_idx on public.trend_subscriptions (consent_id);

-- AI taklif qilgan yozish harakati. Faqat inson tasdiqlagandan keyin bajariladi.
create table public.agent_actions (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  tool        text not null,                          -- "update_status", "build_package" ...
  input       jsonb not null,
  rationale   text,
  status      public.agent_action_status not null default 'proposed',
  decided_by  uuid references public.profiles (id) on delete set null,
  decided_at  timestamptz,
  executed_at timestamptz,
  result      jsonb,
  error       text,
  proposed_at timestamptz not null default now(),
  -- taklifdan boshqa har qanday holat inson qarorini talab qiladi
  constraint agent_actions_human_decision check (status = 'proposed' or decided_by is not null)
);
create index agent_actions_order_idx on public.agent_actions (order_id, status);
create index agent_actions_decided_by_idx on public.agent_actions (decided_by);
