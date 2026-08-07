-- ============================================================================
-- VOLLEYCOACH HUB · FIX: SINCRONIZACIÓN EN TIEMPO REAL DE CORREOS AUTH Y PROFILES
-- ============================================================================

-- 1. Actualizar la tabla profiles para que auth_email coincida 100% con auth.users
UPDATE public.profiles p
SET auth_email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- 2. Trigger para que cualquier cambio futuro de email en auth.users se refleje inmediatamente en profiles
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET auth_email = new.email
  WHERE id = new.id;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_email_update();

-- 3. Actualizar la función de búsqueda de login para que de prioridad SIEMPRE a u.email (auth.users)
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

GRANT EXECUTE ON FUNCTION public.get_auth_email_by_username(text) TO anon, authenticated;
