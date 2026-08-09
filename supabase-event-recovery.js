(function(){
'use strict';
let syncing=false;

function state(){return typeof appState!=='undefined'?appState:null}
function remoteClient(){return window.VolleySupabase?.getClient?.()||null}
function getUserSafe(){try{return typeof getCurrentUser==='function'?getCurrentUser():null}catch(_){return null}}

async function authoritativeEventSync(){
  if(syncing)return;
  const db=remoteClient(),st=state();
  if(!db||!st||!window.VolleySupabase?.fetchEvents)return;
  syncing=true;
  try{
    const u=getUserSafe();
    const clubId=u?.clubId||window.VolleySupabase.config?.clubId;
    const teamId=u?.teamId||null;
    const {data:remoteEvents,error}=await window.VolleySupabase.fetchEvents(clubId,teamId);
    if(error||!Array.isArray(remoteEvents)){
      console.warn('[EventRecovery] No se pudieron cargar eventos remotos',error);
      return;
    }

    // Supabase es la fuente de verdad para cualquier evento de calendario/sesión.
    // Solo se conservan cumpleaños generados en cliente porque no escriben datos de sesión.
    let birthdays=[];
    try{birthdays=typeof generateDynamicBirthdayEvents==='function'?generateDynamicBirthdayEvents():[]}catch(_){}
    const remoteIds=new Set(remoteEvents.map(e=>String(e.id)));
    birthdays=(birthdays||[]).filter(b=>!remoteIds.has(String(b.id)));
    st.events=[...remoteEvents,...birthdays];

    // Limpiar estado local asociado a eventos que ya no existen en Supabase.
    const validIds=new Set(remoteEvents.map(e=>String(e.id)));
    const validLegacy=new Set(remoteEvents.map(e=>String(e.legacyId||e.legacy_id||'')).filter(Boolean));
    const isValidEventRef=v=>validIds.has(String(v||''))||validLegacy.has(String(v||''));

    if(Array.isArray(st.trainingConfirmations)){
      st.trainingConfirmations=st.trainingConfirmations.filter(x=>isValidEventRef(x.eventId)||isValidEventRef(x.eventIdLegacy));
    }
    if(Array.isArray(st.trainingRPEs)){
      st.trainingRPEs=st.trainingRPEs.filter(x=>isValidEventRef(x.eventId));
    }
    if(Array.isArray(st.attendanceData)){
      st.attendanceData=st.attendanceData.filter(x=>isValidEventRef(x.eventId)||isValidEventRef(x.eventIdLegacy));
    }
    if(Array.isArray(st.sessionPlayerComments)){
      st.sessionPlayerComments=st.sessionPlayerComments.filter(x=>isValidEventRef(x.eventId));
    }

    try{saveAppData(st)}catch(_){}
    try{if(typeof invalidateViewRenderCache==='function')invalidateViewRenderCache()}catch(_){}
    requestAnimationFrame(()=>{
      try{renderGoogleCalendar()}catch(_){}
      try{renderTraining()}catch(_){}
      try{renderHomeDashboard()}catch(_){}
      try{renderHomePortalRSVP()}catch(_){}
      try{renderCoachAttendanceList()}catch(_){}
    });
    console.info(`[EventRecovery] Estado reconciliado con Supabase: ${remoteEvents.length} eventos reales.`);
  }finally{syncing=false}
}

function install(){
  if(window.__supabaseEventRecoveryInstalled)return;
  if(!window.VolleySupabase||typeof window.loadEventsFromSupabase!=='function'){
    setTimeout(install,120);return;
  }
  window.__supabaseEventRecoveryInstalled=true;

  const base=window.loadEventsFromSupabase;
  window.loadEventsFromSupabase=async function(){
    const result=await base.apply(this,arguments);
    await authoritativeEventSync();
    return result;
  };

  // Reconciliar nada más arrancar y después de restaurar sesión.
  setTimeout(()=>void authoritativeEventSync(),700);
  window.addEventListener('focus',()=>void authoritativeEventSync());
  console.info('[EventRecovery] Supabase fijado como fuente de verdad de eventos.');
}

install();
})();
