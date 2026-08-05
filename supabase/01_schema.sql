-- VolleyCoach Hub · Supabase Phase 1
-- Ejecutar completo en Supabase > SQL Editor > New query.
-- No contiene contraseñas ni service_role keys.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos y utilidades
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('administrator', 'coach', 'player');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.publication_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Comprobación no sensible para verificar que el esquema está instalado.
create or replace function public.volleycoach_healthcheck()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select 'Supabase conectado y esquema VolleyCoach instalado';
$$;
grant execute on function public.volleycoach_healthcheck() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Estructura principal
-- ---------------------------------------------------------------------------
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_path text,
  primary_color text,
  secondary_color text,
  locale text not null default 'es' check (locale in ('es','ca')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  starts_on date,
  ends_on date,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, name)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete set null,
  name text not null,
  category text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, season_id, name)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete set null,
  username text not null unique,
  full_name text not null,
  role public.app_role not null default 'player',
  avatar_path text,
  active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  profile_id uuid unique references public.profiles(id) on delete set null,
  club_id uuid not null references public.clubs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  dorsal integer,
  birth_date date,
  position text,
  status text default 'Disponible',
  private_data jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, legacy_id)
);

create table if not exists public.team_staff (
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);

create table if not exists public.team_players (
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, player_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  club_id uuid not null references public.clubs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete set null,
  event_type text not null check (event_type in ('training','match','friendly','tournament','birthday','other')),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  status text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, legacy_id)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  player_response text check (player_response in ('yes','no',null)),
  official_status text check (official_status in ('present','late','justified','unjustified',null)),
  validated_by uuid references public.profiles(id) on delete set null,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, player_id)
);

create table if not exists public.wellness_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  entry_date date not null,
  general_state smallint not null check (general_state between 1 and 5),
  fatigue smallint check (fatigue between 1 and 5),
  soreness smallint check (soreness between 1 and 5),
  stress smallint check (stress between 1 and 5),
  sleep smallint not null check (sleep between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, entry_date)
);

create table if not exists public.rpe_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  coach_profile_id uuid references public.profiles(id) on delete cascade,
  score numeric(4,1) not null check (score between 0 and 10),
  source text not null check (source in ('player','coach','coach_for_player')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (source = 'coach' and coach_profile_id is not null and player_id is null)
    or (source in ('player','coach_for_player') and player_id is not null)
  )
);
create unique index if not exists rpe_one_player_per_event
  on public.rpe_entries(event_id, player_id)
  where player_id is not null;
create unique index if not exists rpe_one_coach_per_event
  on public.rpe_entries(event_id, coach_profile_id)
  where source = 'coach';

