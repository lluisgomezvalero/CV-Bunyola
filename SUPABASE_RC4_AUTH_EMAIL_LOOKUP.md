# VolleyCoach Hub · Autenticación Dinámica por Username

Se ha modificado la autenticación de la aplicación para que el usuario escriba **únicamente su usuario** (por ejemplo: `maria23` o `lluisgomez`).

## Resumen de Funcionamiento

1. **Formulario intacto**: El formulario mantiene únicamente los campos **Usuario** y **Contraseña**.
2. **Búsqueda dinámica**: Antes de llamar a `supabase.auth.signInWithPassword()`, la aplicación realiza una consulta a la tabla `profiles` buscando el registro donde coincida el `username`.
3. **Obtención del correo (`auth_email`)**: Extrae el valor `auth_email` real guardado en ese perfil.
4. **Autenticación en Supabase Auth**: Ejecuta `supabase.auth.signInWithPassword()` con el correo obtenido y la contraseña introducida por el usuario.
5. **Dominio Agnóstico**: No se asume ningún dominio fijo (`@cvbunyola.app` o `@volleycoachhub.app`). Admite dominios personalizados o correos reales existentes.
6. **Privacidad**: El correo real nunca se expone en pantalla ni en mensajes de error.
7. **Persistencia**: La sesión se mantiene persistente mediante Supabase Auth (`persistSession: true`).

## Archivo SQL de Migración (Paso 4)

Si deseas actualizar tu esquema de base de datos en el **SQL Editor** de Supabase, ejecuta el archivo:
📄 `supabase/04_username_auth_email.sql`
