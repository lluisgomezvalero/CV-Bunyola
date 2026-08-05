# RC3.0 — Bloque A: login real con Supabase Auth

## Qué cambia

- El formulario de acceso ya no valida contraseñas guardadas en `data.js`.
- El usuario escrito en pantalla se convierte internamente en `usuario@cvbunyola.app`.
- Supabase Auth valida la contraseña.
- La aplicación consulta `public.profiles` para obtener nombre, rol y estado de la cuenta.
- La sesión permanece activa al cerrar y volver a abrir la app.
- El botón Salir ejecuta `supabase.auth.signOut()`.
- Cambiar contraseña usa `supabase.auth.updateUser()`.
- Los datos deportivos continúan temporalmente en localStorage; se migrarán en fases posteriores.

## Cómo probarlo

1. En Supabase, confirma que existe `admin@cvbunyola.app` en Authentication > Users.
2. En Table Editor > profiles, confirma que el mismo UUID tiene:
   - username: `admin`
   - role: `administrator`
   - active: `true`
3. Publica esta carpeta en Netlify.
4. Accede escribiendo solo `admin` y la contraseña creada en Supabase.
5. Recarga la página: debe mantener la sesión.
6. Pulsa Salir: debe volver al login y cerrar la sesión real.

## Crear más cuentas durante esta fase

De momento deben crearse manualmente en Supabase Authentication > Users. Usa correos técnicos:

- `entrenador@cvbunyola.app`
- `marta12@cvbunyola.app`

El trigger del esquema crea automáticamente una fila básica en `profiles`. Después edita esa fila para establecer `username`, `full_name`, `role`, `club_id` y `active`.

## Seguridad

La publishable key puede estar en el frontend. No introduzcas nunca una secret key o `service_role` en estos archivos.
