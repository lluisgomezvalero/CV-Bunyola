-- VolleyCoach Hub · RC3.0 Bloque B
-- Ejecutar una sola vez en Supabase > SQL Editor.

begin;

alter table public.profiles
  add column if not exists preferred_language text not null default 'es';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_preferred_language_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_preferred_language_check
      check (preferred_language in ('es','ca'));
  end if;
end $$;

update public.profiles
set preferred_language = 'es'
where preferred_language is null or preferred_language not in ('es','ca');

commit;

select id, username, full_name, role, club_id, preferred_language, active
from public.profiles
order by role, full_name;
