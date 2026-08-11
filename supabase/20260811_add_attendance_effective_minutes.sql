-- Bloque de monitorización de carga · 2026-08-11
-- Permite calcular carga individual con duración efectiva en participaciones parciales.

alter table if exists public.attendance
  add column if not exists effective_minutes smallint;

alter table public.attendance
  drop constraint if exists attendance_effective_minutes_check;

alter table public.attendance
  add constraint attendance_effective_minutes_check
  check (effective_minutes is null or effective_minutes > 0);

comment on column public.attendance.effective_minutes is
  'Minutos efectivos realizados cuando la participación fue parcial, especialmente official_status=late. Para present se usa la duración completa del evento.';
