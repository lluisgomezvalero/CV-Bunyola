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

// Parches aislados de sincronización. Se cargan en orden para que el último
// hotfix siempre se aplique después de los módulos base.
(function loadVolleySyncPatches() {
  const scripts = [
    'reset-training-state-20260809.js?v=20260809k',
    'attendance-fix.js?v=20260809k',
    'game-plan-sync.js?v=20260809k',
    'app-corrections-20260809.js?v=20260809k',
    'app-corrections-live.js?v=20260809k',
    'hotfix-20260809c.js?v=20260809k',
    'supabase-event-recovery.js?v=20260809k',
    'supabase-roster-sync.js?v=20260809k'
  ];
  scripts.forEach(src => {
    if (document.querySelector(`script[src^="${src.split('?')[0]}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  });
})();