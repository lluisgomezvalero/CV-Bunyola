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

// Parches aislados de sincronización. La asistencia autoritativa se registra
// primero para interceptar el submit antiguo de "Pasar lista"; sus overrides
// finales se aplican después de que hayan cargado los demás parches.
(function loadVolleySyncPatches() {
  const scripts = [
    'attendance-authoritative-20260809.js?v=20260809m',
    'reset-training-state-20260809.js?v=20260809m',
    'attendance-fix.js?v=20260809m',
    'game-plan-sync.js?v=20260809m',
    'app-corrections-20260809.js?v=20260809m',
    'app-corrections-live.js?v=20260809m',
    'hotfix-20260809c.js?v=20260809m',
    'supabase-event-recovery.js?v=20260809m',
    'supabase-roster-sync.js?v=20260809m'
  ];
  scripts.forEach(src => {
    if (document.querySelector(`script[src^="${src.split('?')[0]}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  });
})();