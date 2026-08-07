-- ============================================================================
-- VOLLEYCOACH HUB · PASO 4: LOGINS POR USERNAME DINÁMICO (AUTH_EMAIL)
-- ============================================================================

-- 1. Añadir columna auth_email a public.profiles
alter table public.profiles
  add column if not exists auth_email text;

-- 2. Poblar auth_email existente a partir de auth.users
update public.profiles p
set auth_email = u.email
from auth.users u
where p.id = u.id and (p.auth_email is null or p.auth_email = '');

-- 3. Actualizar función del trigger handle_new_user para guardar auth_email
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fallback_club uuid;
begin
  select id into fallback_club from public.clubs order by created_at asc limit 1;
  insert into public.profiles (id, club_id, username, full_name, role, auth_email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'club_id')::uuid, fallback_club),
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'player'),
    new.email
  )
  on conflict (id) do update set auth_email = excluded.auth_email;
  return new;
end;
$$;

-- 4. Función de búsqueda segura de correo por username para el Login
create or replace function public.get_auth_email_by_username(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select auth_email
  from public.profiles
  where lower(username) = lower(trim(p_username))
    and active = true
  limit 1;
$$;

-- Permitir ejecución anónima y autenticada para el proceso de Login
grant execute on function public.get_auth_email_by_username(text) to anon, authenticated;
