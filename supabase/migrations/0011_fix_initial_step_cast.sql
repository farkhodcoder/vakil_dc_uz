-- =============================================================================
-- vakil · 0011 — tuzatish: order_initial_step() da CASE natijasi text edi,
-- actor_type enum'ga aniq cast kerak (smoke test topdi).
-- =============================================================================

create or replace function private.order_initial_step()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.order_steps (order_id, from_status, to_status, actor_type, actor_id)
  values (
    new.id, null, new.status,
    (case when (select auth.uid()) is null then 'system' else 'client' end)::public.actor_type,
    (select auth.uid())
  );
  return new;
end;
$$;
