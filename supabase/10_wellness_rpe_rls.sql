-- ============================================================================
-- VOLLEYCOACH HUB · PASO 10: BIENESTAR Y CARGA/RPE EN SUPABASE (RLS & REALTIME)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. BIENESTAR (public.wellness_entries)
-- ----------------------------------------------------------------------------
ALTER TABLE public.wellness_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wellness_read_policy ON public.wellness_entries;
DROP POLICY IF EXISTS wellness_write_policy ON public.wellness_entries;

-- Lectura: Jugadoras ven sus propios registros; Staff lee todo el club
CREATE POLICY wellness_read_policy ON public.wellness_entries
FOR SELECT TO authenticated
USING (
  player_id = public.current_player_id()
  OR public.is_staff()
);

-- ESCRITURA: Jugadora inserta/actualiza su propio cuestionario diario
CREATE POLICY wellness_write_policy ON public.wellness_entries
FOR ALL TO authenticated
USING (
  player_id = public.current_player_id()
  OR public.is_staff()
)
WITH CHECK (
  player_id = public.current_player_id()
  OR public.is_staff()
);

-- ----------------------------------------------------------------------------
-- 2. CARGA / RPE (public.rpe_entries)
-- ----------------------------------------------------------------------------
ALTER TABLE public.rpe_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpe_read_policy ON public.rpe_entries;
DROP POLICY IF EXISTS rpe_write_policy ON public.rpe_entries;

-- Lectura: Jugadora ve sus propios RPE; Staff lee todo el club
CREATE POLICY rpe_read_policy ON public.rpe_entries
FOR SELECT TO authenticated
USING (
  player_id = public.current_player_id()
  OR public.is_staff()
);

-- Escritura: Jugadoras guardan su RPE; Entrenadores guardan su RPE de técnico o para jugadora
CREATE POLICY rpe_write_policy ON public.rpe_entries
FOR ALL TO authenticated
USING (
  player_id = public.current_player_id()
  OR coach_profile_id = auth.uid()
  OR public.is_staff()
)
WITH CHECK (
  player_id = public.current_player_id()
  OR coach_profile_id = auth.uid()
  OR public.is_staff()
);

-- ----------------------------------------------------------------------------
-- 3. PUBLICACIÓN SUPABASE REALTIME
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'wellness_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wellness_entries;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'rpe_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rpe_entries;
  END IF;
END $$;
