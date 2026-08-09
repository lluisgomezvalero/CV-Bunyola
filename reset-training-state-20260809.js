(function(){
'use strict';
const RESET_KEY='volleycoach_training_reset_20260809_v1';

function applyReset(){
  if(typeof appState==='undefined'||!appState){setTimeout(applyReset,100);return;}
  if(localStorage.getItem(RESET_KEY)==='done')return;

  const trainingIds=new Set((appState.events||[]).filter(e=>e&&e.type==='Entrenamiento').map(e=>String(e.id)));
  appState.events=(appState.events||[]).filter(e=>e?.type!=='Entrenamiento');
  appState.trainingConfirmations=[];
  appState.trainingRPEs=[];
  appState.attendanceData=[];
  appState.sessionPlayerComments=[];
  appState.wellnessLogs=(appState.wellnessLogs||[]).map(log=>{
    if(log&&log.sessionId&&trainingIds.has(String(log.sessionId))){const copy={...log};delete copy.sessionId;return copy;}
    return log;
  });

  try{saveAppData(appState);}catch(e){console.warn('[TrainingReset] saveAppData',e);}
  try{localStorage.removeItem('volleycoach_unsaved_draft');localStorage.removeItem('volleycoach_unsaved_draft_meta');}catch(_){}
  localStorage.setItem(RESET_KEY,'done');

  try{if(typeof invalidateViewRenderCache==='function')invalidateViewRenderCache();}catch(_){}
  try{if(typeof renderTraining==='function')renderTraining();}catch(_){}
  try{if(typeof renderHomeDashboard==='function')renderHomeDashboard();}catch(_){}
  try{if(typeof renderHomePortalRSVP==='function')renderHomePortalRSVP();}catch(_){}
  try{if(typeof renderCoachAttendanceList==='function')renderCoachAttendanceList();}catch(_){}

  // Después del borrado local, cargar exclusivamente los eventos que sigan existiendo en Supabase.
  setTimeout(()=>{try{window.loadEventsFromSupabase?.({silent:true,force:true});}catch(_){}},250);
  console.info('[TrainingReset] Sesiones locales antiguas y estado asociado eliminados.');
}

applyReset();
})();
