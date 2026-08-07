-- ============================================================================
-- VOLLEYCOACH HUB · PASO 5: CALENDARIO Y ENTRENAMIENTOS EN SUPABASE (RLS & REALTIME)
-- ============================================================================

-- 1. Habilitar RLS en la tabla public.events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas previas si existen
DROP POLICY IF EXISTS events_read_club ON public.events;
DROP POLICY IF EXISTS events_staff_write ON public.events;
DROP POLICY IF EXISTS events_read_policy ON public.events;
DROP POLICY IF EXISTS events_write_policy ON public.events;

-- 3. Política de LECTURA:
-- Staff y Administradores leen todos los eventos del club.
-- Jugadoras leen eventos generales del club (team_id nulo) o eventos dirigidos a su equipo.
CREATE POLICY events_read_policy ON public.events
FOR SELECT TO authenticated
USING (
  club_id = public.current_club_id()
  AND (
    public.is_staff()
    OR team_id IS NULL
    OR team_id IN (
      SELECT team_id FROM public.players WHERE profile_id = auth.uid()
    )
  )
);

-- 4. Política de ESCRITURA (Insert, Update, Delete):
-- Solo Administradores y Entrenadores del club (staff) pueden modificar eventos.
CREATE POLICY events_write_policy ON public.events
FOR ALL TO authenticated
USING (
  club_id = public.current_club_id() AND public.is_staff()
)
WITH CHECK (
  club_id = public.current_club_id() AND public.is_staff()
);

-- 5. Habilitar Supabase Realtime para la tabla public.events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;
END $$;
