-- ============================================================================
-- VOLLEYCOACH HUB · PASO 7: ASISTENCIA SINCRONIZADA EN SUPABASE (RLS & REALTIME)
-- ============================================================================

-- 1. Habilitar RLS en la tabla public.attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS attendance_read ON public.attendance;
DROP POLICY IF EXISTS attendance_player_insert ON public.attendance;
DROP POLICY IF EXISTS attendance_player_update ON public.attendance;
DROP POLICY IF EXISTS attendance_staff_write ON public.attendance;
DROP POLICY IF EXISTS attendance_read_policy ON public.attendance;
DROP POLICY IF EXISTS attendance_player_response_policy ON public.attendance;
DROP POLICY IF EXISTS attendance_staff_official_policy ON public.attendance;

-- 3. Política de LECTURA:
-- Jugadoras ven sus propios registros de asistencia.
-- Entrenadores y Administradores leen toda la asistencia del club.
CREATE POLICY attendance_read_policy ON public.attendance
FOR SELECT TO authenticated
USING (
  player_id = public.current_player_id()
  OR public.is_staff()
);

-- 4. Política para RESPUESTA PREVIA DE JUGADORA ("Asistiré" / "No asistiré"):
-- La jugadora autenticada solo puede insertar/modificar la respuesta previa de su propio perfil.
CREATE POLICY attendance_player_response_policy ON public.attendance
FOR ALL TO authenticated
USING (
  player_id = public.current_player_id()
)
WITH CHECK (
  player_id = public.current_player_id()
);

-- 5. Política para ASISTENCIA OFICIAL DEL ENTRENADOR:
-- Staff (Entrenadores y Administradores) pueden insertar, modificar y validar listas oficiales.
CREATE POLICY attendance_staff_official_policy ON public.attendance
FOR ALL TO authenticated
USING (
  public.is_staff()
)
WITH CHECK (
  public.is_staff()
);

-- 6. Habilitar Supabase Realtime para la tabla public.attendance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'attendance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
  END IF;
END $$;
