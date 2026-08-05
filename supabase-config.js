/**
 * Configuración pública de Supabase.
 * La publishable key es segura en el navegador SIEMPRE que las tablas tengan RLS.
 * Nunca pongas aquí la service_role ni una secret key.
 */
window.VOLLEY_SUPABASE_CONFIG = Object.freeze({
  url: 'https://zpvlkdjdfnvamfcjihyt.supabase.co',
  publishableKey: 'sb_publishable_seL2H6gAGBrUDR0O1vhJDA_Y9d7Ky-u',
  enabled: true,
  // RC3.0 Bloque A: autenticación real mediante Supabase Auth.
  // Los datos deportivos siguen locales hasta las siguientes fases.
  authMode: 'supabase',
  syncMode: 'off',
  usernameDomain: 'cvbunyola.app'
});
