(function(){
'use strict';
let syncing=false;

function st(){return typeof appState!=='undefined'?appState:null}
function db(){return window.VolleySupabase?.getClient?.()||null}
function user(){try{return typeof getCurrentUser==='function'?getCurrentUser():null}catch(_){return null}}

async function syncRosterFromSupabase(){
  if(syncing)return;
  const client=db(),state=st();
  if(!client||!state)return;
  syncing=true;
  try{
    const {data,error}=await client
      .from('players')
      .select('id,legacy_id,team_id,dorsal,birth_date,position,status,active,profile_id,profiles:profile_id(id,username,full_name,avatar_path,active,role)')
      .eq('active',true);
    if(error){console.warn('[RosterSync] Error cargando plantilla',error);return;}

    const rows=(data||[]).filter(r=>r.profile_id&&r.profiles?.active!==false&&r.profiles?.role==='player');
    const old=Array.isArray(state.players)?state.players:[];
    const next=rows.map(r=>{
      const uname=String(r.profiles?.username||'').toLowerCase();
      const previous=old.find(p=>String(p.supabaseId||'')===String(r.id)||String(p.profile_id||'')===String(r.profile_id)||(uname&&String(p.username||'').toLowerCase()===uname));
      return {
        ...(previous||{}),
        id: previous?.id || r.legacy_id || r.id,
        supabaseId:r.id,
        legacy_id:r.legacy_id||previous?.legacy_id||null,
        profile_id:r.profile_id,
        username:r.profiles?.username||previous?.username||'',
        name:r.profiles?.full_name||previous?.name||r.profiles?.username||'Jugadora',
        full_name:r.profiles?.full_name||previous?.full_name||'',
        number:r.dorsal??previous?.number??null,
        dorsal:r.dorsal??previous?.dorsal??null,
        birthDate:r.birth_date||previous?.birthDate||null,
        position:r.position||previous?.position||'',
        status:r.status||previous?.status||'Disponible',
        teamId:r.team_id||previous?.teamId||null,
        avatar_path:r.profiles?.avatar_path||previous?.avatar_path||null,
        active:true
      };
    });

    state.players=next;

    // Eliminar del estado local cualquier dato de jugadoras fantasma que ya no existe.
    const validLocal=new Set(next.map(p=>String(p.id)));
    const validRemote=new Set(next.map(p=>String(p.supabaseId)));
    const validPlayerRef=v=>validLocal.has(String(v||''))||validRemote.has(String(v||''));
    if(Array.isArray(state.trainingConfirmations)) state.trainingConfirmations=state.trainingConfirmations.filter(x=>validPlayerRef(x.playerId)||validPlayerRef(x.playerIdLegacy));
    if(Array.isArray(state.trainingRPEs)) state.trainingRPEs=state.trainingRPEs.filter(x=>validPlayerRef(x.playerId));
    if(Array.isArray(state.attendanceData)) state.attendanceData=state.attendanceData.filter(x=>validPlayerRef(x.playerId)||validPlayerRef(x.playerIdLegacy));
    if(Array.isArray(state.wellnessLogs)) state.wellnessLogs=state.wellnessLogs.filter(x=>validPlayerRef(x.playerId));

    const u=user();
    if(u?.role==='player'){
      const uname=String(u.username||'').toLowerCase();
      const own=next.find(p=>uname&&String(p.username||'').toLowerCase()===uname);
      if(own){u.playerId=own.id;u.supabasePlayerId=own.supabaseId;}
    }

    try{saveAppData(state)}catch(_){}
    try{if(typeof invalidateViewRenderCache==='function')invalidateViewRenderCache()}catch(_){}
    requestAnimationFrame(()=>{
      try{renderHomeDashboard()}catch(_){}
      try{renderTraining()}catch(_){}
      try{renderCoachAttendanceList()}catch(_){}
      try{renderHomePortalRSVP()}catch(_){}
      try{renderStats()}catch(_){}
    });
    console.info('[RosterSync] Plantilla real cargada desde Supabase:',next.map(p=>p.username));
  }finally{syncing=false}
}
window.syncRosterFromSupabase=syncRosterFromSupabase;

function install(){
  if(window.__supabaseRosterSyncInstalled)return;
  if(!window.VolleySupabase||typeof window.openVerifyAttendanceModal!=='function'){
    setTimeout(install,120);return;
  }
  window.__supabaseRosterSyncInstalled=true;

  const baseOpen=window.openVerifyAttendanceModal;
  window.openVerifyAttendanceModal=async function(eventId){
    await syncRosterFromSupabase();
    return baseOpen.call(this,eventId);
  };

  const baseLoad=window.loadAttendanceFromSupabase;
  if(typeof baseLoad==='function'){
    window.loadAttendanceFromSupabase=async function(){
      await syncRosterFromSupabase();
      return baseLoad.apply(this,arguments);
    };
  }

  setTimeout(()=>void syncRosterFromSupabase(),400);
  window.addEventListener('focus',()=>void syncRosterFromSupabase());
  console.info('[RosterSync] Supabase fijado como fuente de verdad de jugadoras.');
}
install();
})();
