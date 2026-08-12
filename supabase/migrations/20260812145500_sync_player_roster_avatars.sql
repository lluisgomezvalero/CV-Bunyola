alter table public.players add column if not exists avatar_path text;

create policy "club_player_avatars_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (current_club_id())::text
);

create policy "club_player_avatars_staff_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (current_club_id())::text
  and is_staff()
);

create policy "club_player_avatars_staff_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (current_club_id())::text
  and is_staff()
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (current_club_id())::text
  and is_staff()
);

create policy "club_player_avatars_staff_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (current_club_id())::text
  and is_staff()
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'players'
  ) then
    alter publication supabase_realtime add table public.players;
  end if;
end $$;
