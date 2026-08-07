-- ============================================================================
-- VOLLEYCOACH HUB · PASO 4: BUSQUEDA REAL POR CAMPO USERNAME DE PROFILES
-- ============================================================================

-- 1. Añadir columna auth_email a public.profiles si no existe
alter table public.profiles
  add column if not exists auth_email text;

-- 2. Sincronizar auth_email con el email de auth.users para todas las cuentas
update public.profiles p
set auth_email = u.email
from auth.users u
where p.id = u.id and (p.auth_email is null or p.auth_email = '');

-- 3. Permitir que usuarios no autenticados (anon) puedan buscar por username en la pantalla de login
drop policy if exists profiles_anon_username_lookup on public.profiles;
create policy profiles_anon_username_lookup on public.profiles
for select to anon
using (active = true);

-- 4. Función de seguridad RPC para obtener el email asociado al username del perfil
create or replace function public.get_auth_email_by_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select coalesce(p.auth_email, u.email)
  into v_email
  from public.profiles p
  left join auth.users u on u.id = p.id
  where lower(p.username) = lower(trim(p_username))
    and p.active = true
  limit 1;

  return v_email;
end;
$$;

-- Otorgar permiso de ejecución a anon y authenticated
grant execute on function public.get_auth_email_by_username(text) to anon, authenticated;