create table if not exists public.performance_tests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  test_type text not null check (test_type in ('SJ','CMJ','Abalakov','Drop Jump')),
  value numeric not null,
  unit text not null default 'cm',
  tested_on date not null,
  notes text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.match_statistics (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  status public.publication_status not null default 'draft',
  visible_metrics jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_plans (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  version integer not null default 1,
  status public.publication_status not null default 'draft',
  payload jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_plan_reads (
  game_plan_id uuid not null references public.game_plans(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (game_plan_id, player_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  title text not null,
  body text not null,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.app_settings (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  modules jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  club_id uuid references public.clubs(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index if not exists events_team_starts_idx on public.events(team_id, starts_at);
create index if not exists attendance_event_idx on public.attendance(event_id);
create index if not exists wellness_player_date_idx on public.wellness_entries(player_id, entry_date desc);
create index if not exists rpe_event_idx on public.rpe_entries(event_id);
create index if not exists tests_player_date_idx on public.performance_tests(player_id, tested_on desc);

-- ---------------------------------------------------------------------------
-- Funciones de autorización
-- ---------------------------------------------------------------------------
create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true;
$$;

create or replace function public.current_club_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select club_id from public.profiles where id = auth.uid() and active = true;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() in ('administrator','coach'), false);
$$;

create or replace function public.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'administrator', false);
$$;

create or replace function public.current_player_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.players where profile_id = auth.uid() and active = true limit 1;
$$;

grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_club_id() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_administrator() to authenticated;
grant execute on function public.current_player_id() to authenticated;

-- Perfil automático para nuevos usuarios Auth.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fallback_club uuid;
begin
  select id into fallback_club from public.clubs order by created_at asc limit 1;
  insert into public.profiles (id, club_id, username, full_name, role)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'club_id')::uuid, fallback_club),
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'player')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clubs','seasons','teams','profiles','players','events','attendance','wellness_entries','rpe_entries','match_statistics','game_plans']
  LOOP
    EXECUTE format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    EXECUTE format('create trigger set_%I_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpe_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_plan_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Club / temporada / equipos: lectura del propio club; escritura administrador.
drop policy if exists clubs_read_own on public.clubs;
create policy clubs_read_own on public.clubs for select to authenticated
  using (id = public.current_club_id());
drop policy if exists clubs_admin_write on public.clubs;
create policy clubs_admin_write on public.clubs for all to authenticated
  using (id = public.current_club_id() and public.is_administrator())
  with check (id = public.current_club_id() and public.is_administrator());

drop policy if exists seasons_read_own on public.seasons;
create policy seasons_read_own on public.seasons for select to authenticated
  using (club_id = public.current_club_id());
drop policy if exists seasons_admin_write on public.seasons;
create policy seasons_admin_write on public.seasons for all to authenticated
  using (club_id = public.current_club_id() and public.is_administrator())
  with check (club_id = public.current_club_id() and public.is_administrator());

drop policy if exists teams_read_own on public.teams;
create policy teams_read_own on public.teams for select to authenticated
  using (club_id = public.current_club_id());
drop policy if exists teams_admin_write on public.teams;
create policy teams_admin_write on public.teams for all to authenticated
  using (club_id = public.current_club_id() and public.is_administrator())
  with check (club_id = public.current_club_id() and public.is_administrator());

-- Perfiles: uno mismo o staff del club; solo admin gestiona otros perfiles.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or (club_id = public.current_club_id() and public.is_staff()));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles for all to authenticated
  using (club_id = public.current_club_id() and public.is_administrator())
  with check (club_id = public.current_club_id() and public.is_administrator());

-- Jugadoras y plantilla: lectura del club; escritura staff.
drop policy if exists players_read_club on public.players;
create policy players_read_club on public.players for select to authenticated
  using (club_id = public.current_club_id());
drop policy if exists players_staff_write on public.players;
create policy players_staff_write on public.players for all to authenticated
  using (club_id = public.current_club_id() and public.is_staff())
  with check (club_id = public.current_club_id() and public.is_staff());

-- Relaciones de equipo.
drop policy if exists team_staff_read on public.team_staff;
create policy team_staff_read on public.team_staff for select to authenticated
  using (exists(select 1 from public.teams t where t.id=team_id and t.club_id=public.current_club_id()));
drop policy if exists team_staff_admin_write on public.team_staff;
create policy team_staff_admin_write on public.team_staff for all to authenticated
  using (public.is_administrator()) with check (public.is_administrator());
drop policy if exists team_players_read on public.team_players;
create policy team_players_read on public.team_players for select to authenticated
  using (exists(select 1 from public.teams t where t.id=team_id and t.club_id=public.current_club_id()));
drop policy if exists team_players_staff_write on public.team_players;
create policy team_players_staff_write on public.team_players for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Eventos: lectura del club; escritura staff.
drop policy if exists events_read_club on public.events;
create policy events_read_club on public.events for select to authenticated
  using (club_id = public.current_club_id());
drop policy if exists events_staff_write on public.events;
create policy events_staff_write on public.events for all to authenticated
  using (club_id = public.current_club_id() and public.is_staff())
  with check (club_id = public.current_club_id() and public.is_staff());

-- Asistencia: jugadora ve/responde la suya; staff ve y valida todo el club.
drop policy if exists attendance_read on public.attendance;
create policy attendance_read on public.attendance for select to authenticated
  using (player_id = public.current_player_id() or public.is_staff());
drop policy if exists attendance_player_insert on public.attendance;
create policy attendance_player_insert on public.attendance for insert to authenticated
  with check (player_id = public.current_player_id());
drop policy if exists attendance_player_update on public.attendance;
create policy attendance_player_update on public.attendance for update to authenticated
  using (player_id = public.current_player_id() and validated_at is null)
  with check (player_id = public.current_player_id());
drop policy if exists attendance_staff_write on public.attendance;
create policy attendance_staff_write on public.attendance for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Bienestar: propia jugadora; staff del club lectura; staff puede corregir.
drop policy if exists wellness_read on public.wellness_entries;
create policy wellness_read on public.wellness_entries for select to authenticated
  using (player_id = public.current_player_id() or public.is_staff());
drop policy if exists wellness_player_write on public.wellness_entries;
create policy wellness_player_write on public.wellness_entries for all to authenticated
  using (player_id = public.current_player_id())
  with check (player_id = public.current_player_id());
drop policy if exists wellness_staff_write on public.wellness_entries;
create policy wellness_staff_write on public.wellness_entries for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- RPE: misma lógica.
drop policy if exists rpe_read on public.rpe_entries;
create policy rpe_read on public.rpe_entries for select to authenticated
  using (player_id = public.current_player_id() or coach_profile_id = auth.uid() or public.is_staff());
drop policy if exists rpe_player_insert on public.rpe_entries;
create policy rpe_player_insert on public.rpe_entries for insert to authenticated
  with check (player_id = public.current_player_id() and source = 'player');
drop policy if exists rpe_staff_write on public.rpe_entries;
create policy rpe_staff_write on public.rpe_entries for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Rendimiento: jugadora lee el suyo, staff gestiona.
drop policy if exists tests_read on public.performance_tests;
create policy tests_read on public.performance_tests for select to authenticated
  using (player_id = public.current_player_id() or public.is_staff());
drop policy if exists tests_staff_write on public.performance_tests;
create policy tests_staff_write on public.performance_tests for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Estadística: staff todo; jugadoras solo publicada.
drop policy if exists stats_read on public.match_statistics;
create policy stats_read on public.match_statistics for select to authenticated
  using (club_id = public.current_club_id() and (public.is_staff() or status='published'));
drop policy if exists stats_staff_write on public.match_statistics;
create policy stats_staff_write on public.match_statistics for all to authenticated
  using (club_id = public.current_club_id() and public.is_staff())
  with check (club_id = public.current_club_id() and public.is_staff());

-- Plan de juego: staff todo; jugadoras solo publicado.
drop policy if exists game_plans_read on public.game_plans;
create policy game_plans_read on public.game_plans for select to authenticated
  using (club_id = public.current_club_id() and (public.is_staff() or status='published'));
drop policy if exists game_plans_staff_write on public.game_plans;
create policy game_plans_staff_write on public.game_plans for all to authenticated
  using (club_id = public.current_club_id() and public.is_staff())
  with check (club_id = public.current_club_id() and public.is_staff());

drop policy if exists reads_read on public.game_plan_reads;
create policy reads_read on public.game_plan_reads for select to authenticated
  using (player_id = public.current_player_id() or public.is_staff());
drop policy if exists reads_player_write on public.game_plan_reads;
create policy reads_player_write on public.game_plan_reads for insert to authenticated
  with check (player_id = public.current_player_id());

-- Comunicados.
drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements for select to authenticated
  using (club_id = public.current_club_id());
drop policy if exists announcements_admin_write on public.announcements;
create policy announcements_admin_write on public.announcements for all to authenticated
  using (club_id = public.current_club_id() and public.is_administrator())
  with check (club_id = public.current_club_id() and public.is_administrator());

-- Ajustes y auditoría.
drop policy if exists settings_read on public.app_settings;
create policy settings_read on public.app_settings for select to authenticated
  using (club_id = public.current_club_id());
drop policy if exists settings_admin_write on public.app_settings;
create policy settings_admin_write on public.app_settings for all to authenticated
  using (club_id = public.current_club_id() and public.is_administrator())
  with check (club_id = public.current_club_id() and public.is_administrator());
drop policy if exists audit_admin_read on public.audit_log;
create policy audit_admin_read on public.audit_log for select to authenticated
  using (club_id = public.current_club_id() and public.is_administrator());
drop policy if exists audit_staff_insert on public.audit_log;
create policy audit_staff_insert on public.audit_log for insert to authenticated
  with check (club_id = public.current_club_id() and public.is_staff());

-- ---------------------------------------------------------------------------
-- Datos iniciales del CV Bunyola
-- ---------------------------------------------------------------------------
insert into public.clubs (id, name, slug, primary_color, secondary_color, locale)
values ('b0000000-0000-4000-8000-000000000001', 'CV BUNYOLA', 'cv-bunyola', '#111827', '#f59e0b', 'es')
on conflict (id) do update set name=excluded.name, slug=excluded.slug;

insert into public.seasons (id, club_id, name, starts_on, ends_on, is_active)
values ('b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', '2026/27', '2026-09-01', '2027-06-30', true)
on conflict (id) do update set is_active=true;

insert into public.teams (id, club_id, season_id, name, category, active)
values ('b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Cadete Femenino', 'Cadete Femenino 1ª División', true)
on conflict (id) do update set active=true;

insert into public.app_settings (club_id, modules, settings)
values (
  'b0000000-0000-4000-8000-000000000001',
  '{"wellness":true,"rpe":true,"gamification":true,"performance":true,"statistics":true,"planning":true,"gamePlan":true}'::jsonb,
  '{"wellnessFrequency":"daily-testing","language":"es"}'::jsonb
)
on conflict (club_id) do nothing;

-- Buckets privados. Las políticas de Storage se añadirán en la fase de archivos.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false), ('club-files', 'club-files', false)
on conflict (id) do nothing;

commit;
