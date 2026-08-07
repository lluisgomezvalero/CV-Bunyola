-- ============================================================================
-- VOLLEYCOACH HUB · PASO 9: MIGRACIÓN BIENESTAR Y CARGA/RPE (ESQUEMA & REALTIME)
-- ============================================================================

-- 1. Añadir columna opcional sleep_hours si no existe
ALTER TABLE public.wellness_entries
  ADD COLUMN IF NOT EXISTS sleep_hours numeric(3,1);

-- 2. Habilitar Supabase Realtime para wellness_entries y rpe_entries
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
