-- =============================================================================
-- vakil · 0008 — fayl saqlash (Supabase Storage)
-- Yo'l tuzilmasi:
--   documents/{user_id}/{order_id|archive}/{uuid}.{ext}   — mijoz yuklaydi
--   generated/{user_id}/{order_id}/{fayl}                 — server yaratadi
--   evidence/{client_user_id}/{order_id}/{fayl}           — operator dalili
--   templates/{service_slug}/{code}_{locale}.docx         — admin
--   public-assets/...                                     — ochiq (logo, reklama)
-- Hamma shaxsiy bucket'lar YOPIQ; fayllarga faqat muddatli (signed) havola orqali.
-- Fayllarni qayta yozish (overwrite) mijozlarga yopiq — dalil o'zgarmaydi.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('documents', 'documents', false, 10485760,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('generated', 'generated', false, 26214400,
    array['application/pdf', 'application/zip',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('evidence', 'evidence', false, 10485760,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('templates', 'templates', false, 5242880,
    array['application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('public-assets', 'public-assets', true, 2097152,
    array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- O'qish
create policy vakil_objects_select on storage.objects
  for select to authenticated
  using (
    case bucket_id
      when 'documents' then
        (storage.foldername(name))[1] = (select auth.uid())::text
        or ((select private.is_staff())
            and private.can_access_order(private.try_uuid((storage.foldername(name))[2])))
      when 'generated' then
        (storage.foldername(name))[1] = (select auth.uid())::text
        or ((select private.is_staff())
            and private.can_access_order(private.try_uuid((storage.foldername(name))[2])))
      when 'evidence' then
        (storage.foldername(name))[1] = (select auth.uid())::text
        or ((select private.is_staff())
            and private.can_access_order(private.try_uuid((storage.foldername(name))[2])))
      when 'templates' then (select private.is_staff())
      when 'public-assets' then (select private.is_admin())
      else false
    end
  );

-- Yuklash
create policy vakil_objects_insert on storage.objects
  for insert to authenticated
  with check (
    case bucket_id
      -- mijoz faqat o'z papkasiga
      when 'documents' then
        (storage.foldername(name))[1] = (select auth.uid())::text
      -- operator dalili: buyurtmaga kirish huquqi + papka buyurtma egasiniki
      when 'evidence' then
        (select private.is_staff())
        and private.can_access_order(private.try_uuid((storage.foldername(name))[2]))
        and (storage.foldername(name))[1] = (
          select o.user_id::text from public.orders o
           where o.id = private.try_uuid((storage.foldername(name))[2])
        )
      when 'templates' then (select private.is_admin())
      when 'public-assets' then (select private.is_admin())
      else false  -- 'generated' faqat server (service_role) yozadi
    end
  );

-- Almashtirish va o'chirish — faqat admin, faqat shablon va ochiq fayllar
create policy vakil_objects_update on storage.objects
  for update to authenticated
  using (bucket_id in ('templates', 'public-assets') and (select private.is_admin()))
  with check (bucket_id in ('templates', 'public-assets') and (select private.is_admin()));

create policy vakil_objects_delete on storage.objects
  for delete to authenticated
  using (bucket_id in ('templates', 'public-assets') and (select private.is_admin()));
