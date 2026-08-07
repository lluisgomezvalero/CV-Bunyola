-- ============================================================================
-- VOLLEYCOACH HUB · PASO 9: ASISTENCIA SINCRONIZADA EN SUPABASE (RLS & REALTIME)
-- ============================================================================

-- 1. Habilitar Row Level Security (RLS) en public.attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS attendance_read_policy ON public.attendance;
DROP POLICY IF EXISTS attendance_player_response_policy ON public.attendance;
DROP POLICY IF EXISTS attendance_staff_official_policy ON public.attendance;

-- 3. Política de LECTURA:
-- Jugadoras leen sus propios registros.
-- Staff (Entrenadores y Administradores) leen todo el historial de asistencia del club.
CREATE POLICY attendance_read_policy ON public.attendance
FOR SELECT TO authenticated
USING (
  player_id = public.current_player_id()
  OR public.is_staff()
);

-- 4. Política para CONFIRMACIÓN PREVIA DE LA JUGADORA:
-- La jugadora autenticada solo puede registrar/actualizar su propia respuesta previa ("Sí, asistiré" / "No podré").
CREATE POLICY attendance_player_response_policy ON public.attendance
FOR ALL TO authenticated
USING (
  player_id = public.current_player_id()
)
WITH CHECK (
  player_id = public.current_player_id()
);

-- 5. Política para ASISTENCIA OFICIAL DEL ENTRENADOR:
-- Staff (Entrenadores y Administradores) pueden insertar y validar la lista oficial de asistencia.
CREATE POLICY attendance_staff_official_policy ON public.attendance
FOR ALL TO authenticated
USING (
  public.is_staff()
)
WITH CHECK (
  public.is_staff()
);

-- 6. Publicación en Supabase Realtime para la tabla public.attendance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'attendance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
  END IF;
END $$;
