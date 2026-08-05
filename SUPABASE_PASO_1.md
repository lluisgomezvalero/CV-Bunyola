# VolleyCoach Hub · Supabase paso 1

Esta versión **conecta la web con tu proyecto Supabase sin romper el funcionamiento local**.
La aplicación todavía usa el login y `localStorage` actuales. Primero verificamos el proyecto, el esquema y RLS; después migraremos autenticación y datos.

## 1. Instalar el esquema

1. Abre tu proyecto en Supabase.
2. Entra en **SQL Editor**.
3. Crea una consulta nueva.
4. Copia todo el contenido de `supabase/01_schema.sql`.
5. Pulsa **Run**.

Al terminar deben aparecer las tablas en **Table Editor**.

## 2. Crear el primer administrador real

1. Ve a **Authentication → Users → Add user**.
2. Usa `admin@cvbunyola.app` (o modifica después el dominio en `supabase-config.js`).
3. Define una contraseña segura distinta de `123456`.
4. Activa **Auto Confirm User**.
5. Vuelve a SQL Editor y ejecuta `supabase/02_link_first_admin.sql`.

## 3. Publicar esta versión en Netlify

Supabase es el backend; **Netlify sigue alojando la web**.
Sube el contenido del ZIP a tu sitio beta o de pruebas en Netlify.

En la pantalla de login aparecerá un indicador:

- Verde: `Supabase conectado y esquema VolleyCoach instalado`.
- Amarillo: conexión correcta, pero falta ejecutar el SQL.
- Rojo: error de red/configuración.

## 4. Qué está preparado

- Cliente `supabase-js` conectado con tu URL y publishable key.
- Esquema completo inicial: clubes, temporadas, equipos, perfiles, jugadoras, eventos, asistencia, bienestar, RPE, tests, estadísticas, planes, lecturas, comunicados y auditoría.
- RLS activado para separar administrador, entrenador y jugadora.
- Buckets privados `avatars` y `club-files`.
- Conversión futura de usuario a correo técnico (`marta` → `marta@cvbunyola.app`).

## 5. Qué NO debes hacer

- No pongas la `service_role` ni una secret key en ningún archivo de la web.
- No desactives RLS para “hacer que funcione”.
- No borres todavía el `localStorage`: es la copia de seguridad durante la migración.

## Siguiente fase

Después de confirmar el indicador verde:

1. cambiar el login local por Supabase Auth;
2. crear las cuentas del entrenador y jugadoras;
3. importar la plantilla actual;
4. sincronizar primero calendario, asistencia, bienestar y RPE;
5. migrar fotos y documentos a Storage.
