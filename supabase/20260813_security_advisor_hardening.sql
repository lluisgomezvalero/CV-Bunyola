-- Security Advisor hardening — 2026-08-13
-- Keeps the existing public helper names used by RLS, while moving the
-- privileged SECURITY DEFINER implementations out of the API-exposed schema.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.current_club_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.club_id
  from public.profiles p
  where p.id = (select auth.uid())
    and p.active = true;
$$;

create or replace function private.current_player_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.players p
  where p.profile_id = (select auth.uid())
    and p.active = true
  limit 1;
$$;

create or replace function private.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.active = true;
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select p.role in ('administrator'::public.app_role, 'coach'::public.app_role)
      from public.profiles p
      where p.id = (select auth.uid())
        and p.active = true
    ),
    false
  );
$$;

create or replace function private.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select p.role = 'administrator'::public.app_role
      from public.profiles p
      where p.id = (select auth.uid())
        and p.active = true
    ),
    false
  );
$$;

create or replace function private.get_auth_email_by_username(p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := lower(trim(coalesce(p_username, '')));
  v_email text;
begin
  if v_username = '' or length(v_username) > 80 then
    return null;
  end if;

  select coalesce(u.email, p.auth_email)
    into v_email
  from public.profiles p
  left join auth.users u on u.id = p.id
  where lower(p.username) = v_username
    and p.active = true
  limit 1;

  return v_email;
end;
$$;

-- Public API/RLS-facing wrappers run with caller privileges.
create or replace function public.current_club_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$ select private.current_club_id(); $$;

create or replace function public.current_player_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$ select private.current_player_id(); $$;

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security invoker
set search_path = ''
as $$ select private.current_profile_role(); $$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_staff(); $$;

create or replace function public.is_administrator()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_administrator(); $$;

-- Required by the existing username-login fallback. The privileged lookup
-- remains internal; the API-facing wrapper itself is SECURITY INVOKER.
create or replace function public.get_auth_email_by_username(p_username text)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.get_auth_email_by_username(p_username); $$;

-- Constant healthcheck does not require elevated privileges.
create or replace function public.volleycoach_healthcheck()
returns text
language sql
stable
security invoker
set search_path = ''
as $$ select 'Supabase conectado y esquema VolleyCoach instalado'::text; $$;

-- Trigger functions remain SECURITY DEFINER because they maintain rows after
-- auth.users changes, but they are not public RPC endpoints.
alter function public.handle_new_auth_user() set search_path = '';
alter function public.handle_user_email_update() set search_path = '';

revoke execute on function public.handle_new_auth_user() from anon;
revoke execute on function public.handle_new_auth_user() from authenticated;
revoke execute on function public.handle_new_auth_user() from public;

revoke execute on function public.handle_user_email_update() from anon;
revoke execute on function public.handle_user_email_update() from authenticated;
revoke execute on function public.handle_user_email_update() from public;
