/**
 * Configuración pública de Supabase.
 * La publishable key es segura en el navegador SIEMPRE que las tablas tengan RLS.
 * Nunca pongas aquí la service_role ni una secret key.
 */
window.VOLLEY_SUPABASE_CONFIG = Object.freeze({
  url: 'https://zpvlkdjdfnvamfcjihyt.supabase.co',
  publishableKey: 'sb_publishable_seL2H6gAGBrUDR0O1vhJDA_Y9d7Ky-u',
  enabled: true,
  // Fase 1: solo conexión y diagnóstico. El login y los datos siguen locales
  // hasta crear los usuarios Auth y validar las políticas RLS.
  authMode: 'local',
  syncMode: 'off',
  usernameDomain: 'cvbunyola.app'
});
