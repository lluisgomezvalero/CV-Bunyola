-- ============================================================================
-- VOLLEYCOACH HUB · PASO 8: AUTENTICACIÓN EXCLUSIVA POR PROFILES.USERNAME
-- ============================================================================

-- 1. Añadir columna auth_email a public.profiles si no existe
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_email text;

-- 2. Sincronizar auth_email con el email real de auth.users
UPDATE public.profiles p
SET auth_email = au.email
FROM auth.users au
WHERE p.id = au.id;

-- 3. Crear índice único case-insensitive para profiles.username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
ON public.profiles (lower(username));

-- 4. Eliminar cualquier política RLS que permitiese consultas anónimas públicas a profiles
DROP POLICY IF EXISTS profiles_anon_username_lookup ON public.profiles;

-- 5. Función de seguridad RPC (SECURITY DEFINER) para obtener el correo sin exponer RLS a anon
CREATE OR REPLACE FUNCTION public.get_auth_email_by_username(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT COALESCE(u.email, p.auth_email)
  INTO v_email
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE lower(p.username) = lower(trim(p_username))
    AND p.active = true
  LIMIT 1;

  RETURN v_email;
END;
$$;

-- Otorgar permiso de ejecución a anon y authenticated
GRANT EXECUTE ON FUNCTION public.get_auth_email_by_username(text) TO anon, authenticated;
