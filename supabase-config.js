/**
 * Configuración pública de Supabase.
 * La publishable key es segura en el navegador SIEMPRE que las tablas tengan RLS.
 * Nunca pongas aquí la service_role ni una secret key.
 */
window.VOLLEY_ASSET_VERSION = '20260812y';
window.VOLLEY_SUPABASE_CONFIG = Object.freeze({
  url: 'https://zpvlkdjdfnvamfcjihyt.supabase.co',
  publishableKey: 'sb_publishable_seL2H6gAGBrUDR0O1vhJDA_Y9d7Ky-u',
  enabled: true,
  authMode: 'supabase',
  syncMode: 'off',
  usernameDomain: 'cvbunyola.app',
  clubId: 'b0000000-0000-4000-8000-000000000001'
});
(function primeAttendanceLoadingState(){document.documentElement.classList.remove('attendance-ready');if(!document.getElementById('attendance-preload-css')){const style=document.createElement('style');style.id='attendance-preload-css';style.textContent=`
html:not(.attendance-ready) button[onclick*="confirmTrainingAttendance"],
html:not(.attendance-ready) .btn-rsvp-yes,
html:not(.attendance-ready) .btn-rsvp-no{visibility:hidden!important;pointer-events:none!important}
`;document.head.appendChild(style);}})();
(function loadVolleySyncPatches(){const scripts=[
'game-plan-authoritative-20260809.js?v=20260810n','attendance-fix.js?v=20260810n','game-plan-sync.js?v=20260810n','app-corrections-20260809.js?v=20260812j','app-corrections-live.js?v=20260810n','hotfix-20260809c.js?v=20260810n','supabase-event-recovery.js?v=20260812f','supabase-roster-sync.js?v=20260812f','player-avatar-authoritative-20260812.js?v=20260812x','attendance-authoritative-20260809.js?v=20260812f','training-duration-authoritative-20260809.js?v=20260810n','training-load-engine-20260809.js?v=20260811b','training-load-player-dashboard-20260809.js?v=20260811l','training-load-team-dashboard-20260809.js?v=20260811h','attendance-transition-guard-20260809.js?v=20260810n','roll-call-form-clean-20260810.js?v=20260810n','roll-call-mobile-ui-20260810.js?v=20260810n','roll-call-effective-minutes-20260811.js?v=20260812f','attendance-late-count-20260811.js?v=20260812f','team-attendance-overview-20260812.js?v=20260812p','rpe-authoritative-20260810.js?v=20260812i','rpe-pending-overview-authoritative-20260810.js?v=20260810p','coach-training-windows-20260810.js?v=20260812f','coach-dashboard-compact-summary-20260810.js?v=20260812f','dashboard-ux-20260811.js?v=20260811j','dashboard-home-priority-20260812.js?v=20260812o','player-dashboard-priority-20260812.js?v=20260812r','wellness-v2-20260811.js?v=20260811n','navigation-shell-20260812.js?v=20260812k','session-header-actions-fix-20260812.js?v=20260812c','app-shell-polish-20260812.js?v=20260812w','sidebar-viewport-stability-20260812.js?v=20260812y'];scripts.forEach(src=>{if(document.querySelector(`script[src^="${src.split('?')[0]}"]`))return;const script=document.createElement('script');script.src=src;script.async=false;document.head.appendChild(script);});})();
