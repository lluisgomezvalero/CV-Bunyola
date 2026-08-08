-- Correcciones 2026-08-09: feedback de sesión y lectura directa del plan.

create table if not exists public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  coach_profile_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('player_comment','coach_assessment')),
  comment_text text,
  assessment text,
  continuity_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind='player_comment' and player_id is not null) or (kind='coach_assessment' and coach_profile_id is not null))
);

create unique index if not exists session_feedback_player_event_unique on public.session_feedback(event_id,player_id) where kind='player_comment';
create unique index if not exists session_feedback_coach_event_unique on public.session_feedback(event_id,coach_profile_id) where kind='coach_assessment';
create index if not exists session_feedback_event_idx on public.session_feedback(event_id);
alter table public.session_feedback enable row level security;

drop policy if exists session_feedback_read on public.session_feedback;
create policy session_feedback_read on public.session_feedback for select to authenticated using (player_id=public.current_player_id() or public.is_staff());
drop policy if exists session_feedback_player_insert on public.session_feedback;
create policy session_feedback_player_insert on public.session_feedback for insert to authenticated with check (kind='player_comment' and player_id=public.current_player_id());
drop policy if exists session_feedback_player_update on public.session_feedback;
create policy session_feedback_player_update on public.session_feedback for update to authenticated using (kind='player_comment' and player_id=public.current_player_id()) with check (kind='player_comment' and player_id=public.current_player_id());
drop policy if exists session_feedback_staff_write on public.session_feedback;
create policy session_feedback_staff_write on public.session_feedback for all to authenticated using (public.is_staff()) with check (public.is_staff());

alter table public.game_plan_reads add column if not exists event_id uuid references public.events(id) on delete cascade;
alter table public.game_plan_reads add column if not exists publication_version text;
alter table public.game_plan_reads drop constraint if exists game_plan_reads_pkey;
alter table public.game_plan_reads alter column game_plan_id drop not null;
alter table public.game_plan_reads add column if not exists id uuid default gen_random_uuid();
update public.game_plan_reads set id=gen_random_uuid() where id is null;
alter table public.game_plan_reads alter column id set not null;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.game_plan_reads'::regclass and contype='p') then
    alter table public.game_plan_reads add constraint game_plan_reads_pkey primary key(id);
  end if;
end $$;
create unique index if not exists game_plan_reads_event_player_version_unique on public.game_plan_reads(event_id,player_id,publication_version) where event_id is not null;
create unique index if not exists game_plan_reads_plan_player_unique on public.game_plan_reads(game_plan_id,player_id) where game_plan_id is not null;

create index if not exists wellness_entries_player_date_idx on public.wellness_entries(player_id,entry_date desc);
create index if not exists rpe_entries_player_event_idx on public.rpe_entries(player_id,event_id);
