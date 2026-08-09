/**
 * Configuración pública de Supabase.
 * La publishable key es segura en el navegador SIEMPRE que las tablas tengan RLS.
 * Nunca pongas aquí la service_role ni una secret key.
 */
window.VOLLEY_SUPABASE_CONFIG = Object.freeze({
  url: 'https://zpvlkdjdfnvamfcjihyt.supabase.co',
  publishableKey: 'sb_publishable_seL2H6gAGBrUDR0O1vhJDA_Y9d7Ky-u',
  enabled: true,
  authMode: 'supabase',
  syncMode: 'off',
  usernameDomain: 'cvbunyola.app',
  clubId: 'b0000000-0000-4000-8000-000000000001'
});
(function primeAttendanceLoadingState(){document.documentElement.classList.remove('attendance-ready');if(!document.getElementById('attendance-preload-css')){const style=document.createElement('style');style.id='attendance-preload-css';style.textContent=`html:not(.attendance-ready) button[onclick*="confirmTrainingAttendance"]{visibility:hidden!important;pointer-events:none!important}`;document.head.appendChild(style);}})();
(function loadVolleySyncPatches(){const scripts=[
'attendance-batch-save-20260809.js?v=20260809w','game-plan-authoritative-20260809.js?v=20260809w','attendance-fix.js?v=20260809w','game-plan-sync.js?v=20260809w','app-corrections-20260809.js?v=20260809w','app-corrections-live.js?v=20260809w','hotfix-20260809c.js?v=20260809w','supabase-event-recovery.js?v=20260809w','supabase-roster-sync.js?v=20260809w','attendance-authoritative-20260809.js?v=20260809w','training-duration-authoritative-20260809.js?v=20260809w','training-load-engine-20260809.js?v=20260809w','training-load-player-dashboard-20260809.js?v=20260809w','training-load-team-dashboard-20260809.js?v=20260809w'];scripts.forEach(src=>{if(document.querySelector(`script[src^="${src.split('?')[0]}"]`))return;const script=document.createElement('script');script.src=src;script.async=false;document.head.appendChild(script);});})();