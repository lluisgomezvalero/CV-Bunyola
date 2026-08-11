do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wellness_entries'
      and column_name = 'pain_score'
  ) then
    alter table public.wellness_entries
      add column pain_score smallint;

    alter table public.wellness_entries
      add constraint wellness_entries_pain_score_check
      check (pain_score is null or (pain_score >= 0 and pain_score <= 10));

    -- Escala antigua: 1 = muy bien, 5 = muy mal.
    -- Escala nueva:   1 = muy mal,  5 = muy bien.
    update public.wellness_entries
    set sleep = 6 - sleep
    where sleep between 1 and 5;
  end if;
end $$;

comment on column public.wellness_entries.sleep is
  'Calidad del sueño en escala 1-5: 1 = muy mal, 5 = muy bien. Los valores históricos se migraron a esta dirección el 2026-08-11.';

comment on column public.wellness_entries.pain_score is
  'Dolor o molestias físicas percibidas en escala 0-10: 0 = sin dolor, 10 = dolor máximo.';

comment on column public.wellness_entries.sleep_hours is
  'Campo histórico de horas de sueño. Desde 2026-08-11 deja de recogerse en el cuestionario de bienestar.';
