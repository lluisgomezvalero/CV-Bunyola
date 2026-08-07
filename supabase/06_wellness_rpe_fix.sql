-- ============================================================================
-- VOLLEYCOACH HUB · FIX: RESTRICCIONES ÚNICAS PARA BIENESTAR Y RPE
-- ============================================================================

-- 1. Asegurar restricción UNIQUE explícita en public.wellness_entries (player_id, entry_date)
ALTER TABLE public.wellness_entries
  DROP CONSTRAINT IF EXISTS wellness_entries_player_id_entry_date_key;

ALTER TABLE public.wellness_entries
  ADD CONSTRAINT wellness_entries_player_id_entry_date_key
  UNIQUE (player_id, entry_date);

-- 2. Eliminar índices parciales antiguos en public.rpe_entries
DROP INDEX IF EXISTS public.rpe_one_player_per_event;
DROP INDEX IF EXISTS public.rpe_one_coach_per_event;

-- 3. Crear restricción UNIQUE explícita en public.rpe_entries para jugadora (event_id, player_id)
ALTER TABLE public.rpe_entries
  DROP CONSTRAINT IF EXISTS rpe_entries_event_id_player_id_key;

ALTER TABLE public.rpe_entries
  ADD CONSTRAINT rpe_entries_event_id_player_id_key
  UNIQUE (event_id, player_id);

-- 4. Crear restricción UNIQUE explícita en public.rpe_entries para entrenador (event_id, coach_profile_id)
ALTER TABLE public.rpe_entries
  DROP CONSTRAINT IF EXISTS rpe_entries_event_id_coach_profile_id_key;

ALTER TABLE public.rpe_entries
  ADD CONSTRAINT rpe_entries_event_id_coach_profile_id_key
  UNIQUE (event_id, coach_profile_id);
