drop policy if exists "club_backgrounds_read" on storage.objects;
drop policy if exists "club_backgrounds_admin_insert" on storage.objects;
drop policy if exists "club_backgrounds_admin_update" on storage.objects;
drop policy if exists "club_backgrounds_admin_delete" on storage.objects;

create policy "club_backgrounds_read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'club-files'
  and (storage.foldername(name))[1] = 'backgrounds'
  and (storage.foldername(name))[2] = public.current_club_id()::text
);

create policy "club_backgrounds_admin_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'club-files'
  and (storage.foldername(name))[1] = 'backgrounds'
  and (storage.foldername(name))[2] = public.current_club_id()::text
  and public.is_administrator()
);

create policy "club_backgrounds_admin_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'club-files'
  and (storage.foldername(name))[1] = 'backgrounds'
  and (storage.foldername(name))[2] = public.current_club_id()::text
  and public.is_administrator()
)
with check (
  bucket_id = 'club-files'
  and (storage.foldername(name))[1] = 'backgrounds'
  and (storage.foldername(name))[2] = public.current_club_id()::text
  and public.is_administrator()
);

create policy "club_backgrounds_admin_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'club-files'
  and (storage.foldername(name))[1] = 'backgrounds'
  and (storage.foldername(name))[2] = public.current_club_id()::text
  and public.is_administrator()
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_settings'
  ) then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end $$;