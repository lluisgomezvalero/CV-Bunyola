# RC3.0 · Bloque B — Perfiles y roles reales

## 1. Ejecutar la migración

En Supabase abre **SQL Editor → New query**, copia el contenido de:

`supabase/03_profiles_roles.sql`

y pulsa **Run**.

Esta migración añade `preferred_language` a `profiles`.

## 2. Comprobar los perfiles

En **Table Editor → profiles** revisa que cada cuenta tenga:

- `username`
- `full_name`
- `role`: `administrator`, `coach` o `player`
- `club_id`
- `active = true`
- `preferred_language = es` o `ca`

Para una jugadora debe existir también una fila en **players** con:

- `profile_id`: el UUID de su cuenta Auth
- `team_id`
- `dorsal`
- `birth_date`
- `position`
- `active = true`

## 3. Publicar la versión

Sube el contenido de esta carpeta a tu repositorio/hosting. Asegúrate de que `index.html` está en la raíz.

## 4. Qué hace esta versión

- Lee nombre, usuario, rol, idioma, estado y club desde Supabase.
- Lee dorsal, nacimiento, posición y equipo de la jugadora desde `players`.
- Lee los equipos del entrenador desde `team_staff`.
- Mantiene una copia local temporal para que el resto de módulos continúe funcionando durante la migración.
- No migra todavía calendario, asistencia, bienestar ni RPE.

## 5. Pruebas

1. Inicia sesión como administrador y comprueba el rol.
2. Inicia sesión como entrenador vinculado a `team_staff`.
3. Inicia sesión como jugadora vinculada a `players`.
4. Comprueba nombre, dorsal, fecha de nacimiento, equipo y foto en Mi perfil.
5. Cambia un dato directamente en Supabase, cierra sesión y vuelve a entrar: debe actualizarse en la app.
