-- =============================================================================
-- vakil · 0010 — performance advisor: indekssiz foreign key'lar
-- =============================================================================

create index legal_sources_checked_by_idx on public.legal_sources (checked_by);
create index orders_assigned_operator_idx on public.orders (assigned_operator_id);
create index service_versions_published_by_idx on public.service_versions (published_by);

-- kompozit FK (current_version_id, id) uchun mos indeks
drop index public.services_current_version_idx;
create index services_current_version_idx on public.services (current_version_id, id);
