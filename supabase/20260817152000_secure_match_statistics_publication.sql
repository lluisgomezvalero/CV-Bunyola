-- Match statistics: staff keeps full-row access; players receive only metrics explicitly published.

drop policy if exists stats_read on public.match_statistics;

create or replace function public.get_published_match_statistics()
returns table (
  id uuid,
  event_id uuid,
  club_id uuid,
  team_id uuid,
  status public.publication_status,
  visible_metrics jsonb,
  payload jsonb,
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    ms.id,
    ms.event_id,
    ms.club_id,
    ms.team_id,
    ms.status,
    ms.visible_metrics,
    coalesce(
      (
        select jsonb_object_agg(metric.key, ms.payload -> metric.key)
        from jsonb_array_elements_text(ms.visible_metrics) as metric(key)
        where ms.payload ? metric.key
      ),
      '{}'::jsonb
    ) as payload,
    ms.published_at,
    ms.created_at,
    ms.updated_at
  from public.match_statistics as ms
  where ms.club_id = public.current_club_id()
    and ms.status = 'published'::public.publication_status
    and (
      public.is_staff()
      or (
        public.current_player_id() is not null
        and (
          ms.team_id is null
          or ms.team_id = (
            select p.team_id
            from public.players as p
            where p.id = public.current_player_id()
          )
        )
      )
    );
$$;

revoke all on function public.get_published_match_statistics() from public;
grant execute on function public.get_published_match_statistics() to authenticated;
