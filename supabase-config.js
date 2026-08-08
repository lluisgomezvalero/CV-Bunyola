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
  authMode: 'supabase',
  syncMode: 'off',
  usernameDomain: 'cvbunyola.app',
  clubId: 'b0000000-0000-4000-8000-000000000001'
});

// Parches aislados de sincronización. Se cargan aquí para no reescribir
// index.html ni app.js y reducir el riesgo de regresiones.
(function loadVolleySyncPatches() {
  const scripts = [
    'attendance-fix.js?v=20260809d',
    'game-plan-sync.js?v=20260809d',
    'app-corrections-20260809.js?v=20260809d',
    'app-corrections-live.js?v=20260809d',
    'hotfix-20260809c.js?v=20260809d'
  ];
  scripts.forEach(src => {
    if (document.querySelector(`script[src^="${src.split('?')[0]}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    document.head.appendChild(script);
  });
})();
