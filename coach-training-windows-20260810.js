(function(){
'use strict';
const FLAG='__coachTrainingWindows20260810';
let refreshTimer=null;

function trainingEvent(event){
  try { if(typeof isTrainingEvent==='function') return !!isTrainingEvent(event); } catch(_){}
  const type=String(event?.event_type||event?.eventType||event?.type||event?.payload?.type||'').toLowerCase();
  return type==='training'||type.includes('entrenamiento');
}
function testFixture(event){
  const legacy=String(event?.legacy_id||event?.legacyId||'').toLowerCase();
  const title=String(event?.title||'').toLowerCase();
  return legacy.startsWith('rpe-test-')||title.includes('prueba rpe');
}
function eventStart(event){
  try {
    if(typeof parseEventStart==='function'){
      const d=parseEventStart(event);
      if(d instanceof Date&&!Number.isNaN(d.getTime())) return d;
    }
  } catch(_){}
  const raw=event?.starts_at||event?.startsAt;
  if(raw){ const d=new Date(raw); if(!Number.isNaN(d.getTime())) return d; }
  if(event?.date){
    const d=new Date(`${event.date}T${event.time||event?.payload?.time||'00:00'}:00`);
    if(!Number.isNaN(d.getTime())) return d;
  }
  return null;
}
function eventDayEnd(event){
  if(event?.date){
    const d=new Date(`${event.date}T23:59:59.999`);
    if(!Number.isNaN(d.getTime())) return d;
  }
  const start=eventStart(event);
  if(!start) return null;
  const d=new Date(start);
  d.setHours(23,59,59,999);
  return d;
}
function prepared(event){
  return Boolean(
    String(event?.plan||event?.payload?.plan||'').trim()||
    String(event?.description||event?.payload?.description||'').trim()||
    event?.attachmentId||event?.sessionImage||event?.payload?.sessionImage
  );
}
function validated(event){
  try { if(typeof isAttendanceOfficiallyValidated==='function') return !!isAttendanceOfficiallyValidated(event); } catch(_){}
  if(event?.attendanceValidatedAt||event?.attendanceOfficial||event?.attendanceValidated===true) return true;
  const ids=[event?.id,event?.supabaseId,event?.supabase_id,event?.legacy_id,event?.legacyId].filter(Boolean).map(String);
  try {
    return (appState?.attendanceData||[]).some(row=>{
      if(!row?.status&&!row?.official_status) return false;
      const rowIds=[row.eventId,row.supabaseEventId,row.event_id,row.eventIdLegacy].filter(Boolean).map(String);
      return rowIds.some(id=>ids.includes(id));
    });
  } catch(_) { return false; }
}
function sameLocalDay(a,b){
  return a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
}
function attendanceReminderWindow(event,now=new Date()){
  const start=eventStart(event),end=eventDayEnd(event);
  return !!(start&&end&&sameLocalDay(start,now)&&now>=start&&now<=end);
}
function operationalTrainings(){
  try { return (appState?.events||[]).filter(event=>trainingEvent(event)&&!testFixture(event)); }
  catch(_) { return []; }
}

function getUpcomingTrainingEventAuthoritative(){
  const now=Date.now();
  return operationalTrainings()
    .filter(event=>{ const start=eventStart(event); return start&&start.getTime()>now; })
    .sort((a,b)=>eventStart(a)-eventStart(b))[0]||null;
}

function getCoachPendingOverviewAuthoritative(){
  const now=new Date();
  const trainings=operationalTrainings();
  const sessionPlanPending=trainings.filter(event=>{
    const start=eventStart(event);
    return start&&start>now&&!prepared(event);
  }).length;
  const attendanceValidationPending=trainings.filter(event=>attendanceReminderWindow(event,now)&&!validated(event)).length;
  return {sessionPlanPending,attendanceValidationPending};
}

function patchWeeklyTracking(){
  const base=window.getWeeklyCoachTracking;
  if(typeof base!=='function'||base[FLAG]) return;
  const wrapped=function(){
    const result=base.apply(this,arguments)||{};
    const now=new Date();
    const todayDue=operationalTrainings().filter(event=>attendanceReminderWindow(event,now)&&!validated(event));
    result.validationPending=todayDue.length;
    if(Array.isArray(result.trainings)){
      const validatedCount=result.trainings.filter(event=>validated(event)).length;
      result.validationDone=validatedCount;
      result.validationTotal=result.trainings.length;
    }
    return result;
  };
  wrapped[FLAG]=true;
  window.getWeeklyCoachTracking=wrapped;
}

function refreshTimeSensitiveDashboard(){
  try { if(typeof renderHomeDashboard==='function') renderHomeDashboard(); } catch(_){}
  try { if(typeof renderHomePortalRSVP==='function') renderHomePortalRSVP(); } catch(_){}
  try { if(typeof renderCoachAttendanceList==='function') renderCoachAttendanceList(); } catch(_){}
}

function install(){
  window.getUpcomingTrainingEvent=getUpcomingTrainingEventAuthoritative;
  window.getCoachPendingOverview=getCoachPendingOverviewAuthoritative;
  window.isCoachAttendanceReminderWindowOpen=attendanceReminderWindow;
  patchWeeklyTracking();
  refreshTimeSensitiveDashboard();
  if(refreshTimer) clearInterval(refreshTimer);
  refreshTimer=setInterval(refreshTimeSensitiveDashboard,30000);
  console.info('[CoachTrainingWindows] Preparación hasta inicio; asistencia pendiente desde inicio hasta fin del día.');
}

setTimeout(install,0);
})();
